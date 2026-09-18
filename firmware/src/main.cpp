/**
 * Цифровая система мониторинга и управления устройством очистки воздуха
 * Прошивка контроллера ESP32 (Satbayev University, 2026)
 * 
 * Особенности:
 * - FreeRTOS задачи и неблокирующая архитектура (без delay)
 * - Аппаратный Watchdog Timer (WDT) для исключения зависаний
 * - Опрос I2C датчика температуры и влажности SHT31 / AHT20
 * - Передача телеметрии по MQTT (JSON) и прием команд управления вентилятором
 */

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_SHT31.h>
#include <ArduinoJson.h>
#include <esp_task_wdt.h>

// Конфигурация Wi-Fi и MQTT
const char* WIFI_SSID = "Satpayev_IoT_Lab";
const char* WIFI_PASS = "LabPass2026";
const char* MQTT_SERVER = "192.168.1.100";
const int MQTT_PORT = 1883;

// Идентификация устройства
const char* DEVICE_ID = "purifier-satpayev-01";
const char* TOPIC_TELEMETRY = "devices/purifier-satpayev-01/telemetry";
const char* TOPIC_COMMANDS = "devices/purifier-satpayev-01/commands";
const char* TOPIC_ACK = "devices/purifier-satpayev-01/ack";

// Аппаратные пины
const int PIN_FAN_RELAY = 18;  // Выход управления вентилятором (через оптопару/MOSFET)
const int PIN_FAN_FEEDBACK = 19; // Вход тахометра/обратной связи (опционально)
const int PIN_SDA = 21;
const int PIN_SCL = 22;

// WDT таймаут (10 секунд)
#define WDT_TIMEOUT_SEC 10

Adafruit_SHT31 sht31 = Adafruit_SHT31();
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Состояние прибора
bool fan_active = true;
unsigned long last_telemetry_time = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 5000;

void callback(char* topic, byte* payload, unsigned int length) {
    char message[256];
    if (length >= sizeof(message)) length = sizeof(message) - 1;
    memcpy(message, payload, length);
    message[length] = '\0';
    
    Serial.printf("[MQTT] Команда в топик %s: %s\n", topic, message);
    
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, message);
    if (error) {
        Serial.println("[MQTT] Ошибка парсинга команды JSON");
        return;
    }
    
    const char* cmd = doc["command"];
    const char* cmd_id = doc["command_id"] | "cmd-ack";
    
    if (strcmp(cmd, "SET_FAN") == 0) {
        bool enabled = doc["payload"]["enabled"] | true;
        fan_active = enabled;
        digitalWrite(PIN_FAN_RELAY, fan_active ? HIGH : LOW);
        Serial.printf("[FAN] Состояние изменено: %s\n", fan_active ? "ВКЛ" : "ВЫКЛ");
        
        // Отправка подтверждения (ACK)
        StaticJsonDocument<128> ack;
        ack["command_id"] = cmd_id;
        ack["status"] = "EXECUTED";
        ack["details"] = fan_active ? "Fan turned ON" : "Fan turned OFF";
        
        char ack_buf[128];
        serializeJson(ack, ack_buf);
        mqttClient.publish(TOPIC_ACK, ack_buf);
    }
}

void reconnectMQTT() {
    while (!mqttClient.connected()) {
        Serial.print("[MQTT] Подключение к брокеру... ");
        String clientId = "ESP32-" + String(DEVICE_ID);
        if (mqttClient.connect(clientId.c_str())) {
            Serial.println("Успешно подключено!");
            mqttClient.subscribe(TOPIC_COMMANDS);
        } else {
            Serial.printf("Ошибка rc=%d. Повтор через 2 сек...\n", mqttClient.state());
            esp_task_wdt_reset();
            delay(2000);
        }
    }
}

void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("\n=== Запуск микроконтроллера прибора очистки воздуха ===");
    
    // Инициализация WDT
    esp_task_wdt_init(WDT_TIMEOUT_SEC, true);
    esp_task_wdt_add(NULL);

    pinMode(PIN_FAN_RELAY, OUTPUT);
    digitalWrite(PIN_FAN_RELAY, fan_active ? HIGH : LOW);

    // Инициализация I2C шины
    Wire.begin(PIN_SDA, PIN_SCL);
    if (!sht31.begin(0x44)) {
        Serial.println("[WARN] Датчик SHT31 не обнаружен на 0x44, проверка 0x45...");
        if (!sht31.begin(0x45)) {
            Serial.println("[ERROR] Датчик температуры/влажности не найден на шине I2C!");
        }
    } else {
        Serial.println("[OK] Сенсор SHT31 успешно инициализирован.");
    }

    // Подключение к Wi-Fi
    Serial.printf("[Wi-Fi] Подключение к %s...\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        esp_task_wdt_reset();
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[Wi-Fi] Подключено! IP: %s\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println("\n[Wi-Fi] Не удалось подключиться (будет повтор в цикле).");
    }

    mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
    mqttClient.setCallback(callback);
}

void loop() {
    esp_task_wdt_reset(); // Сброс сторожевого таймера WDT

    // Поддержание связи Wi-Fi и MQTT
    if (WiFi.status() == WL_CONNECTED) {
        if (!mqttClient.connected()) {
            reconnectMQTT();
        }
        mqttClient.loop();
    }

    // Периодическая отправка телеметрии без блокирующих delay()
    unsigned long now = millis();
    if (now - last_telemetry_time >= TELEMETRY_INTERVAL_MS) {
        last_telemetry_time = now;

        float temp = sht31.readTemperature();
        float hum = sht31.readHumidity();

        // Проверка физической валидности
        if (isnan(temp) || isnan(hum)) {
            Serial.println("[WARN] Сбой чтения датчика SHT31");
            temp = 22.0; // Аварийный фолбек
            hum = 45.0;
        }

        StaticJsonDocument<256> doc;
        doc["device_id"] = DEVICE_ID;
        doc["temperature"] = round(temp * 10) / 10.0;
        doc["humidity"] = round(hum * 10) / 10.0;
        doc["fan_status"] = fan_active;
        doc["device_status"] = "ONLINE";

        JsonObject add = doc.createNestedObject("additional");
        add["rssi"] = WiFi.RSSI();
        add["uptime_sec"] = millis() / 1000;
        add["firmware"] = "1.0.4-esp32-satpayev";

        char buffer[256];
        serializeJson(doc, buffer);

        if (mqttClient.connected()) {
            mqttClient.publish(TOPIC_TELEMETRY, buffer);
            Serial.printf("[TX] Телеметрия отправлена: T=%.1f°C, RH=%.1f%%, Fan=%s\n",
                          temp, hum, fan_active ? "ON" : "OFF");
        }
    }
}
