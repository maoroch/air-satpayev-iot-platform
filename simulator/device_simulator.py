import os
import time
import math
import json
import random
import logging
import requests
from datetime import datetime, timezone
import paho.mqtt.client as mqtt

logging.basicConfig(level=logging.INFO, format="%(asctime)s [SIMULATOR] %(message)s")
logger = logging.getLogger("DeviceSimulator")

DEVICE_ID = os.getenv("DEVICE_ID", "purifier-satpayev-01")
MQTT_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))
HTTP_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:8000/api/v1/telemetry/ingest")
SEND_INTERVAL_SEC = int(os.getenv("SEND_INTERVAL_SEC", "5"))

# Device internal state
fan_enabled = True
fan_speed = 2
filter_hours_accumulated = 42.0

def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        logger.info(f"Simulator connected to Mosquitto Broker at {MQTT_HOST}:{MQTT_PORT}")
        # Subscribe to device command topic
        client.subscribe(f"devices/{DEVICE_ID}/commands")
        logger.info(f"Subscribed to command topic: devices/{DEVICE_ID}/commands")
    else:
        logger.warning(f"Simulator MQTT connection returned code {rc}")

def on_message(client, userdata, msg):
    global fan_enabled, fan_speed
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
        logger.info(f"Simulator received command: {payload}")
        cmd = payload.get("command")
        cmd_payload = payload.get("payload", {})
        
        if cmd == "SET_FAN":
            fan_enabled = cmd_payload.get("enabled", True)
            fan_speed = cmd_payload.get("speed", 2)
            logger.info(f"Command executed: Fan {'RUNNING' if fan_enabled else 'STOPPED'}, speed: {fan_speed}")
            
            # Send ACK
            ack = {
                "command_id": payload.get("command_id", "cmd-ack"),
                "status": "EXECUTED",
                "details": f"Fan set to {'ON' if fan_enabled else 'OFF'}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            client.publish(f"devices/{DEVICE_ID}/ack", json.dumps(ack))
    except Exception as e:
        logger.error(f"Failed to execute command: {e}")

def main():
    global filter_hours_accumulated
    logger.info(f"Starting Physical Device Simulator for '{DEVICE_ID}'...")
    
    mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f"sim-{DEVICE_ID}")
    mqtt_client.on_connect = on_connect
    mqtt_client.on_message = on_message

    mqtt_connected = False
    try:
        mqtt_client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
        mqtt_client.loop_start()
        mqtt_connected = True
        logger.info("MQTT transport initialized.")
    except Exception as e:
        logger.warning(f"Could not connect to MQTT broker directly ({e}). Will use HTTP fallback.")

    step = 0
    while True:
        try:
            step += 1
            # Realistic physical simulation:
            # Base temp 22.5 °C with subtle sinusoidal variation and random noise
            sim_temp = 22.5 + 1.8 * math.sin(step * 0.08) + random.uniform(-0.15, 0.15)
            # Base humidity 48% inverse to temperature variation
            sim_hum = 48.0 - 2.5 * math.sin(step * 0.08) + random.uniform(-0.3, 0.3)
            
            if fan_enabled:
                filter_hours_accumulated += (SEND_INTERVAL_SEC / 3600.0)

            telemetry = {
                "device_id": DEVICE_ID,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "temperature": round(sim_temp, 2),
                "humidity": round(sim_hum, 2),
                "fan_status": fan_enabled,
                "filter_hours": round(filter_hours_accumulated, 2),
                "device_status": "ONLINE",
                "additional": {
                    "fan_speed": fan_speed if fan_enabled else 0,
                    "wifi_rssi": random.randint(-68, -55),
                    "firmware": "1.0.4-satpayev"
                },
                "is_test": False
            }

            payload_json = json.dumps(telemetry)

            # 1. Try MQTT publish
            sent_via_mqtt = False
            if mqtt_connected:
                res = mqtt_client.publish(f"devices/{DEVICE_ID}/telemetry", payload_json)
                if res.rc == mqtt.MQTT_ERR_SUCCESS:
                    sent_via_mqtt = True
                    logger.info(f"[MQTT SEND] T={telemetry['temperature']}°C, RH={telemetry['humidity']}%, Fan={fan_enabled}")

            # 2. If MQTT failed or not available, use direct HTTP fallback
            if not sent_via_mqtt:
                try:
                    resp = requests.post(HTTP_API_URL, json=telemetry, timeout=3)
                    if resp.status_code == 200:
                        logger.info(f"[HTTP SEND] T={telemetry['temperature']}°C, RH={telemetry['humidity']}%, Fan={fan_enabled}")
                    else:
                        logger.warning(f"[HTTP ERROR] Server responded {resp.status_code}")
                except Exception as ex:
                    logger.debug(f"[HTTP FAIL] Could not reach backend HTTP: {ex}")

        except Exception as e:
            logger.error(f"Simulator loop error: {e}")

        time.sleep(SEND_INTERVAL_SEC)

if __name__ == "__main__":
    main()
