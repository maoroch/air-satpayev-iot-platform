export type RoleKey = "ADMIN" | "OPERATOR" | "TECH";

export interface AuthSession {
  token: string;
  email: string;
  full_name: string;
  role: RoleKey;
}

const STORAGE_SESSIONS_KEY = "satpayev_air_auth_sessions";
const STORAGE_ACTIVE_EMAIL_KEY = "satpayev_air_active_email";

export const DEMO_ACCOUNTS: {
  role: RoleKey;
  label: string;
  name: string;
  email: string;
  password: string;
  description: string;
}[] = [
  {
    role: "ADMIN",
    label: "Администратор",
    name: "Администратор Системы",
    email: "admin@satpayev.kz",
    password: "Admin@2026!",
    description: "Полный доступ: пороги тревог, сброс фильтра, регистрация приборов, управление вентилятором",
  },
  {
    role: "OPERATOR",
    label: "Оператор",
    name: "Дежурный Оператор",
    email: "operator@satpayev.kz",
    password: "Operator@2026!",
    description: "Оперативный доступ: пуск/останов вентилятора, сброс фильтра, мониторинг телеметрии",
  },
  {
    role: "TECH",
    label: "Техник",
    name: "Инженер-Диагност",
    email: "tech@satpayev.kz",
    password: "Tech@2026!",
    description: "Только мониторинг: просмотр телеметрии, аппаратной диагностики и журнала аудита",
  },
];

export function getAuthSessions(): AuthSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("[Auth] Error reading auth sessions:", err);
    return [];
  }
}

export function getActiveSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const sessions = getAuthSessions();
    if (sessions.length === 0) return null;

    const activeEmail = localStorage.getItem(STORAGE_ACTIVE_EMAIL_KEY);
    if (activeEmail) {
      const match = sessions.find((s) => s.email.toLowerCase() === activeEmail.toLowerCase());
      if (match) return match;
    }

    // Default to first session if activeEmail not matched
    return sessions[0];
  } catch (err) {
    console.error("[Auth] Error reading active session:", err);
    return null;
  }
}

export function saveSession(session: AuthSession, makeActive = true): void {
  if (typeof window === "undefined") return;
  try {
    const sessions = getAuthSessions();
    const existingIndex = sessions.findIndex(
      (s) => s.email.toLowerCase() === session.email.toLowerCase()
    );

    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }

    localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));

    if (makeActive) {
      localStorage.setItem(STORAGE_ACTIVE_EMAIL_KEY, session.email);
    }
  } catch (err) {
    console.error("[Auth] Error saving session:", err);
  }
}

export function switchActiveSession(email: string): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const sessions = getAuthSessions();
    const target = sessions.find((s) => s.email.toLowerCase() === email.toLowerCase());
    if (target) {
      localStorage.setItem(STORAGE_ACTIVE_EMAIL_KEY, target.email);
      return target;
    }
    return null;
  } catch (err) {
    console.error("[Auth] Error switching session:", err);
    return null;
  }
}

export function removeSession(email: string): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    let sessions = getAuthSessions();
    sessions = sessions.filter((s) => s.email.toLowerCase() !== email.toLowerCase());
    localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));

    const activeEmail = localStorage.getItem(STORAGE_ACTIVE_EMAIL_KEY);
    if (activeEmail && activeEmail.toLowerCase() === email.toLowerCase()) {
      if (sessions.length > 0) {
        localStorage.setItem(STORAGE_ACTIVE_EMAIL_KEY, sessions[0].email);
        return sessions[0];
      } else {
        localStorage.removeItem(STORAGE_ACTIVE_EMAIL_KEY);
        return null;
      }
    }

    return getActiveSession();
  } catch (err) {
    console.error("[Auth] Error removing session:", err);
    return null;
  }
}

export function logoutAll(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_SESSIONS_KEY);
    localStorage.removeItem(STORAGE_ACTIVE_EMAIL_KEY);
  } catch (err) {
    console.error("[Auth] Error logging out all:", err);
  }
}
