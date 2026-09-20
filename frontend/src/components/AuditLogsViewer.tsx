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
    <section className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Журнал аудита действий пользователей (FR-13)
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Хронологическая запись всех операций и команд из PostgreSQL.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 rounded-lg transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={14} /> Обновить
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {auditLogs.length > 0 ? (
          auditLogs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:px-4 sm:py-3 bg-zinc-50 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5 rounded-xl text-sm transition-colors hover:border-black/10 dark:hover:border-white/10"
            >
              <div className="flex items-start sm:items-center gap-2">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                  [{log.action}]
                </span>
                <span className="text-zinc-800 dark:text-zinc-200">{log.details}</span>
              </div>
              <div className="text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap self-end sm:self-auto">
                {log.user_email} • {formatDateWithTime(log.created_at)}
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
            Журнал аудита пуст.
          </div>
        )}
      </div>
    </section>
  );
}
