from fastapi import APIRouter
from app.api.endpoints import auth, devices, telemetry, notifications, system

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Аутентификация"])
api_router.include_router(devices.router, prefix="/devices", tags=["Устройства и Управление"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["Телеметрия и История"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Уведомления"])
api_router.include_router(system.router, prefix="/system", tags=["Диагностика и Аудит"])
