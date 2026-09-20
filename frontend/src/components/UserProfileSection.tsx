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

import { AuthSession, RoleKey } from "../utils/auth";
import { Plus, Users, Check, Trash2 } from "lucide-react";

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
  activeSession: AuthSession | null;
  allSessions: AuthSession[];
  onSwitchSession: (email: string) => void;
  onLogoutSession: (email: string) => void;
  onLogoutAll: () => void;
  onAddAccount: () => void;
  token: string | null;
}

export default function UserProfileSection({
  activeSession,
  allSessions,
  onSwitchSession,
  onLogoutSession,
  onLogoutAll,
  onAddAccount,
  token
}: UserProfileSectionProps) {
  const activeRole = activeSession?.role || "OPERATOR";
  const currentProfile = ROLE_PROFILES[activeRole] || {
    name: activeSession?.full_name || "Пользователь",
    email: activeSession?.email || "user@satpayev.kz",
    label: activeRole,
    description: "Авторизованный пользователь"
  };

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
      title: "Изменение порогов тревог и параметров",
      desc: "Редактирование критических значений температуры и влажности в БД",
      admin: true,
      operator: false,
      tech: false
    },
    {
      title: "Просмотр журнала аудита (FR-13)",
      desc: "Неизменяемый журнал всех действий и переключений пользователей",
      admin: true,
      operator: true,
      tech: true
    },
    {
      title: "Экспорт замеров в CSV",
      desc: "Выгрузка исторического ряда телеметрии для отчетов",
      admin: true,
      operator: true,
      tech: true
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <User size={22} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Профиль пользователя и сессии доступа
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Управление активными учетными записями, мульти-аккаунт в сессии и разграничение прав (RBAC)
          </p>
        </div>
      </div>

      {/* Main Profile Info & Multi-Account Card */}
      <div className="rounded-2xl bg-white p-4 sm:p-6 lg:p-5 xl:p-6 2xl:p-8 border border-black/5 shadow-sm space-y-5 lg:space-y-6">
        {/* User Identity Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-5 pb-4 sm:pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-md shadow-blue-500/20 shrink-0">
              {getInitials(activeSession?.full_name || currentProfile.name)}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-semibold text-gray-900">
                  {activeSession?.full_name || currentProfile.name}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                  <ShieldCheck size={13} className="text-blue-600" />
                  {currentProfile.label || activeRole}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5 font-mono">
                {activeSession?.email || currentProfile.email}
              </p>

            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={onLogoutAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium transition-all active:scale-95 cursor-pointer"
            >
              <LogOut size={13} />
              <span>Выйти со всех</span>
            </button>
          </div>
        </div>

        {/* MULTI-ACCOUNT SESSIONS LIST */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3.5">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-blue-600" />
              <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Активные аккаунты в этой сессии браузера ({allSessions.length})
              </span>
            </div>
            <span className="text-xs text-gray-400">
              Мгновенное переключение без повторного ввода пароля
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allSessions.map((sess) => {
              const isActive = activeSession?.email.toLowerCase() === sess.email.toLowerCase();
              return (
                <div
                  key={sess.email}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${isActive
                    ? "bg-blue-50/40 border-blue-200 shadow-xs ring-1 ring-blue-500/20"
                    : "bg-gray-50/70 border-gray-200/70 hover:bg-white hover:border-gray-300"
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${isActive
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-gray-200 text-gray-700"
                          }`}
                      >
                        {getInitials(sess.full_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-gray-900 truncate">
                            {sess.full_name}
                          </p>
                          {isActive && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                              <Check size={10} />
                              Активен
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 font-mono truncate">
                          {sess.email}
                        </p>
                      </div>
                    </div>

                    {allSessions.length > 1 && (
                      <button
                        onClick={() => onLogoutSession(sess.email)}
                        title="Удалить из этой сессии"
                        className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-100/80">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                      {sess.role}
                    </span>
                    {!isActive ? (
                      <button
                        onClick={() => onSwitchSession(sess.email)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                      >
                        Переключиться →
                      </button>
                    ) : (
                      <span className="text-[11px] text-blue-600 font-medium">
                        Текущий профиль
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add Account Card Button */}
            <button
              onClick={onAddAccount}
              className="p-3.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center gap-2 min-h-[105px] text-gray-500 hover:text-blue-700 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-gray-100 group-hover:bg-blue-100 text-gray-400 group-hover:text-blue-600 flex items-center justify-center transition-colors">
                <Plus size={16} />
              </div>
              <span className="text-xs font-semibold">Добавить аккаунт</span>
            </button>
          </div>
        </div>

      </div>

      {/* Permissions Matrix Table */}
      <div className="rounded-2xl bg-white p-4 sm:p-6 lg:p-5 xl:p-6 2xl:p-8 border border-black/5 shadow-sm space-y-3 sm:space-y-4">
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
