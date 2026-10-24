import { cacheGet, cacheKey, cacheSet } from "@/lib/google-cache";
import {
  inForecastWindow,
  mapDaily,
  shiftYear,
  type WeatherDay,
  type WeatherSource,
} from "@/lib/weather";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lng = url.searchParams.get("lng");
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  if (!lat || !lng || !start || !end) {
    return Response.json({ error: "Missing params" }, { status: 400 });
  }

  const hitKey = cacheKey({ kind: "weather", via: "v2", lat, lng, start, end });
  const cached = cacheGet<{ source: WeatherSource; days: WeatherDay[] }>(hitKey);
  if (cached) return Response.json(cached);

  if (inForecastWindow(start, end)) {
    const forecast = await fetchWeather(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&start_date=${start}&end_date=${end}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia/Tokyo`,
    );
    const days = forecast ? mapDaily(forecast) : [];
    if (days.length) {
      return Response.json(cacheSet(hitKey, { source: "forecast" satisfies WeatherSource, days }));
    }
  }

  const year = Number(start.slice(0, 4));
  const typical = await fetchWeather(
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${shiftYear(start, year - 1)}&end_date=${shiftYear(end, year - 1)}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia/Tokyo`,
  );
  const days = typical
    ? mapDaily({ ...typical, displayYear: year })
    : [];
  return Response.json(cacheSet(hitKey, { source: "typical" satisfies WeatherSource, days }));
}

async function fetchWeather(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const payload = (await response.json()) as Parameters<typeof mapDaily>[0] & { error?: boolean };
    if (payload.error || !payload.daily?.time?.length) return null;
    return payload;
  } catch {
    return null;
  }
}
