"use client";

import React from "react";
import {
  User,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  Lock,
  Clock,
  Building2,
  Cpu,
  LogOut,
  Info,
  ShieldAlert,
  Sliders,
  Wind
} from "lucide-react";

export type RoleKey = "ADMIN" | "OPERATOR" | "TECH";

export interface RoleProfile {
  email: string;
  name: string;
  label: string;
  description: string;
}

export const ROLE_PROFILES: Record<RoleKey, RoleProfile> = {
  ADMIN: {
    email: "admin@satpayev.kz",
    name: "Администратор Системы",
    label: "Администратор",
    description: "Полный доступ: управление устройствами, сброс фильтров, изменение параметров и аудит."
  },
  OPERATOR: {
    email: "operator@satpayev.kz",
    name: "Дежурный Оператор",
    label: "Оператор",
    description: "Оперативный контроль: запуск/остановка очистителя, подтверждение алертов, экспорт замеров."
  },
  TECH: {
    email: "tech@satpayev.kz",
    name: "Инженер-Диагност",
    label: "Техник",
    description: "Инженерный надзор: диагностика датчиков SHT31, мониторинг системного состояния и калибровка."
  }
};

interface UserProfileSectionProps {
  activeRole: RoleKey;
  onSelectRole: (role: RoleKey) => void;
  token: string | null;
}

export default function UserProfileSection({
  activeRole,
  onSelectRole,
  token
}: UserProfileSectionProps) {
  const currentProfile = ROLE_PROFILES[activeRole];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const permissions = [
    {
      title: "Управление питанием и вентилятором",
      desc: "Дистанционное включение и выключение мотора очистителя",
      admin: true,
      operator: true,
      tech: false
    },
    {
      title: "Сброс наработки фильтра HEPA",
      desc: "Обнуление моточасов после физической замены сменного элемента",
      admin: true,
      operator: true,
      tech: false
    },
    {
      title: "Регистрация новых приборов",
      desc: "Добавление устройств очистки воздуха в единый реестр",
      admin: true,
      operator: false,
      tech: false
    },
    {
      title: "Изменение порогов предупреждений",
      desc: "Редактирование критических значений температуры, влажности и ресурса",
      admin: true,
      operator: false,
      tech: false
    },
    {
      title: "Просмотр журнала аудита безопасности",
      desc: "Неизменяемый аудит-лог действий операторов и инженеров",
      admin: true,
      operator: false,
      tech: true
    },
    {
      title: "Системная диагностика и телеметрия",
      desc: "Анализ работоспособности брокера Mosquitto, БД Postgres и шлюзов",
      admin: true,
      operator: true,
      tech: true
    },
    {
      title: "Экспорт замеров в CSV",
      desc: "Выгрузка исторических массивов телеметрии датчиков",
      admin: true,
      operator: true,
      tech: true
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1 border-b border-gray-100">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
            Профиль пользователя и права доступа
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Управление учетной записью оператора и разграничение прав доступа (RBAC)
          </p>
        </div>
      </div>

      {/* Main Profile Info & Role Switcher Card */}
      <div className="rounded-2xl bg-white p-5 sm:p-7 xl:p-8 border border-black/5 shadow-sm space-y-6">
        {/* User Identity Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/20 shrink-0">
              {getInitials(currentProfile.name)}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-semibold text-gray-900">
                  {currentProfile.name}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                  <ShieldCheck size={13} className="text-blue-600" />
                  {currentProfile.label}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5 font-mono">
                {currentProfile.email}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                <Building2 size={13} />
                <span>КазНИТУ им. К.И. Сатпаева • Кафедра автоматизации</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROLE SWITCHER BLOCK (User explicit request) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Переключение активной роли (RBAC)
            </span>
            <span className="text-xs text-gray-400">
              Выберите роль для тестирования разграничения доступа
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-1.5 rounded-2xl bg-gray-100/80 border border-black/5">
            {(["ADMIN", "OPERATOR", "TECH"] as const).map((roleKey) => {
              const prof = ROLE_PROFILES[roleKey];
              const isCurrent = activeRole === roleKey;
              return (
                <button
                  key={roleKey}
                  onClick={() => onSelectRole(roleKey)}
                  className={`flex flex-col items-start p-3.5 rounded-xl text-left transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-white text-gray-900 font-semibold shadow-sm border border-black/5"
                      : "text-gray-600 hover:text-gray-900 hover:bg-white/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-sm font-semibold">{prof.label}</span>
                    {isCurrent && (
                      <CheckCircle2 size={15} className="text-blue-600" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500 font-mono mb-1">
                    {prof.email}
                  </span>
                  <span className="text-[11px] text-gray-400 line-clamp-2">
                    {prof.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Security & Active Session Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <KeyRound size={18} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700">JWT Сессия</p>
              <p className="text-[11px] text-emerald-600 font-medium">
                Авторизован (Bearer OAuth2)
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700">Таймаут токена</p>
              <p className="text-[11px] text-gray-500">12 часов (HS256)</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Lock size={18} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700">Шифрование</p>
              <p className="text-[11px] text-gray-500">TLS/WSS шифрование</p>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className="rounded-2xl bg-white p-5 sm:p-7 xl:p-8 border border-black/5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Матрица полномочий по ролям
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Текущая активная роль отмечена синей подсветкой
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 font-medium">
                <th className="py-2.5 pr-4">Операция / Действие</th>
                <th className={`py-2.5 px-3 text-center rounded-t-lg ${activeRole === "ADMIN" ? "bg-blue-50 text-blue-700 font-semibold" : ""}`}>
                  Администратор
                </th>
                <th className={`py-2.5 px-3 text-center rounded-t-lg ${activeRole === "OPERATOR" ? "bg-blue-50 text-blue-700 font-semibold" : ""}`}>
                  Оператор
                </th>
                <th className={`py-2.5 px-3 text-center rounded-t-lg ${activeRole === "TECH" ? "bg-blue-50 text-blue-700 font-semibold" : ""}`}>
                  Техник
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {permissions.map((perm, idx) => (
                <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-gray-900">{perm.title}</p>
                    <p className="text-[11px] text-gray-400">{perm.desc}</p>
                  </td>
                  <td className={`py-3 px-3 text-center ${activeRole === "ADMIN" ? "bg-blue-50/50" : ""}`}>
                    {perm.admin ? (
                      <span className="inline-flex w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 items-center justify-center font-bold">✓</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className={`py-3 px-3 text-center ${activeRole === "OPERATOR" ? "bg-blue-50/50" : ""}`}>
                    {perm.operator ? (
                      <span className="inline-flex w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 items-center justify-center font-bold">✓</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className={`py-3 px-3 text-center ${activeRole === "TECH" ? "bg-blue-50/50" : ""}`}>
                    {perm.tech ? (
                      <span className="inline-flex w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 items-center justify-center font-bold">✓</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
