"use client";

import React from "react";
import { Cpu, Server, Sliders, Save } from "lucide-react";

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
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Box 1: Hardware Specs */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <Cpu size={18} className="text-blue-500" /> Аппаратная спецификация
          </h3>
          <div className="flex flex-col gap-3.5 text-sm">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2.5">
              <span className="text-zinc-500 dark:text-zinc-400">Идентификатор прибора</span>
              <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{device.id}</span>
            </div>
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2.5">
              <span className="text-zinc-500 dark:text-zinc-400">Микроконтроллер</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">ESP32-WROOM-32 (240 МГц)</span>
            </div>
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2.5">
              <span className="text-zinc-500 dark:text-zinc-400">MAC-адрес</span>
              <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{device.mac_address || "24:6F:28:AE:3C:80"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2.5">
              <span className="text-zinc-500 dark:text-zinc-400">Шина сенсоров</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">I2C (SDA: GPIO21, SCL: GPIO22)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Сторожевой таймер (WDT)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Активен (10 с)</span>
            </div>
          </div>
        </div>

        {/* Box 2: Server Services */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <Server size={18} className="text-teal-500" /> Сервисы серверной платформы
          </h3>
          <div className="flex flex-col gap-3.5 text-sm">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2.5">
              <span className="text-zinc-500 dark:text-zinc-400">Core Backend (FastAPI)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {diagnostics ? `Версия ${diagnostics.version} (:8000)` : "Работает :8000"}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2.5">
              <span className="text-zinc-500 dark:text-zinc-400">Аптайм сервера</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                {diagnostics?.system_uptime || "Синхронизация..."}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2.5">
              <span className="text-zinc-500 dark:text-zinc-400">MQTT Брокер (Mosquitto)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {diagnostics?.mqtt_broker_status || "mosquitto:1883"}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2.5">
              <span className="text-zinc-500 dark:text-zinc-400">База данных (PostgreSQL)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {diagnostics?.database_status || "CONNECTED"} (:5432)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Устройств онлайн</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
                {diagnostics?.online_devices ?? 1} из {diagnostics?.total_devices ?? 1}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Box 3: System Thresholds and Settings (CRUD) */}
      <section className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <Sliders size={18} className="text-blue-500" /> Системные пороги тревог и параметры
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Динамические настройки хранятся в PostgreSQL. Изменение доступно для роли «Администратор».
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(settingsMap).map(([key, setting]) => (
            <div
              key={key}
              className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-black/5 dark:border-white/5 flex flex-col justify-between gap-3 transition-colors hover:border-black/10 dark:hover:border-white/10"
            >
              <div>
                <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {key}
                </span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
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
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-black/15 dark:border-white/15 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <button
                      onClick={() => onSaveSetting(key)}
                      disabled={isSavingSettings}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center shadow-xs"
                      title="Сохранить настройку"
                    >
                      <Save size={13} />
                    </button>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
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
