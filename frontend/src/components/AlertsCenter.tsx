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
    <section className="rounded-2xl bg-white p-5 sm:p-7 xl:p-8 border border-black/5 shadow-sm mb-6 sm:mb-8">
      <h2 className="text-base sm:text-lg xl:text-xl font-semibold text-gray-900 tracking-tight mb-5">
        Центр уведомлений и предупреждений
      </h2>
      <div className="flex flex-col gap-3.5">
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-5 rounded-xl gap-4 transition-colors border ${
                notif.is_resolved
                  ? "bg-gray-50/50 border-gray-100"
                  : "bg-red-50/50 border-red-200/60"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                  notif.is_resolved ? "bg-gray-100 text-gray-400" : "bg-red-100/70 text-red-600"
                }`}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <div className={`text-sm sm:text-base font-semibold ${
                    notif.is_resolved ? "text-gray-400" : "text-gray-900"
                  }`}>
                    {notif.title}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    {notif.message} • {formatDateWithTime(notif.created_at)}
                  </div>
                </div>
              </div>
              {!notif.is_resolved && (
                <button
                  onClick={() => onResolveAlert(notif.id)}
                  className="self-end sm:self-center px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs sm:text-sm font-medium text-gray-700 shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  Подтвердить
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="py-16 sm:py-24 px-4 text-center text-gray-400 text-sm flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 size={28} strokeWidth={2.2} />
            </div>
            <p className="text-base font-semibold text-gray-800">Активных предупреждений нет</p>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Все узлы системы и сенсоры функционируют в штатном режиме.</p>
          </div>
        )}
      </div>
    </section>
  );
}
