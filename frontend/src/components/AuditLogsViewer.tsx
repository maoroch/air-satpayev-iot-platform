"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { formatDateWithTime } from "../utils/date";

export interface AuditLogItem {
  id: number;
  user_email: string;
  action: string;
  details: string;
  created_at: string;
}

interface AuditLogsViewerProps {
  auditLogs: AuditLogItem[];
  onRefresh: () => void;
}

export default function AuditLogsViewer({
  auditLogs,
  onRefresh
}: AuditLogsViewerProps) {
  return (
    <section className="apple-card" style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, letterSpacing: "-0.015em" }}>
            Журнал аудита действий пользователей (FR-13)
          </h2>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: 2 }}>
            Хронологическая запись всех операций и команд из PostgreSQL.
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

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {auditLogs.length > 0 ? (
          auditLogs.map((log) => (
            <div
              key={log.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-divider)",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.875rem"
              }}
            >
              <div>
                <span style={{ color: "var(--accent-blue)", fontWeight: 600, marginRight: 8, fontSize: "0.8125rem" }}>
                  [{log.action}]
                </span>
                <span style={{ color: "var(--text-primary)" }}>{log.details}</span>
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", whiteSpace: "nowrap", marginLeft: 16 }}>
                {log.user_email} • {formatDateWithTime(log.created_at)}
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Журнал аудита пуст.
          </div>
        )}
      </div>
    </section>
  );
}
