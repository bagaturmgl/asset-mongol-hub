import { STATUSES, isMnu } from "@/lib/equipment";

/** DCS/PLC контроллер (public.controllers). Зөвхөн нэвтэрсэн хэрэглэгч уншина — OT мэдээлэл. */
export type Controller = {
  id: string;
  tag: string;
  ctype: "DCS" | "PLC";
  unit: string;
  section: string;
  sub_section: string | null;
  main_equipment: string | null;
  main_equipment_name: string | null;
  manufacturer: string | null;
  model: string | null;
  /** "YYYY" эсвэл "YYYY-MM" */
  commissioned: string | null;
  io_ai: number | null;
  io_ao: number | null;
  io_di: number | null;
  io_do: number | null;
  io_pi: number | null;
  /** Модулийн тоо төрөл бүрээр */
  mod_ai: number | null;
  mod_ao: number | null;
  mod_di: number | null;
  mod_do: number | null;
  mod_pi: number | null;
  /** Нэг модулийн сувгийн тоо төрөл бүрээр */
  ch_ai: number | null;
  ch_ao: number | null;
  ch_di: number | null;
  ch_do: number | null;
  ch_pi: number | null;
  /** Fieldbus: холбох боломжтой ТТ, холбогдсон ТТ, сигналын тоо */
  pb_capacity: number | null;
  pb_devices: number | null;
  pb_signals: number | null;
  mb_capacity: number | null;
  mb_devices: number | null;
  mb_signals: number | null;
  eth_capacity: number | null;
  eth_devices: number | null;
  eth_signals: number | null;
  ip: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const CONTROLLER_TYPES = ["DCS", "PLC"] as const;
export const CONTROLLER_STATUSES = STATUSES;

/** Tag-ийн угтвар: ASU-IFO-SS-DCS, ASU-FSO-CC-PF1-PLC, ASU-DTO-DCS (дэд хэсэггүй DCS). */
export function controllerTagPrefix(c: {
  unit: string;
  section: string;
  sub_section?: string | null;
  main_equipment?: string | null;
  ctype: string;
}) {
  return [
    c.unit,
    c.section,
    c.sub_section || null,
    c.ctype === "PLC" ? c.main_equipment || null : null,
    c.ctype,
  ]
    .filter(Boolean)
    .join("-");
}

/** Угтвартай ижил Tag-уудын дараагийн дугаар: …-PLC-01, …-PLC-02 */
export function nextControllerTag(prefix: string, existing: string[]) {
  const used = existing
    .filter((t) => t.startsWith(prefix + "-"))
    .map((t) => Number(t.slice(prefix.length + 1)) || 0);
  return `${prefix}-${String(Math.max(0, ...used) + 1).padStart(2, "0")}`;
}

/** Физик оролт/гаралтын төрлүүд: AI, AO, DI, DO, PI (импульсийн оролт) */
export const IO_KINDS = [
  { k: "ai", label: "AI" },
  { k: "ao", label: "AO" },
  { k: "di", label: "DI" },
  { k: "do", label: "DO" },
  { k: "pi", label: "PI" },
] as const;
export type IoKind = (typeof IO_KINDS)[number]["k"];

/** Fieldbus протоколууд */
export const FIELDBUS = [
  { k: "pb", label: "PB", name: "Profibus" },
  { k: "mb", label: "MB", name: "Modbus" },
  { k: "eth", label: "ETH", name: "Ethernet" },
] as const;
export type FieldbusKind = (typeof FIELDBUS)[number]["k"];

type IoFields = Pick<Controller, `io_${IoKind}` | `mod_${IoKind}` | `ch_${IoKind}`>;
type FbFields = Pick<
  Controller,
  `${FieldbusKind}_capacity` | `${FieldbusKind}_devices` | `${FieldbusKind}_signals`
>;

const num = (v: number | null | undefined) =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
export const ioUsed = (c: Partial<IoFields>, k: IoKind) => num(c[`io_${k}`]);
export const ioModules = (c: Partial<IoFields>, k: IoKind) => num(c[`mod_${k}`]);
export const ioPerModule = (c: Partial<IoFields>, k: IoKind) => num(c[`ch_${k}`]);

/** Нийт суваг = модулийн тоо × нэг модулийн суваг (аль нэг нь хоосон бол тодорхойгүй) */
export function ioChannels(c: Partial<IoFields>, k: IoKind): number | null {
  const m = ioModules(c, k),
    ch = ioPerModule(c, k);
  return m === null || ch === null ? null : m * ch;
}
/** Нөөц суваг = нийт суваг − ашиглаж буй сигнал */
export function ioSpare(c: Partial<IoFields>, k: IoKind): number | null {
  const total = ioChannels(c, k);
  return total === null ? null : total - (ioUsed(c, k) ?? 0);
}
export const pct = (part: number | null, whole: number | null) =>
  part === null || whole === null || whole <= 0 ? null : part / whole;

/** Бүх төрлийн нийлбэр: суваг тодорхой төрлүүдээр нөөцийг тооцно */
export function ioSummary(c: Partial<IoFields>) {
  let channels: number | null = null,
    usedWithCh = 0,
    used = 0,
    modules: number | null = null;
  const over: IoKind[] = [];
  for (const { k } of IO_KINDS) {
    used += ioUsed(c, k) ?? 0;
    const m = ioModules(c, k);
    if (m !== null) modules = (modules ?? 0) + m;
    const t = ioChannels(c, k);
    if (t !== null) {
      channels = (channels ?? 0) + t;
      usedWithCh += ioUsed(c, k) ?? 0;
      if ((ioUsed(c, k) ?? 0) > t) over.push(k);
    }
  }
  const spare = channels === null ? null : channels - usedWithCh;
  /** over: ашигласан сигнал нь нийт сувгаас хэтэрсэн төрлүүд */
  return { used, modules, channels, spare, sparePct: pct(spare, channels), over };
}

export const fbValue = (
  c: Partial<FbFields>,
  k: FieldbusKind,
  f: "capacity" | "devices" | "signals",
) => num(c[`${k}_${f}`]);
export const fbTotal = (c: Partial<FbFields>, f: "capacity" | "devices" | "signals") =>
  FIELDBUS.reduce((s, { k }) => s + (fbValue(c, k, f) ?? 0), 0);

/** Ашиглаж буй физик сигнал (AI+AO+DI+DO+PI) */
export const ioTotal = (c: Partial<IoFields>) => ioSummary(c).used;
/** Нийт сигнал = физик + fieldbus */
export const allSignals = (c: Partial<IoFields & FbFields>) => ioTotal(c) + fbTotal(c, "signals");

export function controllerAge(
  c: Pick<Controller, "commissioned">,
  now = new Date(),
): number | null {
  const y = Number((c.commissioned ?? "").slice(0, 4));
  return y >= 1950 && y <= now.getFullYear() ? now.getFullYear() - y : null;
}

export function controllersToCsv(rows: Controller[], label: (c: Controller) => string) {
  const headers = [
    "Tag",
    "Төрөл",
    "Байршил",
    "Үйлдвэрлэгч",
    "Загвар",
    "Ашиглалтад орсон",
    ...IO_KINDS.flatMap(({ label }) => [
      `${label} модуль`,
      `${label} суваг/модуль`,
      `${label} нийт суваг`,
      `${label} ашигласан`,
      `${label} нөөц`,
    ]),
    "Нийт суваг",
    "Ашигласан физик сигнал",
    "Нөөц суваг",
    "Нөөц %",
    ...FIELDBUS.flatMap(({ label }) => [
      `${label} боломж (ТТ)`,
      `${label} холбогдсон ТТ`,
      `${label} сигнал`,
    ]),
    "Нийт сигнал",
    "IP",
    "Төлөв",
    "Тэмдэглэл",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const status = (s: string) => CONTROLLER_STATUSES.find((x) => x.code === s)?.label ?? s;
  const lines = rows.map((c) =>
    [
      c.tag,
      c.ctype,
      label(c),
      c.manufacturer,
      c.model,
      c.commissioned,
      ...IO_KINDS.flatMap(({ k }) => [
        ioModules(c, k),
        ioPerModule(c, k),
        ioChannels(c, k),
        ioUsed(c, k),
        ioSpare(c, k),
      ]),
      ioSummary(c).channels,
      ioSummary(c).used,
      ioSummary(c).spare,
      ioSummary(c).sparePct === null ? null : `${Math.round((ioSummary(c).sparePct ?? 0) * 100)}%`,
      ...FIELDBUS.flatMap(({ k }) => [
        fbValue(c, k, "capacity"),
        fbValue(c, k, "devices"),
        fbValue(c, k, "signals"),
      ]),
      allSignals(c),
      c.ip,
      status(c.status),
      c.notes,
    ]
      .map(esc)
      .join(","),
  );
  return "\uFEFF" + [headers.map(esc).join(","), ...lines].join("\n");
}

// MNU-ийн тусгай горим контроллерт хамаарахгүй — ASU, бусад эрхлэгчийн хэсгүүдийг ашиглана.
export const controllerUnitAllowed = (unit: string) => !isMnu(unit);
