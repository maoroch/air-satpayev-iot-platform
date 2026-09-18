import os
import json
import time
import logging
import requests
import paho.mqtt.client as mqtt

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DeviceAdapter")

MQTT_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:8000/api/v1/telemetry/ingest")

def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        logger.info("Connected successfully to Mosquitto MQTT Broker!")
        # Subscribe to telemetry from all devices
        client.subscribe("devices/+/telemetry")
        client.subscribe("devices/+/status")
        client.subscribe("devices/+/ack")
        logger.info("Subscribed to devices/+/telemetry, devices/+/status, devices/+/ack")
    else:
        logger.error(f"Failed to connect to MQTT Broker, return code {rc}")

def on_message(client, userdata, msg):
    topic = msg.topic
    payload_str = msg.payload.decode("utf-8")
    logger.info(f"Received MQTT message on topic '{topic}': {payload_str}")

    try:
        data = json.loads(payload_str)
        if topic.endswith("/telemetry"):
            # Forward telemetry to Backend API
            response = requests.post(BACKEND_API_URL, json=data, timeout=5)
            if response.status_code in [200, 201]:
                logger.info(f"Successfully forwarded telemetry for device {data.get('device_id')}")
            else:
                logger.warning(f"Backend returned status {response.status_code}: {response.text}")
        elif topic.endswith("/status"):
            logger.info(f"Status update: {data}")
    except Exception as e:
        logger.error(f"Error processing MQTT payload from {topic}: {e}")

def main():
    logger.info(f"Starting Device Adapter Ingestion Service, targeting broker {MQTT_HOST}:{MQTT_PORT}")
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

    client.loop_forever()

if __name__ == "__main__":
    main()
