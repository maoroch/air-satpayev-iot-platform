from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Device, Notification, AuditLog, User
from app.schemas.schemas import AuditLogResponse, SystemDiagnosticsResponse
from app.core.security import get_current_user, require_roles
from app.core.config import settings

router = APIRouter()

@router.get("/diagnostics", response_model=SystemDiagnosticsResponse)
def get_diagnostics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_devs = db.query(Device).count()
    online_devs = db.query(Device).filter(Device.status == "ONLINE").count()
    active_alarms = db.query(Notification).filter(Notification.is_resolved == False).count()
    
    return SystemDiagnosticsResponse(
        version=settings.VERSION,
        database_status="CONNECTED",
        mqtt_broker_status=f"{settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}",
        total_devices=total_devs,
        online_devices=online_devs,
        system_uptime="Operational 24/7",
        active_alarms=active_alarms
    )

@router.get("/logs/audit", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "TECH"]))
):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
