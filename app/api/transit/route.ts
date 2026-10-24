import { cacheGet, cacheKey, cacheSet } from "@/lib/google-cache";
import {
  fallbackHop,
  formatDurationSeconds,
  parseDuration,
  parseTransitSteps,
  type TransitLeg,
} from "@/lib/transit";

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

  const fallback = fallbackHop(body.fromId ?? "", body.toId ?? "");
  const typicalDate = (body.date ?? "2026-11-14").replace(/^\d{4}/, "2025");
  const hitKey = cacheKey({
    kind: "transit",
    via: "typical-2025-steps",
    fromLat: body.fromLat,
    fromLng: body.fromLng,
    toLat: body.toLat,
    toLng: body.toLng,
    date: typicalDate,
  });
  const cached = cacheGet<TransitLeg>(hitKey);
  if (cached) return Response.json(cached);

  const empty: TransitLeg = {
    duration: formatDurationSeconds(fallback.seconds),
    summary: fallback.summary,
    steps: [],
  };

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key || body.fromLat == null || body.toLat == null) {
    return Response.json(empty);
  }

  const payload = {
    origin: {
      location: { latLng: { latitude: body.fromLat, longitude: body.fromLng } },
    },
    destination: {
      location: { latLng: { latitude: body.toLat, longitude: body.toLng } },
    },
    travelMode: "TRANSIT",
    departureTime: `${typicalDate}T11:00:00+09:00`,
    computeAlternativeRoutes: true,
    languageCode: "pt-BR",
    regionCode: "JP",
  };

  try {
    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask":
            "routes.duration,routes.description,routes.legs.steps.travelMode,routes.legs.steps.staticDuration,routes.legs.steps.transitDetails",
        },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) return Response.json(empty);
    const data = (await response.json()) as {
      routes?: {
        duration?: string;
        description?: string;
        legs?: { steps?: unknown[] }[];
      }[];
    };
    const fastest = [...(data.routes ?? [])].sort(
      (left, right) => parseDuration(left.duration) - parseDuration(right.duration),
    )[0];
    const seconds = parseDuration(fastest?.duration);
    if (!seconds) return Response.json(empty);
    return Response.json(
      cacheSet(hitKey, {
        duration: formatDurationSeconds(seconds),
        summary: fastest.description || "Transporte público",
        steps: parseTransitSteps(fastest.legs),
      }),
    );
  } catch {
    return Response.json(empty);
  }
}
