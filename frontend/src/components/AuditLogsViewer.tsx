"use client";

import React, { useState, useMemo } from "react";
import {
  RefreshCw,
  Clock,
  User,
  Power,
  ShieldCheck,
  UserPlus,
  Sliders,
  BellRing,
  Activity,
  Code2,
  ChevronDown,
  ChevronUp,
  Cpu,
  CheckCircle2
} from "lucide-react";
import { formatDateWithTime } from "../utils/date";

export interface AuditLogItem {
  id: number;
  user_email: string;
  action: string;
  details: string;
  created_at: string;
}

interface AuditLogsViewerProps {
  auditLogs: AuditLogItem[];
  onRefresh: () => void;
}

type EventFilter = "ALL" | "FAN" | "FILTER" | "USER" | "SETTINGS";

interface ParsedEvent {
  id: number;
  rawAction: string;
  rawDetails: string;
  title: string;
  category: "FAN" | "FILTER" | "USER" | "SETTINGS" | "SYSTEM";
  description: string;
  badgeLabel: string;
  badgeStyle: string;
  iconBg: string;
  iconColor: string;
  icon: React.ElementType;
  initiatorName: string;
  initiatorEmail: string;
  isSystem: boolean;
  createdAt: string;
}

function parseAuditLog(log: AuditLogItem): ParsedEvent {
  const isSystem =
    log.user_email.includes("adapter@") ||
    log.user_email.includes("system") ||
    log.user_email.includes("iot");

  const initiatorName = isSystem
    ? "Автоматика прибора"
    : log.user_email.split("@")[0];

  // 1. FAN COMMANDS
  if (log.action.includes("SET_FAN") || log.action.includes("FAN")) {
    const isAck = log.action.startsWith("COMMAND_ACK");
    const isEnabled =
      log.details.includes("'enabled': True") ||
      log.details.includes("Fan set to ON") ||
      log.details.includes("enabled=true") ||
      log.details.includes("включение");

    if (isEnabled) {
      return {
        id: log.id,
        rawAction: log.action,
        rawDetails: log.details,
        title: isAck ? "Подтверждение: очистка воздуха запущена" : "Включение очистки воздуха",
        category: "FAN",
        description: isAck
          ? "Контроллер ESP32 подтвердил запуск мотора вентилятора в штатном режиме"
          : "Отправлена команда запуска мотора вентилятора воздухоочистителя",
        badgeLabel: "Очистка активна",
        badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        icon: Power,
        initiatorName,
        initiatorEmail: log.user_email,
        isSystem,
        createdAt: log.created_at
      };
    } else {
      return {
        id: log.id,
        rawAction: log.action,
        rawDetails: log.details,
        title: isAck ? "Подтверждение: очистка воздуха остановлена" : "Остановка очистки воздуха",
        category: "FAN",
        description: isAck
          ? "Контроллер ESP32 подтвердил остановку мотора вентилятора"
          : "Отправлена команда отключения вентилятора воздухоочистителя",
        badgeLabel: "Остановлен",
        badgeStyle: "bg-gray-100 text-gray-700 border-gray-200",
        iconBg: "bg-gray-100",
        iconColor: "text-gray-500",
        icon: Power,
        initiatorName,
        initiatorEmail: log.user_email,
        isSystem,
        createdAt: log.created_at
      };
    }
  }

  // 2. FILTER RESET
  if (log.action.includes("FILTER")) {
    return {
      id: log.id,
      rawAction: log.action,
      rawDetails: log.details,
      title: "Сброс наработки фильтра HEPA",
      category: "FILTER",
      description: "Счетчик моточасов обнулен в 0. Ресурс фильтра установлен на 100%. Физическая замена зафиксирована.",
      badgeLabel: "Фильтр HEPA",
      badgeStyle: "bg-blue-50 text-blue-700 border-blue-200/60",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      icon: ShieldCheck,
      initiatorName,
      initiatorEmail: log.user_email,
      isSystem,
      createdAt: log.created_at
    };
  }

  // 3. USER REGISTRATION / AUTH
  if (log.action.includes("USER_REGISTER") || log.action.includes("REGISTER")) {
    const cleanDetails = log.details.replace(
      "Регистрация нового пользователя: ",
      "Зарегистрирован новый сотрудник: "
    );
    return {
      id: log.id,
      rawAction: log.action,
      rawDetails: log.details,
      title: "Регистрация нового сотрудника",
      category: "USER",
      description: cleanDetails,
      badgeLabel: "Сотрудник",
      badgeStyle: "bg-purple-50 text-purple-700 border-purple-200/60",
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      icon: UserPlus,
      initiatorName,
      initiatorEmail: log.user_email,
      isSystem,
      createdAt: log.created_at
    };
  }

  // 4. SETTINGS
  if (log.action.includes("SETTING")) {
    return {
      id: log.id,
      rawAction: log.action,
      rawDetails: log.details,
      title: "Изменение настроек микроклимата",
      category: "SETTINGS",
      description: log.details || "Обновлены пороговые значения температуры или влажности",
      badgeLabel: "Настройки",
      badgeStyle: "bg-amber-50 text-amber-700 border-amber-200/60",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      icon: Sliders,
      initiatorName,
      initiatorEmail: log.user_email,
      isSystem,
      createdAt: log.created_at
    };
  }

  // Fallback System Event
  return {
    id: log.id,
    rawAction: log.action,
    rawDetails: log.details,
    title: log.action.replace(/_/g, " "),
    category: "SYSTEM",
    description: log.details,
    badgeLabel: "Событие",
    badgeStyle: "bg-gray-100 text-gray-700 border-gray-200",
    iconBg: "bg-gray-50",
    iconColor: "text-gray-600",
    icon: Activity,
    initiatorName,
    initiatorEmail: log.user_email,
    isSystem,
    createdAt: log.created_at
  };
}

export default function AuditLogsViewer({
  auditLogs,
  onRefresh
}: AuditLogsViewerProps) {
  const [selectedFilter, setSelectedFilter] = useState<EventFilter>("ALL");
  const [expandedDetails, setExpandedDetails] = useState<Record<number, boolean>>({});

  const parsedEvents = useMemo(() => {
    return auditLogs.map(parseAuditLog);
  }, [auditLogs]);

  const filteredEvents = useMemo(() => {
    if (selectedFilter === "ALL") return parsedEvents;
    return parsedEvents.filter((ev) => ev.category === selectedFilter);
  }, [parsedEvents, selectedFilter]);

  const toggleDetails = (id: number) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filterTabs: { id: EventFilter; label: string; count: number }[] = [
    { id: "ALL", label: "Все события", count: parsedEvents.length },
    { id: "FAN", label: "Вентилятор", count: parsedEvents.filter((e) => e.category === "FAN").length },
    { id: "FILTER", label: "Фильтр HEPA", count: parsedEvents.filter((e) => e.category === "FILTER").length },
    { id: "USER", label: "Сотрудники", count: parsedEvents.filter((e) => e.category === "USER").length },
    { id: "SETTINGS", label: "Настройки", count: parsedEvents.filter((e) => e.category === "SETTINGS").length }
  ];

  return (
    <section className="bg-white rounded-2xl p-4 sm:p-6 lg:p-5 xl:p-6 2xl:p-8 border border-black/5 shadow-sm mb-4 sm:mb-5 lg:mb-5 2xl:mb-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-6 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-9 lg:h-9 xl:w-10 xl:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Activity size={18} className="lg:w-5 lg:h-5" strokeWidth={2.2} />
            </div>
            <h2 className="text-base sm:text-lg lg:text-base xl:text-lg 2xl:text-xl font-semibold tracking-tight text-gray-900">
              История событий и действий
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Хронология управления воздухоочистителем, изменения параметров и действий персонала.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-700 transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
          title="Обновить список событий"
        >
          <RefreshCw size={13} />
          <span>Обновить</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {filterTabs.map((tab) => {
          const isActive = selectedFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white font-semibold shadow-xs"
                  : "bg-gray-100/80 hover:bg-gray-200/80 text-gray-600"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Timeline Event Cards */}
      <div className="space-y-2.5 sm:space-y-3">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((ev) => {
            const Icon = ev.icon;
            const isExpanded = !!expandedDetails[ev.id];

            return (
              <div
                key={ev.id}
                className="p-3.5 sm:p-4 rounded-2xl border border-gray-200/70 bg-gray-50/50 hover:bg-white hover:border-gray-300 hover:shadow-xs transition-all flex flex-col gap-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${ev.iconBg} ${ev.iconColor} flex items-center justify-center shrink-0 shadow-2xs mt-0.5 sm:mt-0`}
                    >
                      <Icon size={18} strokeWidth={2.2} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-900 leading-snug">
                          {ev.title}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${ev.badgeStyle}`}
                        >
                          {ev.badgeLabel}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                        {ev.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-gray-500 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    <div className="inline-flex items-center gap-1.5 font-medium">
                      {ev.isSystem ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                          <Cpu size={11} />
                          {ev.initiatorName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-700 font-mono">
                          <User size={12} className="text-gray-400" />
                          {ev.initiatorEmail}
                        </span>
                      )}
                    </div>

                    <div className="inline-flex items-center gap-1 text-gray-400 font-mono text-[11px] shrink-0">
                      <Clock size={12} />
                      <span>{formatDateWithTime(ev.createdAt)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleDetails(ev.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                      title="Технические данные лога"
                    >
                      <Code2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Collapsible raw details for developers/techs */}
                {isExpanded && (
                  <div className="mt-1 p-2.5 rounded-xl bg-gray-900 text-gray-200 text-[11px] font-mono overflow-x-auto space-y-1 animate-in fade-in">
                    <div className="flex items-center justify-between text-gray-400 pb-1 border-b border-gray-800">
                      <span>Системный код: {ev.rawAction}</span>
                      <span>ID: #{ev.id}</span>
                    </div>
                    <p className="text-emerald-400 break-all">{ev.rawDetails}</p>
                    <p className="text-gray-400">Инициатор: {ev.initiatorEmail}</p>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center text-sm text-gray-400">
            <Activity size={32} className="mx-auto text-gray-300 mb-2" />
            <p>В этой категории пока нет событий.</p>
          </div>
        )}
      </div>
    </section>
  );
}

