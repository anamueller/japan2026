import { calendarDate } from "@/lib/dates";

export type WeatherDay = {
  date: string;
  emoji: string;
  max: number;
  min: number;
  rain: string;
};

export type WeatherSource = "forecast" | "typical";

export function climateLabel(days: WeatherDay[]): string {
  if (days.length === 0) return "Clima a definir";
  const avg =
    days.reduce((sum, day) => sum + (day.max + day.min) / 2, 0) / days.length;
  const wet = days.filter((day) => {
    const value = parseFloat(day.rain);
    if (Number.isNaN(value)) return false;
    return day.rain.includes("%") ? value >= 40 : value >= 2;
  }).length;
  const humid = wet / days.length >= 0.35;
  if (avg < 12) return humid ? "Clima frio e úmido" : "Clima frio e seco";
  if (avg < 20) return humid ? "Clima ameno e úmido" : "Clima ameno e seco";
  return humid ? "Clima quente e úmido" : "Clima quente e seco";
}

export function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}

export function shiftYear(iso: string, year: number): string {
  return `${year}${iso.slice(4)}`;
}

export function inForecastWindow(start: string, end: string, from = new Date()): boolean {
  if (!start || !end || end < start) return false;
  const today = calendarDate(from, "Asia/Tokyo");
  const limit = new Date(`${today}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + 15);
  return end <= limit.toISOString().slice(0, 10);
}

export function mapDaily(payload: {
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    precipitation_sum?: number[];
  };
  displayYear?: number;
}): WeatherDay[] {
  const daily = payload.daily;
  if (!daily?.time) return [];
  return daily.time.map((date, index) => {
    const shown = payload.displayYear ? shiftYear(date, payload.displayYear) : date;
    const chance = daily.precipitation_probability_max?.[index];
    const mm = daily.precipitation_sum?.[index];
    return {
      date: shown,
      emoji: weatherEmoji(daily.weather_code?.[index] ?? 1),
      max: Math.round(daily.temperature_2m_max?.[index] ?? 0),
      min: Math.round(daily.temperature_2m_min?.[index] ?? 0),
      rain:
        chance != null
          ? `${chance}% chuva`
          : mm != null
            ? `${mm.toFixed(0)} mm`
            : "",
    };
  });
}
