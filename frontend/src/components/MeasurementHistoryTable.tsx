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
  const rows = useMemo(() => [...history].reverse(), [history]);

  return (
    <section className="rounded-2xl bg-white p-5 sm:p-7 xl:p-8 border border-black/5 shadow-sm mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-base sm:text-lg xl:text-xl font-semibold text-gray-900 tracking-tight">
            Журнал телеметрических замеров
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Реальные измерения из базы данных PostgreSQL. Статус вентилятора фиксируется в каждом цикле опроса.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar -mx-4 sm:mx-0">
        <table className="w-full text-left text-sm border-collapse min-w-[540px]">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-gray-400">
              <th className="py-3.5 px-4 sm:px-6">Время</th>
              <th className="py-3.5 px-4 sm:px-6">Температура</th>
              <th className="py-3.5 px-4 sm:px-6">Влажность</th>
              <th className="py-3.5 px-4 sm:px-6">Вентилятор</th>
              <th className="py-3.5 px-4 sm:px-6">Канал передачи</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length > 0 ? (
              rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3.5 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-medium text-gray-600">
                    {formatDateWithTime(row.recorded_at)}
                  </td>
                  <td className="py-3.5 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold text-gray-900">
                    {row.temperature !== null ? `${row.temperature.toFixed(1)} °C` : "--"}
                  </td>
                  <td className="py-3.5 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold text-gray-900">
                    {row.humidity !== null ? `${row.humidity.toFixed(1)} %` : "--"}
                  </td>
                  <td className="py-3.5 sm:py-4 px-4 sm:px-6">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${row.fan_active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                          : "bg-gray-100 text-gray-600 border-gray-200/60"
                        }`}
                    >
                      {row.fan_active ? "Работает" : "Остановлен"}
                    </span>
                  </td>
                  <td className="py-3.5 sm:py-4 px-4 sm:px-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono text-gray-500 bg-gray-50 border border-gray-200/60">
                      MQTT / SHT31
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-gray-400">
                  Замеров пока нет. Ожидание пакетов телеметрии от брокера Mosquitto...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
