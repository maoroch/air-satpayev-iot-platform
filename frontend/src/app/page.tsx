"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
  Sliders,
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
  AuthSession,
  RoleKey,
  getActiveSession,
  getAuthSessions,
  switchActiveSession,
  removeSession,
  logoutAll
} from "../utils/auth";
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
  const router = useRouter();

  // Authentication & Multi-Account Session state
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [activeSession, setActiveSession] = useState<AuthSession | null>(null);
  const [activeRole, setActiveRole] = useState<RoleKey>("OPERATOR");
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

  // Dynamic Thresholds from user settings
  const tempHighThreshold = useMemo(() => {
    const raw = settingsMap["ALERT_TEMP_HIGH_C"]?.value;
    const val = raw ? parseFloat(raw) : NaN;
    return isNaN(val) ? 35.0 : val;
  }, [settingsMap]);

  const humidityMinThreshold = useMemo(() => {
    const raw = settingsMap["ALERT_HUMIDITY_MIN"]?.value;
    const val = raw ? parseFloat(raw) : NaN;
    return isNaN(val) ? 20.0 : val;
  }, [settingsMap]);

  const humidityMaxThreshold = useMemo(() => {
    const raw = settingsMap["ALERT_HUMIDITY_MAX"]?.value;
    const val = raw ? parseFloat(raw) : NaN;
    return isNaN(val) ? 80.0 : val;
  }, [settingsMap]);

  // 1. Session verification & route protection on mount
  useEffect(() => {
    const current = getActiveSession();
    if (!current) {
      router.replace("/login");
      return;
    }
    setActiveSession(current);
    setSessions(getAuthSessions());
    setToken(current.token);
    setActiveRole(current.role);
    setIsCheckingAuth(false);
  }, [router]);

  // Session switching & management handlers
  const handleSwitchSession = useCallback((email: string) => {
    const switched = switchActiveSession(email);
    if (switched) {
      setActiveSession(switched);
      setToken(switched.token);
      setActiveRole(switched.role);
      setSessions(getAuthSessions());
      setLastActionMsg(`Переключено на аккаунт: ${switched.full_name} (${switched.role})`);
      setTimeout(() => setLastActionMsg(null), 3500);
    }
  }, []);

  const handleLogoutSession = useCallback((email: string) => {
    removeSession(email);
    const remaining = getAuthSessions();
    setSessions(remaining);
    const current = getActiveSession();
    if (!current) {
      router.replace("/login");
    } else {
      setActiveSession(current);
      setToken(current.token);
      setActiveRole(current.role);
      setLastActionMsg(`Аккаунт ${email} удален из сессии`);
      setTimeout(() => setLastActionMsg(null), 3000);
    }
  }, [router]);

  const handleLogoutAll = useCallback(() => {
    logoutAll();
    router.replace("/login");
  }, [router]);

  const handleAddAccount = useCallback(() => {
    router.push("/login");
  }, [router]);

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
        setEditingSettings((prev) => {
          // If not initialized yet, populate with DB values
          if (Object.keys(prev).length === 0) {
            const initialForm: Record<string, string> = {};
            Object.entries(data).forEach(([k, v]: [string, any]) => {
              initialForm[k] = v.value;
            });
            return initialForm;
          }
          // Preserve any values currently being typed by the user, only add new keys
          const next = { ...prev };
          let changed = false;
          Object.entries(data).forEach(([k, v]: [string, any]) => {
            if (next[k] === undefined) {
              next[k] = v.value;
              changed = true;
            }
          });
          return changed ? next : prev;
        });
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
    fetchSettingsData(token);

    if (activeTab === "audit") {
      if (auditLogs.length === 0) setIsLoadingAudit(true);
      fetchAuditLogsData(token);
    } else if (activeTab === "diagnostics") {
      if (!diagnostics) setIsLoadingDiagnostics(true);
      fetchDiagnosticsData(token);
    }

    const interval = setInterval(() => {
      fetchDevicesList(token);
      fetchDeviceData(token, selectedDeviceId);
      fetchHistoryData(token, selectedDeviceId);
      fetchNotificationsData(token);
      fetchSettingsData(token);

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

  const handleSaveSetting = async (key: string, overrideVal?: string) => {
    if (!token) return;
    setIsSavingSettings(true);
    try {
      const val = overrideVal !== undefined ? overrideVal : editingSettings[key];
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
        // Synchronize local states so UI reflects new value immediately
        setSettingsMap((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            value: String(val)
          }
        }));
        setEditingSettings((prev) => ({
          ...prev,
          [key]: String(val)
        }));
      } else {
        const errData = await res.json().catch(() => null);
        const errMsg = errData?.detail || "Недостаточно прав (требуется ADMIN) или некорректное значение";
        setLastActionMsg(errMsg);
        throw new Error(errMsg);
      }
    } catch (err: any) {
      if (!lastActionMsg) {
        setLastActionMsg(err.message || "Ошибка сохранения параметра");
      }
      throw err;
    } finally {
      setIsSavingSettings(false);
      setTimeout(() => setLastActionMsg(null), 4000);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-black/5 flex items-center justify-center shadow-sm">
            <Wind size={22} className="text-blue-600" />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>Загрузка системы...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1720px] 2xl:max-w-[1800px] mx-auto px-4 sm:px-6 md:px-8 lg:px-[80px] xl:px-[100px] 2xl:px-[100px] pt-6 sm:pt-7 lg:pt-8 xl:pt-10 2xl:pt-12 pb-6 sm:pb-8 lg:pb-10 2xl:pb-14">
      {/* Apple-style Top Bar */}
      <header className="flex flex-row justify-between items-center p-3.5 sm:p-4 lg:p-4 xl:p-4.5 2xl:p-6 mb-4 sm:mb-5 lg:mb-5 2xl:mb-8 gap-3 sm:gap-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-black/5 shadow-sm">
        {/* Left Branding with Top-Left Burger Button */}
        <div className="flex items-center gap-2.5">
          {/* Mobile & Tablet Burger Menu Button - Top Left ONLY */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 border border-black/5 transition-all active:scale-95 cursor-pointer shadow-xs shrink-0"
            aria-label="Открыть меню навигации"
            title="Меню навигации"
          >
            <Menu size={19} />
          </button>

          <div className="w-8.5 h-8.5 lg:w-9 lg:h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Wind size={19} strokeWidth={2.2} />
          </div>
          <span className="text-sm sm:text-base font-semibold text-gray-900 tracking-tight">
            Воздухоочиститель
          </span>
        </div>

        {/* Center: Device Selector & Add Device Button (hidden on mobile & tablet, present in burger menu) */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex-initial flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-gray-100/80 hover:bg-gray-200/70 border border-black/5 transition-all relative">
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

        {/* Right Section: Status Badge & Profile Button */}
        <div className="flex items-center gap-2.5">
          {/* Status badge: visible on tablet and desktop, compact */}
          <div className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${device.status === "ONLINE"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
            : "bg-rose-50 text-rose-700 border-rose-200/70"
            }`}>
            <span
              className={`w-2 h-2 rounded-full ${device.status === "ONLINE" ? "bg-emerald-500 pulse-live" : "bg-rose-500"
                }`}
            />
            {device.status === "ONLINE" ? "Подключено" : "Отключено"}
          </div>

          {/* Profile Navigation Button: desktop only (lg:), on tablet/mobile it's in burger menu */}
          <button
            onClick={() => setActiveTab("profile")}
            className={`hidden lg:inline-flex items-center gap-2 px-3 py-1.5 lg:px-3.5 lg:py-1.5 rounded-xl border text-xs sm:text-sm font-medium transition-all active:scale-95 cursor-pointer shadow-xs ${activeTab === "profile"
              ? "bg-blue-600 text-white border-blue-600 shadow-blue-500/20"
              : "bg-white hover:bg-gray-50 text-gray-800 border-gray-200"
              }`}
            title="Перейти в профиль пользователя и управление доступом"
          >
            <User size={14} className={activeTab === "profile" ? "text-white" : "text-blue-600"} />
            <span className="font-semibold">
              {activeSession?.full_name ? activeSession.full_name.split(" ")[0] : "Профиль"}
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${activeTab === "profile" ? "bg-white/20 text-white" : "bg-blue-50 text-blue-700"
              }`}>
              {activeSession?.role || activeRole}
            </span>
          </button>
        </div>
      </header>

      {/* Action Notification Banner */}
      {lastActionMsg && (
        <div className="bg-emerald-50 border border-emerald-200/60 text-emerald-800 px-4 py-3 rounded-xl mb-4 sm:mb-6 flex items-center gap-2.5 text-sm font-medium animate-in fade-in">
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
          className={`${["alerts", "diagnostics", "audit", "profile"].includes(activeTab)
            ? "hidden md:grid"
            : "grid"
            } grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-3.5 xl:gap-4.5 2xl:gap-6 mb-4 sm:mb-5 lg:mb-5 2xl:mb-8`}
        >
          {/* Card 1: Температура */}
          <div className="rounded-2xl bg-white p-4 sm:p-4.5 lg:p-4.5 xl:p-5 2xl:p-7 border border-black/5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2.5 lg:mb-2 2xl:mb-3">
              <span className="text-xs lg:text-xs xl:text-sm font-medium text-gray-500">
                Температура воздуха
              </span>
              <div className="w-8 h-8 lg:w-8.5 lg:h-8.5 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Thermometer size={18} className="lg:w-4.5 lg:h-4.5 2xl:w-5 2xl:h-5" strokeWidth={2} />
              </div>
            </div>
            <div className="text-2xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-semibold text-gray-900 tracking-tight mb-1">
              {device.status === "ONLINE" && device.last_temperature !== null
                ? `${device.last_temperature.toFixed(1)}°`
                : "0°"}
            </div>
            <div className="flex items-center justify-between text-xs xl:text-sm">
              <span className={
                device.status !== "ONLINE"
                  ? "text-rose-500 font-medium"
                  : (device.last_temperature !== null && device.last_temperature > tempHighThreshold)
                    ? "text-rose-600 font-semibold"
                    : "text-emerald-600 font-medium"
              }>
                {device.status === "ONLINE"
                  ? (device.last_temperature !== null
                    ? (device.last_temperature > tempHighThreshold
                      ? `Выше нормы (> ${tempHighThreshold.toFixed(0)} °C)`
                      : `Норма (до ${tempHighThreshold.toFixed(0)} °C)`)
                    : "Нет данных")
                  : "Отключено"}
              </span>
              <span className="text-gray-400 font-mono text-xs">SHT31 (I2C)</span>
            </div>
            <div className="h-1 lg:h-1.5 bg-gray-100 rounded-full mt-3 lg:mt-3.5 2xl:mt-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${device.status === "ONLINE" && device.last_temperature !== null && device.last_temperature > tempHighThreshold
                    ? "bg-rose-500"
                    : "bg-blue-600"
                  }`}
                style={{
                  width: device.status === "ONLINE"
                    ? `${Math.min(100, Math.max(0, (((device.last_temperature || 20) - 15) / 25) * 100))}%`
                    : "0%"
                }}
              />
            </div>
          </div>

          {/* Card 2: Влажность */}
          <div className="rounded-2xl bg-white p-4 sm:p-4.5 lg:p-4.5 xl:p-5 2xl:p-7 border border-black/5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2.5 lg:mb-2 2xl:mb-3">
              <span className="text-xs lg:text-xs xl:text-sm font-medium text-gray-500">
                Относительная влажность
              </span>
              <div className="w-8 h-8 lg:w-8.5 lg:h-8.5 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Droplets size={18} className="lg:w-4.5 lg:h-4.5 2xl:w-5 2xl:h-5" strokeWidth={2} />
              </div>
            </div>
            <div className="text-2xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-semibold text-gray-900 tracking-tight mb-1">
              {device.status === "ONLINE" && device.last_humidity !== null
                ? `${device.last_humidity.toFixed(1)}%`
                : "0%"}
            </div>
            <div className="flex items-center justify-between text-xs xl:text-sm">
              <span className={
                device.status !== "ONLINE"
                  ? "text-rose-500 font-medium"
                  : (device.last_humidity !== null && (device.last_humidity < humidityMinThreshold || device.last_humidity > humidityMaxThreshold))
                    ? "text-amber-600 font-semibold"
                    : "text-emerald-600 font-medium"
              }>
                {device.status === "ONLINE"
                  ? (device.last_humidity !== null
                    ? (device.last_humidity < humidityMinThreshold
                      ? `Ниже нормы (< ${humidityMinThreshold.toFixed(0)}%)`
                      : (device.last_humidity > humidityMaxThreshold
                        ? `Выше нормы (> ${humidityMaxThreshold.toFixed(0)}%)`
                        : `Норма (${humidityMinThreshold.toFixed(0)}–${humidityMaxThreshold.toFixed(0)}%)`))
                    : "Нет данных")
                  : "Отключено"}
              </span>
              <span className="text-gray-400 font-mono text-xs">SHT31 (I2C)</span>
            </div>
            <div className="h-1 lg:h-1.5 bg-gray-100 rounded-full mt-3 lg:mt-3.5 2xl:mt-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${device.status === "ONLINE" && device.last_humidity !== null && (device.last_humidity < humidityMinThreshold || device.last_humidity > humidityMaxThreshold)
                    ? "bg-amber-500"
                    : "bg-teal-500"
                  }`}
                style={{
                  width: device.status === "ONLINE"
                    ? `${Math.min(100, Math.max(0, device.last_humidity || 50))}%`
                    : "0%"
                }}
              />
            </div>
          </div>

          {/* Card 3: Ресурс фильтра */}
          <div className="rounded-2xl bg-white p-4 sm:p-4.5 lg:p-4.5 xl:p-5 2xl:p-7 border border-black/5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2.5 lg:mb-2 2xl:mb-3">
              <span className="text-xs lg:text-xs xl:text-sm font-medium text-gray-500">
                Ресурс фильтра HEPA
              </span>
              <div className="w-8 h-8 lg:w-8.5 lg:h-8.5 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck size={18} className="lg:w-4.5 lg:h-4.5 2xl:w-5 2xl:h-5" strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-2xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-semibold text-gray-900 tracking-tight">
                {device.filter_life_percent.toFixed(1)}%
              </span>
              <span className="text-xs xl:text-sm text-gray-400 font-mono">
                ({device.filter_hours_used.toFixed(0)}/{device.filter_hours_max}ч)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs xl:text-sm">
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
            <div className="h-1 lg:h-1.5 bg-gray-100 rounded-full mt-3 lg:mt-3.5 2xl:mt-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${device.filter_life_percent > 20 ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                style={{ width: `${Math.min(100, Math.max(0, device.filter_life_percent))}%` }}
              />
            </div>
          </div>

          {/* Card 4: Состояние прибора */}
          <div className="rounded-2xl bg-white p-4 sm:p-4.5 lg:p-4.5 xl:p-5 2xl:p-7 border border-black/5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2.5 lg:mb-2 2xl:mb-3">
              <span className="text-xs lg:text-xs xl:text-sm font-medium text-gray-500">
                Состояние вентилятора
              </span>
              <div className={`w-8 h-8 lg:w-8.5 lg:h-8.5 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 rounded-xl flex items-center justify-center ${device.status === "ONLINE" && device.fan_active
                ? "bg-blue-50 text-blue-600"
                : "bg-gray-100 text-gray-400"
                }`}>
                <Wind size={18} className="lg:w-4.5 lg:h-4.5 2xl:w-5 2xl:h-5" strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2.5 lg:mb-2.5 2xl:mb-3.5">
              <span className={`w-2 h-2 2xl:w-2.5 2xl:h-2.5 rounded-full ${device.status === "ONLINE"
                ? (device.fan_active ? "bg-emerald-500" : "bg-gray-400")
                : "bg-rose-500"
                }`} />
              <span className="text-sm sm:text-base lg:text-base xl:text-lg 2xl:text-xl font-semibold text-gray-900 tracking-tight">
                {device.status === "ONLINE"
                  ? (device.fan_active ? "Активен" : "Прибор остановлен")
                  : "Отключено"}
              </span>
            </div>
            {activeRole === "ADMIN" || activeRole === "OPERATOR" ? (
              <button
                onClick={handleToggleFan}
                disabled={commandLoading || device.status !== "ONLINE"}
                className={`w-full py-1.5 lg:py-2 xl:py-2.5 2xl:py-3 px-3 rounded-xl text-xs xl:text-sm 2xl:text-base font-medium transition-all active:scale-95 flex items-center justify-center gap-1.5 xl:gap-2 shadow-sm ${device.status !== "ONLINE"
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : (device.fan_active
                    ? "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                    : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer")
                  }`}
              >
                <Power size={14} className="xl:w-4 xl:h-4" strokeWidth={2.2} />
                <span>
                  {device.status !== "ONLINE"
                    ? "Прибор отключен"
                    : (device.fan_active ? "Остановить" : "Запустить")}
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

      {/* Desktop Navigation Bar (hidden on mobile and tablet, navigation is via top-left burger menu) */}
      <div className="hidden lg:flex justify-between items-center gap-3 xl:gap-4 mb-4 sm:mb-5 lg:mb-5 2xl:mb-8">
        <div className="overflow-x-auto no-scrollbar pb-1">
          <div className="inline-flex items-center bg-gray-100/90 p-1 lg:p-1.2 xl:p-1.5 rounded-2xl gap-1 lg:gap-1.5 whitespace-nowrap">
            {[
              { id: "overview", label: "Аналитика", icon: Activity },
              { id: "history", label: "История замеров", icon: Clock },
              { id: "alerts", label: `Оповещения (${notifications.filter((n) => !n.is_resolved).length})`, icon: AlertTriangle },
              { id: "diagnostics", label: "Настройки и статус", icon: Sliders },
              { id: "audit", label: "История событий", icon: Activity }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`inline-flex items-center gap-1.5 xl:gap-2 px-3 py-1.5 lg:px-3 lg:py-1.5 xl:px-4 xl:py-2 rounded-xl text-xs xl:text-sm font-medium transition-all cursor-pointer ${isActive
                    ? "bg-white text-gray-900 font-semibold shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                    }`}
                >
                  <Icon size={14} className="xl:w-4 xl:h-4" strokeWidth={2} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center justify-center gap-1.5 xl:gap-2 px-3.5 py-1.5 lg:px-3.5 lg:py-2 xl:px-5 xl:py-2.5 rounded-xl text-xs xl:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200/80 shadow-sm transition-all cursor-pointer active:scale-95 whitespace-nowrap"
        >
          <Download size={14} className="xl:w-4 xl:h-4" strokeWidth={2} />
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
          activeSession={activeSession}
          allSessions={sessions}
          onSwitchSession={handleSwitchSession}
          onLogoutSession={handleLogoutSession}
          onLogoutAll={handleLogoutAll}
          onAddAccount={handleAddAccount}
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
        activeSession={activeSession}
        allSessions={sessions}
        onSwitchSession={handleSwitchSession}
        onAddAccount={handleAddAccount}
        onLogoutAll={handleLogoutAll}
        onExportCSV={handleExportCSV}
      />
    </div>
  );
}
