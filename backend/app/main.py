from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import asyncio
import json

from app.core.config import settings
from app.api.api import api_router
from app.db.session import engine, Base, SessionLocal
from app.db.models import User, Device, SensorType, Setting
from app.core.security import get_password_hash

# Create tables if not existing
Base.metadata.create_all(bind=engine)

def init_db():
    db = SessionLocal()
    try:
        # 1. Seed Sensor Types
        sensors = [
            ("TEMP", "Температура", "°C", -20.0, 70.0),
            ("HUMIDITY", "Относительная влажность", "%", 0.0, 100.0),
            ("PM25", "Твердые частицы PM2.5", "µg/m³", 0.0, 500.0),
            ("CO2", "Углекислый газ CO2", "ppm", 300.0, 5000.0),
        ]
        for code, name, unit, min_v, max_v in sensors:
            if not db.query(SensorType).filter(SensorType.code == code).first():
                db.add(SensorType(code=code, name=name, unit=unit, min_valid=min_v, max_valid=max_v))

        # 2. Seed Default Users (Admin, Operator, Tech)
        default_users = [
            ("admin@satpayev.kz", "Admin@2026!", "Администратор Системы", "ADMIN"),
            ("operator@satpayev.kz", "Operator@2026!", "Дежурный Оператор", "OPERATOR"),
            ("tech@satpayev.kz", "Tech@2026!", "Инженер-Диагност", "TECH"),
        ]
        for email, pwd, name, role in default_users:
            if not db.query(User).filter(User.email == email).first():
                db.add(User(
                    email=email,
                    hashed_password=get_password_hash(pwd),
                    full_name=name,
                    role=role,
                    is_active=True
                ))

        # 3. Seed Default Device
        default_device_id = "purifier-satpayev-01"
        if not db.query(Device).filter(Device.id == default_device_id).first():
            db.add(Device(
                id=default_device_id,
                name="Очиститель воздуха Сатпаев №1",
                model="Satpayev Compact Air Purifier v1",
                mac_address="24:6F:28:AE:3C:80",
                status="OFFLINE",
                last_temperature=22.5,
                last_humidity=45.0,
                fan_active=True,
                filter_life_percent=94.5,
                filter_hours_used=39.6,
                filter_hours_max=720.0
            ))

        db.commit()
    finally:
        db.close()

init_db()

app = FastAPI(
    title="Цифровая система мониторинга и управления устройством очистки воздуха",
    description="Backend API для сбора телеметрии, расчета ресурса фильтра и управления прибором (КазНИТУ им. Сатпаева)",
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

# WebSocket connection manager for live dashboard updates
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

ws_manager = ConnectionManager()

@app.websocket("/api/v1/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keepalive / ping-pong
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

@app.get("/")
def root():
    return {
        "project": "Satpayev University Air Purifier Monitoring System",
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_STR}/docs",
        "status": "OPERATIONAL"
    }
