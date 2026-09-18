# Спецификация телеметрии, протокола MQTT и REST API

**Этап 2**: Спецификация протокола взаимодействия устройства и серверной части, контрактов интерфейсов и структуры обмена данными.

---

## 1. Протокол MQTT взаимодействия с устройством

### 1.1. Структура топиков
* `devices/{device_id}/telemetry` — периодическая передача показаний датчиков (ESP32 → Сервер) с QoS 0/1.
* `devices/{device_id}/status` — статус доступности устройства (LWT - Last Will and Testament: Offline при обрыве сокета).
* `devices/{device_id}/commands` — управляющие директивы (Сервер → ESP32) с QoS 1.
* `devices/{device_id}/ack` — подтверждение выполнения команды (ESP32 → Сервер).

### 1.2. Формат пакета телеметрии (JSON)
Соответствует разделу 10.1 Технического задания:

```json
{
  "device_id": "purifier-satpayev-01",
  "timestamp": "2026-09-18T15:30:00Z",
  "temperature": 23.4,
  "humidity": 48.2,
  "fan_status": true,
  "filter_hours": 142.5,
  "device_status": "ONLINE",
  "additional": {
    "rssi": -62,
    "firmware_version": "1.0.4",
    "pm25": null,
    "co2": null
  },
  "is_test": false
}
```

### 1.3. Формат команды управления
```json
{
  "command_id": "8f39a03b-c2e7-4b71-9f20-94d309be7388",
  "command": "SET_FAN",
  "payload": {
    "enabled": true,
    "speed": 2
  },
  "timestamp": "2026-09-18T15:30:05Z"
}
```

### 1.4. Формат ответа устройства (ACK)
```json
{
  "command_id": "8f39a03b-c2e7-4b71-9f20-94d309be7388",
  "status": "EXECUTED",
  "details": "Fan speed set to 2",
  "timestamp": "2026-09-18T15:30:06Z"
}
```

---

## 2. Спецификация REST API (FastAPI)

Базовый путь: `/api/v1`

### 2.1. Аутентификация (`/auth`)
* `POST /auth/login` — получение JWT access токена по `username` и `password`.
* `GET /auth/me` — получение профиля текущего пользователя и его роли.

### 2.2. Устройства (`/devices`)
* `GET /devices` — список зарегистрированных устройств с текущим статусом Online/Offline и последними показаниями.
* `GET /devices/{device_id}` — детальная карточка устройства.
* `POST /devices` — регистрация нового устройства (только Администратор).
* `POST /devices/{device_id}/command` — отправка команды управления на прибор.
* `POST /devices/{device_id}/filter/reset` — сброс счетчика наработки фильтра после замены.

### 2.3. Телеметрия и история (`/telemetry`)
* `GET /telemetry/latest?device_id=...` — текущий срез телеметрии.
* `GET /telemetry/history?device_id=...&from=...&to=...&sensor=...` — исторический временной ряд для графиков.
* `GET /telemetry/export?device_id=...&from=...&to=...` — выгрузка истории в формате CSV (FR-15).

### 2.4. Уведомления и события (`/notifications`, `/logs`)
* `GET /notifications?resolved=false` — список активных системных предупреждений.
* `POST /notifications/{id}/resolve` — отметка уведомления как прочитанного/обработанного.
* `GET /logs/audit` — журнал действий пользователей для аудита (только Администратор).
* `GET /system/diagnostics` — технические параметры микросервисов, статус БД, памяти и брокера (Технический специалист).

---

## 3. Протокол реального времени (WebSocket)

* URL: `ws://<host>/api/v1/ws/telemetry`
* При подключении клиент передает JWT токен в параметрах или заголовках.
* Сервер пушит события `TELEMETRY_UPDATE`, `DEVICE_STATUS_CHANGE`, `NEW_ALERT` без необходимости постоянного поллинга со стороны браузера.
