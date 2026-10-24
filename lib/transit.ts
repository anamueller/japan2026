import { hoursBetween } from "@/lib/dates";

export type TransitHop = {
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  duration: string;
  summary: string;
};

export type TransitStep = {
  kind: "walk" | "transit";
  title: string;
  detail: string;
};

export type TransitLeg = {
  duration: string;
  summary: string;
  steps: TransitStep[];
};

type RawStep = {
  travelMode?: string;
  staticDuration?: string;
  transitDetails?: {
    transitLine?: { name?: string; nameShort?: string };
    stopDetails?: {
      departureStop?: { name?: string };
      arrivalStop?: { name?: string };
      departureTime?: unknown;
      arrivalTime?: unknown;
    };
  };
};

export function clockFromTimestamp(value: unknown): string {
  if (typeof value === "string" && value.includes("T")) {
    const time = value.split("T")[1]?.slice(0, 5) ?? "";
    return time.replace(/^0/, "");
  }
  if (value && typeof value === "object" && "seconds" in value) {
    const seconds = Number((value as { seconds: string | number }).seconds);
    if (!Number.isFinite(seconds)) return "";
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(new Date(seconds * 1000))
      .replace(/^0/, "");
  }
  return "";
}

export function parseTransitSteps(legs: unknown): TransitStep[] {
  if (!Array.isArray(legs)) return [];
  const steps = legs.flatMap((leg) => {
    if (!leg || typeof leg !== "object" || !("steps" in leg)) return [];
    const raw = (leg as { steps?: unknown }).steps;
    return Array.isArray(raw) ? (raw as RawStep[]) : [];
  });
  return steps
    .map((step) => {
      const details = step.transitDetails;
      if ((step.travelMode === "TRANSIT" || details) && details) {
        const line =
          details.transitLine?.nameShort || details.transitLine?.name || "Transporte";
        const dep = details.stopDetails?.departureStop?.name ?? "";
        const arr = details.stopDetails?.arrivalStop?.name ?? "";
        const t0 = clockFromTimestamp(details.stopDetails?.departureTime);
        const t1 = clockFromTimestamp(details.stopDetails?.arrivalTime);
        return {
          kind: "transit" as const,
          title: [line, t0].filter(Boolean).join(" · "),
          detail: [dep && arr ? `${dep} → ${arr}` : dep || arr, t1 ? `chega ${t1}` : ""]
            .filter(Boolean)
            .join(" · "),
        };
      }
      const seconds = parseDuration(step.staticDuration);
      return {
        kind: "walk" as const,
        title: seconds ? `A pé · ${formatDurationSeconds(seconds).replace(/^0h /, "")}` : "A pé",
        detail: "",
      };
    })
    .filter((step) => step.title);
}

const FALLBACK: Record<string, { seconds: number; summary: string }> = {
  "tokyo>kyoto": { seconds: 7920, summary: "Nozomi (Shinkansen)" },
  "kyoto>hiroshima": { seconds: 6000, summary: "Sakura (Shinkansen)" },
  "hiroshima>gifu": { seconds: 16200, summary: "Shinkansen + Hida" },
  "gifu>hakone": { seconds: 18000, summary: "Hida + Tokaido" },
};

export function fallbackHop(fromId: string, toId: string): {
  seconds: number;
  summary: string;
} {
  return (
    FALLBACK[`${fromId}>${toId}`] ?? {
      seconds: 10800,
      summary: "Transporte público",
    }
  );
}

export function formatDurationSeconds(seconds: number): string {
  const start = new Date(0);
  const end = new Date(seconds * 1000);
  return hoursBetween(start, end);
}

export function parseDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const match = iso.match(/^(\d+)s$/);
  return match ? Number(match[1]) : 0;
}
