from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Device, User
from app.schemas.schemas import (
    DeviceResponse, DeviceCreate, DeviceCommandRequest, 
    DeviceCommandResponse, FilterResetRequest
)
from app.core.security import get_current_user, require_roles
from app.services.device_service import DeviceService
from app.services.telemetry_service import TelemetryService

router = APIRouter()

@router.get("", response_model=List[DeviceResponse])
def get_devices(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Trigger offline check on fetch to keep state fresh (FR-04)
    TelemetryService.check_offline_devices(db)
    devices = db.query(Device).all()
    return devices

@router.get("/commands/pending", response_model=List[DeviceCommandResponse])
def get_pending_commands(db: Session = Depends(get_db)):
    return DeviceService.get_pending_commands(db)

@router.post("/commands/{command_id}/sent", response_model=DeviceCommandResponse)
def mark_command_sent(command_id: str, db: Session = Depends(get_db)):
    cmd = DeviceService.mark_command_sent(db, command_id)
    if not cmd:
        raise HTTPException(status_code=404, detail="Команда не найдена")
    return cmd

@router.post("/commands/{command_id}/ack", response_model=DeviceCommandResponse)
def process_command_ack(command_id: str, payload: dict = None, db: Session = Depends(get_db)):
    ack_status = payload.get("status", "EXECUTED") if payload else "EXECUTED"
    details = payload.get("details") if payload else None
    cmd = DeviceService.process_command_ack(db, command_id, ack_status, details)
    if not cmd:
        raise HTTPException(status_code=404, detail="Команда не найдена")
    return cmd

@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(device_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Устройство не найдено")
    return device

@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
def create_device(
    device_in: DeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    existing = db.query(Device).filter(Device.id == device_in.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Устройство с таким ID уже зарегистрировано")
        
    device = Device(
        id=device_in.id,
        name=device_in.name,
        model=device_in.model or "Satpayev Air Purifier v1",
        mac_address=device_in.mac_address,
        filter_hours_max=device_in.filter_hours_max or 720.0
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device

@router.post("/{device_id}/command", response_model=DeviceCommandResponse)
def send_device_command(
    device_id: str,
    req: DeviceCommandRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "OPERATOR"]))
):
    return DeviceService.send_command(db, device_id, current_user.email, req)

@router.post("/{device_id}/filter/reset", response_model=DeviceResponse)
def reset_filter(
    device_id: str,
    req: FilterResetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "OPERATOR"]))
):
    return DeviceService.reset_filter(db, device_id, current_user.email, req)
