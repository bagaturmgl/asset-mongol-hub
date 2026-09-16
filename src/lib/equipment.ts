export type Equipment = {
  id: string;
  unit: string;
  section: string;
  sub_section: string;
  main_equipment: string;
  category: string;
  subtype: string;
  sequence: string;
  year: string;
  tag_name: string;
  manufacturer: string | null;
  model: string | null;
  factory_serial: string | null;
  status: string;
  notes: string | null;
  maintenance_history: string | null;
  created_at: string;
  updated_at: string;
};

export const UNITS = ["A", "B", "C", "D"] as const;

export const SECTIONS = [
  { code: "KSI", label: "KSI — Түлш хангамж" },
  { code: "DTO", label: "DTO — Дизель тос" },
  { code: "IFO", label: "IFO — Хүнд түлш" },
  { code: "RO", label: "RO — Ус цэвэршүүлэлт" },
  { code: "FSO", label: "FSO — Түлш хадгалалт" },
  { code: "PNS", label: "PNS — Насосны станц" },
] as const;

export const SUB_SECTIONS = ["F1", "F2", "F3", "F4"] as const;
export const MAIN_EQUIPMENTS = ["M1", "M2", "M3", "M4", "M5"] as const;

export const CATEGORIES = [
  { code: "S", label: "S — Сенсор" },
  { code: "C", label: "C — Хувиргагч" },
  { code: "A", label: "A — Хөдөлгүүр / Actuator" },
] as const;

export const SUBTYPES: Record<string, { code: string; label: string }[]> = {
  S: [
    { code: "P", label: "P — Даралт" },
    { code: "T", label: "T — Температур" },
    { code: "L", label: "L — Түвшин" },
    { code: "F", label: "F — Зарцуулалт" },
  ],
  C: [
    { code: "C", label: "C — Гүйдлийн" },
    { code: "W", label: "W — Чадлын" },
    { code: "G", label: "G — Жингийн" },
  ],
  A: [
    { code: "V", label: "V — Клапан" },
    { code: "S", label: "S — Соленоид" },
    { code: "H", label: "H — Гидравлик цилиндр" },
  ],
};

export const STATUSES = [
  { code: "active", label: "Ажиллаж байна" },
  { code: "maintenance", label: "Засварт" },
  { code: "inactive", label: "Ашиглалтгүй" },
] as const;

export function statusLabel(code: string) {
  return STATUSES.find((s) => s.code === code)?.label ?? code;
}

export function categoryLabel(code: string) {
  return CATEGORIES.find((c) => c.code === code)?.label ?? code;
}

export function subtypeLabel(category: string, code: string) {
  return SUBTYPES[category]?.find((s) => s.code === code)?.label ?? code;
}

export type MaintenanceEntry = { date: string; note: string };

export function parseMaintenance(text: string | null): MaintenanceEntry[] {
  if (!text) return [];
  const entries = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\s*[—–-]?\s*(.*)$/);
      if (match) return { date: match[1].replace(/[/.]/g, "-"), note: match[2] || "" };
      return { date: "", note: line };
    });
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

export function lastMaintenance(text: string | null): MaintenanceEntry | null {
  return parseMaintenance(text).find((e) => e.date) ?? parseMaintenance(text)[0] ?? null;
}

export function appendMaintenance(
  text: string | null,
  date: string,
  note: string,
): string {
  const line = `${date} — ${note.trim()}`;
  return text && text.trim() ? `${text.trim()}\n${line}` : line;
}

export function buildTag(v: {
  unit: string;
  section: string;
  sub_section: string;
  main_equipment: string;
  category: string;
  subtype: string;
  sequence: string;
  year: string;
}) {
  const seq = (v.sequence || "").padStart(3, "0");
  return `${v.unit}-${v.section}-${v.sub_section}-${v.main_equipment}-${v.category}${v.subtype}${seq}-${v.year}`;
}

export function toCsv(rows: Equipment[]) {
  const headers = [
    "Tag name",
    "Үйлчилгээ эрхлэгч",
    "Үндсэн хэсэг",
    "Дэд хэсэг",
    "Үндсэн тоног төхөөрөмж",
    "Ангилал",
    "Дэд ангилал",
    "Дараалал",
    "Үйлдвэрлэсэн он",
    "Үйлдвэрлэгч",
    "Модель",
    "Сериал №",
    "Төлөв",
    "Байршил/Тайлбар",
    "Засвар үйлчилгээний түүх",
    "Бүртгэсэн",
  ];
  const esc = (val: unknown) => `"${String(val ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      r.tag_name,
      r.unit,
      r.section,
      r.sub_section,
      r.main_equipment,
      r.category,
      r.subtype,
      r.sequence,
      r.year,
      r.manufacturer,
      r.model,
      r.factory_serial,
      statusLabel(r.status),
      r.notes,
      r.maintenance_history,
      new Date(r.created_at).toLocaleDateString("mn-MN"),
    ]
      .map(esc)
      .join(","),
  );
  return "\uFEFF" + [headers.map(esc).join(","), ...lines].join("\n");
}
