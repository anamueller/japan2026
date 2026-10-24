import { formatDurationSeconds, fallbackHop } from "@/lib/transit";
import { climateLabel, inForecastWindow, weatherEmoji, shiftYear, mapDaily } from "@/lib/weather";
import { cacheGet, cacheKey, cacheSet } from "@/lib/google-cache";
import { parseTrip } from "@/lib/trip-store";
import { airportCountry, applyStayEnrichment, buildFlightDays, defaultCities, defaultFlights, defaultStays, nextConnection, stayDisplayName, travelerHeader } from "@/lib/trip";
import { daysUntil, formatClock, formatDate, formatDateShort, formatDayMonth, formatNumericDate, formatStayRange, formatWeekday } from "@/lib/dates";

if (weatherEmoji(0) !== "☀️") throw new Error("clear sky emoji");
if (shiftYear("2026-11-10", 2025) !== "2025-11-10") throw new Error("shiftYear");
if (inForecastWindow("2026-11-10", "2026-11-14", new Date("2026-10-24T12:00:00+09:00"))) {
  throw new Error("november is outside forecast");
}
if (!inForecastWindow("2026-10-24", "2026-10-26", new Date("2026-10-24T12:00:00+09:00"))) {
  throw new Error("near dates use forecast");
}
if (formatClock("2026-11-08T22:40") !== "22:40") throw new Error("clock");
if (formatDate("2026-11-10") !== "10 de nov. de 2026") throw new Error("formatDate");
if (formatDateShort("2026-11-10") !== "ter. 10 de nov.") throw new Error("formatDateShort");
if (formatWeekday("2026-11-10") !== "terça") throw new Error("weekday");
if (daysUntil("2026-11-10", new Date("2026-09-30T23:00:00-03:00")) !== 41) {
  throw new Error("daysUntil sao paulo");
}
if (formatClock("2026-11-09T06:35") !== "6:35") throw new Error("clock pad");
if (formatDayMonth("2026-11-08") !== "8/11") throw new Error("day month");

const days = buildFlightDays(defaultFlights);
if (days[0]?.cards.length !== 2) throw new Error(`first day cards ${days[0]?.cards.length}`);
if (days[0]?.cards[0]?.traveler !== "Ana & Marcelo") {
  throw new Error(days[0]?.cards[0]?.traveler);
}
if (days[0]?.cards[0]?.plusDays !== 1) throw new Error("plus day");
if (
  buildFlightDays([
    { ...defaultFlights[0], id: "same", departAt: "2026-11-08T10:00", arriveAt: "2026-11-08T14:00" },
  ])[0]?.cards[0]?.plusDays !== 0
) {
  throw new Error("same day plus");
}
const connection = nextConnection(defaultFlights[0], defaultFlights);
if (connection !== "5h 30min") throw new Error(`connection ${connection}`);
if (days.some((day) => !day.ellipsis && day.cards.length === 0)) {
  throw new Error("empty flight day");
}
if (days.filter((day) => !day.ellipsis).length !== 2) {
  throw new Error(`flight days ${days.filter((day) => !day.ellipsis).length}`);
}
const withGap = buildFlightDays([
  ...defaultFlights,
  { ...defaultFlights[0], id: "gap", departAt: "2026-11-20T10:00", arriveAt: "2026-11-20T12:00" },
]);
if (!withGap.some((day) => day.ellipsis)) throw new Error("missing ellipsis");

const hop = fallbackHop("tokyo", "kyoto");
if (!hop || formatDurationSeconds(hop.seconds) !== "2h 12min") {
  throw new Error(formatDurationSeconds(hop?.seconds ?? 0));
}
if (fallbackHop("senso-ji", "shibuya-sky")) throw new Error("no fake 3h hop");

const mapped = mapDaily({
  daily: {
    time: ["2025-11-10"],
    weather_code: [0],
    temperature_2m_max: [16.4],
    temperature_2m_min: [8.2],
    precipitation_sum: [0],
  },
  displayYear: 2026,
});
if (mapped[0]?.date !== "2026-11-10" || mapped[0]?.max !== 16) {
  throw new Error("mapDaily");
}
if (climateLabel(mapped) !== "Clima ameno e seco") throw new Error(climateLabel(mapped));
if (formatNumericDate("2026-11-11") !== "11/11/2026") throw new Error("numeric date");
if (formatStayRange("2026-11-10", "2026-11-14") !== "10-14/11") {
  throw new Error(formatStayRange("2026-11-10", "2026-11-14"));
}
if (airportCountry("GRU") !== "BR") throw new Error("flag");
if (nextConnection(defaultFlights[1], defaultFlights) !== null) {
  throw new Error("japan arrival connection");
}
if (
  nextConnection(defaultFlights[1], [
    ...defaultFlights,
    { ...defaultFlights[1], id: "back", departAt: "2026-11-22T10:00", arriveAt: "2026-11-22T22:00" },
  ]) !== null
) {
  throw new Error("return is not a connection");
}
if (stayDisplayName("Airbnb Takadanobaba") !== "Takadanobaba") throw new Error("stay name");
const kept = applyStayEnrichment(
  [{ ...defaultStays[0], name: "Meu Airbnb" }],
  [{ ...defaultStays[0], name: "Nome do Google", image: "photo.jpg", station: "Takadanobaba" }],
);
if (kept[0]?.name !== "Meu Airbnb") throw new Error("enrich kept name");
if (kept[0]?.station !== "Takadanobaba") throw new Error("enrich filled station");
if (travelerHeader("Ana").background !== "#fecdd3") throw new Error("ana color");
if (travelerHeader("Marcelo").background !== "#7dd3fc") throw new Error("marcelo color");
if (travelerHeader("Lahana").background !== "#d8b4fe") throw new Error("lahana color");
if (travelerHeader("Manu").background !== "#92400e") throw new Error("manu color");
const key = cacheKey({ a: 1 });
cacheSet(key, { ok: true });
if (!cacheGet<{ ok: boolean }>(key)?.ok) throw new Error("cache");
if (!parseTrip({ cities: defaultCities, flights: defaultFlights, stays: defaultStays })) {
  throw new Error("parse trip");
}
if (parseTrip({ cities: [] })) throw new Error("parse trip empty");

console.log("overview.selfcheck ok");
