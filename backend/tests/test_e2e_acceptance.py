import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.db.models import Device, Measurement, Notification, User, AuditLog

client = TestClient(app)

def test_at_01_authorization():
    """AT-01: Вход под пользователем и администратором"""
    # Valid admin login
    res = client.post("/api/v1/auth/login", json={"email": "admin@satpayev.kz", "password": "Admin@2026!"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "ADMIN"

    # Invalid password
    res_bad = client.post("/api/v1/auth/login", json={"email": "admin@satpayev.kz", "password": "WrongPassword"})
    assert res_bad.status_code == 401

def test_at_02_device_registration():
    """AT-02: Регистрация нового прибора администратором"""
    login_res = client.post("/api/v1/auth/login", json={"email": "admin@satpayev.kz", "password": "Admin@2026!"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    new_device_id = f"purifier-test-reg-{int(datetime.now().timestamp())}"
    res = client.post(
        "/api/v1/devices",
        json={"id": new_device_id, "name": "Тестовый воздухоочиститель", "filter_hours_max": 720.0},
        headers=headers
    )
    assert res.status_code == 201
    assert res.json()["id"] == new_device_id

def test_at_03_online_status_and_telemetry():
    """AT-03..05: Поступление температуры, влажности и статус Online"""
    dev_id = "purifier-satpayev-01"
    payload = {
        "device_id": dev_id,
        "temperature": 23.8,
        "humidity": 46.5,
        "fan_status": True,
        "is_test": True
    }
    res = client.post("/api/v1/telemetry/ingest", json=payload)
    assert res.status_code == 200
    dev = res.json()
    assert dev["status"] == "ONLINE"
    assert dev["last_temperature"] == 23.8
    assert dev["last_humidity"] == 46.5

def test_at_06_history():
    """AT-06: Просмотр истории измерений"""
    login_res = client.post("/api/v1/auth/login", json={"email": "admin@satpayev.kz", "password": "Admin@2026!"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/telemetry/history?device_id=purifier-satpayev-01", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "data" in data
    assert isinstance(data["data"], list)

def test_at_07_offline_detection():
    """AT-07: Корректный переход в Offline по таймауту"""
    db = SessionLocal()
    dev = db.query(Device).filter(Device.id == "purifier-satpayev-01").first()
    # Simulate device last seen 60 seconds ago
    dev.last_seen = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=60)
    db.commit()

    login_res = client.post("/api/v1/auth/login", json={"email": "admin@satpayev.kz", "password": "Admin@2026!"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch devices -> triggers check_offline_devices
    res = client.get("/api/v1/devices", headers=headers)
    assert res.status_code == 200
    devices = res.json()
    target = next((d for d in devices if d["id"] == "purifier-satpayev-01"), None)
    assert target is not None
    assert target["status"] == "OFFLINE"
    db.close()

def test_at_08_filter_reset_and_hours():
    """AT-08: Расчет наработки и сброс после замены"""
    login_res = client.post("/api/v1/auth/login", json={"email": "admin@satpayev.kz", "password": "Admin@2026!"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/v1/devices/purifier-satpayev-01/filter/reset",
        json={"comment": "Приемочные испытания: плановая замена"},
        headers=headers
    )
    assert res.status_code == 200
    dev = res.json()
    assert dev["filter_hours_used"] == 0.0
    assert dev["filter_life_percent"] == 100.0

def test_at_09_alarm_deduplication():
    """AT-09: Уведомление создается без спам-дублирования"""
    dev_id = "purifier-satpayev-01"
    # Send abnormal temperature (>35 °C) twice
    client.post("/api/v1/telemetry/ingest", json={"device_id": dev_id, "temperature": 39.5, "humidity": 50.0, "fan_status": True})
    client.post("/api/v1/telemetry/ingest", json={"device_id": dev_id, "temperature": 40.0, "humidity": 51.0, "fan_status": True})

    login_res = client.post("/api/v1/auth/login", json={"email": "admin@satpayev.kz", "password": "Admin@2026!"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/notifications?resolved=false", headers=headers)
    notifs = res.json()
    temp_notifs = [n for n in notifs if n["type"] == "TEMP_HIGH" and n["device_id"] == dev_id]
    assert len(temp_notifs) == 1  # Exactly 1 active notification, no duplicates

def test_at_10_device_command():
    """AT-10: Отправка команды управления и подтверждение"""
    login_res = client.post("/api/v1/auth/login", json={"email": "admin@satpayev.kz", "password": "Admin@2026!"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/v1/devices/purifier-satpayev-01/command",
        json={"command": "SET_FAN", "payload": {"enabled": True, "speed": 2}},
        headers=headers
    )
    assert res.status_code == 200
    cmd = res.json()
    assert cmd["command"] == "SET_FAN"
    assert cmd["status"] in ["PENDING", "EXECUTED"]

def test_at_11_rbac_permission_denial():
    """AT-11: Отказ в доступе пользователю без необходимых прав"""
    # Operator tries to call an admin-only endpoint (create device)
    login_res = client.post("/api/v1/auth/login", json={"email": "operator@satpayev.kz", "password": "Operator@2026!"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post("/api/v1/devices", json={"id": "illegal-device", "name": "Illegal"}, headers=headers)
    assert res.status_code == 403

def test_at_12_csv_export():
    """AT-12: Экспорт истории в формате CSV"""
    login_res = client.post("/api/v1/auth/login", json={"email": "admin@satpayev.kz", "password": "Admin@2026!"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/telemetry/export?device_id=purifier-satpayev-01", headers=headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "Идентификатор прибора" in res.text

def test_at_15_invalid_payload_resilience():
    """AT-15: Ошибка валидации некорректного сообщения без падения сервера"""
    # Temperature out of physical range (e.g. 500 °C)
    res = client.post("/api/v1/telemetry/ingest", json={"device_id": "purifier-satpayev-01", "temperature": 500.0})
    assert res.status_code == 422  # Handled by Pydantic validation cleanly
