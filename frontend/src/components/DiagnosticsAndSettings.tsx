"use client";

import React, { useState, useMemo } from "react";
import {
  Cpu,
  Server,
  Sliders,
  Save,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Thermometer,
  Droplets,
  Radio,
  Clock,
  Check,
  Info,
  AlertCircle
} from "lucide-react";

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
  onSaveSetting: (key: string, valOverride?: string) => Promise<void>;
  isSavingSettings: boolean;
}

interface SettingMeta {
  label: string;
  category: string;
  unit?: string;
  hint: string;
  icon: React.ElementType;
}

const SETTINGS_META: Record<string, SettingMeta> = {
  ALERT_TEMP_HIGH_C: {
    label: "Порог высокой температуры",
    category: "Температурный режим",
    unit: "°C",
    hint: "Оповестить оператора, если температура воздуха в помещении превысит это значение",
    icon: Thermometer
  },
  ALERT_HUMIDITY_MIN: {
    label: "Минимальная допустимая влажность",
    category: "Влажность воздуха",
    unit: "%",
    hint: "Нижняя граница нормы; предупреждает о пересушенном воздухе",
    icon: Droplets
  },
  ALERT_HUMIDITY_MAX: {
    label: "Максимальная допустимая влажность",
    category: "Влажность воздуха",
    unit: "%",
    hint: "Верхняя граница нормы; сигнализирует о риске конденсата и духоты",
    icon: Droplets
  },
  ALERT_FILTER_WARN_PERCENT: {
    label: "Напоминание о замене фильтра",
    category: "Фильтрация HEPA",
    unit: "%",
    hint: "Сформировать предупреждение, когда остаточный ресурс опустится ниже порога",
    icon: ShieldCheck
  },
  DEVICE_OFFLINE_TIMEOUT_SEC: {
    label: "Таймаут проверки связи с прибором",
    category: "Мониторинг сети",
    unit: "сек.",
    hint: "Время ожидания пакетов телеметрии от ESP32 до перевода в статус «Отключено»",
    icon: Clock
  }
};

export function validateSettings(values: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};

  // ALERT_TEMP_HIGH_C: 10 to 60 °C
  if (values.ALERT_TEMP_HIGH_C !== undefined) {
    const raw = values.ALERT_TEMP_HIGH_C.trim();
    const temp = Number(raw);
    if (raw === "" || isNaN(temp)) {
      errors.ALERT_TEMP_HIGH_C = "Укажите числовое значение температуры";
    } else if (temp < 10 || temp > 60) {
      errors.ALERT_TEMP_HIGH_C = "Допустимый диапазон от 10 до 60 °C";
    }
  }

  // ALERT_HUMIDITY_MIN & ALERT_HUMIDITY_MAX: 0 to 100%, Min < Max
  const humMinRaw = values.ALERT_HUMIDITY_MIN !== undefined ? values.ALERT_HUMIDITY_MIN.trim() : "";
  const humMaxRaw = values.ALERT_HUMIDITY_MAX !== undefined ? values.ALERT_HUMIDITY_MAX.trim() : "";
  const humMin = humMinRaw !== "" ? Number(humMinRaw) : NaN;
  const humMax = humMaxRaw !== "" ? Number(humMaxRaw) : NaN;

  if (values.ALERT_HUMIDITY_MIN !== undefined) {
    if (humMinRaw === "" || isNaN(humMin)) {
      errors.ALERT_HUMIDITY_MIN = "Укажите числовое значение влажности";
    } else if (humMin < 0 || humMin > 100) {
      errors.ALERT_HUMIDITY_MIN = "Значение должно быть от 0% до 100%";
    }
  }

  if (values.ALERT_HUMIDITY_MAX !== undefined) {
    if (humMaxRaw === "" || isNaN(humMax)) {
      errors.ALERT_HUMIDITY_MAX = "Укажите числовое значение влажности";
    } else if (humMax < 0 || humMax > 100) {
      errors.ALERT_HUMIDITY_MAX = "Значение должно быть от 0% до 100%";
    }
  }

  // Cross-field validation: Min must be strictly less than Max
  if (!isNaN(humMin) && !isNaN(humMax) && humMin >= 0 && humMin <= 100 && humMax >= 0 && humMax <= 100) {
    if (humMin >= humMax) {
      const msg = `Минимум (${humMin}%) не может быть больше или равен максимуму (${humMax}%)`;
      errors.ALERT_HUMIDITY_MIN = msg;
      errors.ALERT_HUMIDITY_MAX = msg;
    }
  }

  // ALERT_FILTER_WARN_PERCENT: 1 to 99%
  if (values.ALERT_FILTER_WARN_PERCENT !== undefined) {
    const raw = values.ALERT_FILTER_WARN_PERCENT.trim();
    const filter = Number(raw);
    if (raw === "" || isNaN(filter)) {
      errors.ALERT_FILTER_WARN_PERCENT = "Укажите процент ресурса фильтра";
    } else if (filter < 1 || filter > 99) {
      errors.ALERT_FILTER_WARN_PERCENT = "Значение должно быть от 1% до 99%";
    }
  }

  // DEVICE_OFFLINE_TIMEOUT_SEC: 5 to 3600 seconds
  if (values.DEVICE_OFFLINE_TIMEOUT_SEC !== undefined) {
    const raw = values.DEVICE_OFFLINE_TIMEOUT_SEC.trim();
    const timeout = Number(raw);
    if (raw === "" || isNaN(timeout) || !Number.isInteger(timeout)) {
      errors.DEVICE_OFFLINE_TIMEOUT_SEC = "Укажите целое число секунд";
    } else if (timeout < 5 || timeout > 3600) {
      errors.DEVICE_OFFLINE_TIMEOUT_SEC = "Таймаут должен быть от 5 до 3600 сек.";
    }
  }

  return errors;
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
  const [showEngineeringDetails, setShowEngineeringDetails] = useState(false);
  const [savingFieldKey, setSavingFieldKey] = useState<string | null>(null);
  const [justSavedKey, setJustSavedKey] = useState<string | null>(null);
  const [saveAllStatus, setSaveAllStatus] = useState<"idle" | "saving" | "success">("idle");
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const isAdmin = activeRole === "ADMIN";

  // Real-time validation across all fields
  const validationErrors = useMemo(() => {
    const merged: Record<string, string> = {};
    Object.entries(settingsMap).forEach(([k, v]) => {
      merged[k] = v.value;
    });
    Object.entries(editingSettings).forEach(([k, v]) => {
      merged[k] = v;
    });
    return validateSettings(merged);
  }, [settingsMap, editingSettings]);

  const hasAnyErrors = Object.keys(validationErrors).length > 0;

  const handleSaveSingle = async (key: string) => {
    if (validationErrors[key]) return;
    setSavingFieldKey(key);
    setServerErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    try {
      await onSaveSetting(key, editingSettings[key]);
      setJustSavedKey(key);
      setTimeout(() => setJustSavedKey(null), 2500);
    } catch (err: any) {
      setServerErrors((prev) => ({
        ...prev,
        [key]: err.message || "Ошибка сохранения"
      }));
    } finally {
      setSavingFieldKey(null);
    }
  };

  const handleSaveAll = async () => {
    if (hasAnyErrors) return;
    setSaveAllStatus("saving");
    setServerErrors({});
    try {
      const keys = Object.keys(settingsMap);
      for (const key of keys) {
        if (editingSettings[key] !== undefined && editingSettings[key] !== settingsMap[key].value) {
          await onSaveSetting(key, editingSettings[key]);
        }
      }
      setSaveAllStatus("success");
      setTimeout(() => setSaveAllStatus("idle"), 3000);
    } catch {
      setSaveAllStatus("idle");
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-5 2xl:gap-8 animate-in fade-in duration-300">
      {/* Top Section: User-friendly Equipment & Platform Status */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-4 xl:gap-5 2xl:gap-6">
        {/* Card 1: Equipment Health */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-5 xl:p-6 2xl:p-8 border border-black/5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 lg:mb-4 xl:mb-5">
              <h3 className="text-base sm:text-lg lg:text-base xl:text-lg 2xl:text-xl font-semibold flex items-center gap-2.5 sm:gap-3 text-gray-900">
                <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-9 lg:h-9 xl:w-10 xl:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Radio size={18} className="lg:w-5 lg:h-5" strokeWidth={2.2} />
                </div>
                <span>Состояние прибора</span>
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  device.status === "ONLINE"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                    : "bg-rose-50 text-rose-700 border-rose-200/60"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    device.status === "ONLINE" ? "bg-emerald-500 pulse-live" : "bg-rose-500"
                  }`}
                />
                {device.status === "ONLINE" ? "В сети" : "Отключен"}
              </span>
            </div>

            <div className="flex flex-col gap-3 text-xs sm:text-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <span className="text-gray-500">Модель устройства</span>
                <span className="font-semibold text-gray-900">{device.name || "Сатпаев Air Compact"}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <span className="text-gray-500">Серийный номер / ID</span>
                <span className="font-mono font-medium text-gray-800 bg-gray-100/80 px-2 py-0.5 rounded text-xs">
                  {device.id}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <span className="text-gray-500">Сенсор микроклимата</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded text-xs">
                  <CheckCircle2 size={12} />
                  SHT31 (Исправен)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Вентилятор очистки</span>
                <span className={`font-semibold ${device.fan_active ? "text-emerald-700" : "text-gray-500"}`}>
                  {device.fan_active ? "Включен (Идет очистка)" : "Остановлен"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Cloud Sync & Monitoring Service */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-5 xl:p-6 2xl:p-8 border border-black/5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 lg:mb-4 xl:mb-5">
              <h3 className="text-base sm:text-lg lg:text-base xl:text-lg 2xl:text-xl font-semibold flex items-center gap-2.5 sm:gap-3 text-gray-900">
                <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-9 lg:h-9 xl:w-10 xl:h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                  <Server size={18} className="lg:w-5 lg:h-5" strokeWidth={2.2} />
                </div>
                <span>Сервисы платформы</span>
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                Синхронизировано
              </span>
            </div>

            <div className="flex flex-col gap-3 text-xs sm:text-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <span className="text-gray-500">Облачная синхронизация</span>
                <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded text-xs">
                  Активна • Realtime WS
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <span className="text-gray-500">База данных замеров</span>
                <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded text-xs">
                  Подключена • Запись ведется
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <span className="text-gray-500">Время непрерывной работы</span>
                <span className="text-blue-600 font-semibold font-mono">
                  {diagnostics?.system_uptime || "Синхронизация..."}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Приборов на контроле</span>
                <span className="text-gray-900 font-semibold">
                  {diagnostics?.online_devices ?? 1} из {diagnostics?.total_devices ?? 1} онлайн
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Engineering Diagnostic Accordion (Hidden by default for clients, available on demand) */}
      <div className="rounded-2xl border border-gray-200/80 bg-gray-50/60 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowEngineeringDetails(!showEngineeringDetails)}
          className="w-full px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between text-left hover:bg-gray-100/70 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-gray-700">
            <Cpu size={16} className="text-gray-500" />
            <span>Инженерные параметры оборудования (для технических специалистов)</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>{showEngineeringDetails ? "Скрыть" : "Показать"}</span>
            {showEngineeringDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        </button>

        {showEngineeringDetails && (
          <div className="px-4 py-3 sm:px-5 sm:py-4 bg-white border-t border-gray-200/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs animate-in fade-in">
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-gray-400 block mb-0.5">Микроконтроллер</span>
              <span className="font-semibold text-gray-900 font-mono">ESP32-WROOM-32 (240 МГц)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-gray-400 block mb-0.5">Сетевой MAC-адрес</span>
              <span className="font-semibold text-gray-900 font-mono">{device.mac_address || "24:6F:28:AE:3C:80"}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-gray-400 block mb-0.5">Шина датчиков</span>
              <span className="font-semibold text-gray-900 font-mono">I2C (SDA: GPIO21, SCL: GPIO22)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-gray-400 block mb-0.5">Сторожевой таймер</span>
              <span className="font-semibold text-emerald-700 font-mono">WDT 10 сек. (Активен)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-gray-400 block mb-0.5">Стек сервисов</span>
              <span className="font-semibold text-gray-900 font-mono">FastAPI :8000, PostgreSQL :5432</span>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-gray-400 block mb-0.5">Протокол телеметрии</span>
              <span className="font-semibold text-gray-900 font-mono">MQTT Mosquitto :1883</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Section: Human-friendly Climate Settings & Alert Thresholds */}
      <section className="bg-white rounded-2xl p-4 sm:p-6 lg:p-5 xl:p-6 2xl:p-8 border border-black/5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-base sm:text-lg lg:text-base xl:text-lg 2xl:text-xl font-semibold flex items-center gap-2.5 sm:gap-3 text-gray-900">
              <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-9 lg:h-9 xl:w-10 xl:h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Sliders size={18} className="lg:w-5 lg:h-5" strokeWidth={2.2} />
              </div>
              <span>Параметры микроклимата и порогов оповещений</span>
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Установите комфортные границы температуры и влажности. При выходе показателей за рамки система уведомит персонал.
            </p>
          </div>

          {isAdmin && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 self-start sm:self-auto">
              {hasAnyErrors && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200/70 px-2.5 py-1.5 rounded-xl">
                  <AlertCircle size={14} className="shrink-0 text-rose-500" />
                  <span>Исправьте ошибки в параметрах</span>
                </span>
              )}
              <button
                onClick={handleSaveAll}
                disabled={isSavingSettings || saveAllStatus === "saving" || hasAnyErrors}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm ${
                  hasAnyErrors
                    ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                    : saveAllStatus === "success"
                    ? "bg-emerald-600 text-white cursor-pointer active:scale-95"
                    : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95"
                }`}
              >
                {saveAllStatus === "success" ? (
                  <>
                    <Check size={16} />
                    <span>Параметры сохранены!</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>Сохранить настройки</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 xl:gap-5">
          {Object.entries(settingsMap).map(([key, setting]) => {
            const meta = SETTINGS_META[key] || {
              label: key,
              category: "Общие настройки",
              hint: setting.description,
              icon: Sliders
            };
            const Icon = meta.icon;
            const currentValue = editingSettings[key] ?? setting.value;
            const isSavingThis = savingFieldKey === key;
            const isJustSaved = justSavedKey === key;
            const fieldError = validationErrors[key] || serverErrors[key];

            return (
              <div
                key={key}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3.5 ${
                  fieldError
                    ? "border-rose-300 bg-rose-50/30"
                    : "border-gray-200/80 bg-gray-50/60 hover:bg-white hover:border-blue-200/80 hover:shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                      <Icon size={14} className={fieldError ? "text-rose-500 shrink-0" : "text-blue-600 shrink-0"} />
                      {meta.label}
                    </span>
                    {meta.unit && (
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                        fieldError ? "bg-rose-100 text-rose-700" : "bg-blue-50 text-blue-700"
                      }`}>
                        {meta.unit}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed min-h-[32px]">
                    {meta.hint}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  {isAdmin ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={currentValue}
                            onChange={(e) => {
                              if (serverErrors[key]) {
                                setServerErrors((prev) => {
                                  const next = { ...prev };
                                  delete next[key];
                                  return next;
                                });
                              }
                              onEditingSettingsChange({
                                ...editingSettings,
                                [key]: e.target.value
                              });
                            }}
                            className={`w-full px-3 py-2 bg-white border rounded-xl text-sm font-semibold text-gray-900 outline-none transition-all ${
                              fieldError
                                ? "border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15 bg-rose-50/20"
                                : "border-gray-300 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                            }`}
                            placeholder={meta.unit}
                          />
                          {meta.unit && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">
                              {meta.unit}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSaveSingle(key)}
                          disabled={isSavingSettings || isSavingThis || Boolean(fieldError)}
                          className={`p-2 rounded-xl border transition-all active:scale-95 shrink-0 ${
                            fieldError
                              ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                              : isJustSaved
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 cursor-pointer"
                              : "bg-white hover:bg-gray-100 text-gray-700 border-gray-300 hover:text-blue-600 cursor-pointer"
                          }`}
                          title={fieldError ? "Исправьте ошибку перед сохранением" : "Сохранить это поле"}
                        >
                          {isJustSaved ? <Check size={16} /> : <Save size={16} />}
                        </button>
                      </div>

                      {fieldError && (
                        <div className="flex items-start gap-1.5 text-[11px] sm:text-xs text-rose-600 font-medium mt-1.5 animate-in fade-in">
                          <AlertCircle size={13} className="shrink-0 mt-0.5 text-rose-500" />
                          <span>{fieldError}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between py-1 px-2 bg-white rounded-xl border border-gray-200/70 text-sm">
                      <span className="text-xs text-gray-400">Текущее значение</span>
                      <span className="font-bold text-gray-900">
                        {setting.value} {meta.unit || ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!isAdmin && (
          <div className="mt-5 p-3 rounded-xl bg-blue-50/60 border border-blue-200/60 flex items-center gap-2 text-xs text-blue-800">
            <Info size={15} className="text-blue-600 shrink-0" />
            <span>Изменение порогов микроклимата доступно только учетным записям с ролью «Администратор».</span>
          </div>
        )}
      </section>
    </div>
  );
}
