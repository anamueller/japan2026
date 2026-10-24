"use client";

import { BedDouble, LayoutDashboard, Sun } from "lucide-react";
import type { AppView } from "@/components/Sidebar";

type BottomNavProps = {
  view: AppView;
  today: string;
  onView: (view: AppView) => void;
};

export function BottomNav({ view, today, onView }: BottomNavProps) {
  const items: { id: string; label: string; icon: typeof Sun; target: AppView; active: boolean }[] = [
    {
      id: "day",
      label: "Dia",
      icon: Sun,
      target: { kind: "day", date: view.kind === "day" ? view.date : today },
      active: view.kind === "day",
    },
    {
      id: "bases",
      label: "Bases",
      icon: BedDouble,
      target: { kind: "bases" },
      active: view.kind === "bases" || view.kind === "city",
    },
    {
      id: "overview",
      label: "Viagem",
      icon: LayoutDashboard,
      target: { kind: "overview" },
      active: view.kind === "overview",
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-rose-100 bg-white pb-[max(0.4rem,env(safe-area-inset-bottom))] lg:hidden">
      <ul className="grid grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onView(item.target)}
                className={`flex w-full flex-col items-center gap-0.5 py-2 text-[11px] ${
                  item.active ? "font-semibold text-jp-red" : "text-stone-500"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
