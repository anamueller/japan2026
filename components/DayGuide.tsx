"use client";

import { useEffect, useState } from "react";
import { ChevronDown, MapPinned, TrainFront, X } from "lucide-react";
import { AttractionCard } from "@/components/AttractionCard";
import { MapPanel } from "@/components/MapPanel";
import { formatDayMonth, formatWeekday } from "@/lib/dates";
import { mapsSearchUrl, mapsTransitUrl, type TripDay } from "@/lib/days";
import { stayDisplayName } from "@/lib/trip";
import type { TransitLeg } from "@/lib/transit";

type DayGuideProps = {
  day: TripDay;
  days: TripDay[];
  onDate: (date: string) => void;
  onPlan?: () => void;
};

type Point = { id: string; lat: number; lng: number; name: string };

export function DayGuide({ day, days, onDate, onPlan }: DayGuideProps) {
  const [mapOpen, setMapOpen] = useState(false);
  const [openPlace, setOpenPlace] = useState<string | null>(null);
  const [openLeg, setOpenLeg] = useState<string | null>(null);
  const [legs, setLegs] = useState<Record<string, TransitLeg>>({});
  const start: Point | null = day.stay
    ? {
        id: day.stay.id,
        lat: day.stay.lat,
        lng: day.stay.lng,
        name: stayDisplayName(day.stay.name),
      }
    : null;
  const stops: Point[] = day.places
    .filter((item) => item.lat && item.lng)
    .map((item) => ({ id: item.id, lat: item.lat, lng: item.lng, name: item.name }));
  const points = start ? [start, ...stops] : stops;
  const selected = day.places.find((item) => item.id === openPlace);
  const hopsKey = points.map((item) => `${item.id}:${item.lat},${item.lng}`).join("|");

  useEffect(() => {
    let live = true;
    const pairs = points.slice(0, -1).map((from, index) => ({ from, to: points[index + 1] }));
    Promise.all(
      pairs.map(async ({ from, to }) => {
        const response = await fetch("/api/transit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromId: from.id,
            toId: to.id,
            fromLat: from.lat,
            fromLng: from.lng,
            toLat: to.lat,
            toLng: to.lng,
            date: day.date,
          }),
        });
        const payload = (await response.json()) as TransitLeg;
        return [`${from.id}>${to.id}`, payload] as const;
      }),
    ).then((rows) => {
      if (live) setLegs(Object.fromEntries(rows));
    });
    return () => {
      live = false;
    };
  }, [hopsKey, day.date]);

  const mapAttractions = day.places.filter((item) => item.lat && item.lng);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <section className="min-h-0 flex-1 overflow-y-auto bg-jp-paper px-4 py-4 pb-20 md:px-8 lg:pb-6">
        <div className="mx-auto max-w-xl">
          <div className="flex items-start justify-between gap-3">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Escolher dia</span>
              <span className="relative block">
                <select
                  value={day.date}
                  onChange={(event) => onDate(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-rose-100 bg-white py-2.5 pr-9 pl-3 text-xl font-semibold text-stone-900 shadow-sm outline-none focus:border-jp-red"
                >
                  {days.map((item) => (
                    <option key={item.date} value={item.date}>
                      {formatWeekday(item.date)} {formatDayMonth(item.date)}
                      {item.base?.name ? ` · ${item.base.name}` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 text-stone-400" />
              </span>
            </label>
            <button
              type="button"
              onClick={() => setMapOpen((value) => !value)}
              className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-100 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 lg:hidden"
            >
              <MapPinned className="h-3.5 w-3.5" />
              Mapa
            </button>
          </div>
          <p className="mt-2 text-base text-stone-700">
            Base: {day.base?.name || "—"}
            {day.stay?.name ? ` · ${stayDisplayName(day.stay.name)}` : ""}
          </p>
          {day.hop ? (
            <p className="mt-1 text-sm font-medium text-jp-red">
              Mudança de base: {day.hop.from.name} → {day.hop.to.name}
            </p>
          ) : null}
          {onPlan ? (
            <button
              type="button"
              onClick={onPlan}
              className="mt-2 text-sm font-medium text-jp-red hover:underline"
            >
              Planejar este dia
            </button>
          ) : null}
          <p className="mt-4 text-[11px] text-stone-400">
            Horários de transporte são de um dia típico de novembro, não da data exata.
          </p>

          <ol className="mt-4 flex flex-col">
            {start ? (
              <li className="rounded-2xl border border-rose-100 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  Saída
                </p>
                <p className="mt-0.5 text-lg font-semibold text-stone-900">{start.name}</p>
                {day.stay?.station ? (
                  <p className="text-sm text-stone-500">{day.stay.station}</p>
                ) : null}
                {start.lat ? (
                  <a
                    href={mapsSearchUrl(start.lat, start.lng)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm font-medium text-jp-red"
                  >
                    Abrir no Maps
                  </a>
                ) : null}
              </li>
            ) : null}

            {day.places.length === 0 ? (
              <li className="mt-3 text-base text-stone-500">Nenhum lugar neste dia ainda.</li>
            ) : null}

            {day.places.map((place) => {
              const here =
                place.lat && place.lng
                  ? { id: place.id, lat: place.lat, lng: place.lng, name: place.name }
                  : null;
              const fromIndex = here
                ? points.findIndex((item) => item.id === here.id) - 1
                : -1;
              const fromPoint = fromIndex >= 0 ? points[fromIndex] : undefined;
              const key = fromPoint && here ? `${fromPoint.id}>${here.id}` : "";
              return (
                <li key={place.id}>
                  {key && here ? (
                    <LegRow
                      leg={legs[key]}
                      open={openLeg === key}
                      mapsUrl={mapsTransitUrl(here.lat, here.lng)}
                      onToggle={() => setOpenLeg((value) => (value === key ? null : key))}
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setOpenPlace(place.id)}
                    className="w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 text-left shadow-sm"
                  >
                    <p className="text-lg font-semibold text-stone-900">{place.name}</p>
                    <p className="mt-0.5 text-sm text-stone-500">
                      {[place.station, place.duration, place.price].filter(Boolean).join(" · ")}
                    </p>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <div
        className={`${
          mapOpen ? "fixed inset-0 z-40" : "hidden"
        } bg-white lg:static lg:z-0 lg:block lg:min-h-0 lg:w-[42%] lg:shrink-0`}
      >
        <button
          type="button"
          aria-label="Fechar mapa"
          onClick={() => setMapOpen(false)}
          className="absolute top-3 right-3 z-[1001] rounded-full bg-white p-2 shadow lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
        <MapPanel
          attractions={mapAttractions}
          selectedId={openPlace ?? mapAttractions[0]?.id ?? ""}
          view={day.date}
          dates={[day.date]}
          cityName={day.base?.name || ""}
          routeStart={
            day.stay
              ? { lat: day.stay.lat, lng: day.stay.lng, label: stayDisplayName(day.stay.name) }
              : null
          }
          className="relative h-full min-h-64 w-full overflow-hidden bg-slate-200 lg:min-h-full"
          onSelect={setOpenPlace}
          onViewChange={() => undefined}
        />
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-3 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-jp-paper p-3 shadow-xl">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setOpenPlace(null)}
                className="rounded-full p-2 text-stone-500 hover:bg-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <AttractionCard attraction={selected} focused />
            {selected.lat ? (
              <a
                href={mapsSearchUrl(selected.lat, selected.lng)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex justify-center text-sm font-medium text-jp-red"
              >
                Abrir no Google Maps
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LegRow({
  leg,
  open,
  mapsUrl,
  onToggle,
}: {
  leg?: TransitLeg;
  open: boolean;
  mapsUrl: string;
  onToggle: () => void;
}) {
  return (
    <div className="relative ml-4 border-l border-dashed border-rose-200 py-3 pl-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-2 text-left"
      >
        <TrainFront className="mt-0.5 h-4 w-4 shrink-0 text-jp-red" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-stone-800">
            {leg ? `${leg.duration} · ${leg.summary}` : "Calculando trajeto…"}
          </span>
          {open && leg?.steps.length ? (
            <span className="mt-1 block space-y-1">
              {leg.steps.map((step, index) => (
                <span key={`${step.title}-${index}`} className="block text-sm text-stone-600">
                  {step.title}
                  {step.detail ? ` · ${step.detail}` : ""}
                </span>
              ))}
            </span>
          ) : null}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-stone-400 ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 ml-6 inline-block text-sm font-medium text-jp-red"
        >
          Abrir trajeto no Maps
        </a>
      ) : null}
    </div>
  );
}
