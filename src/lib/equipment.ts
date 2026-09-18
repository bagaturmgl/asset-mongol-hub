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
    { code: "H", label: "H — Чийгшил" },
    { code: "W", label: "W — Жин" },
    { code: "S", label: "S — Хурд" },
    { code: "V", label: "V — Чичиргээ" },
    { code: "O", label: "O — pH" },
    { code: "B", label: "P — Байршил мэдрэгч" },
  ],
  C: [
    { code: "C", label: "C — Гүйдлийн" },
    { code: "W", label: "W — Чадлын" },
    { code: "G", label: "G — Жингийн" },
    { code: "S", label: "S — Чадал" },
    { code: "I", label: "I — Гүйдэл / Заагч" },
    { code: "M", label: "M — Метал" },
    { code: "O", label: "O — pH" },
    { code: "A", label: "C — Ca%" },
    { code: "T", label: "T — Температур" },
    { code: "P", label: "P — Даралт" },
    { code: "E", label: "W — Жин" },
    { code: "V", label: "V — Чичиргээ" },
    { code: "F", label: "F — Зарцуулалт" },
    { code: "L", label: "L — Түвшин" },
  ],
  A: [
    { code: "V", label: "V — Клапан" },
    { code: "S", label: "S — Соленоид" },
    { code: "H", label: "H — Гидравлик цилиндр" },
    { code: "L", label: "V — Хаалт" },
    { code: "U", label: "A — Гүйцэтгэгч" },
    { code: "B", label: "P — Байршил заагч" },
    { code: "D", label: "D — Тугнагч" },
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

export function sectionLabel(code: string) {
  return SECTIONS.find((section) => section.code === code)?.label ?? code;
}

export function subSectionLabel(section: string, code: string) {
  return SUB_SECTIONS[section]?.find((subSection) => subSection.code === code)?.label ?? code;
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
    "Ашиглалтын явцын түүх",
    "Засвар үйлчилгээний түүх",
    "Бүртгэсэн",
  ];
  const esc = (val: unknown) => `"${String(val ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      r.tag_name,
      r.unit,
      sectionLabel(r.section),
      subSectionLabel(r.section, r.sub_section),
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
