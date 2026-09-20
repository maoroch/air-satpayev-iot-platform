"use client";

import React from "react";
import { RefreshCw, FileText, Clock, User } from "lucide-react";
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
    <section className="bg-white rounded-2xl p-5 sm:p-7 border border-black/5 shadow-sm animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileText size={18} strokeWidth={2.2} />
            </div>
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900">
              Журнал аудита действий пользователей (FR-13)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Неизменяемый журнал операций и команд управления очистителем воздуха из PostgreSQL.
          </p>
        </div>

      </div>

      <div className="flex flex-col gap-2.5">
        {auditLogs.length > 0 ? (
          auditLogs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 sm:px-4 sm:py-3.5 bg-gray-50 hover:bg-gray-100/80 border border-gray-200/60 rounded-xl text-sm transition-colors"
            >
              <div className="flex items-start sm:items-center gap-2.5 flex-wrap sm:flex-nowrap">
                <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-200/70 px-2 py-0.5 rounded-md shrink-0">
                  {log.action}
                </span>
                <span className="text-gray-900 font-medium">{log.details}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400 whitespace-nowrap self-end sm:self-auto shrink-0">
                <span className="inline-flex items-center gap-1 text-gray-500 font-mono">
                  <User size={12} className="text-gray-400" />
                  {log.user_email}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-gray-400">
                  <Clock size={12} />
                  {formatDateWithTime(log.created_at)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-sm text-gray-400">
            <FileText size={32} className="mx-auto text-gray-300 mb-2" />
            <p>Журнал аудита пока пуст.</p>
          </div>
        )}
      </div>
    </section>
  );
}
