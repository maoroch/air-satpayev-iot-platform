import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, Float, Integer, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(String(20), default="OPERATOR", nullable=False)  # ADMIN, OPERATOR, TECH
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

class Device(Base):
    __tablename__ = "devices"
    
    id = Column(String(64), primary_key=True, index=True)  # e.g. "purifier-satpayev-01"
    name = Column(String(120), nullable=False)
    model = Column(String(64), default="Satpayev Air Purifier v1")
    mac_address = Column(String(32), nullable=True)
    status = Column(String(20), default="OFFLINE")  # ONLINE, OFFLINE
    last_temperature = Column(Float, nullable=True)
    last_humidity = Column(Float, nullable=True)
    fan_active = Column(Boolean, default=False)
    filter_life_percent = Column(Float, default=100.0)
    filter_hours_used = Column(Float, default=0.0)
    filter_hours_max = Column(Float, default=720.0)
    last_seen = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    measurements = relationship("Measurement", back_populates="device", cascade="all, delete-orphan")
    filter_cycles = relationship("FilterCycle", back_populates="device", cascade="all, delete-orphan")
    commands = relationship("DeviceCommand", back_populates="device", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="device", cascade="all, delete-orphan")

class SensorType(Base):
    __tablename__ = "sensor_types"
    
    code = Column(String(20), primary_key=True)  # TEMP, HUMIDITY, PM25, CO2
    name = Column(String(60), nullable=False)
    unit = Column(String(20), nullable=False)  # °C, %, µg/m³
    min_valid = Column(Float, nullable=False)
    max_valid = Column(Float, nullable=False)

class Measurement(Base):
    __tablename__ = "measurements"
    
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    device_id = Column(String(64), ForeignKey("devices.id"), index=True, nullable=False)
    sensor_code = Column(String(20), ForeignKey("sensor_types.code"), index=True, nullable=False)
    value = Column(Float, nullable=False)
    fan_status = Column(Boolean, default=True, nullable=False)
    is_test = Column(Boolean, default=False)
    recorded_at = Column(DateTime, default=utc_now, index=True)

    device = relationship("Device", back_populates="measurements")
    sensor = relationship("SensorType")

class FilterCycle(Base):
    __tablename__ = "filter_cycles"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String(64), ForeignKey("devices.id"), index=True, nullable=False)
    cycle_start = Column(DateTime, default=utc_now)
    cycle_end = Column(DateTime, nullable=True)
    total_hours_worked = Column(Float, default=0.0)
    replaced_by = Column(String(120), nullable=True)
    comment = Column(Text, nullable=True)

    device = relationship("Device", back_populates="filter_cycles")

class DeviceCommand(Base):
    __tablename__ = "commands"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String(64), ForeignKey("devices.id"), index=True, nullable=False)
    command = Column(String(50), nullable=False)  # SET_FAN, RESET_FILTER, REBOOT
    payload = Column(Text, nullable=True)  # JSON formatted payload
    status = Column(String(20), default="PENDING")  # PENDING, EXECUTED, FAILED, TIMEOUT
    created_at = Column(DateTime, default=utc_now)
    executed_at = Column(DateTime, nullable=True)

    device = relationship("Device", back_populates="commands")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String(64), ForeignKey("devices.id"), index=True, nullable=False)
    type = Column(String(50), nullable=False)  # OFFLINE, FILTER_WARN, FILTER_CRITICAL, SENSOR_FAULT
    severity = Column(String(20), default="INFO")  # INFO, WARNING, CRITICAL
    title = Column(String(120), nullable=False)
    message = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)
    resolved_at = Column(DateTime, nullable=True)

    device = relationship("Device", back_populates="notifications")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_email = Column(String(120), nullable=False)
    action = Column(String(60), nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=utc_now)

class Setting(Base):
    __tablename__ = "settings"
    
    key = Column(String(50), primary_key=True)
    value = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
