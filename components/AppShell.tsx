"use client";

import { useEffect, useRef, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { CitySetup } from "@/components/CitySetup";
import { Dashboard } from "@/components/Dashboard";
import { DayGuide } from "@/components/DayGuide";
import { OverviewPanel } from "@/components/OverviewPanel";
import { Sidebar, type AppView } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { buildTripDays, resolveGuideDate } from "@/lib/days";
import { daysUntil } from "@/lib/dates";
import {
  dayAttractions,
  ideaCards,
  type Attraction,
} from "@/lib/mock-data";
import { fetchPlaceDetails, searchPlaces } from "@/lib/places-client";
import { fetchSharedTrip, loadTrip, publishSharedTrip, saveTrip } from "@/lib/trip-store";
import {
  applyStayEnrichment,
  defaultCities,
  defaultFlights,
  defaultStays,
  type CityStay,
  type Flight,
  type Stay,
} from "@/lib/trip";

const initialAttractions = [...dayAttractions, ...ideaCards];

export function AppShell() {
  const [view, setView] = useState<AppView>({ kind: "day", date: "" });
  const [cities, setCities] = useState<CityStay[]>(defaultCities);
  const [flights, setFlights] = useState<Flight[]>(defaultFlights);
  const [stays, setStays] = useState<Stay[]>(defaultStays);
  const [attractions, setAttractions] = useState<Attraction[]>(initialAttractions);
  const [selectedId, setSelectedId] = useState(dayAttractions[0]?.id ?? "");
  const [mapView, setMapView] = useState<"macro" | string>("macro");
  const [optimizing, setOptimizing] = useState(false);
  const [ready, setReady] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const skipShare = useRef(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const remote = await fetchSharedTrip();
      const saved = remote ?? loadTrip();
      if (saved && live) {
        setCities(saved.cities);
        setFlights(saved.flights);
        setStays(saved.stays);
        if (saved.attractions.length) setAttractions(saved.attractions);
      }
      skipShare.current = Boolean(remote);
      if (live) setReady(true);
    })();
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const trip = { cities, flights, stays, attractions };
    saveTrip(trip);
    if (skipShare.current) {
      skipShare.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void publishSharedTrip(trip).then(setShareError);
    }, 1000);
    return () => clearTimeout(timer);
  }, [ready, cities, flights, stays, attractions]);

  useEffect(() => {
    if (!ready) return;
    let live = true;
    Promise.all(initialAttractions.map(enrichFromPlaces)).then((list) => {
      if (!live) return;
      setAttractions((current) =>
        current.map((item) => {
          const extra = list.find((row) => row.id === item.id);
          if (!extra) return item;
          return {
            ...item,
            image: item.image || extra.image,
            station: item.station || extra.station,
            address: item.address || extra.address,
            lat: item.lat || extra.lat,
            lng: item.lng || extra.lng,
            rating: item.rating || extra.rating,
            userRatingCount: item.userRatingCount || extra.userRatingCount,
            placeId: item.placeId || extra.placeId,
          };
        }),
      );
    });
    Promise.all(stays.map(enrichStay)).then((list) => {
      if (live) setStays((current) => applyStayEnrichment(current, list));
    });
    return () => {
      live = false;
    };
  }, [ready]);

  const tripDays = buildTripDays(cities, stays, attractions);
  const today = resolveGuideDate(tripDays);
  const city =
    view.kind === "city" ? cities.find((item) => item.id === view.id) : undefined;
  const openDate =
    view.kind === "day" && tripDays.some((day) => day.date === view.date) ? view.date : today;
  const openDay = view.kind === "day" ? tripDays.find((day) => day.date === openDate) : undefined;
  const countdownStart = cities[0]?.start ?? "2026-11-10";

  function openCity(id: string) {
    setView({ kind: "city", id });
    setMapView("macro");
    const first = attractions.find((item) => item.cityId === id);
    if (first) setSelectedId(first.id);
  }

  function changeView(next: AppView) {
    if (next.kind === "city") {
      openCity(next.id);
      return;
    }
    setView(next);
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white">
      <TopBar daysLeft={daysUntil(countdownStart)} />
      {shareError ? (
        <p className="shrink-0 bg-red-50 px-3 py-1 text-center text-xs text-red-700">
          Não deu para gravar o roteiro compartilhado: {shareError}
        </p>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col pb-16 lg:flex-row lg:pb-0">
        <Sidebar cities={cities} today={today} view={view} onView={changeView} />
        {openDay && (
          <DayGuide
            day={openDay}
            days={tripDays}
            onDate={(date) => setView({ kind: "day", date })}
            onPlan={openCity}
          />
        )}
        {view.kind === "overview" && (
          <OverviewPanel
            flights={flights}
            stays={stays}
            onFlights={setFlights}
            onStays={setStays}
          />
        )}
        {view.kind === "bases" && (
          <CitySetup
            cities={cities}
            onChange={setCities}
            onOpenCity={openCity}
          />
        )}
        {city && (
          <Dashboard
            city={city}
            stay={stays.find((item) => item.cityId === city.id)}
            attractions={attractions}
            selectedId={selectedId}
            mapView={mapView}
            optimizing={optimizing}
            onAttractions={setAttractions}
            onSelectedId={setSelectedId}
            onMapView={setMapView}
            onOptimizing={setOptimizing}
          />
        )}
      </div>
      <BottomNav view={view} today={today} onView={changeView} />
    </div>
  );
}

async function enrichStay(stay: Stay): Promise<Stay> {
  if ((stay.image && stay.station) || !stay.address) return stay;
  const hits = await searchPlaces(stay.address);
  if (!hits[0]) return stay;
  const details = await fetchPlaceDetails(hits[0].placeId);
  if (!details) return stay;
  return {
    ...stay,
    image: details.image || stay.image,
    lat: stay.lat || details.lat,
    lng: stay.lng || details.lng,
    station: details.station || stay.station,
  };
}

async function enrichFromPlaces(item: Attraction): Promise<Attraction> {
  if (item.placeId) return item;
  const hits = await searchPlaces(`${item.name} Tokyo`);
  if (!hits[0]) return item;
  const details = await fetchPlaceDetails(hits[0].placeId);
  if (!details) return item;
  return {
    ...item,
    placeId: details.placeId,
    name: details.name || item.name,
    address: details.address,
    station: details.station || item.station,
    rating: details.rating || item.rating,
    userRatingCount: details.userRatingCount,
    image: details.image || item.image,
    lat: details.lat,
    lng: details.lng,
    category: details.category,
    categoryEmoji: details.categoryEmoji,
  };
}
