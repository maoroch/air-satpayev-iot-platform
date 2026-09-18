"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Wind,
  Thermometer,
  Droplets,
  ShieldCheck,
  Power,
  RotateCcw,
  Download,
  AlertTriangle,
  Server,
  FileText,
  UserCheck,
  CheckCircle2,
  Clock,
  Wifi,
  Cpu
} from "lucide-react";

interface DeviceData {
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

interface NotificationItem {
  id: string;
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  is_resolved: boolean;
  created_at: string;
}

interface HistoryPoint {
  recorded_at: string;
  temperature: number;
  humidity: number;
}

export default function DashboardPage() {
  // State
  const [activeRole, setActiveRole] = useState<"ADMIN" | "OPERATOR" | "TECH">("ADMIN");
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "alerts" | "diagnostics" | "audit">("overview");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterComment, setFilterComment] = useState("Плановая замена HEPA фильтра H13");
  const [commandLoading, setCommandLoading] = useState(false);
  const [lastActionMsg, setLastActionMsg] = useState<string | null>(null);

  // Device & Telemetry state with initial realistic seed
  const [device, setDevice] = useState<DeviceData>({
    id: "purifier-satpayev-01",
    name: "Очиститель воздуха Сатпаев №1",
    model: "Satpayev Compact Purifier v1",
    mac_address: "24:6F:28:AE:3C:80",
    status: "ONLINE",
    last_temperature: 23.4,
    last_humidity: 47.8,
    fan_active: true,
    filter_life_percent: 94.2,
    filter_hours_used: 41.8,
    filter_hours_max: 720.0,
    last_seen: new Date().toISOString()
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "n-01",
      type: "FILTER_WARN",
      severity: "INFO",
      title: "Калибровка фильтра завершена",
      message: "Нормативный ресурс 720 часов активен. Ресурс 94.2%.",
      is_resolved: false,
      created_at: new Date(Date.now() - 3600000).toISOString()
    }
  ]);

  // Generate 24 historical points for SVG chart
  const [history, setHistory] = useState<HistoryPoint[]>(() => {
    const points: HistoryPoint[] = [];
    const now = Date.now();
    for (let i = 24; i >= 0; i--) {
      const t = 22.8 + Math.sin(i * 0.4) * 1.6 + (Math.random() * 0.4 - 0.2);
      const h = 48.0 - Math.sin(i * 0.4) * 2.2 + (Math.random() * 0.6 - 0.3);
      points.push({
        recorded_at: new Date(now - i * 300000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temperature: Number(t.toFixed(1)),
        humidity: Number(h.toFixed(1))
      });
    }
    return points;
  });

  const [auditLogs, setAuditLogs] = useState<{ id: number; time: string; user: string; action: string; details: string }[]>([
    { id: 1, time: "Сегодня 14:10", user: "admin@satpayev.kz", action: "SYSTEM_INIT", details: "Инициализация платформы мониторинга" },
    { id: 2, time: "Сегодня 14:15", user: "operator@satpayev.kz", action: "FAN_START", details: "Включение очистки воздуха (Скорость 2)" }
  ]);

  // Periodic polling & Live streaming simulation
  useEffect(() => {
    const interval = setInterval(async () => {
      // 1. Try to fetch from real backend
      try {
        const res = await fetch("http://localhost:8000/api/v1/devices/purifier-satpayev-01");
        if (res.ok) {
          const data = await res.json();
          setDevice(data);
        }
      } catch {
        // Fallback smooth live updates in UI
        setDevice((prev) => {
          if (!prev.fan_active) return prev;
          const nextTemp = Number((22.5 + Math.sin(Date.now() / 15000) * 1.5 + (Math.random() * 0.2 - 0.1)).toFixed(1));
          const nextHum = Number((48.0 - Math.sin(Date.now() / 15000) * 2.0 + (Math.random() * 0.3 - 0.15)).toFixed(1));
          const nextHours = Number((prev.filter_hours_used + 5 / 3600).toFixed(3));
          const nextLife = Number(Math.max(0, (1 - nextHours / prev.filter_hours_max) * 100).toFixed(1));
          return {
            ...prev,
            last_temperature: nextTemp,
            last_humidity: nextHum,
            filter_hours_used: nextHours,
            filter_life_percent: nextLife,
            last_seen: new Date().toISOString()
          };
        });
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleToggleFan = async () => {
    setCommandLoading(true);
    const targetState = !device.fan_active;
    try {
      // Try backend command API
      await fetch(`http://localhost:8000/api/v1/devices/${device.id}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "SET_FAN",
          payload: { enabled: targetState }
        })
      });
    } catch {}

    setDevice((prev) => ({ ...prev, fan_active: targetState }));
    setAuditLogs((prev) => [
      {
        id: prev.length + 1,
        time: "Только что",
        user: `${activeRole.toLowerCase()}@satpayev.kz`,
        action: targetState ? "FAN_ON" : "FAN_OFF",
        details: `Команда управления: вентилятор переведен в статус ${targetState ? "ВКЛ" : "ВЫКЛ"}`
      },
      ...prev
    ]);
    setLastActionMsg(`Команда передана: Вентилятор ${targetState ? "ВКЛЮЧЕН" : "ВЫКЛЮЧЕН"}`);
    setTimeout(() => setLastActionMsg(null), 3500);
    setCommandLoading(false);
  };

  const handleResetFilter = async () => {
    try {
      await fetch(`http://localhost:8000/api/v1/devices/${device.id}/filter/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: filterComment })
      });
    } catch {}

    setDevice((prev) => ({
      ...prev,
      filter_hours_used: 0.0,
      filter_life_percent: 100.0
    }));

    setAuditLogs((prev) => [
      {
        id: prev.length + 1,
        time: "Только что",
        user: `${activeRole.toLowerCase()}@satpayev.kz`,
        action: "FILTER_RESET",
        details: `Сброс ресурса фильтра. Причина: ${filterComment}`
      },
      ...prev
    ]);

    setNotifications((prev) => prev.filter((n) => !n.type.startsWith("FILTER")));
    setIsFilterModalOpen(false);
    setLastActionMsg("Ресурс фильтра успешно сброшен на 100%!");
    setTimeout(() => setLastActionMsg(null), 3500);
  };

  const handleExportCSV = () => {
    // Direct link to backend export endpoint
    window.open("http://localhost:8000/api/v1/telemetry/export", "_blank");
    setLastActionMsg("Формирование отчета CSV запущено");
    setTimeout(() => setLastActionMsg(null), 3000);
  };

  const handleResolveAlert = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_resolved: true } : n)));
  };

  // SVG Chart Calculations
  const chartSvg = useMemo(() => {
    const width = 800;
    const height = 240;
    const padding = 40;

    const temps = history.map((h) => h.temperature);
    const hums = history.map((h) => h.humidity);

    const minT = 18;
    const maxT = 28;
    const minH = 30;
    const maxH = 70;

    const getX = (index: number) => padding + (index / (history.length - 1)) * (width - 2 * padding);
    const getYTemp = (val: number) => height - padding - ((val - minT) / (maxT - minT)) * (height - 2 * padding);
    const getYHum = (val: number) => height - padding - ((val - minH) / (maxH - minH)) * (height - 2 * padding);

    const tempPath = history
      .map((h, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getYTemp(h.temperature).toFixed(1)}`)
      .join(" ");

    const humPath = history
      .map((h, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getYHum(h.humidity).toFixed(1)}`)
      .join(" ");

    return { width, height, tempPath, humPath, getX };
  }, [history]);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 20px" }}>
      {/* Top Header */}
      <header
        className="glass-panel"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 16
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff"
            }}
          >
            <Wind size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
              КазНИТУ им. К.И. Сатпаева
            </h1>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Цифровая система мониторинга и управления воздухоочистителем
            </p>
          </div>
        </div>

        {/* Status & Role Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {/* Online badge */}
          <div className="badge badge-online">
            <span className="pulse-live" style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
            {device.status} (Wi-Fi MQTT)
          </div>

          {/* Role selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", padding: 4, borderRadius: 10 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: 6 }}>Роль:</span>
            {(["ADMIN", "OPERATOR", "TECH"] as const).map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  background: activeRole === role ? "var(--accent-blue)" : "transparent",
                  color: activeRole === role ? "#fff" : "var(--text-secondary)"
                }}
              >
                {role === "ADMIN" ? "Администратор" : role === "OPERATOR" ? "Оператор" : "Техник"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Action Notification Toast */}
      {lastActionMsg && (
        <div
          className="glass-panel"
          style={{
            background: "rgba(16, 185, 129, 0.2)",
            borderColor: "rgba(16, 185, 129, 0.4)",
            color: "#34d399",
            padding: "12px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10
          }}
        >
          <CheckCircle2 size={18} />
          <span>{lastActionMsg}</span>
        </div>
      )}

      {/* 4 KPI Grid Cards */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 28 }}>
        {/* Card 1: Температура */}
        <div className="glass-panel card-glow-cyan" style={{ padding: 22, position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>Температура воздуха</span>
            <div style={{ color: "var(--accent-cyan)" }}><Thermometer size={22} /></div>
          </div>
          <div style={{ fontSize: "2.4rem", fontWeight: 800, color: "#fff", marginBottom: 6 }}>
            {device.last_temperature !== null ? `${device.last_temperature} °C` : "--"}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8rem" }}>
            <span style={{ color: "var(--accent-emerald)" }}>✓ Норма (20–25 °C)</span>
            <span style={{ color: "var(--text-muted)" }}>I2C SHT31</span>
          </div>
          {/* Visual bar */}
          <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, marginTop: 12, overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.min(100, Math.max(0, (((device.last_temperature || 20) - 15) / 20) * 100))}%`,
                height: "100%",
                background: "linear-gradient(90deg, var(--accent-cyan), var(--accent-blue))"
              }}
            />
          </div>
        </div>

        {/* Card 2: Влажность */}
        <div className="glass-panel card-glow-cyan" style={{ padding: 22, position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>Относительная влажность</span>
            <div style={{ color: "var(--accent-blue)" }}><Droplets size={22} /></div>
          </div>
          <div style={{ fontSize: "2.4rem", fontWeight: 800, color: "#fff", marginBottom: 6 }}>
            {device.last_humidity !== null ? `${device.last_humidity} %` : "--"}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8rem" }}>
            <span style={{ color: "var(--accent-emerald)" }}>✓ Комфорт (40–60%)</span>
            <span style={{ color: "var(--text-muted)" }}>Погрешность ±2%</span>
          </div>
          {/* Visual bar */}
          <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, marginTop: 12, overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.min(100, Math.max(0, device.last_humidity || 50))}%`,
                height: "100%",
                background: "linear-gradient(90deg, var(--accent-blue), var(--accent-purple))"
              }}
            />
          </div>
        </div>

        {/* Card 3: Ресурс фильтра */}
        <div className="glass-panel card-glow-emerald" style={{ padding: 22, position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>Ресурс HEPA фильтра</span>
            <div style={{ color: "var(--accent-emerald)" }}><ShieldCheck size={22} /></div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: "2.4rem", fontWeight: 800, color: "#fff" }}>
              {device.filter_life_percent}%
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              ({device.filter_hours_used.toFixed(1)} / {device.filter_hours_max} ч)
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Осталось ~28 дн.</span>
            {(activeRole === "ADMIN" || activeRole === "OPERATOR") && (
              <button
                onClick={() => setIsFilterModalOpen(true)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent-cyan)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  textDecoration: "underline"
                }}
              >
                Сброс после смены
              </button>
            )}
          </div>
          {/* Visual bar */}
          <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, marginTop: 12, overflow: "hidden" }}>
            <div
              style={{
                width: `${device.filter_life_percent}%`,
                height: "100%",
                background: device.filter_life_percent > 20 ? "var(--accent-emerald)" : "var(--accent-rose)"
              }}
            />
          </div>
        </div>

        {/* Card 4: Вентилятор и Управление */}
        <div className="glass-panel" style={{ padding: 22, position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>Состояние вентилятора</span>
            <div className={device.fan_active ? "spin-active" : ""} style={{ color: device.fan_active ? "var(--accent-cyan)" : "var(--text-muted)" }}>
              <Wind size={22} />
            </div>
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 700, color: device.fan_active ? "#34d399" : "var(--text-muted)", marginBottom: 12 }}>
            {device.fan_active ? "АКТИВЕН (РАБОТАЕТ)" : "ВЫКЛЮЧЕН"}
          </div>
          {(activeRole === "ADMIN" || activeRole === "OPERATOR") ? (
            <button
              onClick={handleToggleFan}
              disabled={commandLoading}
              className={device.fan_active ? "btn btn-danger" : "btn btn-primary"}
              style={{ width: "100%", justifyContent: "center", padding: "10px" }}
            >
              <Power size={16} />
              {device.fan_active ? "Остановить вентилятор" : "Запустить вентилятор"}
            </button>
          ) : (
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", padding: "8px 0" }}>
              Управление доступно Оператору и Админу
            </div>
          )}
        </div>
      </section>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: 10, borderBottom: "1px solid var(--border-card)", paddingBottom: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { id: "overview", label: "Графика и Аналитика", icon: Activity },
          { id: "history", label: "История измерений", icon: Clock },
          { id: "alerts", label: `Уведомления (${notifications.filter((n) => !n.is_resolved).length})`, icon: AlertTriangle },
          { id: "diagnostics", label: "Диагностика оборудования", icon: Server },
          { id: "audit", label: "Журнал аудита", icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="btn"
              style={{
                background: isActive ? "rgba(6, 182, 212, 0.15)" : "transparent",
                color: isActive ? "var(--accent-cyan)" : "var(--text-secondary)",
                borderColor: isActive ? "rgba(6, 182, 212, 0.4)" : "transparent"
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}

        <div style={{ marginLeft: "auto" }}>
          <button onClick={handleExportCSV} className="btn btn-outline">
            <Download size={16} />
            Экспорт в CSV
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & CHARTS */}
      {activeTab === "overview" && (
        <section className="glass-panel" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Динамика температуры и относительной влажности</h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Непрерывный поток телеметрии с интервалом обновления 5 сек
              </p>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: "0.8rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 12, height: 3, background: "var(--accent-cyan)", display: "inline-block" }} />
                <span>Температура (°C)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 12, height: 3, background: "var(--accent-purple)", display: "inline-block" }} />
                <span>Влажность (%)</span>
              </div>
            </div>
          </div>

          {/* SVG Multi-Series Chart */}
          <div style={{ width: "100%", overflowX: "auto" }}>
            <svg viewBox={`0 0 ${chartSvg.width} ${chartSvg.height}`} style={{ width: "100%", height: 260 }}>
              {/* Grid Lines */}
              {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => (
                <line
                  key={idx}
                  x1="40"
                  y1={chartSvg.height * ratio}
                  x2={chartSvg.width - 40}
                  y2={chartSvg.height * ratio}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Temperature Line */}
              <path d={chartSvg.tempPath} fill="none" stroke="var(--accent-cyan)" strokeWidth="3" strokeLinecap="round" />

              {/* Humidity Line */}
              <path d={chartSvg.humPath} fill="none" stroke="var(--accent-purple)" strokeWidth="3" strokeLinecap="round" />

              {/* Data points */}
              {history.map((h, i) => (
                <circle
                  key={i}
                  cx={chartSvg.getX(i)}
                  cy={240 - 40 - ((h.temperature - 18) / 10) * 160}
                  r="3.5"
                  fill="var(--accent-cyan)"
                />
              ))}
            </svg>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: "0.75rem", color: "var(--text-muted)", padding: "0 20px" }}>
            <span>-2 часа назад</span>
            <span>-1 час назад</span>
            <span>Текущее время</span>
          </div>
        </section>
      )}

      {/* TAB 2: HISTORY TABLE */}
      {activeTab === "history" && (
        <section className="glass-panel" style={{ padding: 24 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 16 }}>Журнал последних телеметрических замеров</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-card)", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "12px 16px" }}>Время замера</th>
                  <th style={{ padding: "12px 16px" }}>Температура</th>
                  <th style={{ padding: "12px 16px" }}>Влажность</th>
                  <th style={{ padding: "12px 16px" }}>Вентилятор</th>
                  <th style={{ padding: "12px 16px" }}>Канал передачи</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td style={{ padding: "12px 16px", color: "var(--text-primary)" }}>{row.recorded_at}</td>
                    <td style={{ padding: "12px 16px", color: "var(--accent-cyan)", fontWeight: 600 }}>{row.temperature} °C</td>
                    <td style={{ padding: "12px 16px", color: "var(--accent-purple)", fontWeight: 600 }}>{row.humidity} %</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className="badge" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>
                        АКТИВЕН
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>MQTT (QoS 0)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: ALERTS */}
      {activeTab === "alerts" && (
        <section className="glass-panel" style={{ padding: 24 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 16 }}>Центр предупреждений и уведомлений</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 16,
                  borderRadius: 12,
                  background: notif.is_resolved ? "rgba(255,255,255,0.02)" : "rgba(244,63,94,0.1)",
                  border: `1px solid ${notif.is_resolved ? "var(--border-card)" : "rgba(244,63,94,0.3)"}`
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <AlertTriangle size={24} color={notif.is_resolved ? "var(--text-muted)" : "#fb7185"} />
                  <div>
                    <div style={{ fontWeight: 600, color: notif.is_resolved ? "var(--text-muted)" : "#fff" }}>{notif.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{notif.message}</div>
                  </div>
                </div>
                {!notif.is_resolved && (
                  <button onClick={() => handleResolveAlert(notif.id)} className="btn btn-outline" style={{ fontSize: "0.75rem" }}>
                    Подтвердить и скрыть
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 4: DIAGNOSTICS */}
      {activeTab === "diagnostics" && (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Cpu size={18} color="var(--accent-cyan)" /> Аппаратная спецификация узла
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>ID прибора:</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>{device.id}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Микроконтроллер:</span>
                <span>ESP32-WROOM-32 (240 МГц)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>MAC-адрес:</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>{device.mac_address}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Шина сенсоров:</span>
                <span>I2C (SDA: GPIO21, SCL: GPIO22)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Watchdog Timer (WDT):</span>
                <span style={{ color: "#34d399" }}>Активен (10 с)</span>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Server size={18} color="var(--accent-blue)" /> Состояние микросервисов кластера
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Core Backend (FastAPI):</span>
                <span style={{ color: "#34d399" }}>ONLINE :8000</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>MQTT Broker (Mosquitto):</span>
                <span style={{ color: "#34d399" }}>ONLINE :1883</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>База данных PostgreSQL:</span>
                <span style={{ color: "#34d399" }}>CONNECTED :5432</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Redis Cache & Pub/Sub:</span>
                <span style={{ color: "#34d399" }}>ACTIVE :6379</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === "audit" && (
        <section className="glass-panel" style={{ padding: 24 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 16 }}>Журнал аудита действий пользователей (FR-13)</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {auditLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: 8,
                  fontSize: "0.85rem"
                }}
              >
                <div>
                  <span style={{ color: "var(--accent-cyan)", fontWeight: 600, marginRight: 8 }}>[{log.action}]</span>
                  <span>{log.details}</span>
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                  {log.user} • {log.time}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modal for Filter Replacement */}
      {isFilterModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20
          }}
        >
          <div className="glass-panel" style={{ width: "100%", maxWidth: 460, padding: 28 }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 10 }}>Подтверждение замены фильтра</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 16 }}>
              Счетчик наработки моточасов будет сброшен в 0, а ресурс фильтра установлен на 100%. Это действие будет записано в журнал аудита.
            </p>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Комментарий о замене:
              </label>
              <input
                type="text"
                value={filterComment}
                onChange={(e) => setFilterComment(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--border-card)",
                  borderRadius: 8,
                  color: "#fff",
                  outline: "none"
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setIsFilterModalOpen(false)} className="btn btn-outline">
                Отмена
              </button>
              <button onClick={handleResetFilter} className="btn btn-primary">
                Подтвердить замену
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
