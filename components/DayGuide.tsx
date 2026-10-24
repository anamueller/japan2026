"use client";

import { useState } from "react";
import { ChevronDown, MapPinned, X } from "lucide-react";
import { AttractionCard } from "@/components/AttractionCard";
import { MapPanel } from "@/components/MapPanel";
import { formatWeekday } from "@/lib/dates";
import {
  dayLabel,
  daySequence,
  mapsSearchUrl,
  mapsTransitUrl,
  previousPoint,
  stopPoint,
  type TripDay,
} from "@/lib/days";
import { stayDisplayName, type Stay } from "@/lib/trip";

type DayGuideProps = {
  day: TripDay;
  days: TripDay[];
  onDate: (date: string) => void;
  onPlan?: (cityId: string) => void;
};

export function DayGuide({ day, days, onDate, onPlan }: DayGuideProps) {
  const [mapOpen, setMapOpen] = useState(false);
  const [openPlace, setOpenPlace] = useState<string | null>(null);
  const stops = daySequence(day);
  const selected = day.places.find((item) => item.id === openPlace);
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
                      {formatWeekday(item.date)} {dayLabel(item)}
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
          {onPlan
            ? day.bases.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => onPlan(city.id)}
                  className="mt-2 mr-3 text-sm font-medium text-jp-red hover:underline"
                >
                  Planejar {city.name}
                </button>
              ))
            : null}

          <ol className="mt-4 flex flex-col">
            {stops.length === 0 ? (
              <li className="mt-3 text-base text-stone-500">Nenhum lugar neste dia ainda.</li>
            ) : null}
            {stops.map((stop, index) => {
              const here = stopPoint(stop);
              const from = previousPoint(stops, index);
              return (
                <li key={stop.kind === "stay" ? `${stop.role}-${stop.stay.id}` : stop.place.id}>
                  {from && here ? (
                    <a
                      href={mapsTransitUrl(from, here)}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-4 my-1 block border-l border-dashed border-rose-200 py-2 pl-4 text-sm font-medium text-jp-red"
                    >
                      Trajeto no Maps
                    </a>
                  ) : null}
                  {stop.kind === "stay" ? (
                    <StayCard stay={stop.stay} role={stop.role === "leave" ? "Airbnb" : "Chegada"} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpenPlace(stop.place.id)}
                      className="w-full rounded-2xl border border-rose-100 bg-white px-4 py-3 text-left shadow-sm"
                    >
                      <p className="text-lg font-semibold text-stone-900">{stop.place.name}</p>
                      <p className="mt-0.5 text-sm text-stone-500">
                        {[stop.place.station, stop.place.duration, stop.place.price]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </button>
                  )}
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
          cityName={dayLabel(day)}
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

function StayCard({ stay, role }: { stay: Stay; role: string }) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-400">{role}</p>
      <p className="mt-0.5 text-lg font-semibold text-stone-900">{stayDisplayName(stay.name)}</p>
      {stay.station ? <p className="text-sm text-stone-500">{stay.station}</p> : null}
      {stay.lat ? (
        <a
          href={mapsSearchUrl(stay.lat, stay.lng)}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-sm font-medium text-jp-red"
        >
          Abrir no Maps
        </a>
      ) : null}
    </div>
  );
}

