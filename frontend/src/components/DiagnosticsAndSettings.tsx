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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {/* Box 1: Hardware Specs */}
        <div className="apple-card" style={{ padding: "24px 28px" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 18, display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
            <Cpu size={18} color="var(--accent-blue)" /> Аппаратная спецификация
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: "0.875rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-divider)", paddingBottom: 10 }}>
              <span style={{ color: "var(--text-secondary)" }}>Идентификатор прибора</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>{device.id}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-divider)", paddingBottom: 10 }}>
              <span style={{ color: "var(--text-secondary)" }}>Микроконтроллер</span>
              <span style={{ fontWeight: 500 }}>ESP32-WROOM-32 (240 МГц)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-divider)", paddingBottom: 10 }}>
              <span style={{ color: "var(--text-secondary)" }}>MAC-адрес</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>{device.mac_address || "24:6F:28:AE:3C:80"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-divider)", paddingBottom: 10 }}>
              <span style={{ color: "var(--text-secondary)" }}>Шина сенсоров</span>
              <span style={{ fontWeight: 500 }}>I2C (SDA: GPIO21, SCL: GPIO22)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Сторожевой таймер (WDT)</span>
              <span style={{ color: "var(--accent-green)", fontWeight: 500 }}>Активен (10 с)</span>
            </div>
          </div>
        </div>

        {/* Box 2: Server Services */}
        <div className="apple-card" style={{ padding: "24px 28px" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 18, display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
            <Server size={18} color="var(--accent-teal)" /> Сервисы серверной платформы
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: "0.875rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-divider)", paddingBottom: 10 }}>
              <span style={{ color: "var(--text-secondary)" }}>Core Backend (FastAPI)</span>
              <span style={{ color: "var(--accent-green)", fontWeight: 500 }}>
                {diagnostics ? `Версия ${diagnostics.version} (:8000)` : "Работает :8000"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-divider)", paddingBottom: 10 }}>
              <span style={{ color: "var(--text-secondary)" }}>Аптайм сервера</span>
              <span style={{ color: "var(--accent-blue)", fontWeight: 600 }}>
                {diagnostics?.system_uptime || "Синхронизация..."}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-divider)", paddingBottom: 10 }}>
              <span style={{ color: "var(--text-secondary)" }}>MQTT Брокер (Mosquitto)</span>
              <span style={{ color: "var(--accent-green)", fontWeight: 500 }}>
                {diagnostics?.mqtt_broker_status || "mosquitto:1883"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-divider)", paddingBottom: 10 }}>
              <span style={{ color: "var(--text-secondary)" }}>База данных (PostgreSQL)</span>
              <span style={{ color: "var(--accent-green)", fontWeight: 500 }}>
                {diagnostics?.database_status || "CONNECTED"} (:5432)
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Устройств онлайн</span>
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                {diagnostics?.online_devices ?? 1} из {diagnostics?.total_devices ?? 1}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Box 3: System Thresholds and Settings (CRUD) */}
      <section className="apple-card" style={{ padding: "24px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
              <Sliders size={18} color="var(--accent-blue)" /> Системные пороги тревог и параметры
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: 2 }}>
              Динамические настройки хранятся в PostgreSQL. Изменение доступно для роли «Администратор».
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {Object.entries(settingsMap).map(([key, setting]) => (
            <div
              key={key}
              style={{
                padding: "14px 18px",
                background: "var(--bg-subtle)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-divider)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 10
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--accent-blue)", fontWeight: 600 }}>
                  {key}
                </span>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: 4 }}>
                  {setting.description}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                      style={{
                        flex: 1,
                        padding: "6px 10px",
                        background: "#ffffff",
                        border: "1px solid rgba(0, 0, 0, 0.15)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.875rem",
                        outline: "none"
                      }}
                    />
                    <button
                      onClick={() => onSaveSetting(key)}
                      disabled={isSavingSettings}
                      className="btn btn-primary"
                      style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                    >
                      <Save size={13} />
                    </button>
                  </>
                ) : (
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
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
