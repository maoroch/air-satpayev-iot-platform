import csv
import io
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.db.models import Measurement, Device

class ExportService:
    @staticmethod
    def generate_csv(
        db: Session,
        device_id: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None
    ) -> str:
        query = db.query(Measurement).order_by(Measurement.recorded_at.desc())
        
        if device_id:
            query = query.filter(Measurement.device_id == device_id)
        if from_date:
            query = query.filter(Measurement.recorded_at >= from_date)
        if to_date:
            query = query.filter(Measurement.recorded_at <= to_date)
            
        records = query.limit(5000).all()
        
        output = io.StringIO()
        # Write UTF-8 BOM so Excel opens Cyrillic properly
        output.write('\ufeff')
        writer = csv.writer(output, delimiter=';')
        
        # Header (FR-15)
        writer.writerow([
            "ID записи",
            "Идентификатор прибора",
            "Дата и время (UTC)",
            "Тип параметра",
            "Значение",
            "Тестовый режим"
        ])
        
        for r in records:
            writer.writerow([
                r.id,
                r.device_id,
                r.recorded_at.strftime("%Y-%m-%d %H:%M:%S") if r.recorded_at else "",
                "Температура (°C)" if r.sensor_code == "TEMP" else "Влажность (%)" if r.sensor_code == "HUMIDITY" else r.sensor_code,
                f"{r.value:.2f}",
                "Да" if r.is_test else "Нет"
            ])
            
        return output.getvalue()
