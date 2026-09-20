"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Wind,
  ShieldCheck,
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Building2,
  Users,
  Plus
} from "lucide-react";
import {
  DEMO_ACCOUNTS,
  RoleKey,
  getActiveSession,
  getAuthSessions,
  saveSession
} from "../../utils/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAddingAccount = searchParams.get("action") === "add_account";

  const [activeTab, setActiveTab] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Registration fields
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerRole, setRegisterRole] = useState<RoleKey>("OPERATOR");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [existingSessionsCount, setExistingSessionsCount] = useState(0);

  // Check existing sessions on load
  useEffect(() => {
    const sessions = getAuthSessions();
    setExistingSessionsCount(sessions.length);
  }, []);

  // Quick 1-click Demo Account Login
  const handleQuickDemoLogin = async (demo: typeof DEMO_ACCOUNTS[0]) => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demo.email, password: demo.password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Ошибка авторизации демо-аккаунта");
      }

      const data = await res.json();
      saveSession({
        token: data.access_token,
        email: data.email,
        full_name: data.full_name || demo.name,
        role: data.role as RoleKey,
      });

      setSuccessMsg(`Успешный вход: ${demo.label}`);
      setTimeout(() => {
        router.replace("/");
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка подключения к серверу");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit standard Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg("Заполните адрес электронной почты и пароль");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Неверный адрес электронной почты или пароль");
      }

      const data = await res.json();
      saveSession({
        token: data.access_token,
        email: data.email,
        full_name: data.full_name || cleanEmail.split("@")[0],
        role: (data.role as RoleKey) || "OPERATOR",
      });

      setSuccessMsg("Авторизация прошла успешно");
      setTimeout(() => {
        router.replace("/");
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка подключения к серверу авторизации");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    const cleanName = fullName.trim();

    if (!cleanName) {
      setErrorMsg("Укажите ваше имя и фамилию (ФИО)");
      return;
    }
    if (!cleanEmail) {
      setErrorMsg("Укажите рабочий адрес электронной почты");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Длина пароля должна быть не менее 6 символов");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Введенные пароли не совпадают");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          full_name: cleanName,
          role: registerRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Ошибка при регистрации пользователя");
      }

      const data = await res.json();
      saveSession({
        token: data.access_token,
        email: data.email,
        full_name: data.full_name,
        role: data.role as RoleKey,
      });

      setSuccessMsg("Учетная запись успешно создана! Вход в систему...");
      setTimeout(() => {
        router.replace("/");
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка регистрации учетной записи");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col justify-center items-center px-4 py-8 sm:py-12">
      {/* Top University & System Badge */}
      <div className="flex flex-col items-center text-center mb-6">


        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
            <Wind size={24} strokeWidth={2.2} />
          </div>
          <div className="text-left">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
              Воздухоочиститель
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Цифровая система мониторинга и телеметрии
            </p>
          </div>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-black/5 shadow-xl">
        {/* Notice if user has active sessions */}
        {existingSessionsCount > 0 && (
          <div className="mb-5 p-3 sm:p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/70 text-xs text-blue-800 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <Users size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold">
                  {isAddingAccount ? "Добавление аккаунта в сессию" : `Активных аккаунтов: ${existingSessionsCount}`}
                </p>
                <p className="text-blue-700/90 text-[11px] mt-0.5 leading-tight">
                  Вход добавит аккаунт в текущую сессию браузера.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 bg-white/90 hover:bg-white px-2.5 py-1.5 rounded-xl border border-blue-200 shadow-2xs whitespace-nowrap cursor-pointer transition-all shrink-0"
            >
              В панель →
            </button>
          </div>
        )}

        {/* Mode Switcher: Login vs Register */}
        <div className="grid grid-cols-2 p-1 bg-gray-100/90 rounded-2xl gap-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab("LOGIN");
              setErrorMsg(null);
            }}
            className={`py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${activeTab === "LOGIN"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-900"
              }`}
          >
            Вход в систему
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("REGISTER");
              setErrorMsg(null);
            }}
            className={`py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${activeTab === "REGISTER"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-900"
              }`}
          >
            Регистрация
          </button>
        </div>

        {/* Error and Success Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2 animate-in fade-in">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {activeTab === "LOGIN" && (
          <div>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Электронная почта
                </label>
                <div className="relative flex items-center">
                  <Mail
                    size={16}
                    className="absolute left-3.5 text-gray-400 pointer-events-none"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@satpayev.kz"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50/70 hover:bg-gray-50 focus:bg-white text-sm text-gray-900 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Пароль
                </label>
                <div className="relative flex items-center">
                  <Lock
                    size={16}
                    className="absolute left-3.5 text-gray-400 pointer-events-none"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50/70 hover:bg-gray-50 focus:bg-white text-sm text-gray-900 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                <span>{isLoading ? "Выполняется вход..." : "Войти в систему"}</span>
                {!isLoading && <ArrowRight size={16} />}
              </button>
            </form>

            {/* Quick 1-Click Demo Accounts */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Быстрый вход под демо-ролями (1 клик)
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {DEMO_ACCOUNTS.map((demo) => (
                  <button
                    key={demo.role}
                    type="button"
                    onClick={() => handleQuickDemoLogin(demo)}
                    disabled={isLoading}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100/90 transition-all text-left cursor-pointer group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {demo.role[0]}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900 leading-tight">
                          {demo.label}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">
                          {demo.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-blue-600 opacity-80 group-hover:opacity-100 flex items-center gap-0.5">
                      Войти →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTER */}
        {activeTab === "REGISTER" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                ФИО пользователя
              </label>
              <div className="relative flex items-center">
                <User
                  size={16}
                  className="absolute left-3.5 text-gray-400 pointer-events-none"
                />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Иванов Иван Иванович"
                  className="w-full pl-10 pr-3.5 py-2 bg-gray-50/70 hover:bg-gray-50 focus:bg-white text-sm text-gray-900 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Электронная почта (Email)
              </label>
              <div className="relative flex items-center">
                <Mail
                  size={16}
                  className="absolute left-3.5 text-gray-400 pointer-events-none"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="i.ivanov@satpayev.kz"
                  className="w-full pl-10 pr-3.5 py-2 bg-gray-50/70 hover:bg-gray-50 focus:bg-white text-sm text-gray-900 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Роль в системе
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl">
                {(["ADMIN", "OPERATOR", "TECH"] as RoleKey[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRegisterRole(r)}
                    className={`py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${registerRole === r
                      ? "bg-white text-blue-600 font-semibold shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                      }`}
                  >
                    {r === "ADMIN" ? "Админ" : r === "OPERATOR" ? "Оператор" : "Техник"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Пароль
                </label>
                <div className="relative flex items-center">
                  <Lock
                    size={16}
                    className="absolute left-3 text-gray-400 pointer-events-none"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Мин. 6 знаков"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50/70 hover:bg-gray-50 focus:bg-white text-sm text-gray-900 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Повторите пароль
                </label>
                <div className="relative flex items-center">
                  <Lock
                    size={16}
                    className="absolute left-3 text-gray-400 pointer-events-none"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повтор"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50/70 hover:bg-gray-50 focus:bg-white text-sm text-gray-900 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Показать пароли</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              <span>{isLoading ? "Регистрация..." : "Зарегистрироваться"}</span>
              {!isLoading && <Plus size={16} />}
            </button>
          </form>
        )}

        {/* Return to Dashboard if user has sessions */}
        {isAddingAccount && existingSessionsCount > 0 && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-xs text-gray-500 hover:text-gray-800 font-medium cursor-pointer"
            >
              ← Вернуться в панель управления
            </button>
          </div>
        )}
      </div>

      {/* Footer copyright */}
      <p className="mt-8 text-xs text-gray-400 text-center">
        © 2026 Казахский национальный исследовательский технический университет имени К.И. Сатпаева
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center text-sm text-gray-400">
          Загрузка формы авторизации...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
