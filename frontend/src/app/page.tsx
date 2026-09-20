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
  User,
  Plus,
  Menu
} from "lucide-react";
import ClimateDynamicsChart from "../components/ClimateDynamicsChart";
import MeasurementHistoryTable from "../components/MeasurementHistoryTable";
import AlertsCenter from "../components/AlertsCenter";
import DiagnosticsAndSettings from "../components/DiagnosticsAndSettings";
import AuditLogsViewer from "../components/AuditLogsViewer";
import AddDeviceModal from "../components/AddDeviceModal";
import MobileMenu from "../components/MobileMenu";
import UserProfileSection from "../components/UserProfileSection";
import { formatTime, formatDateWithTime } from "../utils/date";
import {
  MetricCardsSkeleton,
  ChartSkeleton,
  TableSkeleton,
  AlertsSkeleton,
  DiagnosticsSkeleton,
  AuditLogsSkeleton
} from "../components/ui";

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
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "alerts" | "diagnostics" | "audit" | "profile">("overview");

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

  // Loading states for skeleton placeholders & backend requests
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);

  // Multi-device fleet state
  const [devicesList, setDevicesList] = useState<DeviceData[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("purifier-satpayev-01");
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);

  // Modals & UI indicators
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [filterComment, setFilterComment] = useState("Плановая замена фильтра HEPA H13");
  const [commandLoading, setCommandLoading] = useState(false);
  const [lastActionMsg, setLastActionMsg] = useState<string | null>(null);
  const lastTelemetryAtRef = useRef<number>(Date.now());

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

  // 2. Fetch Devices List, Details, History, Notifications, Audit Logs
  const fetchDevicesList = useCallback(async (currentToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/devices`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDevicesList(data);
          if (data.length > 0 && !data.some((d: any) => d.id === selectedDeviceId)) {
            setSelectedDeviceId(data[0].id);
          }
        }
      }
    } catch (err) {
      console.error("[Fetch] Devices list error:", err);
    }
  }, [selectedDeviceId]);

  const fetchDeviceData = useCallback(async (currentToken: string, devId: string) => {
    try {
      const res = await fetch(`${API_BASE}/devices/${devId}`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "OFFLINE") {
          setDevice({
            ...data,
            last_temperature: 0,
            last_humidity: 0,
            fan_active: false
          });
        } else {
          lastTelemetryAtRef.current = Date.now();
          setDevice(data);
        }
      }
    } catch (err) {
      console.error("[Fetch] Device error:", err);
    } finally {
      setIsLoadingInitial(false);
    }
  }, []);

  const fetchHistoryData = useCallback(async (currentToken: string, devId: string) => {
    try {
      const res = await fetch(`${API_BASE}/telemetry/history?device_id=${devId}&limit=30`, {
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
    } finally {
      setIsLoadingHistory(false);
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
    } finally {
      setIsLoadingNotifications(false);
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
    } finally {
      setIsLoadingAudit(false);
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
    } finally {
      setIsLoadingDiagnostics(false);
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

    fetchDevicesList(token);
    fetchDeviceData(token, selectedDeviceId);
    fetchHistoryData(token, selectedDeviceId);
    fetchNotificationsData(token);

    if (activeTab === "audit") {
      if (auditLogs.length === 0) setIsLoadingAudit(true);
      fetchAuditLogsData(token);
    } else if (activeTab === "diagnostics") {
      if (!diagnostics) setIsLoadingDiagnostics(true);
      fetchDiagnosticsData(token);
      fetchSettingsData(token);
    }

    const interval = setInterval(() => {
      fetchDevicesList(token);
      fetchDeviceData(token, selectedDeviceId);
      fetchHistoryData(token, selectedDeviceId);
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
    selectedDeviceId,
    activeTab,
    fetchDevicesList,
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
            if (msg.device_id === selectedDeviceId) {
              if (msg.type === "DEVICE_OFFLINE" || msg.status === "OFFLINE") {
                setDevice((prev) => ({
                  ...prev,
                  status: "OFFLINE",
                  last_temperature: 0,
                  last_humidity: 0,
                  fan_active: false
                }));
              } else {
                lastTelemetryAtRef.current = Date.now();
                setDevice((prev) => ({
                  ...prev,
                  last_temperature: msg.temperature ?? prev.last_temperature,
                  last_humidity: msg.humidity ?? prev.last_humidity,
                  fan_active: typeof msg.fan_active === "boolean" ? msg.fan_active : prev.fan_active,
                  status: "ONLINE",
                  last_seen: msg.recorded_at || new Date().toISOString(),
                  filter_life_percent: msg.filter_life_percent ?? prev.filter_life_percent,
                  filter_hours_used: msg.filter_hours_used ?? prev.filter_hours_used,
                  filter_hours_max: msg.filter_hours_max ?? prev.filter_hours_max
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
  }, [selectedDeviceId]);

  // 4. Watchdog: Auto-detect offline status if simulator stops transmitting (15s threshold)
  useEffect(() => {
    const watchdog = setInterval(() => {
      setDevice((prev) => {
        if (prev.status === "ONLINE") {
          const elapsedMs = Date.now() - lastTelemetryAtRef.current;
          // If no message arrived for more than 15 seconds, mark offline
          if (elapsedMs > 15000) {
            return {
              ...prev,
              status: "OFFLINE",
              last_temperature: 0,
              last_humidity: 0,
              fan_active: false
            };
          }
        }
        return prev;
      });
    }, 3000);

    return () => clearInterval(watchdog);
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
            fetchDeviceData(token, selectedDeviceId);
            fetchHistoryData(token, selectedDeviceId);
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
    <div className="w-full max-w-[1720px] 2xl:max-w-[1800px] mx-auto px-4 sm:px-8 xl:px-12 py-5 sm:py-8 lg:py-10">
      {/* Apple-style Top Bar */}
      <header className="flex flex-col md:flex-row justify-between items-stretch md:items-center p-4 sm:p-5 xl:p-6 mb-6 sm:mb-8 gap-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-black/5 shadow-sm">
        {/* Left Branding with Top-Left Burger Button */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Mobile Burger Menu Button - Top Left ONLY */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 border border-black/5 transition-all active:scale-95 cursor-pointer shadow-xs shrink-0"
            aria-label="Открыть меню навигации"
            title="Меню навигации"
          >
            <Menu size={19} />
          </button>

          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Wind size={20} strokeWidth={2.2} />
          </div>
          <span className="text-sm sm:text-base font-semibold text-gray-900 tracking-tight">
            Воздухоочиститель
          </span>
        </div>

        {/* Center: Device Selector & Add Device Button (hidden on mobile, present in burger menu) */}
        <div className="hidden md:flex items-center gap-2 w-full md:w-auto">
          <div className="flex-1 md:flex-initial flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-gray-100/80 hover:bg-gray-200/70 border border-black/5 transition-all relative">
            <Cpu size={15} className="text-blue-600 flex-shrink-0" />
            <select
              className="bg-transparent border-none outline-none cursor-pointer pr-5 text-xs sm:text-sm font-medium text-gray-800 w-full appearance-none"
              value={selectedDeviceId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedDeviceId(newId);
                setIsLoadingHistory(true);
                if (token) {
                  fetchDeviceData(token, newId);
                  fetchHistoryData(token, newId);
                }
              }}
            >
              {devicesList.length > 0 ? (
                devicesList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.id})
                  </option>
                ))
              ) : (
                <option value={device.id}>
                  {device.name} ({device.id})
                </option>
              )}
            </select>
            <ChevronRight
              size={13}
              className="text-gray-400 rotate-90 pointer-events-none absolute right-2.5"
            />
          </div>

          {activeRole === "ADMIN" && (
            <button
              onClick={() => setIsAddDeviceOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200/60 text-xs sm:text-sm font-medium transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              title="Зарегистрировать новое устройство очистки воздуха"
            >
              <Plus size={14} />
              <span>Прибор</span>
            </button>
          )}
        </div>

        {/* Right Section: Status Badge & Profile Button (role switcher moved to dedicated Profile page) */}
        <div className="hidden md:flex items-center gap-2.5 w-full md:w-auto">
          {/* Status badge */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            device.status === "ONLINE"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
              : "bg-rose-50 text-rose-700 border-rose-200/70"
          }`}>
            <span
              className={`w-2 h-2 rounded-full ${
                device.status === "ONLINE" ? "bg-emerald-500 pulse-live" : "bg-rose-500"
              }`}
            />
            {device.status === "ONLINE" ? "Подключено" : "Отключено"}
          </div>

          {/* Profile Navigation Button */}
          <button
            onClick={() => setActiveTab("profile")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs sm:text-sm font-medium transition-all active:scale-95 cursor-pointer shadow-xs ${
              activeTab === "profile"
                ? "bg-blue-600 text-white border-blue-600 shadow-blue-500/20"
                : "bg-gray-100/90 hover:bg-gray-200 text-gray-700 border-black/5"
            }`}
            title="Перейти в профиль пользователя и управление доступом"
          >
            <User size={15} className={activeTab === "profile" ? "text-white" : "text-blue-600"} />
            <span>Профиль ({ROLE_PROFILES[activeRole].label})</span>
          </button>
        </div>
      </header>

      {/* Action Notification Banner */}
      {lastActionMsg && (
        <div className="bg-emerald-50 border border-emerald-200/60 text-emerald-800 px-4 py-3 rounded-xl mb-6 flex items-center gap-2.5 text-sm font-medium animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          <span>{lastActionMsg}</span>
        </div>
      )}

      {/* 4 Minimalist Metric Cards or Skeleton */}
      {isLoadingInitial ? (
        <MetricCardsSkeleton
          hiddenOnMobile={["alerts", "diagnostics", "audit", "profile"].includes(activeTab)}
        />
      ) : (
        <section
          className={`${
            ["alerts", "diagnostics", "audit", "profile"].includes(activeTab)
              ? "hidden md:grid"
              : "grid"
          } grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 xl:gap-6 mb-6 sm:mb-8`}
        >
        {/* Card 1: Температура */}
        <div className="rounded-2xl bg-white p-5 sm:p-6 xl:p-7 border border-black/5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500">
              Температура воздуха
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Thermometer size={20} strokeWidth={2} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl xl:text-4xl font-semibold text-gray-900 tracking-tight mb-1.5">
            {device.status === "ONLINE" && device.last_temperature !== null
              ? `${device.last_temperature.toFixed(1)}°`
              : "0°"}
          </div>
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className={device.status === "ONLINE" ? "text-emerald-600 font-medium" : "text-rose-500 font-medium"}>
              {device.status === "ONLINE"
                ? (device.last_temperature !== null && device.last_temperature <= 30.0 ? "Норма (18–26 °C)" : "Повышенная")
                : "Отключено"}
            </span>
            <span className="text-gray-400 font-mono text-xs">SHT31 (I2C)</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{
                width: device.status === "ONLINE"
                  ? `${Math.min(100, Math.max(0, (((device.last_temperature || 20) - 15) / 20) * 100))}%`
                  : "0%"
              }}
            />
          </div>
        </div>

        {/* Card 2: Влажность */}
        <div className="rounded-2xl bg-white p-5 sm:p-6 xl:p-7 border border-black/5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500">
              Относительная влажность
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Droplets size={20} strokeWidth={2} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl xl:text-4xl font-semibold text-gray-900 tracking-tight mb-1.5">
            {device.status === "ONLINE" && device.last_humidity !== null
              ? `${device.last_humidity.toFixed(1)}%`
              : "0%"}
          </div>
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className={device.status === "ONLINE" ? "text-emerald-600 font-medium" : "text-rose-500 font-medium"}>
              {device.status === "ONLINE"
                ? (device.last_humidity !== null && device.last_humidity >= 30 && device.last_humidity <= 60 ? "Оптимально (40–60%)" : "В норме")
                : "Отключено"}
            </span>
            <span className="text-gray-400 font-mono text-xs">SHT31 (I2C)</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-500"
              style={{
                width: device.status === "ONLINE"
                  ? `${Math.min(100, Math.max(0, device.last_humidity || 50))}%`
                  : "0%"
              }}
            />
          </div>
        </div>

        {/* Card 3: Ресурс фильтра */}
        <div className="rounded-2xl bg-white p-5 sm:p-6 xl:p-7 border border-black/5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500">
              Ресурс фильтра HEPA
            </span>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={20} strokeWidth={2} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-2xl sm:text-3xl xl:text-4xl font-semibold text-gray-900 tracking-tight">
              {device.filter_life_percent.toFixed(1)}%
            </span>
            <span className="text-xs sm:text-sm text-gray-400 font-mono">
              ({device.filter_hours_used.toFixed(0)}/{device.filter_hours_max}ч)
            </span>
          </div>
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-gray-400">Наработка</span>
            {(activeRole === "ADMIN" || activeRole === "OPERATOR") && (
              <button
                onClick={() => setIsFilterModalOpen(true)}
                className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
              >
                Сброс
              </button>
            )}
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full mt-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                device.filter_life_percent > 20 ? "bg-emerald-500" : "bg-rose-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, device.filter_life_percent))}%` }}
            />
          </div>
        </div>

        {/* Card 4: Состояние прибора */}
        <div className="rounded-2xl bg-white p-5 sm:p-6 xl:p-7 border border-black/5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs sm:text-sm font-medium text-gray-500">
              Состояние прибора
            </span>
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${
              device.status === "ONLINE" && device.fan_active
                ? "bg-blue-50 text-blue-600"
                : "bg-gray-100 text-gray-400"
            }`}>
              <Wind size={20} strokeWidth={2} />
            </div>
          </div>
          <div className="flex items-center gap-2.5 mb-3.5">
            <span className={`w-2.5 h-2.5 rounded-full ${
              device.status === "ONLINE"
                ? (device.fan_active ? "bg-emerald-500" : "bg-gray-400")
                : "bg-rose-500"
            }`} />
            <span className="text-base sm:text-lg xl:text-xl font-semibold text-gray-900 tracking-tight">
              {device.status === "ONLINE"
                ? (device.fan_active ? "Очистка активна" : "Прибор остановлен")
                : "Отключено"}
            </span>
          </div>
          {activeRole === "ADMIN" || activeRole === "OPERATOR" ? (
            <button
              onClick={handleToggleFan}
              disabled={commandLoading || device.status !== "ONLINE"}
              className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm xl:text-base font-medium transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm ${
                device.status !== "ONLINE"
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : (device.fan_active
                      ? "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                      : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer")
              }`}
            >
              <Power size={16} strokeWidth={2.2} />
              <span>
                {device.status !== "ONLINE"
                  ? "Прибор отключен"
                  : (device.fan_active ? "Остановить вентилятор" : "Запустить вентилятор")}
              </span>
            </button>
          ) : (
            <div className="text-xs text-gray-400 pt-1">
              Доступно администраторам и операторам
            </div>
          )}
        </div>
      </section>
      )}

      {/* Desktop Navigation Bar (hidden on mobile, navigation is via top-left burger menu) */}
      <div className="hidden md:flex justify-between items-center gap-4 mb-6 sm:mb-8">
        <div className="overflow-x-auto no-scrollbar pb-1">
          <div className="inline-flex items-center bg-gray-100/90 p-1.5 rounded-2xl gap-1.5 whitespace-nowrap">
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
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-white text-gray-900 font-semibold shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <Icon size={16} strokeWidth={2} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200/80 shadow-sm transition-all cursor-pointer active:scale-95 whitespace-nowrap"
        >
          <Download size={16} strokeWidth={2} />
          <span>Экспорт в CSV</span>
        </button>
      </div>


      {/* TAB 1: OVERVIEW & CHART */}
      {activeTab === "overview" && (
        isLoadingHistory ? <ChartSkeleton /> : <ClimateDynamicsChart history={history} />
      )}

      {/* TAB 2: HISTORY TABLE */}
      {activeTab === "history" && (
        isLoadingHistory ? (
          <TableSkeleton />
        ) : (
          <MeasurementHistoryTable
            history={history}
            onRefresh={() => {
              if (token) {
                setIsLoadingHistory(true);
                fetchHistoryData(token, selectedDeviceId);
              }
            }}
          />
        )
      )}

      {/* TAB 3: ALERTS */}
      {activeTab === "alerts" && (
        isLoadingNotifications ? (
          <AlertsSkeleton />
        ) : (
          <AlertsCenter
            notifications={notifications}
            onResolveAlert={handleResolveAlert}
          />
        )
      )}

      {/* TAB 4: DIAGNOSTICS & SETTINGS */}
      {activeTab === "diagnostics" && (
        isLoadingDiagnostics || !diagnostics ? (
          <DiagnosticsSkeleton />
        ) : (
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
        )
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === "audit" && (
        isLoadingAudit ? (
          <AuditLogsSkeleton />
        ) : (
          <AuditLogsViewer
            auditLogs={auditLogs}
            onRefresh={() => {
              if (token) {
                setIsLoadingAudit(true);
                fetchAuditLogsData(token);
              }
            }}
          />
        )
      )}

      {/* TAB 6: PROFILE & ACCESS CONTROL */}
      {activeTab === "profile" && (
        <UserProfileSection
          activeRole={activeRole}
          onSelectRole={setActiveRole}
          token={token}
        />
      )}

      {/* Apple-style Sheet Modal for Filter Replacement */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border border-black/5 relative max-h-[90vh] overflow-y-auto animate-in fade-in">
            <h3 className="text-base font-semibold text-gray-900 tracking-tight mb-2">
              Сброс наработки фильтра
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              Счетчик наработки моточасов будет сброшен в 0, а ресурс фильтра установлен на 100%. Запись будет зафиксирована в журнале аудита.
            </p>
            <div className="mb-5">
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                Комментарий к замене
              </label>
              <input
                type="text"
                value={filterComment}
                onChange={(e) => setFilterComment(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              />
            </div>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button onClick={handleResetFilter} className="btn btn-primary">
                Подтвердить сброс
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Device Modal (FR-03, FR-18) */}
      <AddDeviceModal
        isOpen={isAddDeviceOpen}
        onClose={() => setIsAddDeviceOpen(false)}
        token={token}
        apiBase={API_BASE}
        onDeviceAdded={(newDevId) => {
          setSelectedDeviceId(newDevId);
          if (token) {
            fetchDevicesList(token);
            fetchDeviceData(token, newDevId);
            fetchHistoryData(token, newDevId);
          }
          setLastActionMsg(`Устройство ${newDevId} успешно зарегистрировано`);
          setTimeout(() => setLastActionMsg(null), 3500);
        }}
      />

      {/* Minimalist Footer in small gray text */}
      <footer className="mt-12 pt-6 pb-6 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400 text-center sm:text-left">
        <p>КазНИТУ им. К.И. Сатпаева • Система мониторинга и контроля воздухоочистителя</p>
        <p>Версия 1.0.4 • ESP32-WROOM-32</p>
      </footer>

      {/* Mobile Burger Menu Drawer (Light Theme, Top-Left) */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        unresolvedAlertsCount={notifications.filter((n) => !n.is_resolved).length}
        device={device}
        devicesList={devicesList}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={(newId) => {
          setSelectedDeviceId(newId);
          setIsLoadingHistory(true);
          if (token) {
            fetchDeviceData(token, newId);
            fetchHistoryData(token, newId);
          }
        }}
        onOpenAddDevice={() => setIsAddDeviceOpen(true)}
        activeRole={activeRole}
        onSelectRole={(role) => setActiveRole(role)}
        onExportCSV={handleExportCSV}
      />
    </div>
  );
}
