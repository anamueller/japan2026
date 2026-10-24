import { dayAttractions } from "@/lib/mock-data";
import { defaultCities, defaultStays } from "@/lib/trip";
import { clockFromTimestamp, parseTransitSteps } from "@/lib/transit";
import { baseForDate, buildTripDays, resolveGuideDate, resolveToday, tripDates } from "@/lib/days";

const dates = tripDates(defaultCities);
if (dates[0] !== "2026-11-10") throw new Error("trip start");
if (dates[dates.length - 1] !== "2026-11-22") throw new Error("trip end");
if (baseForDate(defaultCities, "2026-11-12")?.id !== "tokyo") throw new Error("tokyo day");
if (baseForDate(defaultCities, "2026-11-14")?.id !== "kyoto") throw new Error("arrival kyoto");
if (baseForDate(defaultCities, "2026-11-22")?.id !== "hakone") throw new Error("last day");
if (resolveToday(dates, new Date("2026-10-01T12:00:00+09:00")) !== "2026-11-10") {
  throw new Error("before trip");
}
if (resolveToday(dates, new Date("2026-11-12T08:00:00+09:00")) !== "2026-11-12") {
  throw new Error("during trip");
}
const preview = buildTripDays(defaultCities, defaultStays, dayAttractions);
if (resolveGuideDate(preview, new Date("2026-10-23T12:00:00+09:00")) !== "2026-11-12") {
  throw new Error("preview jumps to first busy day");
}

const days = buildTripDays(defaultCities, defaultStays, dayAttractions);
const tokyoDay = days.find((day) => day.date === "2026-11-12");
if (tokyoDay?.places.length !== 4) throw new Error(`places ${tokyoDay?.places.length}`);
if (tokyoDay?.stay?.cityId !== "tokyo") throw new Error("tokyo stay");
if (!days.find((day) => day.date === "2026-11-14")?.hop) throw new Error("transfer hop");

if (clockFromTimestamp("2025-11-12T08:12:00+09:00") !== "8:12") throw new Error("clock rfc");
const steps = parseTransitSteps([
  {
    steps: [
      { travelMode: "WALK", staticDuration: "360s" },
      {
        travelMode: "TRANSIT",
        transitDetails: {
          transitLine: { nameShort: "JR Nara" },
          stopDetails: {
            departureStop: { name: "Kyoto" },
            arrivalStop: { name: "Nara" },
            departureTime: "2025-11-16T08:12:00+09:00",
            arrivalTime: "2025-11-16T09:01:00+09:00",
          },
        },
      },
    ],
  },
]);
if (steps[0]?.title !== "A pé · 6min") throw new Error(steps[0]?.title);
if (!steps[1]?.title.includes("JR Nara")) throw new Error(steps[1]?.title);
if (!steps[1]?.detail.includes("Kyoto → Nara")) throw new Error(steps[1]?.detail);

console.log("days.selfcheck ok");
