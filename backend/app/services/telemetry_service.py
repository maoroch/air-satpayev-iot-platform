from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from app.db.models import Device, Measurement, Notification, SensorType
from app.schemas.schemas import TelemetryPayload

def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)

class TelemetryService:
    @staticmethod
    def process_telemetry(db: Session, payload: TelemetryPayload) -> Device:
        device = db.query(Device).filter(Device.id == payload.device_id).first()
        if payload.timestamp:
            now = payload.timestamp.astimezone(timezone.utc).replace(tzinfo=None) if payload.timestamp.tzinfo else payload.timestamp
        else:
            now = utc_now()
        
        # Auto-register device if not existing yet
        if not device:
            device = Device(
                id=payload.device_id,
                name=f"Очиститель воздуха ({payload.device_id})",
                model="Satpayev Air Purifier v1",
                status="ONLINE",
                last_seen=now
            )
            db.add(device)
            db.commit()
            db.refresh(device)

        # 1. Update device status and heartbeat
        device.status = "ONLINE"
        
        # 2. Filter runtime calculation (FR-07)
        # If fan is running, accumulate runtime
        if payload.fan_status:
            device.fan_active = True
            if payload.filter_hours is not None and payload.filter_hours > 0:
                device.filter_hours_used = round(payload.filter_hours, 2)
            else:
                delta_hours = 5.0 / 3600.0  # default 5 sec tick
                if device.last_seen:
                    diff_seconds = (now - device.last_seen).total_seconds()
                    if 0 < diff_seconds <= 60:
                        delta_hours = diff_seconds / 3600.0
                device.filter_hours_used += delta_hours
            
            # Recalculate percent
            max_hours = device.filter_hours_max or 720.0
            remaining = max(0.0, max_hours - device.filter_hours_used)
            device.filter_life_percent = round((remaining / max_hours) * 100.0, 1)
        else:
            device.fan_active = False

        device.last_seen = now

        # 3. Save Measurements (FR-05, FR-06)
        if payload.temperature is not None:
            device.last_temperature = round(payload.temperature, 2)
            m_temp = Measurement(
                device_id=device.id,
                sensor_code="TEMP",
                value=device.last_temperature,
                is_test=payload.is_test or False,
                recorded_at=now
            )
            db.add(m_temp)

        if payload.humidity is not None:
            device.last_humidity = round(payload.humidity, 2)
            m_hum = Measurement(
                device_id=device.id,
                sensor_code="HUMIDITY",
                value=device.last_humidity,
                is_test=payload.is_test or False,
                recorded_at=now
            )
            db.add(m_hum)

        # 4. Threshold & Alarm Checks with Deduplication (FR-10)
        TelemetryService._check_alarms(db, device)

        db.commit()
        db.refresh(device)
        return device

    @staticmethod
    def _check_alarms(db: Session, device: Device):
        # Check high temperature
        if device.last_temperature and device.last_temperature > 35.0:
            TelemetryService._create_unique_notification(
                db=db,
                device_id=device.id,
                notif_type="TEMP_HIGH",
                severity="WARNING",
                title="Превышение температуры",
                message=f"Температура воздуха {device.last_temperature}°C превышает допустимый порог 35°C."
            )
            
        # Check abnormal humidity
        if device.last_humidity and (device.last_humidity < 20.0 or device.last_humidity > 80.0):
            TelemetryService._create_unique_notification(
                db=db,
                device_id=device.id,
                notif_type="HUMIDITY_ABNORMAL",
                severity="WARNING",
                title="Отклонение влажности",
                message=f"Относительная влажность {device.last_humidity}% вышла за пределы комфортного диапазона (20-80%)."
            )

        # Check filter life degradation
        if device.filter_life_percent <= 0.0:
            TelemetryService._create_unique_notification(
                db=db,
                device_id=device.id,
                notif_type="FILTER_EXPIRED",
                severity="CRITICAL",
                title="Ресурс фильтра исчерпан",
                message="Фильтрующий элемент выработал 100% нормативного ресурса. Требуется замена."
            )
        elif device.filter_life_percent <= 10.0:
            TelemetryService._create_unique_notification(
                db=db,
                device_id=device.id,
                notif_type="FILTER_WARN",
                severity="WARNING",
                title="Остаточный ресурс фильтра < 10%",
                message=f"Осталось {device.filter_life_percent}% ресурса фильтра. Подготовьте новый сменный элемент."
            )

    @staticmethod
    def _create_unique_notification(db: Session, device_id: str, notif_type: str, severity: str, title: str, message: str):
        # Check for active unresolved notification of same type (FR-10 deduplication rule)
        existing = db.query(Notification).filter(
            Notification.device_id == device_id,
            Notification.type == notif_type,
            Notification.is_resolved == False
        ).first()

        if not existing:
            notif = Notification(
                device_id=device_id,
                type=notif_type,
                severity=severity,
                title=title,
                message=message,
                is_resolved=False,
                created_at=utc_now()
            )
            db.add(notif)

    @staticmethod
    def check_offline_devices(db: Session, timeout_seconds: int = 30):
        """Called periodically to detect offline devices (FR-04)"""
        now = utc_now()
        threshold = now - timedelta(seconds=timeout_seconds)
        
        online_devices = db.query(Device).filter(
            Device.status == "ONLINE",
            (Device.last_seen < threshold) | (Device.last_seen == None)
        ).all()

        for d in online_devices:
            d.status = "OFFLINE"
            TelemetryService._create_unique_notification(
                db=db,
                device_id=d.id,
                notif_type="DEVICE_OFFLINE",
                severity="WARNING",
                title="Потеря связи с устройством",
                message=f"Устройство {d.name} ({d.id}) не выходит на связь более {timeout_seconds} сек."
            )
        
        if online_devices:
            db.commit()
