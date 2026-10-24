import { calendarDate, eachDate } from "@/lib/dates";
import type { Attraction } from "@/lib/mock-data";
import { cityHops, type CityStay, type Stay } from "@/lib/trip";

export type TripDay = {
  date: string;
  base?: CityStay;
  stay?: Stay;
  hop?: { from: CityStay; to: CityStay };
  places: Attraction[];
};

export function tripDates(cities: CityStay[]): string[] {
  if (!cities.length) return [];
  const starts = cities.map((city) => city.start).sort();
  const ends = cities.map((city) => city.end).sort();
  return eachDate(starts[0], ends[ends.length - 1]);
}

export function baseForDate(cities: CityStay[], iso: string): CityStay | undefined {
  const arriving = cities.find((city) => city.start === iso);
  if (arriving) return arriving;
  return (
    cities.find((city) => iso >= city.start && iso < city.end) ??
    cities.find((city) => city.end === iso)
  );
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
    const base = baseForDate(cities, date);
    return {
      date,
      base,
      stay: stays.find((item) => item.cityId === base?.id),
      hop: hops.find((item) => item.date === date),
      places: attractions.filter((item) => item.date === date),
    };
  });
}

export function mapsSearchUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function mapsTransitUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=transit`;
}
