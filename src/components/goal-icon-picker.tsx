"use client";

import { useState } from "react";

import { GOAL_ICON_CATEGORIES, GOAL_ICONS, type GoalIconCategory } from "@/lib/goal-icons";

export function GoalIconPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (iconId: string) => void;
  disabled?: boolean;
}) {
  const [category, setCategory] = useState<"all" | GoalIconCategory>("all");
  const categories: Array<"all" | GoalIconCategory> = ["all", ...GOAL_ICON_CATEGORIES.map((c) => c.id)];
  const icons = category === "all" ? GOAL_ICONS : GOAL_ICONS.filter((item) => item.category === category);

  return (
    <div>
      <p className="text-sm font-bold">Elige tu ícono</p>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((id) => {
          const label = id === "all" ? "Todos" : GOAL_ICON_CATEGORIES.find((c) => c.id === id)?.label ?? id;
          const on = category === id;
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => setCategory(id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                on ? "bg-accent text-white" : "bg-[#efe9ff] text-accent"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
        {icons.map((item) => {
          const selected = value === item.id;
          const Icon = item.Icon;
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={item.label}
              onClick={() => onChange(item.id)}
              className={`grid aspect-square place-items-center rounded-2xl border-2 transition ${
                selected ? "border-accent bg-[#efe9ff] text-accent" : "border-transparent bg-[#f8f5ff] text-foreground/70"
              }`}
            >
              <Icon className="size-6" aria-hidden />
            </button>
          );
        })}
      </div>
    </div>
  );
}
