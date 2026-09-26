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

@router.put("/settings")
def update_system_settings_batch(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    data = payload.get("settings", payload)
    if not isinstance(data, dict) or not data:
        raise HTTPException(status_code=400, detail="Не переданы параметры для обновления")

    existing_records = {s.key: s for s in db.query(Setting).all()}
    
    hum_min_val = None
    hum_max_val = None

    if "ALERT_HUMIDITY_MIN" in data:
        raw_min = str(data["ALERT_HUMIDITY_MIN"]).strip()
        try:
            hum_min_val = float(raw_min)
            if hum_min_val < 0 or hum_min_val > 100:
                raise HTTPException(status_code=400, detail="Минимальная влажность должна быть от 0% до 100%")
        except ValueError:
            raise HTTPException(status_code=400, detail="Минимальная влажность должна быть числом")
    elif "ALERT_HUMIDITY_MIN" in existing_records:
        try:
            hum_min_val = float(existing_records["ALERT_HUMIDITY_MIN"].value)
        except ValueError:
            pass

    if "ALERT_HUMIDITY_MAX" in data:
        raw_max = str(data["ALERT_HUMIDITY_MAX"]).strip()
        try:
            hum_max_val = float(raw_max)
            if hum_max_val < 0 or hum_max_val > 100:
                raise HTTPException(status_code=400, detail="Максимальная влажность должна быть от 0% до 100%")
        except ValueError:
            raise HTTPException(status_code=400, detail="Максимальная влажность должна быть числом")
    elif "ALERT_HUMIDITY_MAX" in existing_records:
        try:
            hum_max_val = float(existing_records["ALERT_HUMIDITY_MAX"].value)
        except ValueError:
            pass

    if hum_min_val is not None and hum_max_val is not None:
        if hum_min_val >= hum_max_val:
            raise HTTPException(
                status_code=400,
                detail=f"Минимальная влажность ({hum_min_val}%) не может быть больше или равна максимальной ({hum_max_val}%)"
            )

    updated_keys = []
    for key, val in data.items():
        val_str = str(val).strip()
        if key == "ALERT_TEMP_HIGH_C":
            try:
                num = float(val_str)
                if num < 10 or num > 60:
                    raise HTTPException(status_code=400, detail="Порог температуры должен быть в диапазоне от 10 до 60 °C")
            except ValueError:
                raise HTTPException(status_code=400, detail="Порог температуры должен быть числом")

        elif key == "ALERT_FILTER_WARN_PERCENT":
            try:
                num = float(val_str)
                if num < 1 or num > 99:
                    raise HTTPException(status_code=400, detail="Порог ресурса фильтра должен быть от 1% до 99%")
            except ValueError:
                raise HTTPException(status_code=400, detail="Порог ресурса фильтра должен быть числом")

        elif key == "DEVICE_OFFLINE_TIMEOUT_SEC":
            try:
                num = int(val_str)
                if num < 5 or num > 3600:
                    raise HTTPException(status_code=400, detail="Таймаут связи должен быть от 5 до 3600 секунд")
            except ValueError:
                raise HTTPException(status_code=400, detail="Таймаут должен быть целым числом секунд")

        setting = existing_records.get(key)
        if not setting:
            setting = Setting(key=key, value=val_str, description="")
            db.add(setting)
        else:
            setting.value = val_str
        updated_keys.append(f"{key}={val_str}")

    db.add(AuditLog(
        user_email=current_user.email,
        action="UPDATE_SETTINGS",
        details=f"Обновлены параметры: {', '.join(updated_keys)}"
    ))

    db.commit()
    all_settings = db.query(Setting).all()
    return {s.key: {"value": s.value, "description": s.description} for s in all_settings}


@router.put("/settings/{key}")
def update_system_setting(
    key: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    val = payload.get("value")
    if val is None or str(val).strip() == "":
        raise HTTPException(status_code=400, detail="Параметр value обязателен")
    
    val_str = str(val).strip()

    # Validation rules for specific settings
    if key == "ALERT_TEMP_HIGH_C":
        try:
            num = float(val_str)
            if num < 10 or num > 60:
                raise HTTPException(status_code=400, detail="Порог температуры должен быть в диапазоне от 10 до 60 °C")
        except ValueError:
            raise HTTPException(status_code=400, detail="Порог температуры должен быть числом")

    elif key == "ALERT_HUMIDITY_MIN":
        try:
            num = float(val_str)
            if num < 0 or num > 100:
                raise HTTPException(status_code=400, detail="Минимальная влажность должна быть от 0% до 100%")
            # Cross-validation with ALERT_HUMIDITY_MAX
            max_setting = db.query(Setting).filter(Setting.key == "ALERT_HUMIDITY_MAX").first()
            if max_setting:
                try:
                    max_num = float(max_setting.value)
                    if num >= max_num:
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Минимальная влажность ({num}%) не может быть больше или равна максимальной ({max_num}%)"
                        )
                except ValueError:
                    pass
        except ValueError:
            raise HTTPException(status_code=400, detail="Минимальная влажность должна быть числом")

    elif key == "ALERT_HUMIDITY_MAX":
        try:
            num = float(val_str)
            if num < 0 or num > 100:
                raise HTTPException(status_code=400, detail="Максимальная влажность должна быть от 0% до 100%")
            # Cross-validation with ALERT_HUMIDITY_MIN
            min_setting = db.query(Setting).filter(Setting.key == "ALERT_HUMIDITY_MIN").first()
            if min_setting:
                try:
                    min_num = float(min_setting.value)
                    if num <= min_num:
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Максимальная влажность ({num}%) не может быть меньше или равна минимальной ({min_num}%)"
                        )
                except ValueError:
                    pass
        except ValueError:
            raise HTTPException(status_code=400, detail="Максимальная влажность должна быть числом")

    elif key == "ALERT_FILTER_WARN_PERCENT":
        try:
            num = float(val_str)
            if num < 1 or num > 99:
                raise HTTPException(status_code=400, detail="Порог ресурса фильтра должен быть от 1% до 99%")
        except ValueError:
            raise HTTPException(status_code=400, detail="Порог ресурса фильтра должен быть числом")

    elif key == "DEVICE_OFFLINE_TIMEOUT_SEC":
        try:
            num = int(val_str)
            if num < 5 or num > 3600:
                raise HTTPException(status_code=400, detail="Таймаут связи должен быть от 5 до 3600 секунд")
        except ValueError:
            raise HTTPException(status_code=400, detail="Таймаут должен быть целым числом секунд")

    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        setting = Setting(key=key, value=val_str, description=payload.get("description", ""))
        db.add(setting)
    else:
        setting.value = val_str
        if "description" in payload:
            setting.description = payload["description"]
    
    # Audit log entry
    db.add(AuditLog(
        user_email=current_user.email,
        action="UPDATE_SETTING",
        details=f"Изменен параметр {key}: {val_str}"
    ))

    db.commit()
    db.refresh(setting)
    return {"key": setting.key, "value": setting.value, "description": setting.description}

