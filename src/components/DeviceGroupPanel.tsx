import { Activity, FlaskConical, Gauge, Radiation, type LucideIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import {
  TOP_TYPES,
  type AgeRow,
  type DeviceGroup,
  type GroupSummary,
  type TypeRow,
} from "@/lib/dashboard";

const ICONS: Record<DeviceGroup, LucideIcon> = {
  sensor: Gauge,
  actuator: Activity,
  radiation: Radiation,
  analyzer: FlaskConical,
};

const chartConfig = { count: { label: "Тоо", color: "var(--primary)" } } satisfies ChartConfig;

/** Шинэ → хуучин: цайвараас бараан руу. Хамгийн бараан нь 21+ жил. */
const AGE_COLORS = [
  "oklch(0.80 0.07 240)",
  "oklch(0.69 0.09 240)",
  "oklch(0.58 0.10 240)",
  "oklch(0.47 0.11 240)",
  "oklch(0.35 0.10 248)",
];

const BAR_ROW = 30;
const chartHeight = (rows: number) => rows * BAR_ROW + 8;

export function DeviceGroupPanel({
  group,
  grandTotal,
}: {
  group: GroupSummary;
  grandTotal: number;
}) {
  const Icon = ICONS[group.code];
  const share = grandTotal ? Math.round((group.total / grandTotal) * 100) : 0;

  return (
    <section
      aria-labelledby={`group-${group.code}`}
      className="flex flex-col rounded-xl border bg-card p-5 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <h2 id={`group-${group.code}`} className="text-base font-semibold tracking-tight">
          {group.label}
        </h2>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <p className="text-4xl font-semibold tabular-nums leading-none">{group.total}</p>
        <p className="text-right text-xs text-muted-foreground">Нийт бүртгэлийн {share}%</p>
      </div>

      {group.total === 0 ? (
        <div className="mt-5 flex flex-1 flex-col justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          <p>Энэ бүлэгт бүртгэл алга.</p>
          <p className="mt-1 text-xs">{group.rule} гэж бүртгэсэн тоног төхөөрөмж энд харагдана.</p>
        </div>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-y py-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Дундаж нас</dt>
              <dd className="font-medium tabular-nums">
                {group.averageAge === null ? "—" : `${group.averageAge.toFixed(1)} жил`}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">20-оос дээш жил</dt>
              <dd className="font-medium tabular-nums">{group.over20}</dd>
            </div>
          </dl>

          <h3 className="mt-5 text-sm font-medium">Төрлөөр</h3>
          {/* Олон баганатай үед насжилтын диаграмууд нэг түвшинд эгнэхийн тулд өндрийг тогтмол байлгана */}
          <div
            className="md:min-h-[var(--types-h)]"
            style={{ "--types-h": `${chartHeight(TOP_TYPES) + 8}px` } as React.CSSProperties}
          >
            <TypeChart rows={group.types} label={group.label} />
          </div>

          <h3 className="mt-5 text-sm font-medium">Насжилтаар</h3>
          <AgeChart rows={group.ages} label={group.label} />
          <p className="mt-1 text-xs text-muted-foreground">
            Нас жилээр, үйлдвэрлэсэн оноос тооцов.
            {group.unknownAge > 0 && ` Он тодорхойгүй: ${group.unknownAge}.`}
          </p>
        </>
      )}
    </section>
  );
}

function TypeChart({ rows, label }: { rows: TypeRow[]; label: string }) {
  const summary = rows.map((r) => `${r.code} ${r.count}`).join(", ");
  return (
    <ChartContainer
      config={chartConfig}
      className="mt-2 aspect-auto w-full"
      style={{ height: chartHeight(rows.length) }}
      role="img"
      aria-label={`${label}, төрлөөр: ${summary}`}
    >
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 0 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="code"
          width={56}
          tickLine={false}
          axisLine={false}
          tick={{ fontFamily: "var(--font-mono, ui-monospace, monospace)", fontSize: 12 }}
        />
        <Tooltip cursor={{ fill: "var(--muted)" }} content={<TypeTooltip />} />
        <Bar dataKey="count" radius={4} barSize={18} isAnimationActive={false}>
          {rows.map((r) => (
            <Cell
              key={r.code}
              fill={r.code === "Бусад" ? "var(--muted-foreground)" : "var(--color-count)"}
            />
          ))}
          <LabelList dataKey="count" position="right" fill="var(--foreground)" fontSize={12} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function AgeChart({ rows, label }: { rows: AgeRow[]; label: string }) {
  const summary = rows.map((r) => `${r.label} жил ${r.count}`).join(", ");
  return (
    <ChartContainer
      config={chartConfig}
      className="mt-2 aspect-auto h-44 w-full"
      role="img"
      aria-label={`${label}, насжилтаар: ${summary}`}
    >
      <BarChart data={rows} margin={{ top: 20, right: 4, bottom: 0, left: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} />
        <YAxis hide allowDecimals={false} />
        <Tooltip cursor={{ fill: "var(--muted)" }} content={<AgeTooltip />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {rows.map((r, i) => (
            <Cell key={r.key} fill={AGE_COLORS[i] ?? "var(--color-count)"} />
          ))}
          <LabelList dataKey="count" position="top" fill="var(--foreground)" fontSize={12} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

type TipProps<T> = { active?: boolean; payload?: { payload: T }[] };

function TipBox({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground">{body}</p>
    </div>
  );
}

function TypeTooltip({ active, payload }: TipProps<TypeRow>) {
  const row = active ? payload?.[0]?.payload : undefined;
  if (!row) return null;
  return <TipBox title={`${row.code}: ${row.count}`} body={row.name} />;
}

function AgeTooltip({ active, payload }: TipProps<AgeRow>) {
  const row = active ? payload?.[0]?.payload : undefined;
  if (!row) return null;
  return <TipBox title={`${row.label} жил`} body={`${row.count} тоног төхөөрөмж`} />;
}
