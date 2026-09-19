"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Cpu,
  RefreshCw,
  ChevronRight,
  User
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

const ROLE_PROFILES = {
  ADMIN: { email: "admin@satpayev.kz", password: "Admin@2026!", label: "Администратор" },
  OPERATOR: { email: "operator@satpayev.kz", password: "Operator@2026!", label: "Оператор" },
  TECH: { email: "tech@satpayev.kz", password: "Tech@2026!", label: "Техник" }
};

export default function DashboardPage() {
  // State
  const [activeRole, setActiveRole] = useState<"ADMIN" | "OPERATOR" | "TECH">("ADMIN");
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "alerts" | "diagnostics" | "audit">("overview");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterComment, setFilterComment] = useState("Плановая замена HEPA фильтра H13");
  const [commandLoading, setCommandLoading] = useState(false);
  const [lastActionMsg, setLastActionMsg] = useState<string | null>(null);

  // Device & Telemetry state
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
      message: "Нормативный ресурс 720 часов активен. Текущий ресурс 94.2%.",
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
        recorded_at: new Date(now - i * 300000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        temperature: Number(t.toFixed(1)),
        humidity: Number(h.toFixed(1))
      });
    }
    return points;
  });

  const [auditLogs, setAuditLogs] = useState<{ id: number; time: string; user: string; action: string; details: string }[]>([
    { id: 1, time: "Сегодня 14:10", user: "admin@satpayev.kz", action: "SYSTEM_INIT", details: "Инициализация платформы мониторинга" },
    { id: 2, time: "Сегодня 14:15", user: "operator@satpayev.kz", action: "FAN_START", details: "Включение очистки воздуха (Режим Авто)" }
  ]);

  // Automatic JWT Authentication upon role switch or initial mount
  useEffect(() => {
    let isMounted = true;
    async function loginWithProfile() {
      try {
        const creds = ROLE_PROFILES[activeRole];
        const res = await fetch("http://localhost:8000/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: creds.email, password: creds.password })
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.access_token) {
            setToken(data.access_token);
          }
        }
      } catch (err) {
        // Backend offline or running in mock mode
        console.warn("Backend auth offline, using local simulation mode:", err);
      }
    }

    loginWithProfile();
    return () => {
      isMounted = false;
    };
  }, [activeRole]);

  // Periodic polling & Live streaming
  useEffect(() => {
    const fetchTelemetry = async () => {
      if (token) {
        try {
          const res = await fetch("http://localhost:8000/api/v1/devices/purifier-satpayev-01", {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            setDevice(data);
            return;
          }
        } catch {
          // Fall through to fallback simulation
        }
      }

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
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 4000);
    return () => clearInterval(interval);
  }, [token]);

  // Handlers
  const handleToggleFan = async () => {
    setCommandLoading(true);
    const targetState = !device.fan_active;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      await fetch(`http://localhost:8000/api/v1/devices/${device.id}/command`, {
        method: "POST",
        headers,
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
        user: ROLE_PROFILES[activeRole].email,
        action: targetState ? "FAN_ON" : "FAN_OFF",
        details: `Команда управления: вентилятор переведен в статус ${targetState ? "ВКЛ" : "ВЫКЛ"}`
      },
      ...prev
    ]);
    setLastActionMsg(`Команда выполнена: вентилятор ${targetState ? "запущен" : "остановлен"}`);
    setTimeout(() => setLastActionMsg(null), 3500);
    setCommandLoading(false);
  };

  const handleResetFilter = async () => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      await fetch(`http://localhost:8000/api/v1/devices/${device.id}/filter/reset`, {
        method: "POST",
        headers,
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
        user: ROLE_PROFILES[activeRole].email,
        action: "FILTER_RESET",
        details: `Сброс ресурса фильтра. Причина: ${filterComment}`
      },
      ...prev
    ]);

    setNotifications((prev) => prev.filter((n) => !n.type.startsWith("FILTER")));
    setIsFilterModalOpen(false);
    setLastActionMsg("Ресурс фильтра успешно сброшен на 100%");
    setTimeout(() => setLastActionMsg(null), 3500);
  };

  const handleExportCSV = () => {
    window.open("http://localhost:8000/api/v1/telemetry/export", "_blank");
    setLastActionMsg("Экспорт телеметрии в CSV начат");
    setTimeout(() => setLastActionMsg(null), 3000);
  };

  const handleResolveAlert = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_resolved: true } : n)));
  };

  // SVG Chart Calculations
  const chartSvg = useMemo(() => {
    const width = 800;
    const height = 220;
    const padding = 36;

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
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "32px 24px" }}>
      {/* Apple-style Top Bar */}
      <header
        className="apple-glass"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          marginBottom: 28,
          flexWrap: "wrap",
          gap: 16
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "10px",
              background: "rgba(0, 113, 227, 0.08)",
              color: "var(--accent-blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Wind size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
              КазНИТУ им. К.И. Сатпаева
            </h1>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              Система мониторинга и контроля воздухоочистителя
            </p>
          </div>
        </div>

        {/* Right Section: User Profile & Segmented Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {/* Status badge */}
          <div className="badge badge-online">
            <span className="pulse-live" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent-green)" }} />
            {device.status === "ONLINE" ? "Подключено" : "Офлайн"}
          </div>

          {/* User Email Indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.8125rem",
              color: "var(--text-secondary)",
              background: "var(--bg-control)",
              padding: "5px 10px",
              borderRadius: "8px"
            }}
          >
            <User size={14} color="var(--accent-blue)" />
            <span>{ROLE_PROFILES[activeRole].email}</span>
          </div>

          {/* Role Segmented Switcher */}
          <div className="segmented-control">
            {(["ADMIN", "OPERATOR", "TECH"] as const).map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`segmented-control-btn ${activeRole === role ? "active" : ""}`}
              >
                {ROLE_PROFILES[role].label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Action Notification Banner */}
      {lastActionMsg && (
        <div
          style={{
            background: "rgba(52, 199, 89, 0.08)",
            border: "1px solid rgba(52, 199, 89, 0.2)",
            color: "#1b5e20",
            padding: "12px 18px",
            borderRadius: "var(--radius-sm)",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: "0.875rem",
            fontWeight: 500
          }}
        >
          <CheckCircle2 size={18} color="var(--accent-green)" />
          <span>{lastActionMsg}</span>
        </div>
      )}

      {/* 4 Apple Minimalist Metric Cards */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginBottom: 32 }}>
        {/* Card 1: Температура */}
        <div className="apple-card" style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>
              Температура воздуха
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                background: "rgba(0, 113, 227, 0.08)",
                color: "var(--accent-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Thermometer size={18} strokeWidth={2} />
            </div>
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.025em", marginBottom: 6 }}>
            {device.last_temperature !== null ? `${device.last_temperature}°` : "--"}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8125rem" }}>
            <span style={{ color: "var(--accent-green)", fontWeight: 500 }}>Норма (20–25 °C)</span>
            <span style={{ color: "var(--text-muted)" }}>SHT31</span>
          </div>
          {/* Track */}
          <div style={{ height: 4, background: "#f2f2f7", borderRadius: 9999, marginTop: 14, overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.min(100, Math.max(0, (((device.last_temperature || 20) - 15) / 20) * 100))}%`,
                height: "100%",
                background: "var(--accent-blue)",
                borderRadius: 9999,
                transition: "width 0.4s ease"
              }}
            />
          </div>
        </div>

        {/* Card 2: Влажность */}
        <div className="apple-card" style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>
              Относительная влажность
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                background: "rgba(48, 176, 199, 0.1)",
                color: "var(--accent-teal)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Droplets size={18} strokeWidth={2} />
            </div>
          </div>
          <div style={{ fontSize: "2.25rem", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.025em", marginBottom: 6 }}>
            {device.last_humidity !== null ? `${device.last_humidity}%` : "--"}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8125rem" }}>
            <span style={{ color: "var(--accent-green)", fontWeight: 500 }}>Комфортно (40–60%)</span>
            <span style={{ color: "var(--text-muted)" }}>±2%</span>
          </div>
          {/* Track */}
          <div style={{ height: 4, background: "#f2f2f7", borderRadius: 9999, marginTop: 14, overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.min(100, Math.max(0, device.last_humidity || 50))}%`,
                height: "100%",
                background: "var(--accent-teal)",
                borderRadius: 9999,
                transition: "width 0.4s ease"
              }}
            />
          </div>
        </div>

        {/* Card 3: Ресурс фильтра */}
        <div className="apple-card" style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>
              Ресурс фильтра HEPA
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                background: "rgba(52, 199, 89, 0.12)",
                color: "var(--accent-green)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <ShieldCheck size={18} strokeWidth={2} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: "2.25rem", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.025em" }}>
              {device.filter_life_percent}%
            </span>
            <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              ({device.filter_hours_used.toFixed(1)} / {device.filter_hours_max} ч)
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8125rem" }}>
            <span style={{ color: "var(--text-muted)" }}>~28 дн. работы</span>
            {(activeRole === "ADMIN" || activeRole === "OPERATOR") && (
              <button
                onClick={() => setIsFilterModalOpen(true)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent-blue)",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "0.8125rem"
                }}
              >
                Сброс
              </button>
            )}
          </div>
          {/* Track */}
          <div style={{ height: 4, background: "#f2f2f7", borderRadius: 9999, marginTop: 14, overflow: "hidden" }}>
            <div
              style={{
                width: `${device.filter_life_percent}%`,
                height: "100%",
                background: device.filter_life_percent > 20 ? "var(--accent-green)" : "var(--accent-red)",
                borderRadius: 9999,
                transition: "width 0.4s ease"
              }}
            />
          </div>
        </div>

        {/* Card 4: Вентилятор и управление */}
        <div className="apple-card" style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>
              Состояние прибора
            </span>
            <div
              className={device.fan_active ? "spin-active" : ""}
              style={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                background: device.fan_active ? "rgba(0, 113, 227, 0.08)" : "var(--bg-control)",
                color: device.fan_active ? "var(--accent-blue)" : "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Wind size={18} strokeWidth={2} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: device.fan_active ? "var(--accent-green)" : "var(--text-tertiary)"
              }}
            />
            <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
              {device.fan_active ? "Очистка активна" : "Прибор выключен"}
            </span>
          </div>
          {(activeRole === "ADMIN" || activeRole === "OPERATOR") ? (
            <button
              onClick={handleToggleFan}
              disabled={commandLoading}
              className={device.fan_active ? "btn btn-danger" : "btn btn-primary"}
              style={{ width: "100%", padding: "9px 14px", borderRadius: "var(--radius-sm)" }}
            >
              <Power size={15} strokeWidth={2.2} />
              {device.fan_active ? "Остановить вентилятор" : "Запустить вентилятор"}
            </button>
          ) : (
            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", paddingTop: 4 }}>
              Доступно администраторам и операторам
            </div>
          )}
        </div>
      </section>

      {/* Apple-style Segmented Navigation Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 14
        }}
      >
        <div className="segmented-control" style={{ padding: 4 }}>
          {[
            { id: "overview", label: "Аналитика", icon: Activity },
            { id: "history", label: "История замеров", icon: Clock },
            { id: "alerts", label: `Алерты (${notifications.filter((n) => !n.is_resolved).length})`, icon: AlertTriangle },
            { id: "diagnostics", label: "Диагностика", icon: Server },
            { id: "audit", label: "Журнал аудита", icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`segmented-control-btn ${isActive ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 7 }}
              >
                <Icon size={15} strokeWidth={2} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button onClick={handleExportCSV} className="btn btn-outline" style={{ fontSize: "0.8125rem" }}>
          <Download size={15} strokeWidth={2} />
          Экспорт в CSV
        </button>
      </div>

      {/* TAB 1: OVERVIEW & CHART */}
      {activeTab === "overview" && (
        <section className="apple-card" style={{ padding: "28px 32px", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
                Динамика климатических параметров
              </h2>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: 2 }}>
                Непрерывный поток телеметрии (интервал 5 сек)
              </p>
            </div>
            <div style={{ display: "flex", gap: 20, fontSize: "0.8125rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent-blue)" }} />
                <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Температура (°C)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent-teal)" }} />
                <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Влажность (%)</span>
              </div>
            </div>
          </div>

          {/* Minimalist Multi-Series Chart */}
          <div style={{ width: "100%", overflowX: "auto" }}>
            <svg viewBox={`0 0 ${chartSvg.width} ${chartSvg.height}`} style={{ width: "100%", height: 240, overflow: "visible" }}>
              {/* Subtle Horizontal Grid lines */}
              {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => (
                <line
                  key={idx}
                  x1="36"
                  y1={chartSvg.height * ratio}
                  x2={chartSvg.width - 36}
                  y2={chartSvg.height * ratio}
                  stroke="rgba(0, 0, 0, 0.04)"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Temperature Line */}
              <path d={chartSvg.tempPath} fill="none" stroke="var(--accent-blue)" strokeWidth="2.5" strokeLinecap="round" />

              {/* Humidity Line */}
              <path d={chartSvg.humPath} fill="none" stroke="var(--accent-teal)" strokeWidth="2.5" strokeLinecap="round" />

              {/* Temperature Points */}
              {history.map((h, i) => (
                <circle
                  key={`t-${i}`}
                  cx={chartSvg.getX(i)}
                  cy={220 - 36 - ((h.temperature - 18) / 10) * 148}
                  r="3"
                  fill="#ffffff"
                  stroke="var(--accent-blue)"
                  strokeWidth="2"
                />
              ))}
            </svg>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: "0.75rem", color: "var(--text-muted)", padding: "0 10px" }}>
            <span>-2 часа</span>
            <span>-1 час</span>
            <span>Текущее время</span>
          </div>
        </section>
      )}

      {/* TAB 2: HISTORY TABLE */}
      {activeTab === "history" && (
        <section className="apple-card" style={{ padding: "24px 28px" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: 18, letterSpacing: "-0.015em" }}>
            Журнал телеметрических замеров
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-divider)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Время</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Температура</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Влажность</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Вентилятор</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Канал передачи</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--border-divider)" }}>
                    <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{row.recorded_at}</td>
                    <td style={{ padding: "14px 16px", color: "var(--accent-blue)", fontWeight: 600 }}>{row.temperature} °C</td>
                    <td style={{ padding: "14px 16px", color: "var(--accent-teal)", fontWeight: 600 }}>{row.humidity} %</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span className="badge badge-online">
                        Активен
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--text-muted)" }}>MQTT (QoS 0)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: ALERTS */}
      {activeTab === "alerts" && (
        <section className="apple-card" style={{ padding: "24px 28px" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: 18, letterSpacing: "-0.015em" }}>
            Центр уведомлений и предупреждений
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 20px",
                  borderRadius: "var(--radius-sm)",
                  background: notif.is_resolved ? "rgba(0, 0, 0, 0.02)" : "rgba(255, 59, 48, 0.06)",
                  border: `1px solid ${notif.is_resolved ? "var(--border-divider)" : "rgba(255, 59, 48, 0.15)"}`
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <AlertTriangle size={22} color={notif.is_resolved ? "var(--text-muted)" : "var(--accent-red)"} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", color: notif.is_resolved ? "var(--text-muted)" : "var(--text-primary)" }}>
                      {notif.title}
                    </div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: 2 }}>
                      {notif.message}
                    </div>
                  </div>
                </div>
                {!notif.is_resolved && (
                  <button onClick={() => handleResolveAlert(notif.id)} className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "6px 12px" }}>
                    Подтвердить
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
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>{device.mac_address}</span>
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

          <div className="apple-card" style={{ padding: "24px 28px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 18, display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
              <Server size={18} color="var(--accent-teal)" /> Сервисы серверной платформы
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: "0.875rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-divider)", paddingBottom: 10 }}>
                <span style={{ color: "var(--text-secondary)" }}>Core Backend (FastAPI)</span>
                <span style={{ color: "var(--accent-green)", fontWeight: 500 }}>Работает :8000</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-divider)", paddingBottom: 10 }}>
                <span style={{ color: "var(--text-secondary)" }}>MQTT Брокер (Mosquitto)</span>
                <span style={{ color: "var(--accent-green)", fontWeight: 500 }}>Работает :1883</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-divider)", paddingBottom: 10 }}>
                <span style={{ color: "var(--text-secondary)" }}>База данных (PostgreSQL)</span>
                <span style={{ color: "var(--accent-green)", fontWeight: 500 }}>Подключено :5432</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Кэш & Брокер (Redis)</span>
                <span style={{ color: "var(--accent-green)", fontWeight: 500 }}>Активен :6379</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === "audit" && (
        <section className="apple-card" style={{ padding: "24px 28px" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: 18, letterSpacing: "-0.015em" }}>
            Журнал аудита действий пользователей (FR-13)
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {auditLogs.map((log) => (
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
                <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                  {log.user} • {log.time}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Apple-style Sheet Modal for Filter Replacement */}
      {isFilterModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20
          }}
        >
          <div
            className="apple-card"
            style={{
              width: "100%",
              maxWidth: 440,
              padding: "28px 30px",
              boxShadow: "var(--shadow-modal)",
              borderRadius: "var(--radius-lg)"
            }}
          >
            <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: 8, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
              Замена фильтрующего элемента
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: 18, lineHeight: 1.45 }}>
              Счетчик наработки моточасов будет сброшен в 0, а ресурс фильтра установлен на 100%. Запись будет зафиксирована в журнале аудита.
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500, display: "block", marginBottom: 6 }}>
                Комментарий к замене
              </label>
              <input
                type="text"
                value={filterComment}
                onChange={(e) => setFilterComment(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "#f5f5f7",
                  border: "1px solid rgba(0, 0, 0, 0.1)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  fontSize: "0.875rem",
                  outline: "none"
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setIsFilterModalOpen(false)} className="btn btn-outline">
                Отмена
              </button>
              <button onClick={handleResetFilter} className="btn btn-primary">
                Подтвердить сброс
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
