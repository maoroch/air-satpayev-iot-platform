"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import ClimateDynamicsChart from "../components/ClimateDynamicsChart";
import MeasurementHistoryTable from "../components/MeasurementHistoryTable";
import AlertsCenter from "../components/AlertsCenter";
import DiagnosticsAndSettings from "../components/DiagnosticsAndSettings";
import AuditLogsViewer from "../components/AuditLogsViewer";
import { formatTime, formatDateWithTime } from "../utils/date";

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
  temperature: number | null;
  humidity: number | null;
  fan_active: boolean;
}

interface AuditLogItem {
  id: number;
  user_email: string;
  action: string;
  details: string;
  created_at: string;
}

interface DiagnosticsData {
  version: string;
  database_status: string;
  mqtt_broker_status: string;
  total_devices: number;
  online_devices: number;
  system_uptime: string;
  active_alarms: number;
}

interface SettingDetail {
  value: string;
  description: string;
}

const ROLE_PROFILES = {
  ADMIN: { email: "admin@satpayev.kz", password: "Admin@2026!", label: "Администратор" },
  OPERATOR: { email: "operator@satpayev.kz", password: "Operator@2026!", label: "Оператор" },
  TECH: { email: "tech@satpayev.kz", password: "Tech@2026!", label: "Техник" }
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000/api/v1`
    : "http://localhost:8000/api/v1");

const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:8000/api/v1/ws/telemetry`
    : "ws://localhost:8000/api/v1/ws/telemetry");


export default function DashboardPage() {
  // Authentication & Navigation
  const [activeRole, setActiveRole] = useState<"ADMIN" | "OPERATOR" | "TECH">("ADMIN");
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "alerts" | "diagnostics" | "audit">("overview");

  // Device & Telemetry state
  const [device, setDevice] = useState<DeviceData>({
    id: "purifier-satpayev-01",
    name: "Очиститель воздуха Сатпаев №1",
    model: "Satpayev Compact Air Purifier v1",
    mac_address: "24:6F:28:AE:3C:80",
    status: "OFFLINE",
    last_temperature: 22.5,
    last_humidity: 45.0,
    fan_active: false,
    filter_life_percent: 100.0,
    filter_hours_used: 0.0,
    filter_hours_max: 720.0,
    last_seen: null
  });

  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [settingsMap, setSettingsMap] = useState<Record<string, SettingDetail>>({});
  const [editingSettings, setEditingSettings] = useState<Record<string, string>>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Modals & UI indicators
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterComment, setFilterComment] = useState("Плановая замена фильтра HEPA H13");
  const [commandLoading, setCommandLoading] = useState(false);
  const [lastActionMsg, setLastActionMsg] = useState<string | null>(null);

  // 1. Automatic JWT Login on role switch
  useEffect(() => {
    let isMounted = true;
    async function loginWithProfile() {
      try {
        const creds = ROLE_PROFILES[activeRole];
        const res = await fetch(`${API_BASE}/auth/login`, {
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
        console.warn("[Auth] Backend login error:", err);
      }
    }

    loginWithProfile();
    return () => {
      isMounted = false;
    };
  }, [activeRole]);

  // 2. Fetch Device, History, Notifications, Audit Logs
  const fetchDeviceData = useCallback(async (currentToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/devices/purifier-satpayev-01`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDevice(data);
      }
    } catch (err) {
      console.error("[Fetch] Device error:", err);
    }
  }, []);

  const fetchHistoryData = useCallback(async (currentToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/telemetry/history?device_id=purifier-satpayev-01&limit=30`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setHistory(json.data);
        }
      }
    } catch (err) {
      console.error("[Fetch] History error:", err);
    }
  }, []);

  const fetchNotificationsData = useCallback(async (currentToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/notifications?resolved=false`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("[Fetch] Notifications error:", err);
    }
  }, []);

  const fetchAuditLogsData = useCallback(async (currentToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/system/logs/audit?limit=50`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error("[Fetch] Audit logs error:", err);
    }
  }, []);

  const fetchDiagnosticsData = useCallback(async (currentToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/system/diagnostics`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data);
      }
    } catch (err) {
      console.error("[Fetch] Diagnostics error:", err);
    }
  }, []);

  const fetchSettingsData = useCallback(async (currentToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/system/settings`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettingsMap(data);
        const initialForm: Record<string, string> = {};
        Object.entries(data).forEach(([k, v]: [string, any]) => {
          initialForm[k] = v.value;
        });
        setEditingSettings(initialForm);
      }
    } catch (err) {
      console.error("[Fetch] Settings error:", err);
    }
  }, []);

  // Periodic Polling
  useEffect(() => {
    if (!token) return;

    fetchDeviceData(token);
    fetchHistoryData(token);
    fetchNotificationsData(token);

    if (activeTab === "audit") {
      fetchAuditLogsData(token);
    } else if (activeTab === "diagnostics") {
      fetchDiagnosticsData(token);
      fetchSettingsData(token);
    }

    const interval = setInterval(() => {
      fetchDeviceData(token);
      fetchHistoryData(token);
      fetchNotificationsData(token);

      if (activeTab === "audit") {
        fetchAuditLogsData(token);
      } else if (activeTab === "diagnostics") {
        fetchDiagnosticsData(token);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [
    token,
    activeTab,
    fetchDeviceData,
    fetchHistoryData,
    fetchNotificationsData,
    fetchAuditLogsData,
    fetchDiagnosticsData,
    fetchSettingsData
  ]);

  // 3. Real-time WebSocket Streaming
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    function connect() {
      try {
        ws = new WebSocket(WS_BASE);
        ws.onopen = () => {
          console.log("[WS] Connected to telemetry stream");
        };
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.device_id === "purifier-satpayev-01") {
              setDevice((prev) => ({
                ...prev,
                last_temperature: msg.temperature ?? prev.last_temperature,
                last_humidity: msg.humidity ?? prev.last_humidity,
                fan_active: typeof msg.fan_active === "boolean" ? msg.fan_active : prev.fan_active,
                status: "ONLINE",
                last_seen: msg.recorded_at || new Date().toISOString()
              }));

              setHistory((prev) => {
                const newPoint: HistoryPoint = {
                  recorded_at: msg.recorded_at || new Date().toISOString(),
                  temperature: msg.temperature ?? null,
                  humidity: msg.humidity ?? null,
                  fan_active: msg.fan_active ?? true
                };
                const next = [...prev, newPoint];
                return next.slice(-30);
              });
            }
          } catch (e) {
            console.error("[WS] Message parsing error:", e);
          }
        };
        ws.onclose = () => {
          reconnectTimeout = setTimeout(connect, 3000);
        };
        ws.onerror = () => {
          ws?.close();
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connect, 3000);
      }
    }

    connect();
    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

  // 4. Handlers
  const handleToggleFan = async () => {
    setCommandLoading(true);
    const targetState = !device.fan_active;

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/devices/${device.id}/command`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          command: "SET_FAN",
          payload: { enabled: targetState }
        })
      });

      if (res.ok) {
        setDevice((prev) => ({ ...prev, fan_active: targetState }));
        setLastActionMsg(`Команда передана в Outbox: вентилятор ${targetState ? "запускается" : "останавливается"}`);
        if (token) {
          setTimeout(() => {
            fetchDeviceData(token);
            fetchHistoryData(token);
            fetchAuditLogsData(token);
          }, 1200);
        }
      } else {
        setLastActionMsg("Ошибка при отправке команды управления вентилятором");
      }
    } catch (err) {
      setLastActionMsg("Сетевая ошибка при отправке команды");
    } finally {
      setCommandLoading(false);
      setTimeout(() => setLastActionMsg(null), 3500);
    }
  };

  const handleResetFilter = async () => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/devices/${device.id}/filter/reset`, {
        method: "POST",
        headers,
        body: JSON.stringify({ comment: filterComment })
      });

      if (res.ok) {
        setDevice((prev) => ({
          ...prev,
          filter_hours_used: 0.0,
          filter_life_percent: 100.0
        }));
        setLastActionMsg("Ресурс фильтра успешно сброшен на 100%");
        if (token) {
          fetchNotificationsData(token);
          fetchAuditLogsData(token);
        }
      } else {
        setLastActionMsg("Недостаточно прав для сброса ресурса фильтра");
      }
    } catch {
      setLastActionMsg("Ошибка соединения при сбросе фильтра");
    } finally {
      setIsFilterModalOpen(false);
      setTimeout(() => setLastActionMsg(null), 3500);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch(`${API_BASE}/telemetry/export`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `telemetry_${device.id}_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setLastActionMsg("Экспорт телеметрии в CSV успешно загружен");
      } else {
        setLastActionMsg("Ошибка авторизации при экспорте CSV");
      }
    } catch (err) {
      setLastActionMsg("Ошибка соединения при экспорте CSV");
    }
    setTimeout(() => setLastActionMsg(null), 3500);
  };

  const handleResolveAlert = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/notifications/${id}/resolve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok && token) {
        fetchNotificationsData(token);
        setLastActionMsg("Предупреждение подтверждено");
        setTimeout(() => setLastActionMsg(null), 3000);
      }
    } catch (err) {
      console.error("[Alert] Resolve error:", err);
    }
  };

  const handleSaveSetting = async (key: string) => {
    if (!token) return;
    setIsSavingSettings(true);
    try {
      const val = editingSettings[key];
      const res = await fetch(`${API_BASE}/system/settings/${key}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ value: val })
      });
      if (res.ok) {
        setLastActionMsg(`Параметр ${key} сохранен: ${val}`);
        fetchSettingsData(token);
      } else {
        setLastActionMsg(`Недостаточно прав (требуется ADMIN)`);
      }
    } catch (err) {
      setLastActionMsg("Ошибка сохранения параметра");
    } finally {
      setIsSavingSettings(false);
      setTimeout(() => setLastActionMsg(null), 3500);
    }
  };


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
          <div className={`badge ${device.status === "ONLINE" ? "badge-online" : "badge-offline"}`}>
            <span
              className="pulse-live"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: device.status === "ONLINE" ? "var(--accent-green)" : "var(--accent-red)"
              }}
            />
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
            {device.last_temperature !== null ? `${device.last_temperature.toFixed(1)}°` : "--"}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8125rem" }}>
            <span style={{ color: "var(--accent-green)", fontWeight: 500 }}>
              {device.last_temperature !== null && device.last_temperature <= 30.0 ? "Норма (18–26 °C)" : "Повышенная"}
            </span>
            <span style={{ color: "var(--text-muted)" }}>SHT31 (I2C)</span>
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
                background: "rgba(48, 176, 199, 0.08)",
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
            {device.last_humidity !== null ? `${device.last_humidity.toFixed(1)}%` : "--"}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8125rem" }}>
            <span style={{ color: "var(--accent-green)", fontWeight: 500 }}>
              {device.last_humidity !== null && device.last_humidity >= 30 && device.last_humidity <= 60 ? "Оптимально (40–60%)" : "В норме"}
            </span>
            <span style={{ color: "var(--text-muted)" }}>SHT31 (I2C)</span>
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
              Ресурс фильтра HEPA H13
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
              {device.filter_life_percent.toFixed(1)}%
            </span>
            <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              ({device.filter_hours_used.toFixed(1)} / {device.filter_hours_max} ч)
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8125rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Счетчик наработки</span>
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
                width: `${Math.min(100, Math.max(0, device.filter_life_percent))}%`,
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
                background: device.fan_active ? "var(--accent-green)" : "#8e8e93"
              }}
            />
            <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
              {device.fan_active ? "Очистка активна" : "Прибор остановлен"}
            </span>
          </div>
          {activeRole === "ADMIN" || activeRole === "OPERATOR" ? (
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
            { id: "diagnostics", label: "Диагностика и настройки", icon: Server },
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
      {activeTab === "overview" && <ClimateDynamicsChart history={history} />}

      {/* TAB 2: HISTORY TABLE */}
      {activeTab === "history" && (
        <MeasurementHistoryTable
          history={history}
          onRefresh={() => token && fetchHistoryData(token)}
        />
      )}

      {/* TAB 3: ALERTS */}
      {activeTab === "alerts" && (
        <AlertsCenter
          notifications={notifications}
          onResolveAlert={handleResolveAlert}
        />
      )}

      {/* TAB 4: DIAGNOSTICS & SETTINGS */}
      {activeTab === "diagnostics" && (
        <DiagnosticsAndSettings
          device={device}
          diagnostics={diagnostics}
          settingsMap={settingsMap}
          editingSettings={editingSettings}
          onEditingSettingsChange={setEditingSettings}
          activeRole={activeRole}
          onSaveSetting={handleSaveSetting}
          isSavingSettings={isSavingSettings}
        />
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === "audit" && (
        <AuditLogsViewer
          auditLogs={auditLogs}
          onRefresh={() => token && fetchAuditLogsData(token)}
        />
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
