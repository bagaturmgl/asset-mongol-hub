export type Equipment = {
  id: string;
  unit: string;
  section: string;
  sub_section: string;
  main_equipment: string;
  main_equipment_name: string | null;
  category: string;
  subtype: string;
  parameter: string | null;
  function_code: string | null;
  asset_serial: string | null;
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

export const UNITS = [
  { code: "ASU", label: "ASU — БТАХ" },
  { code: "MNU", label: "MNU — УТХ" },
  { code: "RSL", label: "RSL — РШШЛ" },
  { code: "GTR", label: "GTR — УТАТАХ" },
] as const;

export const SECTIONS = [
  { code: "KSI", label: "KSI — Өөрөө нунтаглах" },
  { code: "IFO", label: "IFO — Нунтаглан баяжуулах" },
  { code: "DTO", label: "DTO — Бутлан тээвэрлэх" },
  { code: "FSO", label: "FSO — Шүүн хатаах" },
  { code: "RO", label: "RO — Урвалжийн бэлтгэх" },
  { code: "PNS", label: "PNS — Хаягдлын шахуургын" },
] as const;

export const SUB_SECTIONS: Record<string, { code: string; label: string }[]> = {
  KSI: [
    { code: "S1", label: "1-р секц" },
    { code: "S2", label: "2-р секц" },
    { code: "S3", label: "3-р секц" },
    { code: "S4", label: "4-р секц" },
    { code: "KKD2", label: "Том бутлуур-2" },
    { code: "PS", label: "Эргэлтийн усны станц" },
  ],
  IFO: [
    { code: "S1", label: "1-р секц" },
    { code: "S2", label: "2-р секц" },
    { code: "S3", label: "3-р секц" },
    { code: "S4", label: "4-р секц" },
    { code: "S5", label: "5-р секц" },
    { code: "S6", label: "6-р секц" },
    { code: "MS", label: "Үндсэн селекц" },
    { code: "SS", label: "Нөөц селекц" },
    { code: "NMS", label: "Шинэ Молибден" },
    { code: "OMS", label: "Хуучин Молибден" },
    { code: "ML", label: "Нунтаглах цикл" },
    { code: "ACS", label: "Агаарын компрессорын станц" },
  ],
  DTO: [
    { code: "KKD1", label: "Том бутлуур-1" },
    { code: "KSD", label: "Дунд бутлуур" },
    { code: "KMD", label: "Жижиг бутлуур" },
    { code: "HPGR", label: "Өндөр даралтын булт бутлуур" },
    { code: "SKDR", label: "ТБХ Агуулах" },
  ],
  FSO: [
    { code: "CC", label: "Зэсийн баяжмал" },
    { code: "MC", label: "Молибдений баяжмал" },
    { code: "MN", label: "Ерөнхий" },
  ],
  RO: [{ code: "0", label: "0" }],
  PNS: [{ code: "0", label: "0" }],
};
export const MAIN_EQUIPMENTS = ["M1", "M2", "M3", "M4", "M5"] as const;

/** Ерөнхий бүлэг — функцээс автоматаар тодорхойлогдоно */
export const CATEGORIES = [
  { code: "S", label: "Мэдрэгч (E, S)" },
  { code: "C", label: "Хувиргагч (T, IT, I)" },
  { code: "A", label: "Гүйцэтгэгч (V, Y)" },
] as const;

/** ISA-5.1 параметр — эхний үсэг */
export const PARAMETERS = [
  { code: "P", label: "P — Даралт" },
  { code: "T", label: "T — Температур" },
  { code: "L", label: "L — Түвшин" },
  { code: "F", label: "F — Зарцуулалт" },
  { code: "W", label: "W — Жин" },
  { code: "V", label: "V — Чичиргээ" },
  { code: "S", label: "S — Хурд" },
  { code: "A", label: "A — Шинжилгээ / pH / Ca%" },
  { code: "R", label: "R — Цацраг / Радиометр" },
  { code: "Z", label: "Z — Байрлал / Төгсгөл" },
  { code: "Y", label: "Y — Илрэл / Метал илрүүлэгч" },
  { code: "M", label: "M — Чийгшил" },
  { code: "I", label: "I — Гүйдэл" },
  { code: "J", label: "J — Чадал" },
  { code: "X", label: "X — Бусад / Ерөнхий" },
] as const;

/** ISA-5.1 функц — дараагийн үсэг */
export const FUNCTIONS = [
  { code: "IT", label: "IT — Дэлгэцтэй хувиргагч" },
  { code: "T", label: "T — Хувиргагч" },
  { code: "E", label: "E — Мэдрэгч элемент" },
  { code: "I", label: "I — Заагч / Манометр" },
  { code: "S", label: "S — Унтраалга / Реле" },
  { code: "V", label: "V — Клапан / Гүйцэтгэгч" },
  { code: "Y", label: "Y — Позиционер / Хөрвүүлэгч" },
] as const;

export function groupOfFunction(fn: string): "S" | "C" | "A" {
  if (fn === "E" || fn === "S") return "S";
  // Позиционер (Y) клапантайгаа хамт гүйцэтгэх механизмд тооцогдоно.
  if (fn === "V" || fn === "Y") return "A";
  return "C";
}

export function parameterLabel(code: string | null) {
  return PARAMETERS.find((p) => p.code === code)?.label ?? code ?? "—";
}

export function functionLabel(code: string | null) {
  return FUNCTIONS.find((f) => f.code === code)?.label ?? code ?? "—";
}

export const SECTION_SERIAL_PREFIX: Record<string, string> = {
  KSI: "1",
  IFO: "2",
  DTO: "3",
  FSO: "4",
  RO: "5",
  PNS: "6",
};

export function nextAssetSerial(section: string, existing: (string | null)[]) {
  const prefix = SECTION_SERIAL_PREFIX[section] ?? "0";
  let max = 0;
  for (const s of existing) {
    const m = s?.match(/^(\d)-(\d{5})$/);
    if (m && m[1] === prefix) max = Math.max(max, Number(m[2]));
  }
  return `${prefix}-${String(max + 1).padStart(5, "0")}`;
}

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

export function sectionLabel(code: string) {
  return SECTIONS.find((section) => section.code === code)?.label ?? code;
}

export function unitLabel(code: string) {
  return UNITS.find((unit) => unit.code === code)?.label ?? code;
}

export function subSectionLabel(section: string, code: string) {
  return SUB_SECTIONS[section]?.find((subSection) => subSection.code === code)?.label ?? code;
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
      if (match) return { date: (match[1] ?? "").replace(/[/.]/g, "-"), note: match[2] ?? "" };
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
  parameter: string;
  function_code: string;
  sequence: string;
  year: string;
}) {
  const seq = (v.sequence || "").padStart(3, "0");
  return `${v.unit}-${v.section}-${v.sub_section}-${v.main_equipment}-${v.parameter}${v.function_code}${seq}-${v.year}`;
}

export function isaCode(r: Pick<Equipment, "parameter" | "function_code" | "category" | "subtype">) {
  return r.parameter && r.function_code ? `${r.parameter}${r.function_code}` : `${r.category}${r.subtype}`;
}

export function toCsv(rows: Equipment[]) {
  const headers = [
    "Tag name",
    "Хөрөнгийн сериал",
    "Үйлчилгээ эрхлэгч",
    "Үндсэн хэсэг",
    "Дэд хэсэг",
    "Үндсэн тоног төхөөрөмж",
    "Тоног төхөөрөмжийн нэр",
    "ISA код",
    "Параметр",
    "Функц",
    "Ерөнхий бүлэг",
    "Байрлалын дугаар",
    "Үйлдвэрлэсэн он",
    "Үйлдвэрлэгч",
    "Модель",
    "Үйлдвэрийн сериал №",
    "Төлөв",
    "Ашиглалтын явцын түүх",
    "Засвар үйлчилгээний түүх",
    "Бүртгэсэн",
  ];
  const esc = (val: unknown) => `"${String(val ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      r.tag_name,
      r.asset_serial,
      unitLabel(r.unit),
      sectionLabel(r.section),
      subSectionLabel(r.section, r.sub_section),
      r.main_equipment,
      r.main_equipment_name,
      isaCode(r),
      parameterLabel(r.parameter),
      functionLabel(r.function_code),
      categoryLabel(r.category),
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
