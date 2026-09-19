import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.db.models import Device, FilterCycle, DeviceCommand, AuditLog, Notification
from app.schemas.schemas import FilterResetRequest, DeviceCommandRequest

def utc_now():
    return datetime.now(timezone.utc)

class DeviceService:
    @staticmethod
    def reset_filter(db: Session, device_id: str, user_email: str, req: FilterResetRequest) -> Device:
        device = db.query(Device).filter(Device.id == device_id).first()
        if not device:
            raise HTTPException(status_code=404, detail="Устройство не найдено")

        # 1. Close current filter cycle
        cycle = FilterCycle(
            device_id=device.id,
            cycle_start=device.created_at,  # approximate or previous cycle end
            cycle_end=utc_now(),
            total_hours_worked=device.filter_hours_used,
            replaced_by=user_email,
            comment=req.comment
        )
        db.add(cycle)

        # 2. Reset device counters
        device.filter_hours_used = 0.0
        device.filter_life_percent = 100.0

        # 3. Resolve active filter notifications
        filter_notifs = db.query(Notification).filter(
            Notification.device_id == device.id,
            Notification.type.in_(["FILTER_WARN", "FILTER_EXPIRED"]),
            Notification.is_resolved == False
        ).all()
        for fn in filter_notifs:
            fn.is_resolved = True
            fn.resolved_at = utc_now()

        # 4. Audit Log (FR-13)
        audit = AuditLog(
            user_email=user_email,
            action="FILTER_RESET",
            details=f"Сброс ресурса фильтра для {device.id}. Наработка до смены: {cycle.total_hours_worked:.2f} ч. Комментарий: {req.comment}",
            created_at=utc_now()
        )
        db.add(audit)

        db.commit()
        db.refresh(device)
        return device

    @staticmethod
    def send_command(db: Session, device_id: str, user_email: str, req: DeviceCommandRequest) -> DeviceCommand:
        device = db.query(Device).filter(Device.id == device_id).first()
        if not device:
            raise HTTPException(status_code=404, detail="Устройство не найдено")

        # Create command record in PENDING status for Transactional Outbox
        cmd = DeviceCommand(
            device_id=device.id,
            command=req.command,
            payload=json.dumps(req.payload or {}),
            status="PENDING",
            created_at=utc_now()
        )
        db.add(cmd)

        # Audit log
        audit = AuditLog(
            user_email=user_email,
            action=f"DEVICE_COMMAND_{req.command}",
            details=f"Команда {req.command} поставлена в Outbox для {device.id}. Параметры: {req.payload}",
            created_at=utc_now()
        )
        db.add(audit)

        db.commit()
        db.refresh(cmd)
        return cmd

    @staticmethod
    def get_pending_commands(db: Session):
        return db.query(DeviceCommand).filter(DeviceCommand.status == "PENDING").order_by(DeviceCommand.created_at.asc()).all()

    @staticmethod
    def mark_command_sent(db: Session, command_id: str):
        cmd = db.query(DeviceCommand).filter(DeviceCommand.id == command_id).first()
        if cmd and cmd.status == "PENDING":
            cmd.status = "SENT"
            db.commit()
            db.refresh(cmd)
        return cmd

    @staticmethod
    def process_command_ack(db: Session, command_id: str, ack_status: str = "EXECUTED", details: str = None):
        cmd = db.query(DeviceCommand).filter(DeviceCommand.id == command_id).first()
        if not cmd:
            return None

        cmd.status = ack_status
        cmd.executed_at = utc_now()

        # Update physical device state based on confirmed command
        if cmd.command == "SET_FAN":
            device = db.query(Device).filter(Device.id == cmd.device_id).first()
            if device:
                try:
                    payload = json.loads(cmd.payload) if cmd.payload else {}
                    device.fan_active = bool(payload.get("enabled", True))
                except Exception:
                    pass

        # Audit log acknowledgment
        audit = AuditLog(
            user_email="adapter@iot.satpayev.kz",
            action=f"COMMAND_ACK_{cmd.command}",
            details=f"Прибор {cmd.device_id} подтвердил выполнение: {ack_status}. Детали: {details or ''}",
            created_at=utc_now()
        )
        db.add(audit)

        db.commit()
        db.refresh(cmd)
        return cmd
