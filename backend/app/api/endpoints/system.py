from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from sqlalchemy.orm import Session
import time
from app.db.session import get_db
from app.db.models import Device, Notification, AuditLog, User, Setting
from app.schemas.schemas import AuditLogResponse, SystemDiagnosticsResponse
from app.core.security import get_current_user, require_roles
from app.core.config import settings

router = APIRouter()
START_TIME = time.time()

def format_uptime(seconds: float) -> str:
    secs = int(seconds)
    days, rem = divmod(secs, 86400)
    hours, rem = divmod(rem, 3600)
    mins, s = divmod(rem, 60)
    parts = []
    if days > 0:
        parts.append(f"{days} д.")
    if hours > 0:
        parts.append(f"{hours} ч.")
    if mins > 0:
        parts.append(f"{mins} мин.")
    parts.append(f"{s} сек.")
    return " ".join(parts)

@router.get("/diagnostics", response_model=SystemDiagnosticsResponse)
def get_diagnostics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_devs = db.query(Device).count()
    online_devs = db.query(Device).filter(Device.status == "ONLINE").count()
    active_alarms = db.query(Notification).filter(Notification.is_resolved == False).count()
    elapsed_uptime = format_uptime(time.time() - START_TIME)
    
    return SystemDiagnosticsResponse(
        version=settings.VERSION,
        database_status="CONNECTED",
        mqtt_broker_status=f"{settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}",
        total_devices=total_devs,
        online_devices=online_devs,
        system_uptime=elapsed_uptime,
        active_alarms=active_alarms
    )

@router.get("/logs/audit", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "OPERATOR", "TECH"]))
):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()

@router.get("/settings")
def get_system_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    settings_records = db.query(Setting).all()
    return {s.key: {"value": s.value, "description": s.description} for s in settings_records}

@router.put("/settings/{key}")
def update_system_setting(
    key: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    val = payload.get("value")
    if val is None:
        raise HTTPException(status_code=400, detail="Параметр value обязателен")
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        setting = Setting(key=key, value=str(val), description=payload.get("description", ""))
        db.add(setting)
    else:
        setting.value = str(val)
        if "description" in payload:
            setting.description = payload["description"]
    db.commit()
    db.refresh(setting)
    return {"key": setting.key, "value": setting.value, "description": setting.description}
