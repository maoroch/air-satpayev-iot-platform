# Инструкция по развертыванию и установке системы

**Проект**: Цифровая система мониторинга и управления устройством очистки воздуха  
**Заказчик**: НАО «Казахский национальный исследовательский технический университет имени К.И. Сатпаева»  
**Версия**: 1.0.0 (2026 г.)

---

## 1. Системные требования к серверу
* **ОС**: Linux (Ubuntu 22.04 LTS / Debian 12 / RHEL 9) или macOS / Windows с WSL2;
* **Процессор**: 2 ядра и выше;
* **Оперативная память**: от 4 ГБ RAM;
* **Дисковое пространство**: не менее 20 ГБ свободного места;
* **Установленное ПО**: Docker (24.x+) и Docker Compose (v2.x+) ИЛИ кластер Kubernetes (k3s / minikube).

---

## 2. Вариант А: Быстрый запуск через Docker Compose (Рекомендуемый для локального сервера)

Все микросервисы (PostgreSQL, Redis, Mosquitto, Backend FastAPI, Ingestion Adapter, Frontend Next.js, Simulator) поднимаются **одной командой**:

```bash
# 1. Перейдите в корень проекта
cd /Applications/projects/wind_satpayev

# 2. Запустите все микросервисы в фоновом режиме
docker compose up -d --build

# 3. Проверьте статус запущенных контейнеров
docker compose ps
```

### Доступ к сервисам:
* **Веб-интерфейс**: `http://localhost:3000`
* **Интерактивная документация Swagger API**: `http://localhost:8000/api/v1/docs`
* **MQTT Брокер телеметрии**: `localhost:1883`

---

## 3. Вариант Б: Промышленное развертывание в Kubernetes (K3s / Minikube)

```bash
# 1. Создание пространства имен
kubectl apply -f k8s/00-namespace.yaml

# 2. Применение конфигураций и секретов
kubectl apply -f k8s/01-configmap-secrets.yaml

# 3. Развертывание хранилищ (PostgreSQL, Redis)
kubectl apply -f k8s/02-postgres.yaml
kubectl apply -f k8s/03-redis.yaml

# 4. Развертывание брокера Mosquitto и бэкенда
kubectl apply -f k8s/04-mosquitto.yaml
kubectl apply -f k8s/05-backend.yaml
kubectl apply -f k8s/06-device-adapter.yaml

# 5. Развертывание фронтенда и маршрутизации Ingress
kubectl apply -f k8s/07-frontend.yaml
kubectl apply -f k8s/08-ingress.yaml

# 6. Проверка статуса подов
kubectl get pods -n wind-satpayev
```

---

## 4. Локальный запуск без контейнеров (для разработки)

### Бэкенд:
```bash
source .venv/bin/activate
uvicorn app.main:app --app-dir backend --reload --port 8000
```

### Фронтенд:
```bash
cd frontend
npm run dev
```

### Запуск симулятора прибора:
```bash
source .venv/bin/activate
python simulator/device_simulator.py
```
