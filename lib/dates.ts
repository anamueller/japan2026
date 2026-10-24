const MONTHS = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
const WEEKDAYS = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${Number(day)} de ${MONTHS[Number(month) - 1]} de ${year}`;
}

export function formatDateShort(iso: string): string {
  const [, month, day] = iso.split("-");
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return `${WEEKDAYS[weekday]} ${Number(day)} de ${MONTHS[Number(month) - 1]}`;
}

const WEEKDAY_LONG = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function formatWeekday(iso: string): string {
  return WEEKDAY_LONG[new Date(`${iso}T00:00:00Z`).getUTCDay()] ?? "";
}

export function calendarDate(from: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(from);
}

export function daysUntil(iso: string, from = new Date()): number {
  const start = Date.parse(`${calendarDate(from, "America/Sao_Paulo")}T00:00:00Z`);
  const target = Date.parse(`${iso}T00:00:00Z`);
  return Math.round((target - start) / 86_400_000);
}

export function calendarDaysBetween(start: string, end: string): number {
  return Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000,
  );
}

export function eachDate(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export type TimeZoneId =
  | "America/Sao_Paulo"
  | "GMT-4"
  | "America/New_York"
  | "Asia/Tokyo";

const TZ_OFFSET: Record<TimeZoneId, string> = {
  "America/Sao_Paulo": "-03:00",
  "GMT-4": "-04:00",
  "America/New_York": "-05:00",
  "Asia/Tokyo": "+09:00",
};

const TZ_LABEL: Record<TimeZoneId, string> = {
  "America/Sao_Paulo": "BRT",
  "GMT-4": "GMT-4",
  "America/New_York": "NY",
  "Asia/Tokyo": "JST",
};

export function formatDayMonth(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${Number(day)}/${month}`;
}

export function formatNumericDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function formatStayRange(start: string, end: string): string {
  const [, startMonth, startDay] = start.split("-");
  const [, endMonth, endDay] = end.split("-");
  if (startMonth === endMonth) {
    return `${Number(startDay)}-${Number(endDay)}/${startMonth}`;
  }
  return `${Number(startDay)}/${startMonth}–${Number(endDay)}/${endMonth}`;
}

export function formatClock(local: string): string {
  const time = local.split("T")[1]?.slice(0, 5) ?? "";
  return time.replace(/^0/, "");
}

export function localToUtc(local: string, timeZone: TimeZoneId): Date {
  const stamped = local.length === 16 ? `${local}:00` : local;
  return new Date(`${stamped}${TZ_OFFSET[timeZone]}`);
}

export function formatDateTime(local: string, timeZone: TimeZoneId): string {
  const [date, time] = local.split("T");
  return `${formatDate(date)} ${time} ${TZ_LABEL[timeZone]}`;
}

export function hoursBetween(start: Date, end: Date): string {
  const hours = Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return `${whole}h${minutes ? ` ${minutes}min` : ""}`;
}
