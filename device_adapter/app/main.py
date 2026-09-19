import os
import json
import time
import logging
import threading
import requests
import paho.mqtt.client as mqtt

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DeviceAdapter")

MQTT_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:8000/api/v1/telemetry/ingest")
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL") or BACKEND_API_URL.replace("/telemetry/ingest", "")

def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        logger.info("Connected successfully to Mosquitto MQTT Broker!")
        # Subscribe to telemetry, status, and acknowledgments from all devices
        client.subscribe("devices/+/telemetry")
        client.subscribe("devices/+/status")
        client.subscribe("devices/+/ack")
        logger.info("Subscribed to devices/+/telemetry, devices/+/status, devices/+/ack")
    else:
        logger.error(f"Failed to connect to MQTT Broker, return code {rc}")

def on_message(client, userdata, msg):
    topic = msg.topic
    payload_str = msg.payload.decode("utf-8")

    try:
        data = json.loads(payload_str)
        if topic.endswith("/telemetry"):
            # Forward telemetry to Backend API
            response = requests.post(BACKEND_API_URL, json=data, timeout=5)
            if response.status_code in [200, 201]:
                logger.debug(f"Forwarded telemetry for device {data.get('device_id')}")
            else:
                logger.warning(f"Backend returned status {response.status_code}: {response.text}")
        elif topic.endswith("/ack"):
            # Hardware / Simulator executed command and confirmed (FR-10, Outbox ACK)
            logger.info(f"[ACK RECEIVED] Topic '{topic}': {data}")
            cmd_id = data.get("command_id")
            if cmd_id and cmd_id != "cmd-ack":
                ack_url = f"{BACKEND_BASE_URL}/devices/commands/{cmd_id}/ack"
                try:
                    ack_resp = requests.post(
                        ack_url,
                        json={
                            "status": data.get("status", "EXECUTED"),
                            "details": data.get("details", "Confirmed by hardware/simulator")
                        },
                        timeout=5
                    )
                    logger.info(f"[ACK FORWARDED] Command {cmd_id} execution recorded in DB (HTTP {ack_resp.status_code})")
                except Exception as ex:
                    logger.error(f"[ACK ERROR] Failed to forward ACK to backend: {ex}")
        elif topic.endswith("/status"):
            logger.info(f"Status update: {data}")
    except Exception as e:
        logger.error(f"Error processing MQTT payload from {topic}: {e}")

def outbox_dispatcher(mqtt_client):
    """
    Background worker implementing the Transactional Outbox Pattern.
    Monitors DB for PENDING commands, publishes to Mosquitto MQTT broker,
    and updates status to SENT.
    """
    logger.info("Starting Transactional Outbox command dispatcher...")
    while True:
        try:
            url = f"{BACKEND_BASE_URL}/devices/commands/pending"
            resp = requests.get(url, timeout=3)
            if resp.status_code == 200:
                pending_cmds = resp.json()
                for cmd in pending_cmds:
                    cmd_id = cmd.get("id")
                    device_id = cmd.get("device_id")
                    command_name = cmd.get("command")
                    payload_raw = cmd.get("payload")
                    
                    if isinstance(payload_raw, str):
                        try:
                            payload_data = json.loads(payload_raw)
                        except Exception:
                            payload_data = {}
                    else:
                        payload_data = payload_raw or {}

                    topic = f"devices/{device_id}/commands"
                    mqtt_packet = {
                        "command_id": cmd_id,
                        "command": command_name,
                        "payload": payload_data
                    }

                    logger.info(f"[OUTBOX DISPATCH] Sending {command_name} ({cmd_id}) to topic '{topic}'")
                    res = mqtt_client.publish(topic, json.dumps(mqtt_packet), qos=1)
                    if res.rc == mqtt.MQTT_ERR_SUCCESS:
                        # Mark command as SENT in backend DB
                        requests.post(f"{BACKEND_BASE_URL}/devices/commands/{cmd_id}/sent", timeout=3)
                        logger.info(f"[OUTBOX SENT] Command {cmd_id} marked as SENT in database")
                    else:
                        logger.warning(f"[OUTBOX RETRY] MQTT publish failed with rc={res.rc}")
        except Exception as e:
            # Backend might be restarting
            logger.debug(f"[OUTBOX POLL] Check pending commands failed: {e}")

        time.sleep(1)

def main():
    logger.info(f"Starting Device Adapter Ingestion & Outbox Service, targeting broker {MQTT_HOST}:{MQTT_PORT}")
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="device-adapter-ingestion")
    client.on_connect = on_connect
    client.on_message = on_message

    connected = False
    retry_delay = 2
    while not connected:
        try:
            client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            connected = True
        except Exception as e:
            logger.warning(f"Waiting for MQTT Broker at {MQTT_HOST}:{MQTT_PORT} ({e}). Retrying in {retry_delay}s...")
            time.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, 10)

    # Start MQTT network loop in background
    client.loop_start()

    # Start Outbox Dispatcher in dedicated worker thread
    outbox_thread = threading.Thread(target=outbox_dispatcher, args=(client,), daemon=True)
    outbox_thread.start()

    # Keep main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Stopping Device Adapter...")
        client.loop_stop()

if __name__ == "__main__":
    main()
