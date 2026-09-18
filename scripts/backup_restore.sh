#!/usr/bin/env bash
# ==============================================================================
# Скрипт резервного копирования и восстановления базы данных (FR-17, AT-13)
# Проект: Цифровая система мониторинга очистителя воздуха (КазНИТУ им. Сатпаева)
# ==============================================================================

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_CONTAINER="purifier-postgres"
DB_NAME="purifier_db"
DB_USER="postgres"

mkdir -p "$BACKUP_DIR"

function show_help() {
    echo "Использование: $0 {backup|restore <файл_дампа>}"
    echo ""
    echo "Команды:"
    echo "  backup                  Создать полный дамп базы данных PostgreSQL"
    echo "  restore <путь_к_дампу>  Восстановить базу данных из указанного дампа"
}

function backup_db() {
    BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${TIMESTAMP}.sql"
    echo "[INFO] Запуск создания резервной копии базы данных..."
    
    if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"
        echo "[SUCCESS] Дамп успешно создан в контейнере: $BACKUP_FILE"
    else
        echo "[WARN] Контейнер Docker не найден. Попытка локального pg_dump или SQLite..."
        if [ -f "./backend/purifier.db" ]; then
            cp "./backend/purifier.db" "${BACKUP_DIR}/backup_sqlite_${TIMESTAMP}.db"
            echo "[SUCCESS] Резервная копия SQLite создана: ${BACKUP_DIR}/backup_sqlite_${TIMESTAMP}.db"
        else
            echo "[ERROR] Не удалось обнаружить работающую СУБД для бэкапа."
            exit 1
        fi
    fi
}

function restore_db() {
    TARGET_FILE="$1"
    if [ -z "$TARGET_FILE" ] || [ ! -f "$TARGET_FILE" ]; then
        echo "[ERROR] Файл дампа '$TARGET_FILE' не найден!"
        exit 1
    fi

    echo "[INFO] Восстановление базы данных из '$TARGET_FILE'..."
    if [[ "$TARGET_FILE" == *.sql ]]; then
        docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$TARGET_FILE"
        echo "[SUCCESS] База данных PostgreSQL успешно восстановлена!"
    elif [[ "$TARGET_FILE" == *.db ]]; then
        cp "$TARGET_FILE" "./backend/purifier.db"
        echo "[SUCCESS] База данных SQLite успешно восстановлена!"
    fi
}

case "$1" in
    backup)
        backup_db
        ;;
    restore)
        restore_db "$2"
        ;;
    *)
        show_help
        ;;
esac
