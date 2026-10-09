import { Activity, FlaskConical, Gauge, Radiation, type LucideIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { type AgeRow, type DeviceGroup, type GroupSummary, type TypeRow } from "@/lib/dashboard";

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
          <TypeList rows={group.types} label={group.label} />

          {/* Нэг эгнээний картууд ижил өндөртэй тул насжилтын диаграмууд доод талдаа эгнэнэ */}
          <div className="mt-auto pt-5">
            <h3 className="text-sm font-medium">Насжилтаар</h3>
            <AgeChart rows={group.ages} label={group.label} />
            <p className="mt-1 text-xs text-muted-foreground">
              Нас жилээр, үйлдвэрлэсэн оноос тооцов.
              {group.unknownAge > 0 && ` Он тодорхойгүй: ${group.unknownAge}.`}
            </p>

            <h3 className="mt-5 text-sm font-medium">Үйлдвэрлэгчээр</h3>
            {/* 7 мөр + тайлбарын өндрийг тогтмол байлгаснаар баганын насжилтын диаграмууд нэг түвшинд эгнэнэ */}
            <div className="md:min-h-[290px]">
              <VendorList rows={group.vendors} label={group.label} />
              {group.unknownVendor > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Үйлдвэрлэгч тодорхойгүй: {group.unknownVendor}.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/**
 * Төрлийн жагсаалт: мөр бүрт ISA код, бүтэн нэр, тоо, доор нь харьцангуй урттай зурвас.
 * Урт нэр SVG тэнхлэгт багтахгүй тул HTML-ээр зурсан; нэр таслагдвал хулганаар заахад бүтнээрээ гарна.
 */
function TypeList({ rows, label }: { rows: TypeRow[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="mt-2 space-y-2" aria-label={`${label}, төрлөөр`}>
      {rows.map((r) => {
        const other = r.code === "Бусад";
        return (
          <li key={r.code} title={`${r.code} — ${r.name}: ${r.count}`}>
            <div className="flex items-baseline gap-2 text-xs">
              <span className="w-12 shrink-0 font-mono font-semibold">{r.code}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{r.name}</span>
              <span className="shrink-0 text-sm font-medium tabular-nums">{r.count}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted" aria-hidden>
              <div
                className={`h-full rounded-full ${other ? "bg-muted-foreground/60" : "bg-primary"}`}
                style={{ width: `${(r.count / max) * 100}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Үйлдвэрлэгчийн жагсаалт: нэр, тоо, харьцангуй зурвас; "Бусад" нь үлдсэн үйлдвэрлэгчдийн нийлбэр. */
function VendorList({ rows, label }: { rows: TypeRow[]; label: string }) {
  if (!rows.length)
    return <p className="mt-2 text-xs text-muted-foreground">Үйлдвэрлэгчийн мэдээлэл алга.</p>;
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="mt-2 space-y-2" aria-label={`${label}, үйлдвэрлэгчээр`}>
      {rows.map((r) => {
        const other = r.code === "Бусад";
        return (
          <li key={r.code} title={other ? `Бусад ${r.name}: ${r.count}` : `${r.code}: ${r.count}`}>
            <div className="flex items-baseline gap-2 text-xs">
              <span
                className={`min-w-0 flex-1 truncate ${other ? "text-muted-foreground" : "font-medium"}`}
              >
                {r.code}
                {other && <span className="ml-1 font-normal">({r.name})</span>}
              </span>
              <span className="shrink-0 text-sm font-medium tabular-nums">{r.count}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted" aria-hidden>
              <div
                className={`h-full rounded-full ${other ? "bg-muted-foreground/60" : "bg-primary"}`}
                style={{ width: `${(r.count / max) * 100}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
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

function AgeTooltip({ active, payload }: TipProps<AgeRow>) {
  const row = active ? payload?.[0]?.payload : undefined;
  if (!row) return null;
  return <TipBox title={`${row.label} жил`} body={`${row.count} тоног төхөөрөмж`} />;
}
