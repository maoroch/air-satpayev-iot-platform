from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    email: str
    full_name: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "OPERATOR"  # ADMIN, OPERATOR, TECH

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Telemetry Schemas (FR-05, FR-06, FR-10.1)
class TelemetryPayload(BaseModel):
    device_id: str = Field(..., json_schema_extra={"example": "purifier-satpayev-01"})
    timestamp: Optional[datetime] = None
    temperature: Optional[float] = Field(None, ge=-20.0, le=70.0, json_schema_extra={"example": 23.5})
    humidity: Optional[float] = Field(None, ge=0.0, le=100.0, json_schema_extra={"example": 48.2})
    fan_status: Optional[bool] = Field(True, json_schema_extra={"example": True})
    filter_hours: Optional[float] = Field(None, ge=0.0, json_schema_extra={"example": 120.5})
    device_status: Optional[str] = Field("ONLINE", json_schema_extra={"example": "ONLINE"})
    additional: Optional[Dict[str, Any]] = Field(default_factory=dict)
    is_test: Optional[bool] = False

# Device Schemas
class DeviceCreate(BaseModel):
    id: str
    name: str
    model: Optional[str] = "Satpayev Air Purifier v1"
    mac_address: Optional[str] = None
    filter_hours_max: Optional[float] = 720.0

class DeviceResponse(BaseModel):
    id: str
    name: str
    model: str
    mac_address: Optional[str]
    status: str
    last_temperature: Optional[float]
    last_humidity: Optional[float]
    fan_active: bool
    filter_life_percent: float
    filter_hours_used: float
    filter_hours_max: float
    last_seen: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Command Schemas
class DeviceCommandRequest(BaseModel):
    command: str = Field(..., json_schema_extra={"example": "SET_FAN"})  # SET_FAN, RESET_FILTER, REBOOT
    payload: Optional[Dict[str, Any]] = Field(default_factory=dict, json_schema_extra={"example": {"enabled": True}})

class DeviceCommandResponse(BaseModel):
    id: str
    device_id: str
    command: str
    payload: Optional[str] = None
    status: str
    created_at: datetime
    executed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

# Filter Lifecycle
class FilterResetRequest(BaseModel):
    comment: Optional[str] = "Плановая замена HEPA фильтра"

class FilterCycleResponse(BaseModel):
    id: str
    device_id: str
    cycle_start: datetime
    cycle_end: Optional[datetime]
    total_hours_worked: float
    replaced_by: Optional[str]
    comment: Optional[str]

    model_config = ConfigDict(from_attributes=True)

# Notification Schemas
class NotificationResponse(BaseModel):
    id: str
    device_id: str
    type: str
    severity: str
    title: str
    message: str
    is_resolved: bool
    created_at: datetime
    resolved_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

# History & Export Schemas
class MeasurementPoint(BaseModel):
    recorded_at: datetime
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    fan_active: Optional[bool] = True

class MeasurementHistoryResponse(BaseModel):
    device_id: str
    total_records: int
    data: List[MeasurementPoint]

# Diagnostics & Audit
class AuditLogResponse(BaseModel):
    id: int
    user_email: str
    action: str
    details: Optional[str]
    ip_address: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SystemDiagnosticsResponse(BaseModel):
    version: str
    database_status: str
    mqtt_broker_status: str
    total_devices: int
    online_devices: int
    system_uptime: str
    active_alarms: int
