import { hoursBetween } from "@/lib/dates";

export type TransitHop = {
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  duration: string;
  summary: string;
};

export type TransitMode = "walk" | "train" | "bus";

export type TransitStep = {
  kind: TransitMode;
  title: string;
  detail: string;
};

export type TransitLeg = {
  duration: string;
  summary: string;
  steps: TransitStep[];
  modes: TransitMode[];
};

const BUS_TYPES = new Set(["BUS", "INTERCITY_BUS", "TROLLEYBUS"]);

export function vehicleMode(type?: string): TransitMode {
  const value = (type ?? "").toUpperCase();
  if (!value) return "train";
  return BUS_TYPES.has(value) ? "bus" : "train";
}

export function inferLegMode(steps: TransitStep[]): TransitMode {
  return inferLegModes(steps)[0] ?? "walk";
}

export function inferLegModes(steps: TransitStep[]): TransitMode[] {
  const modes: TransitMode[] = [];
  for (const step of steps) {
    if (step.kind === "walk") continue;
    if (!modes.includes(step.kind)) modes.push(step.kind);
  }
  return modes.length ? modes : ["walk"];
}

export function hasPublicTransit(steps: TransitStep[]): boolean {
  return steps.some((step) => step.kind !== "walk");
}

export function preferredRoute<T extends { steps: TransitStep[]; seconds: number }>(
  routes: T[],
): T | undefined {
  const ranked = [...routes].sort(
    (left, right) => transitRank(left.steps) - transitRank(right.steps) || left.seconds - right.seconds,
  );
  const best = ranked[0];
  if (!best || !hasPublicTransit(best.steps)) return undefined;
  return best;
}

function transitRank(steps: TransitStep[]): number {
  if (steps.some((step) => step.kind === "train")) return 0;
  if (steps.some((step) => step.kind === "bus")) return 1;
  return 2;
}

type RawStep = {
  travelMode?: string;
  staticDuration?: string;
  transitDetails?: {
    transitLine?: { name?: string; nameShort?: string; vehicle?: { type?: string } };
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
  const raw = legs.flatMap((leg) => {
    if (!leg || typeof leg !== "object" || !("steps" in leg)) return [];
    const list = (leg as { steps?: unknown }).steps;
    return Array.isArray(list) ? (list as RawStep[]) : [];
  });
  const parsed: TransitStep[] = [];
  let walkSeconds = 0;
  function flushWalk() {
    const title = walkTitle(walkSeconds);
    walkSeconds = 0;
    if (title) parsed.push({ kind: "walk", title, detail: "" });
  }
  for (const step of raw) {
    const details = step.transitDetails;
    if (step.travelMode === "TRANSIT" || details) {
      flushWalk();
      const line =
        details?.transitLine?.nameShort || details?.transitLine?.name || "Metrô / trem";
      const dep = details?.stopDetails?.departureStop?.name ?? "";
      const arr = details?.stopDetails?.arrivalStop?.name ?? "";
      const t0 = clockFromTimestamp(details?.stopDetails?.departureTime);
      const t1 = clockFromTimestamp(details?.stopDetails?.arrivalTime);
      parsed.push({
        kind: vehicleMode(details?.transitLine?.vehicle?.type),
        title: [line, t0].filter(Boolean).join(" · "),
        detail: [dep && arr ? `${dep} → ${arr}` : dep || arr, t1 ? `chega ${t1}` : ""]
          .filter(Boolean)
          .join(" · "),
      });
      continue;
    }
    walkSeconds += parseDuration(step.staticDuration);
  }
  flushWalk();
  if (parsed.length && parsed.every((step) => step.kind === "walk")) return [];
  return parsed.filter((step) => step.title);
}

function walkTitle(seconds: number): string | null {
  if (seconds < 30) return null;
  const text = formatDurationSeconds(seconds).replace(/^0h /, "");
  if (!text || text === "0h") return null;
  return `A pé · ${text}`;
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
} | null {
  return FALLBACK[`${fromId}>${toId}`] ?? null;
}

export function formatDurationSeconds(seconds: number): string {
  const start = new Date(0);
  const end = new Date(seconds * 1000);
  return hoursBetween(start, end);
}

export function parseDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const seconds = iso.match(/^(\d+(?:\.\d+)?)s$/);
  if (seconds) return Number(seconds[1]);
  const iso8601 = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
  if (!iso8601) return 0;
  return (
    Number(iso8601[1] ?? 0) * 3600 +
    Number(iso8601[2] ?? 0) * 60 +
    Number(iso8601[3] ?? 0)
  );
}
