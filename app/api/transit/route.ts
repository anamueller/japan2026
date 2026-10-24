import { cacheGet, cacheKey, cacheSet } from "@/lib/google-cache";
import {
  fallbackHop,
  formatDurationSeconds,
  hasPublicTransit,
  inferLegModes,
  parseDuration,
  parseTransitSteps,
  preferredRoute,
  type TransitLeg,
} from "@/lib/transit";

const RAIL_MODES = ["SUBWAY", "TRAIN", "LIGHT_RAIL", "RAIL"];
const TRANSIT_MODES = ["BUS", ...RAIL_MODES];

const empty: TransitLeg = { duration: "", summary: "", steps: [], modes: ["walk"] };

type GoogleRoute = {
  duration?: string;
  description?: string;
  legs?: { duration?: string; steps?: unknown[] }[];
};

export async function POST(request: Request) {
  const body = (await request.json()) as {
    fromId?: string;
    toId?: string;
    fromLat?: number;
    fromLng?: number;
    toLat?: number;
    toLng?: number;
    date?: string;
  };

  const typicalDate = body.date ?? "2026-11-14";
  const hitKey = cacheKey({
    kind: "transit",
    via: "trip-date-v6",
    fromLat: body.fromLat,
    fromLng: body.fromLng,
    toLat: body.toLat,
    toLng: body.toLng,
    date: typicalDate,
  });
  const cached = cacheGet<TransitLeg>(hitKey);
  if (cached) return Response.json(cached);

  const known = fallbackHop(body.fromId ?? "", body.toId ?? "");
  const knownLeg: TransitLeg | null = known
    ? {
        duration: formatDurationSeconds(known.seconds),
        summary: known.summary,
        steps: [],
        modes: ["train"],
      }
    : null;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key || body.fromLat == null || body.toLat == null) {
    return Response.json(knownLeg ?? empty);
  }

  const departure = departureTime(typicalDate);
  const from = { lat: body.fromLat, lng: body.fromLng ?? 0 };
  const to = { lat: body.toLat, lng: body.toLng ?? 0 };
  const rail = await computeLeg(key, from, to, departure, RAIL_MODES);
  const result =
    (rail && hasPublicTransit(rail.steps) ? rail : null) ??
    (await computeLeg(key, from, to, departure, TRANSIT_MODES)) ??
    knownLeg ??
    empty;
  if (result.duration) return Response.json(cacheSet(hitKey, result));
  return Response.json(result);
}

function departureTime(date: string): string {
  const stamp = `${date}T11:00:00+09:00`;
  if (Date.parse(stamp) > Date.now() + 60_000) return stamp;
  const soon = new Date(Date.now() + 7 * 86_400_000);
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(soon);
  return `${ymd}T11:00:00+09:00`;
}

async function computeLeg(
  key: string,
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  departure: string,
  allowedTravelModes: string[],
): Promise<TransitLeg | null> {
  try {
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "routes.duration,routes.description,routes.legs.duration,routes.legs.steps.travelMode,routes.legs.steps.staticDuration,routes.legs.steps.transitDetails",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
        destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
        travelMode: "TRANSIT",
        languageCode: "pt-BR",
        regionCode: "JP",
        departureTime: departure,
        computeAlternativeRoutes: true,
        transitPreferences: {
          routingPreference: "LESS_WALKING",
          allowedTravelModes,
        },
      }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { routes?: GoogleRoute[] };
    const scored = (data.routes ?? []).map((route) => ({
      route,
      steps: parseTransitSteps(route.legs),
      seconds: parseDuration(route.duration ?? route.legs?.[0]?.duration),
    }));
    const chosen = preferredRoute(scored);
    if (!chosen?.seconds) return null;
    return {
      duration: formatDurationSeconds(chosen.seconds).replace(/^0h /, ""),
      summary: chosen.route.description || "Metrô / trem",
      steps: chosen.steps,
      modes: inferLegModes(chosen.steps),
    };
  } catch {
    return null;
  }
}
