import { Activity, Cpu, Gauge, Sliders } from "lucide-react";

import { Equipment } from "@/lib/equipment";

export function StatsCards({ items }: { items: Equipment[] }) {
  const count = (code: string) => items.filter((i) => i.category === code).length;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = items.filter((i) => new Date(i.created_at).getTime() > weekAgo).length;

  const cards = [
    { label: "Бүртгэлтэй нийт", value: items.length, icon: Cpu, hint: "тоног төхөөрөмж" },
    { label: "Сенсор (S)", value: count("S"), icon: Gauge, hint: "даралт, температур, түвшин" },
    { label: "Хувиргагч (C)", value: count("C"), icon: Sliders, hint: "гүйдэл, чадал, жин" },
    { label: "Actuator (A)", value: count("A"), icon: Activity, hint: "клапан, соленоид" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {card.label}
            </p>
            <card.icon className="size-4 text-primary" />
          </div>
          <p className="mt-3 text-3xl font-semibold tabular-nums">{card.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
        </div>
      ))}
      <p className="sr-only">Сүүлийн 7 хоногт: {recent}</p>
    </div>
  );
}
