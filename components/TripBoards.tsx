"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, CloudSun, TrainFront } from "lucide-react";
import { formatDayMonth, formatStayRange } from "@/lib/dates";
import { cityHops, type CityStay } from "@/lib/trip";
import { climateLabel, type WeatherDay } from "@/lib/weather";

export function WeatherBoard({ cities }: { cities: CityStay[] }) {
  const [rows, setRows] = useState<{ city: CityStay; days: WeatherDay[] }[]>([]);
  const citiesKey = cities
    .map((city) => `${city.id}:${city.lat},${city.lng}:${city.start}:${city.end}`)
    .join("|");

  useEffect(() => {
    let live = true;
    Promise.all(
      cities.map(async (city) => {
        const response = await fetch(
          `/api/weather?lat=${city.lat}&lng=${city.lng}&start=${city.start}&end=${city.end}`,
        );
        const payload = (await response.json()) as { days?: WeatherDay[] };
        return { city, days: payload.days ?? [] };
      }),
    ).then((list) => {
      if (live) setRows(list);
    });
    return () => {
      live = false;
    };
  }, [citiesKey]);

  return (
    <div>
      <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-stone-800">
        <CloudSun className="h-4 w-4 text-jp-red" />
        Tempo por cidade
      </h3>
      <div className="mt-3 flex flex-wrap gap-3">
        {rows.map((row) => (
          <article
            key={row.city.id}
            className="w-fit rounded-2xl border border-rose-100 bg-white px-3 py-2.5 shadow-sm"
          >
            <p className="text-sm font-semibold text-stone-900">
              {row.city.name || "Nova cidade"}
            </p>
            <p className="text-[11px] leading-tight text-stone-500">
              {climateLabel(row.days)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {row.days.map((day) => (
                <div
                  key={day.date}
                  className="flex w-8 shrink-0 flex-col items-center text-center"
                >
                  <p className="text-sm leading-none">{day.emoji}</p>
                  <p className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-red-600">
                    <ArrowUp className="h-2.5 w-2.5" />
                    {day.max}
                  </p>
                  <p className="inline-flex items-center gap-0.5 text-[10px] text-sky-600">
                    <ArrowDown className="h-2.5 w-2.5" />
                    {day.min}
                  </p>
                  <p className="text-[10px] text-stone-400">
                    {formatDayMonth(day.date)}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function TransitBoard({
  cities,
  action,
  onSelectCity,
}: {
  cities: CityStay[];
  action?: ReactNode;
  onSelectCity?: (id: string) => void;
}) {
  const hops = cityHops(cities);
  const [rows, setRows] = useState<{ key: string; duration: string; summary: string }[]>([]);
  const cityWidth = `${Math.max(...cities.map((city) => city.name.length), 8) + 2}ch`;
  const hopsKey = hops
    .map((hop) => `${hop.from.id}:${hop.from.lat},${hop.from.lng}->${hop.to.id}:${hop.to.lat},${hop.to.lng}:${hop.date}`)
    .join("|");

  useEffect(() => {
    let live = true;
    Promise.all(
      hops.map(async (hop) => {
        const response = await fetch("/api/transit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromId: hop.from.id,
            toId: hop.to.id,
            fromName: hop.from.name,
            toName: hop.to.name,
            fromLat: hop.from.lat,
            fromLng: hop.from.lng,
            toLat: hop.to.lat,
            toLng: hop.to.lng,
            date: hop.date,
          }),
        });
        const payload = (await response.json()) as {
          duration?: string;
          summary?: string;
        };
        return {
          key: `${hop.from.id}-${hop.to.id}`,
          duration: payload.duration || "—",
          summary: payload.summary || "",
        };
      }),
    ).then((list) => {
      if (live) setRows(list);
    });
    return () => {
      live = false;
    };
  }, [hopsKey]);

  const ordered = hops.length
    ? [hops[0].from, ...hops.map((hop) => hop.to)]
    : [...cities].sort((left, right) => left.start.localeCompare(right.start));

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-stone-800">
          <TrainFront className="h-4 w-4 text-jp-red" />
          Rota mais rápida
        </h3>
        {action}
      </div>
      <div className="mt-3 flex flex-wrap items-start gap-2">
        {ordered.map((city, index) => {
          const hop = index === 0 ? null : hops[index - 1];
          const row = hop
            ? rows.find((item) => item.key === `${hop.from.id}-${hop.to.id}`)
            : null;
          return (
            <div key={city.id} className="flex flex-wrap items-start gap-2">
              {hop ? (
                <HopPill
                  duration={row?.duration ?? "…"}
                  summary={row?.summary ?? ""}
                />
              ) : null}
              <CityPill
                city={city}
                width={cityWidth}
                onClick={() => onSelectCity?.(city.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HopPill({ duration, summary }: { duration: string; summary: string }) {
  const width = `${Math.max(Math.ceil(summary.length / 2), duration.length, 6)}ch`;
  return (
    <div className="flex flex-col items-center" style={{ width }}>
      <div className="w-full rounded-full border border-rose-100 bg-white px-1.5 py-0.5 text-center">
        <p className="text-[10px] font-semibold text-jp-red">{duration}</p>
      </div>
      <p className="mt-1 w-full text-center text-[10px] leading-tight text-stone-400">
        {summary}
      </p>
    </div>
  );
}

function CityPill({
  city,
  width,
  onClick,
}: {
  city: CityStay;
  width: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onClick}
        style={{ width }}
        className="rounded-full bg-jp-red px-3 py-1.5 text-center text-xs font-semibold text-white"
      >
        {city.name || "Nova cidade"}
      </button>
      <p className="mt-1 text-[10px] text-stone-400">
        {formatStayRange(city.start, city.end)}
      </p>
    </div>
  );
}
