"use client";

import { useState } from "react";
import { MapPinned, X } from "lucide-react";
import { ItineraryPanel } from "@/components/ItineraryPanel";
import { MapPanel, type MapView } from "@/components/MapPanel";
import { WeatherBoard } from "@/components/TripBoards";
import { eachDate } from "@/lib/dates";
import { fetchGoogleRoute } from "@/lib/google-route";
import {
  applyDraft,
  reorderById,
  replaceDateOrder,
  type Attraction,
  type AttractionDraft,
} from "@/lib/mock-data";
import type { CityStay, Stay } from "@/lib/trip";

type DashboardProps = {
  city: CityStay;
  stay?: Stay;
  attractions: Attraction[];
  selectedId: string;
  mapView: MapView;
  optimizing: boolean;
  onAttractions: (next: Attraction[]) => void;
  onSelectedId: (id: string) => void;
  onMapView: (view: MapView) => void;
  onOptimizing: (value: boolean) => void;
};

export function Dashboard({
  city,
  stay,
  attractions,
  selectedId,
  mapView,
  optimizing,
  onAttractions,
  onSelectedId,
  onMapView,
  onOptimizing,
}: DashboardProps) {
  const [showMap, setShowMap] = useState(false);
  const dates = eachDate(city.start, city.end);
  const cityItems = attractions.filter((item) => item.cityId === city.id);
  const routeStart = stay
    ? { lat: stay.lat, lng: stay.lng, label: stay.name || "Airbnb" }
    : { lat: city.lat, lng: city.lng, label: "Airbnb" };
  const mapAttractions =
    mapView === "macro"
      ? cityItems
          .filter((item) => item.date !== null)
          .sort((left, right) => (left.date ?? "").localeCompare(right.date ?? ""))
      : cityItems.filter((item) => item.date === mapView);

  function selectPin(id: string) {
    onSelectedId(id);
  }

  function focus(id: string) {
    onSelectedId(id);
    const item = attractions.find((attraction) => attraction.id === id);
    if (item?.date) onMapView(item.date);
  }

  function changeView(view: MapView) {
    onMapView(view);
    if (view === "macro") return;
    const first = cityItems.find((item) => item.date === view);
    if (first) onSelectedId(first.id);
  }

  function add(draft: AttractionDraft) {
    const attraction = applyDraft({ ...draft, cityId: city.id });
    onAttractions([...attractions, attraction]);
    onSelectedId(attraction.id);
    onMapView(attraction.date ?? "macro");
  }

  function save(id: string, draft: AttractionDraft) {
    onAttractions(
      attractions.map((item) =>
        item.id === id ? applyDraft({ ...draft, cityId: city.id }, item) : item,
      ),
    );
    onSelectedId(id);
    onMapView(draft.date ?? "macro");
  }

  function remove(id: string) {
    const next = attractions.filter((item) => item.id !== id);
    onAttractions(next);
    if (id !== selectedId) return;
    const fallback =
      next.find((item) => item.cityId === city.id && item.date != null) ??
      next.find((item) => item.cityId === city.id);
    onSelectedId(fallback?.id ?? "");
  }

  async function optimizeDate(items: Attraction[], startId?: string) {
    let ordered = items;
    if (startId) {
      const start = items.find((item) => item.id === startId);
      if (start) ordered = [start, ...items.filter((item) => item.id !== startId)];
    }
    if (ordered.length === 0) return ordered;
    const origin = { lat: routeStart.lat, lng: routeStart.lng };
    const points = [origin, ...ordered];
    if (points.length < 2) return ordered;
    const result = await fetchGoogleRoute(points, true);
    return result.waypointOrder
      .map((index) => points[index])
      .filter((point) => "id" in point) as Attraction[];
  }

  async function optimize(scope: "all" | string, startId?: string) {
    const datesToRun =
      scope === "all"
        ? [...new Set(cityItems.filter((item) => item.date).map((item) => item.date!))].sort()
        : [scope];
    onOptimizing(true);
    try {
      let next = attractions;
      for (const date of datesToRun) {
        const items = next.filter(
          (item) => item.cityId === city.id && item.date === date,
        );
        const ordered = await optimizeDate(items, startId);
        next = replaceDateOrder(next, date, ordered);
      }
      onAttractions(next);
      if (scope !== "all") onMapView(scope);
    } finally {
      onOptimizing(false);
    }
  }

  function reorder(date: string, fromId: string, toId: string) {
    const day = attractions.filter(
      (item) => item.cityId === city.id && item.date === date,
    );
    onAttractions(replaceDateOrder(attractions, date, reorderById(day, fromId, toId)));
    onMapView(date);
  }

  function startFrom(id: string) {
    const item = attractions.find((attraction) => attraction.id === id);
    if (!item?.date) return;
    onSelectedId(id);
    onMapView(item.date);
    void optimize(item.date, id);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className={`${showMap ? "hidden lg:flex" : "flex"} min-h-0 min-w-0 flex-1 flex-col`}>
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => setShowMap(true)}
            className="inline-flex items-center gap-1 rounded-full border border-rose-100 px-3 py-1.5 text-xs font-medium text-stone-700"
          >
            <MapPinned className="h-3.5 w-3.5" />
            Ver mapa
          </button>
        </div>
        <div className="shrink-0 overflow-x-auto px-4 py-3 md:px-6">
          <WeatherBoard cities={[city]} />
        </div>
      <ItineraryPanel
        cityName={city.name}
        cityId={city.id}
        dates={dates}
        attractions={cityItems}
        selectedId={selectedId}
        optimizing={optimizing}
        onFocus={focus}
        onAdd={add}
        onSave={save}
        onDelete={remove}
        onOptimize={optimize}
        onStartFrom={startFrom}
        onReorder={reorder}
      />
      </div>
      <div
        className={`${
          showMap ? "relative min-h-0 flex-1" : "hidden"
        } lg:block lg:h-auto lg:w-[46%] lg:shrink-0`}
      >
        <button
          type="button"
          aria-label="Fechar mapa"
          onClick={() => setShowMap(false)}
          className="absolute top-3 right-3 z-[1001] rounded-full bg-white p-2 shadow lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      <MapPanel
        attractions={mapAttractions}
        selectedId={selectedId}
        view={mapView}
        dates={dates}
        cityName={city.name}
        routeStart={routeStart}
        className="relative h-full min-h-64 w-full"
        onSelect={selectPin}
        onViewChange={changeView}
      />
      </div>
    </div>
  );
}
