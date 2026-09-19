"use client";

import React, { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { formatDateWithTime } from "../utils/date";

export interface HistoryPoint {
  recorded_at: string;
  temperature: number | null;
  humidity: number | null;
  fan_active: boolean;
}

interface MeasurementHistoryTableProps {
  history: HistoryPoint[];
  onRefresh: () => void;
}

export default function MeasurementHistoryTable({
  history,
  onRefresh
}: MeasurementHistoryTableProps) {
  // Table rows in reverse order (newest first)
  const rows = useMemo(() => [...history].reverse(), [history]);

  return (
    <section className="apple-card" style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, letterSpacing: "-0.015em" }}>
            Журнал телеметрических замеров
          </h2>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: 2 }}>
            Реальные измерения из базы данных PostgreSQL. Статус вентилятора фиксируется в каждом цикле опроса.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="btn btn-outline"
          style={{ fontSize: "0.75rem", padding: "6px 12px" }}
        >
          <RefreshCw size={14} /> Обновить
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-divider)", color: "var(--text-muted)" }}>
              <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Время</th>
              <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Температура</th>
              <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Влажность</th>
              <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Вентилятор</th>
              <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Канал передачи</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid var(--border-divider)" }}>
                  <td style={{ padding: "14px 16px", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                    {formatDateWithTime(row.recorded_at)}
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--accent-blue)", fontWeight: 600 }}>
                    {row.temperature !== null ? `${row.temperature.toFixed(1)} °C` : "—"}
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--accent-teal)", fontWeight: 600 }}>
                    {row.humidity !== null ? `${row.humidity.toFixed(1)} %` : "—"}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span className={`badge ${row.fan_active ? "badge-online" : "badge-neutral"}`}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: row.fan_active ? "var(--accent-green)" : "#8e8e93"
                        }}
                      />
                      {row.fan_active ? "Включен" : "Остановлен"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--text-muted)" }}>MQTT (QoS 0)</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)" }}>
                  Замеры пока отсутствуют в базе данных. Ожидание телеметрии...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
