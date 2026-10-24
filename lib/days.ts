import { calendarDate, eachDate, formatDayMonth } from "@/lib/dates";
import type { Attraction } from "@/lib/mock-data";
import { cityHops, stayDisplayName, type CityStay, type Stay } from "@/lib/trip";

export type DayStop =
  | { kind: "stay"; role: "leave" | "arrive"; stay: Stay }
  | { kind: "place"; place: Attraction };

export type StopPoint = { id: string; lat: number; lng: number; name: string };

export type TripDay = {
  date: string;
  bases: CityStay[];
  base?: CityStay;
  stay?: Stay;
  arriveStay?: Stay;
  hop?: { from: CityStay; to: CityStay };
  places: Attraction[];
};

export function tripDates(cities: CityStay[]): string[] {
  if (!cities.length) return [];
  const starts = cities.map((city) => city.start).sort();
  const ends = cities.map((city) => city.end).sort();
  return eachDate(starts[0], ends[ends.length - 1]);
}

export function basesForDate(cities: CityStay[], iso: string): CityStay[] {
  return cities
    .filter((city) => iso >= city.start && iso <= city.end)
    .sort((left, right) => left.start.localeCompare(right.start) || left.end.localeCompare(right.end));
}

export function baseForDate(cities: CityStay[], iso: string): CityStay | undefined {
  const list = basesForDate(cities, iso);
  return list[list.length - 1] ?? list[0];
}

export function dayLabel(day: Pick<TripDay, "date" | "bases">): string {
  const stamp = formatDayMonth(day.date);
  const names = day.bases.map((city) => city.name).filter(Boolean);
  return names.length ? `${stamp} ${names.join("/")}` : stamp;
}

export function orderPlacesForDay(places: Attraction[], bases: CityStay[]): Attraction[] {
  if (bases.length < 2) return places;
  const rank = new Map(bases.map((city, index) => [city.id, index]));
  return [...places].sort((left, right) => {
    const a = left.cityId != null && rank.has(left.cityId) ? rank.get(left.cityId)! : bases.length;
    const b = right.cityId != null && rank.has(right.cityId) ? rank.get(right.cityId)! : bases.length;
    return a - b;
  });
}

export function resolveToday(dates: string[], from = new Date()): string {
  if (!dates.length) return "";
  const today = calendarDate(from, "Asia/Tokyo");
  if (dates.includes(today)) return today;
  if (today < dates[0]) return dates[0];
  return dates[dates.length - 1];
}

export function resolveGuideDate(days: TripDay[], from = new Date()): string {
  const dates = days.map((day) => day.date);
  const resolved = resolveToday(dates, from);
  const now = calendarDate(from, "Asia/Tokyo");
  if (dates[0] && now < dates[0]) {
    return days.find((day) => day.places.length)?.date ?? resolved;
  }
  return resolved;
}

export function buildTripDays(
  cities: CityStay[],
  stays: Stay[],
  attractions: Attraction[],
): TripDay[] {
  const hops = cityHops(cities);
  return tripDates(cities).map((date) => {
    const bases = basesForDate(cities, date);
    const hop = hops.find((item) => item.date === date);
    const from = hop?.from ?? bases[0];
    const to = hop?.to ?? bases[bases.length - 1];
    return {
      date,
      bases,
      base: to ?? bases[0],
      stay: stays.find((item) => item.cityId === (bases[0] ?? from)?.id),
      arriveStay:
        to && to.id !== from?.id ? stays.find((item) => item.cityId === to.id) : undefined,
      hop,
      places: orderPlacesForDay(
        attractions.filter((item) => item.date === date),
        bases,
      ),
    };
  });
}

export function daySequence(day: TripDay): DayStop[] {
  const rows: DayStop[] = [];
  if (day.stay) rows.push({ kind: "stay", role: "leave", stay: day.stay });
  for (const place of day.places) rows.push({ kind: "place", place });
  if (day.arriveStay) rows.push({ kind: "stay", role: "arrive", stay: day.arriveStay });
  return rows;
}

export function stopPoint(stop: DayStop): StopPoint | null {
  if (stop.kind === "stay") {
    if (!stop.stay.lat || !stop.stay.lng) return null;
    return {
      id: stop.stay.id,
      lat: stop.stay.lat,
      lng: stop.stay.lng,
      name: stayDisplayName(stop.stay.name),
    };
  }
  if (!stop.place.lat || !stop.place.lng) return null;
  return {
    id: stop.place.id,
    lat: stop.place.lat,
    lng: stop.place.lng,
    name: stop.place.name,
  };
}

export function previousPoint(stops: DayStop[], index: number): StopPoint | null {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const point = stopPoint(stops[cursor]);
    if (point) return point;
  }
  return null;
}

export function mapsSearchUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function mapsTransitUrl(from: StopPoint, to: StopPoint): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=transit`;
}
