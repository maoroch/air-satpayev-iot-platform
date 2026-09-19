from fastapi import APIRouter, Depends, HTTPException, Query, Response
from typing import Optional, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Measurement, Device, User
from app.schemas.schemas import (
    TelemetryPayload, DeviceResponse, MeasurementHistoryResponse, MeasurementPoint
)
from app.core.security import get_current_user
from app.services.telemetry_service import TelemetryService
from app.services.export_service import ExportService

router = APIRouter()

@router.post("/ingest", response_model=DeviceResponse)
async def ingest_telemetry(payload: TelemetryPayload, db: Session = Depends(get_db)):
    """
    HTTP Ingestion endpoint (acts as alternative or bridge to MQTT for hardware / simulator).
    """
    device = TelemetryService.process_telemetry(db, payload)
    
    # Broadcast to active WebSocket dashboard listeners
    try:
        from app.main import ws_manager
        import json
        msg = json.dumps({
            "type": "TELEMETRY",
            "device_id": device.id,
            "status": device.status,
            "temperature": device.last_temperature,
            "humidity": device.last_humidity,
            "fan_active": device.fan_active,
            "filter_life_percent": device.filter_life_percent,
            "filter_hours_used": device.filter_hours_used,
            "filter_hours_max": device.filter_hours_max,
            "last_seen": device.last_seen.isoformat() if device.last_seen else None
        })
        await ws_manager.broadcast(msg)
    except Exception:
        pass

    return device

@router.get("/history", response_model=MeasurementHistoryResponse)
def get_telemetry_history(
    device_id: str = Query(..., description="ID устройства"),
    from_date: Optional[datetime] = Query(None, description="Начало периода (ISO)"),
    to_date: Optional[datetime] = Query(None, description="Конец периода (ISO)"),
    limit: int = Query(500, le=2000, description="Максимальное количество точек"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Measurement).filter(Measurement.device_id == device_id)
    if from_date:
        query = query.filter(Measurement.recorded_at >= from_date)
    if to_date:
        query = query.filter(Measurement.recorded_at <= to_date)
        
    records = query.order_by(Measurement.recorded_at.desc()).limit(limit).all()
    records = list(reversed(records))
    
    # Group by timestamp (to pair temp & humidity with true fan_status)
    points_dict = {}
    for r in records:
        ts = r.recorded_at
        fan_state = bool(getattr(r, "fan_status", True))
        if ts not in points_dict:
            points_dict[ts] = {"recorded_at": ts, "temperature": None, "humidity": None, "fan_active": fan_state}
        else:
            points_dict[ts]["fan_active"] = fan_state

        if r.sensor_code == "TEMP":
            points_dict[ts]["temperature"] = r.value
        elif r.sensor_code == "HUMIDITY":
            points_dict[ts]["humidity"] = r.value

    points = [MeasurementPoint(**p) for p in points_dict.values()]
    return MeasurementHistoryResponse(
        device_id=device_id,
        total_records=len(points),
        data=points
    )

@router.get("/export")
def export_telemetry_csv(
    device_id: Optional[str] = Query(None, description="ID устройства"),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    csv_content = ExportService.generate_csv(db, device_id, from_date, to_date)
    filename = f"telemetry_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
