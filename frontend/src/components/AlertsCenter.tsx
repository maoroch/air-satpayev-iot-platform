"use client";

import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatDateWithTime } from "../utils/date";

export interface NotificationItem {
  id: string;
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  is_resolved: boolean;
  created_at: string;
}

interface AlertsCenterProps {
  notifications: NotificationItem[];
  onResolveAlert: (id: string) => void;
}

export default function AlertsCenter({
  notifications,
  onResolveAlert
}: AlertsCenterProps) {
  return (
    <section className="apple-card" style={{ padding: "24px 28px" }}>
      <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: 18, letterSpacing: "-0.015em" }}>
        Центр уведомлений и предупреждений
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <div
              key={notif.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderRadius: "var(--radius-sm)",
                background: notif.is_resolved ? "rgba(0, 0, 0, 0.02)" : "rgba(255, 59, 48, 0.06)",
                border: `1px solid ${notif.is_resolved ? "var(--border-divider)" : "rgba(255, 59, 48, 0.15)"}`
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <AlertTriangle size={22} color={notif.is_resolved ? "var(--text-muted)" : "var(--accent-red)"} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: notif.is_resolved ? "var(--text-muted)" : "var(--text-primary)" }}>
                    {notif.title}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: 2 }}>
                    {notif.message} • {formatDateWithTime(notif.created_at)}
                  </div>
                </div>
              </div>
              {!notif.is_resolved && (
                <button
                  onClick={() => onResolveAlert(notif.id)}
                  className="btn btn-outline"
                  style={{ fontSize: "0.75rem", padding: "6px 12px" }}
                >
                  Подтвердить
                </button>
              )}
            </div>
          ))
        ) : (
          <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            <CheckCircle2 size={24} color="var(--accent-green)" style={{ margin: "0 auto 10px auto" }} />
            <p>Все параметры в норме. Активных предупреждений нет.</p>
          </div>
        )}
      </div>
    </section>
  );
}
