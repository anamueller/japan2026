import { dayAttractions } from "@/lib/mock-data";
import { defaultCities, defaultStays } from "@/lib/trip";
import { clockFromTimestamp, inferLegMode, inferLegModes, parseDuration, parseTransitSteps, preferredRoute, vehicleMode } from "@/lib/transit";
import { baseForDate, buildTripDays, dayLabel, daySequence, previousPoint, resolveGuideDate, resolveToday, tripDates } from "@/lib/days";

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
const tokyoStops = daySequence(tokyoDay!);
if (tokyoStops[0]?.kind !== "stay" || tokyoStops[0].stay.name !== "Takadanobaba") {
  throw new Error("day starts at airbnb");
}
if (tokyoStops[1]?.kind !== "place") throw new Error("airbnb then attraction");
if (previousPoint(tokyoStops, 1)?.id !== "tokyo-stay") throw new Error("first hop from airbnb");
if (tokyoStops[1].kind === "place" && previousPoint(tokyoStops, 2)?.id !== tokyoStops[1].place.id) {
  throw new Error("next hop from previous attraction");
}
const overlap = days.find((day) => day.date === "2026-11-14");
if (!overlap?.hop) throw new Error("transfer hop");
if (overlap.bases.map((city) => city.id).join("/") !== "tokyo/kyoto") throw new Error("overlap bases");
if (dayLabel(overlap) !== "14/11 Tóquio/Kyoto") throw new Error(dayLabel(overlap));
if (overlap.stay?.cityId !== "tokyo") throw new Error("leave tokyo");
if (overlap.arriveStay?.cityId !== "kyoto") throw new Error("arrive kyoto");
const mixed = buildTripDays(defaultCities, defaultStays, [
  { ...dayAttractions[0], id: "pm", date: "2026-11-14", cityId: "kyoto" },
  { ...dayAttractions[0], id: "am", date: "2026-11-14", cityId: "tokyo" },
]);
if (mixed.find((day) => day.date === "2026-11-14")?.places.map((item) => item.id).join() !== "am,pm") {
  throw new Error("morning then afternoon");
}

if (clockFromTimestamp("2025-11-12T08:12:00+09:00") !== "8:12") throw new Error("clock rfc");
if (parseDuration("90s") !== 90) throw new Error("parse seconds");
if (parseDuration("PT1H12M") !== 4320) throw new Error("parse iso");
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
if (vehicleMode("BUS") !== "bus") throw new Error("bus vehicle");
if (vehicleMode("SUBWAY") !== "train") throw new Error("subway vehicle");
if (inferLegMode([{ kind: "walk", title: "A pé", detail: "" }]) !== "walk") {
  throw new Error("walk mode");
}
if (inferLegModes([{ kind: "train", title: "G", detail: "" }, { kind: "bus", title: "B", detail: "" }]).join() !== "train,bus") {
  throw new Error("compound modes");
}
const bareTransit = parseTransitSteps([{ steps: [{ travelMode: "TRANSIT" }] }]);
if (bareTransit[0]?.kind !== "train") throw new Error("transit without details");
if (steps[0]?.title !== "A pé · 6min") throw new Error(steps[0]?.title);
if (steps[1]?.kind !== "train") throw new Error("nara train");
if (!steps[1]?.title.includes("JR Nara")) throw new Error(steps[1]?.title);
if (!steps[1]?.detail.includes("Kyoto → Nara")) throw new Error(steps[1]?.detail);
const walkOnly = parseTransitSteps([
  {
    steps: [
      { travelMode: "WALK", staticDuration: "0s" },
      { travelMode: "WALK", staticDuration: "60s" },
      { travelMode: "WALK", staticDuration: "15s" },
      { travelMode: "WALK", staticDuration: "120s" },
    ],
  },
]);
if (walkOnly.length !== 0) throw new Error("walk-only steps stay in the header");
const metroOverWalk = preferredRoute([
  { steps: [{ kind: "walk" as const, title: "A pé", detail: "" }], seconds: 600 },
  { steps: [{ kind: "train" as const, title: "G", detail: "" }], seconds: 1200 },
]);
if (metroOverWalk?.seconds !== 1200) throw new Error("prefer metro over shorter walk");
if (preferredRoute([{ steps: [{ kind: "walk" as const, title: "A pé", detail: "" }], seconds: 60 }])) {
  throw new Error("reject walk-only");
}

console.log("days.selfcheck ok");
