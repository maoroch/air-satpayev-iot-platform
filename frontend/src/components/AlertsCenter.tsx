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
    <section className="rounded-2xl bg-white p-4 sm:p-7 border border-black/5 shadow-sm mb-6 sm:mb-8">
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight mb-4">
        Центр уведомлений и предупреждений
      </h2>
      <div className="flex flex-col gap-3">
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl gap-3 transition-colors border ${
                notif.is_resolved
                  ? "bg-gray-50/50 border-gray-100"
                  : "bg-red-50/50 border-red-200/60"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  notif.is_resolved ? "bg-gray-100 text-gray-400" : "bg-red-100/70 text-red-600"
                }`}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <div className={`text-sm font-semibold ${
                    notif.is_resolved ? "text-gray-400" : "text-gray-900"
                  }`}>
                    {notif.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {notif.message} • {formatDateWithTime(notif.created_at)}
                  </div>
                </div>
              </div>
              {!notif.is_resolved && (
                <button
                  onClick={() => onResolveAlert(notif.id)}
                  className="self-end sm:self-center px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  Подтвердить
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="py-12 px-4 text-center text-gray-400 text-sm">
            <CheckCircle2 size={26} className="mx-auto mb-2 text-emerald-500" />
            <p>Активных предупреждений нет. Система работает в штатном режиме.</p>
          </div>
        )}
      </div>
    </section>
  );
}
