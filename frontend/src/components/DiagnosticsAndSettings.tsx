"use client";

import React from "react";
import { Cpu, Server, Sliders, Save, CheckCircle2 } from "lucide-react";

export interface DiagnosticsData {
  version: string;
  database_status: string;
  mqtt_broker_status: string;
  total_devices: number;
  online_devices: number;
  system_uptime: string;
  active_alarms: number;
}

export interface SettingDetail {
  value: string;
  description: string;
}

export interface DeviceData {
  id: string;
  name: string;
  model: string;
  mac_address: string | null;
  status: string;
  last_temperature: number | null;
  last_humidity: number | null;
  fan_active: boolean;
  filter_life_percent: number;
  filter_hours_used: number;
  filter_hours_max: number;
  last_seen: string | null;
}

interface DiagnosticsAndSettingsProps {
  device: DeviceData;
  diagnostics: DiagnosticsData | null;
  settingsMap: Record<string, SettingDetail>;
  editingSettings: Record<string, string>;
  onEditingSettingsChange: (newSettings: Record<string, string>) => void;
  activeRole: "ADMIN" | "OPERATOR" | "TECH";
  onSaveSetting: (key: string) => Promise<void>;
  isSavingSettings: boolean;
}

export default function DiagnosticsAndSettings({
  device,
  diagnostics,
  settingsMap,
  editingSettings,
  onEditingSettingsChange,
  activeRole,
  onSaveSetting,
  isSavingSettings
}: DiagnosticsAndSettingsProps) {
  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-in fade-in duration-300">
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5 xl:gap-6">
        {/* Box 1: Hardware Specs */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 xl:p-8 border border-black/5 shadow-sm">
          <h3 className="text-base sm:text-lg xl:text-xl font-semibold mb-5 flex items-center gap-3 text-gray-900">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Cpu size={20} strokeWidth={2.2} />
            </div>
            <span>Аппаратная спецификация</span>
          </h3>
          <div className="flex flex-col gap-3.5 text-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <span className="text-gray-500">Идентификатор прибора</span>
              <span className="font-mono font-medium text-gray-900 bg-gray-100/80 px-2 py-0.5 rounded text-xs">{device.id}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <span className="text-gray-500">Микроконтроллер</span>
              <span className="font-medium text-gray-900">ESP32-WROOM-32 (240 МГц)</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <span className="text-gray-500">MAC-адрес</span>
              <span className="font-mono font-medium text-gray-900 bg-gray-100/80 px-2 py-0.5 rounded text-xs">{device.mac_address || "24:6F:28:AE:3C:80"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <span className="text-gray-500">Шина сенсоров</span>
              <span className="font-medium text-gray-900">I2C (SDA: GPIO21, SCL: GPIO22)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Сторожевой таймер (WDT)</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <CheckCircle2 size={12} />
                Активен (10 с)
              </span>
            </div>
          </div>
        </div>

        {/* Box 2: Server Services */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 xl:p-8 border border-black/5 shadow-sm">
          <h3 className="text-base sm:text-lg xl:text-xl font-semibold mb-5 flex items-center gap-3 text-gray-900">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Server size={20} strokeWidth={2.2} />
            </div>
            <span>Сервисы серверной платформы</span>
          </h3>
          <div className="flex flex-col gap-3.5 text-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <span className="text-gray-500">Core Backend (FastAPI)</span>
              <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded text-xs">
                {diagnostics ? `Версия ${diagnostics.version} (:8000)` : "Работает :8000"}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <span className="text-gray-500">Аптайм сервера</span>
              <span className="text-blue-600 font-semibold">
                {diagnostics?.system_uptime || "Синхронизация..."}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <span className="text-gray-500">MQTT Брокер (Mosquitto)</span>
              <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded text-xs">
                {diagnostics?.mqtt_broker_status || "mosquitto:1883"}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <span className="text-gray-500">База данных (PostgreSQL)</span>
              <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded text-xs">
                {diagnostics?.database_status || "CONNECTED"} (:5432)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Устройств онлайн</span>
              <span className="text-gray-900 font-semibold">
                {diagnostics?.online_devices ?? 1} из {diagnostics?.total_devices ?? 1}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Box 3: System Thresholds and Settings (CRUD) */}
      <section className="bg-white rounded-2xl p-5 sm:p-7 xl:p-8 border border-black/5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base sm:text-lg xl:text-xl font-semibold flex items-center gap-3 text-gray-900">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Sliders size={20} strokeWidth={2.2} />
              </div>
              <span>Системные пороги тревог и параметры</span>
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Динамические настройки хранятся в PostgreSQL. Изменение доступно для роли «Администратор».
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(settingsMap).map(([key, setting]) => (
            <div
              key={key}
              className="p-4 bg-gray-50/80 hover:bg-gray-100/70 rounded-xl border border-gray-200/70 flex flex-col justify-between gap-3 transition-colors"
            >
              <div>
                <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                  {key}
                </span>
                <p className="text-xs text-gray-500 mt-1.5">
                  {setting.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeRole === "ADMIN" ? (
                  <>
                    <input
                      type="text"
                      value={editingSettings[key] ?? setting.value}
                      onChange={(e) =>
                        onEditingSettingsChange({
                          ...editingSettings,
                          [key]: e.target.value
                        })
                      }
                      className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                    />
                    <button
                      onClick={() => onSaveSetting(key)}
                      disabled={isSavingSettings}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center shadow-xs cursor-pointer"
                      title="Сохранить настройку"
                    >
                      <Save size={13} />
                    </button>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-gray-900 bg-white px-2.5 py-1 rounded-lg border border-gray-200/70">
                    {setting.value}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
