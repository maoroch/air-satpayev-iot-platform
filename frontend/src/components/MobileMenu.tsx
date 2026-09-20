"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Activity,
  Clock,
  AlertTriangle,
  Sliders,
  FileText,
  ChevronRight,
  Wind,
  Download,
  User,
  Cpu,
  Plus,
  LucideIcon
} from "lucide-react";

export type TabId = "overview" | "history" | "alerts" | "diagnostics" | "audit" | "profile";

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

const ROLE_PROFILES = {
  ADMIN: { email: "admin@satpayev.kz", label: "Администратор" },
  OPERATOR: { email: "operator@satpayev.kz", label: "Оператор" },
  TECH: { email: "tech@satpayev.kz", label: "Техник" }
};

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  unresolvedAlertsCount: number;
  device: DeviceData;
  devicesList: DeviceData[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  onOpenAddDevice: () => void;
  activeRole: "ADMIN" | "OPERATOR" | "TECH";
  onSelectRole: (role: "ADMIN" | "OPERATOR" | "TECH") => void;
  onExportCSV: () => void;
}

export default function MobileMenu({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  unresolvedAlertsCount,
  device,
  devicesList,
  selectedDeviceId,
  onSelectDevice,
  onOpenAddDevice,
  activeRole,
  onSelectRole,
  onExportCSV
}: MobileMenuProps) {
  // Keep mounted once opened so exit transition plays smoothly
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
    }
  }, [isOpen]);

  // Close on Escape key and lock background scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const menuItems: { id: TabId; label: string; icon: LucideIcon }[] = [
    { id: "overview", label: "Аналитика", icon: Activity },
    { id: "history", label: "История замеров", icon: Clock },
    {
      id: "alerts",
      label: `Алерты (${unresolvedAlertsCount})`,
      icon: AlertTriangle
    },
    { id: "diagnostics", label: "Диагностика и настройки", icon: Sliders },
    { id: "audit", label: "Журнал аудита", icon: FileText }
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-start md:hidden transition-all duration-300 ease-in-out ${isOpen ? "opacity-100 pointer-events-auto visible" : "opacity-0 pointer-events-none invisible"
        }`}
    >
      {/* Backdrop Overlay with smooth fade */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${isOpen ? "opacity-100" : "opacity-0"
          }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel - Smooth hardware-accelerated slide from Left */}
      <div
        className={`relative w-[88vw] max-w-sm h-full bg-white border-r border-gray-200/80 shadow-2xl flex flex-col z-10 transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"
          } overflow-hidden`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Wind size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 leading-snug">
                Воздухоочиститель
              </h2>
              <p className="text-[11px] text-gray-400 leading-tight">
                Панель управления
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Закрыть меню"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Neat, unified controls card inside drawer */}
          <div className="p-3.5 border-b border-gray-100 bg-gray-50/70">
            <div className="bg-white rounded-2xl p-3 border border-gray-200/70 shadow-xs space-y-2.5">
              {/* Device Selector with Add Button */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gray-50/80 hover:bg-gray-100/70 border border-gray-200/60 transition-all relative">
                  <Cpu size={15} className="text-blue-600 shrink-0" />
                  <select
                    className="bg-transparent border-none outline-none cursor-pointer pr-5 text-xs font-medium text-gray-800 w-full appearance-none truncate"
                    value={selectedDeviceId}
                    onChange={(e) => {
                      onSelectDevice(e.target.value);
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
                    onClick={() => {
                      onOpenAddDevice();
                      onClose();
                    }}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200/60 transition-all active:scale-95 cursor-pointer shrink-0"
                    title="Зарегистрировать новое устройство"
                  >
                    <Plus size={15} />
                  </button>
                )}
              </div>

              {/* Status and Profile Quick Row */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${device.status === "ONLINE" ? "bg-emerald-500 pulse-live" : "bg-rose-500"
                      }`}
                  />
                  <span
                    className={`font-semibold ${device.status === "ONLINE" ? "text-emerald-700" : "text-rose-600"
                      }`}
                  >
                    {device.status === "ONLINE" ? "Подключено" : "Отключено"}
                  </span>
                </div>

                <button
                  onClick={() => {
                    onSelectTab("profile");
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 font-medium transition-colors cursor-pointer"
                >
                  <User size={13} className="text-gray-400" />
                  <span>{ROLE_PROFILES[activeRole].label}</span>
                  <ChevronRight size={12} className="text-gray-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Section Header: Разделы */}
          <div className="px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Разделы
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isAlertTab = item.id === "alerts";

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all text-left cursor-pointer ${isActive
                      ? "bg-blue-50 text-blue-600 font-semibold shadow-xs"
                      : "text-gray-700 hover:bg-gray-100 active:scale-[0.99]"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isActive
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-500"
                        }`}
                    >
                      <Icon size={16} strokeWidth={isActive ? 2.2 : 2} />
                    </div>
                    <span>{item.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAlertTab && unresolvedAlertsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                        {unresolvedAlertsCount}
                      </span>
                    )}
                    <ChevronRight
                      size={15}
                      className={`transition-transform ${isActive ? "text-blue-500 translate-x-0.5" : "text-gray-400"
                        }`}
                    />
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Drawer Footer with CSV Export */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col gap-2">
          <button
            onClick={() => {
              onExportCSV();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Download size={14} />
            <span>Экспорт замеров в CSV</span>
          </button>
          <p className="text-[11px] text-center text-gray-400">
            КазНИТУ • Версия 1.0.4 • ESP32
          </p>
        </div>
      </div>
    </div>
  );
}
