"use client";

import { BedDouble, LayoutDashboard, Sun } from "lucide-react";
import { CountryFlag } from "@/components/CountryFlag";
import type { CityStay } from "@/lib/trip";

export type AppView =
  | { kind: "overview" }
  | { kind: "day"; date: string }
  | { kind: "bases" }
  | { kind: "city"; id: string };

type SidebarProps = {
  cities: CityStay[];
  today: string;
  view: AppView;
  onView: (view: AppView) => void;
};

export function Sidebar({ cities, today, view, onView }: SidebarProps) {
  return (
    <aside className="hidden w-56 shrink-0 flex-col overflow-y-auto bg-jp-ink px-4 py-5 text-rose-100 lg:flex">
      <p className="mb-6 flex items-center gap-2 px-2 text-sm font-semibold tracking-wide text-white">
        Trip: Japan
        <CountryFlag iso="JP" className="h-3.5 w-[1.3rem]" title="Japão" />
      </p>
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto text-sm">
        <NavItem
          icon={Sun}
          label="Dia"
          active={view.kind === "day"}
          onClick={() => onView({ kind: "day", date: view.kind === "day" ? view.date : today })}
        />
        <div>
          <NavItem
            icon={BedDouble}
            label="Bases"
            active={view.kind === "bases" || view.kind === "city"}
            onClick={() => onView({ kind: "bases" })}
          />
          <ul className="mt-1 ml-9 flex flex-col gap-1 text-rose-200/70">
            {cities.map((city) => (
              <li key={city.id}>
                <button
                  type="button"
                  onClick={() => onView({ kind: "city", id: city.id })}
                  className={`w-full rounded-md px-2 py-1 text-left transition hover:bg-white/5 hover:text-white ${
                    view.kind === "city" && view.id === city.id ? "font-medium text-white" : ""
                  }`}
                >
                  {city.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <NavItem
          icon={LayoutDashboard}
          label="Viagem"
          active={view.kind === "overview"}
          onClick={() => onView({ kind: "overview" })}
        />
      </nav>
    </aside>
  );
}

function NavItem({
  icon: Icon,
  label,
  active = false,
  onClick,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition hover:bg-white/5 hover:text-white ${
        active ? "bg-jp-red font-medium text-white" : ""
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
