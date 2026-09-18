import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import Base
from app.db.models import Device, User, SensorType, Measurement, Notification, AuditLog
from app.core.security import get_password_hash, verify_password, create_access_token
from app.services.telemetry_service import TelemetryService
from app.services.device_service import DeviceService
from app.services.export_service import ExportService
from app.schemas.schemas import TelemetryPayload, FilterResetRequest, DeviceCommandRequest

# In-memory database for tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    # Seed sensor types
    session.add(SensorType(code="TEMP", name="Температура", unit="°C", min_valid=-20.0, max_valid=70.0))
    session.add(SensorType(code="HUMIDITY", name="Влажность", unit="%", min_valid=0.0, max_valid=100.0))
    session.commit()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_password_hashing():
    pwd = "SecretPassword123!"
    hashed = get_password_hash(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPwd", hashed) is False

def test_jwt_token_generation():
    token = create_access_token(subject="admin@satpayev.kz", role="ADMIN")
    assert token is not None
    assert isinstance(token, str)

def test_telemetry_processing_and_filter_calc(db):
    payload = TelemetryPayload(
        device_id="test-purifier-01",
        temperature=23.5,
        humidity=48.0,
        fan_status=True,
        is_test=True
    )
    
    device = TelemetryService.process_telemetry(db, payload)
    assert device.id == "test-purifier-01"
    assert device.status == "ONLINE"
    assert device.last_temperature == 23.5
    assert device.last_humidity == 48.0
    assert device.fan_active is True
    assert device.filter_hours_used > 0
    assert device.filter_life_percent <= 100.0

    # Verify measurement records created in DB
    measurements = db.query(Measurement).filter(Measurement.device_id == "test-purifier-01").all()
    assert len(measurements) == 2
    codes = [m.sensor_code for m in measurements]
    assert "TEMP" in codes
    assert "HUMIDITY" in codes

def test_alarm_deduplication(db):
    # Send abnormal temperature (>35 °C)
    p1 = TelemetryPayload(device_id="test-purifier-02", temperature=38.5, humidity=50.0, fan_status=True)
    TelemetryService.process_telemetry(db, p1)
    
    notifs = db.query(Notification).filter(Notification.device_id == "test-purifier-02").all()
    assert len(notifs) == 1
    assert notifs[0].type == "TEMP_HIGH"

    # Send again abnormal temp -> should NOT duplicate (FR-10)
    p2 = TelemetryPayload(device_id="test-purifier-02", temperature=39.0, humidity=50.0, fan_status=True)
    TelemetryService.process_telemetry(db, p2)

    notifs_after = db.query(Notification).filter(Notification.device_id == "test-purifier-02").all()
    assert len(notifs_after) == 1

def test_filter_replacement_reset(db):
    p = TelemetryPayload(device_id="test-purifier-03", temperature=22.0, humidity=45.0, fan_status=True)
    device = TelemetryService.process_telemetry(db, p)
    device.filter_hours_used = 700.0
    device.filter_life_percent = 2.7
    db.commit()

    reset_req = FilterResetRequest(comment="Замена картриджа на новый")
    updated = DeviceService.reset_filter(db, "test-purifier-03", "operator@satpayev.kz", reset_req)

    assert updated.filter_hours_used == 0.0
    assert updated.filter_life_percent == 100.0
    
    # Audit log check
    audit = db.query(AuditLog).filter(AuditLog.action == "FILTER_RESET").first()
    assert audit is not None
    assert audit.user_email == "operator@satpayev.kz"

def test_csv_export(db):
    p = TelemetryPayload(device_id="test-purifier-04", temperature=24.1, humidity=52.3, fan_status=True)
    TelemetryService.process_telemetry(db, p)

    csv_data = ExportService.generate_csv(db, "test-purifier-04")
    assert "Идентификатор прибора" in csv_data
    assert "test-purifier-04" in csv_data
    assert "24.10" in csv_data
