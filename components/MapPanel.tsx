"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { formatDateShort } from "@/lib/dates";
import type { RouteStart } from "@/components/DayMap";
import type { Attraction } from "@/lib/mock-data";
import { fetchGoogleRoute } from "@/lib/google-route";
import { straightRoute, type LatLng } from "@/lib/osrm-route";

const mapLoading = () => <div className="absolute inset-0 bg-slate-200" />;

const DayMap = dynamic(() => import("@/components/DayMap"), {
  ssr: false,
  loading: mapLoading,
});

const GoogleDayMap = dynamic(() => import("@/components/GoogleDayMap"), {
  ssr: false,
  loading: mapLoading,
});

const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

export type MapView = "macro" | string;

type MapPanelProps = {
  attractions: Attraction[];
  selectedId: string;
  view: MapView;
  dates: string[];
  cityName: string;
  routeStart?: RouteStart | null;
  onSelect: (id: string) => void;
  onViewChange: (view: MapView) => void;
  className?: string;
};

export function MapPanel({
  attractions,
  selectedId,
  view,
  dates,
  cityName,
  routeStart,
  onSelect,
  onViewChange,
  className,
}: MapPanelProps) {
  const [route, setRoute] = useState<LatLng[]>([]);
  const fitKey = view === "macro" ? "macro" : `day-${view}`;
  const pointsKey = `${routeStart?.lat ?? ""},${routeStart?.lng ?? ""}|${attractions
    .map((item) => `${item.id}:${item.lat},${item.lng}`)
    .join(",")}`;

  useEffect(() => {
    const waypoints = routeStart
      ? [{ lat: routeStart.lat, lng: routeStart.lng }, ...attractions]
      : attractions;
    let live = true;
    setRoute(straightRoute(waypoints));
    fetchGoogleRoute(waypoints, false).then((result) => {
      if (live) setRoute(result.path);
    });
    return () => {
      live = false;
    };
  }, [pointsKey]);

  return (
    <aside
      className={
        className ??
        "relative h-64 w-full shrink-0 overflow-hidden bg-slate-200 lg:h-full lg:w-[46%]"
      }
    >
      <div className="absolute inset-0">
        {googleMapsKey ? (
          <GoogleDayMap
            apiKey={googleMapsKey}
            attractions={attractions}
            selectedId={selectedId}
            showRoute
            showPins
            route={route}
            fitKey={fitKey}
            routeStart={routeStart}
            onSelect={onSelect}
          />
        ) : (
          <DayMap
            attractions={attractions}
            selectedId={selectedId}
            showRoute
            showPins
            route={route}
            fitKey={fitKey}
            routeStart={routeStart}
            onSelect={onSelect}
          />
        )}
      </div>

      <div className="absolute top-4 right-4 left-4 z-[1000]">
        <label className="relative block">
          <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            aria-label="Visão do mapa"
            value={view}
            onChange={(event) => onViewChange(event.target.value)}
            className="w-full appearance-none rounded-full border border-slate-200 bg-white py-2 pr-10 pl-9 text-sm text-slate-800 shadow-sm outline-none focus:border-slate-400"
          >
            <option value="macro">Visão macro — {cityName}</option>
            {dates.map((date) => (
              <option key={date} value={date}>
                {formatDateShort(date)} — rota do dia
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </label>
      </div>
    </aside>
  );
}
