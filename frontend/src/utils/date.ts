export function parseUtcDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const hasTimezone = dateStr.endsWith("Z") || dateStr.includes("+") || /-\d{2}:\d{2}$/.test(dateStr);
  const normalized = hasTimezone ? dateStr : `${dateStr}Z`;
  const parsed = new Date(normalized);
  return isNaN(parsed.getTime()) ? new Date(dateStr) : parsed;
}

export function formatTime(dateStr: string | null): string {
  if (!dateStr) return "--:--:--";
  try {
    const d = parseUtcDate(dateStr);
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return String(dateStr);
  }
}

export function formatDateWithTime(dateStr: string | null): string {
  if (!dateStr) return "--";
  try {
    const d = parseUtcDate(dateStr);
    const date = d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
    const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    return `${date} ${time}`;
  } catch {
    return String(dateStr);
  }
}
