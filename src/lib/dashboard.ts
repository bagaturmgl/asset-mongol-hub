import { type Equipment, FUNCTIONS, PARAMETERS, isaCode } from "@/lib/equipment";

/**
 * Хянах самбарын 4 бүлэг. Ангилал нь зөвхөн deviceGroupOf()-д байгаа тул
 * дүрэм өөрчлөгдвөл энэ нэг функцийг засна.
 */
export type DeviceGroup = "sensor" | "actuator" | "radiation" | "analyzer";

export const DEVICE_GROUPS: { code: DeviceGroup; label: string; rule: string }[] = [
  {
    code: "sensor",
    label: "Мэдрэгч ба хувиргагч",
    rule: "Мэдрэгч, хувиргагч бүлгийн бусад бүх төхөөрөмж",
  },
  { code: "actuator", label: "Гүйцэтгэх механизм", rule: "Функц V — клапан, гүйцэтгэгч" },
  { code: "radiation", label: "Цацрагийн тоног төхөөрөмж", rule: "Параметр R — цацраг, радиометр" },
  { code: "analyzer", label: "Анализатор", rule: "Параметр A — шинжилгээ, pH, метал" },
];

export function deviceGroupOf(item: Pick<Equipment, "category" | "parameter">): DeviceGroup {
  if (item.category === "A") return "actuator";
  if (item.parameter === "R") return "radiation";
  if (item.parameter === "A") return "analyzer";
  return "sensor";
}

/* ---------- Насжилт (үйлдвэрлэсэн оноос) ---------- */

export const AGE_BUCKETS = [
  { key: "0-5", label: "0–5", max: 5 },
  { key: "6-10", label: "6–10", max: 10 },
  { key: "11-15", label: "11–15", max: 15 },
  { key: "16-20", label: "16–20", max: 20 },
  { key: "21+", label: "21+", max: Number.POSITIVE_INFINITY },
] as const;

const MIN_YEAR = 1950;

/** Үйлдвэрлэсэн он хоосон, буруу эсвэл ирээдүйд байвал null. */
export function ageOf(year: string | null | undefined, currentYear: number): number | null {
  const y = (year ?? "").trim();
  if (!/^\d{4}$/.test(y)) return null;
  const n = Number(y);
  if (n < MIN_YEAR || n > currentYear) return null;
  return currentYear - n;
}

/* ---------- Төрлөөр (ISA код) ---------- */

const shortLabel = (label: string) => label.split("— ")[1] ?? label;

function typeName(item: Equipment): string {
  const p = PARAMETERS.find((x) => x.code === item.parameter);
  const f = FUNCTIONS.find((x) => x.code === item.function_code);
  if (p && f) return `${shortLabel(p.label)}, ${shortLabel(f.label).toLowerCase()}`;
  return isaCode(item);
}

export type TypeRow = { code: string; name: string; count: number };
export type AgeRow = { key: string; label: string; count: number };

export type GroupSummary = {
  code: DeviceGroup;
  label: string;
  rule: string;
  total: number;
  types: TypeRow[];
  ages: AgeRow[];
  unknownAge: number;
  averageAge: number | null;
  over20: number;
};

const OTHER = "Бусад";

/** Төрлийн диаграмд харуулах дээд мөр ("Бусад"-ыг оруулаад). */
export const TOP_TYPES = 8;

export function summarizeGroups(
  items: Equipment[],
  { topTypes = TOP_TYPES, currentYear = new Date().getFullYear() } = {},
): GroupSummary[] {
  return DEVICE_GROUPS.map((group) => {
    const rows = items.filter((item) => deviceGroupOf(item) === group.code);

    // Төрөл: ISA кодоор тоолж, их нь эхэнд; topTypes-аас хэтэрсэнийг "Бусад" болгоно.
    const byType = new Map<string, TypeRow>();
    for (const item of rows) {
      const code = isaCode(item) || "?";
      const row = byType.get(code) ?? { code, name: typeName(item), count: 0 };
      row.count += 1;
      byType.set(code, row);
    }
    const sorted = [...byType.values()].sort(
      (a, b) => b.count - a.count || a.code.localeCompare(b.code),
    );
    const types =
      sorted.length > topTypes
        ? [
            ...sorted.slice(0, topTypes - 1),
            {
              code: OTHER,
              name: `${sorted.length - (topTypes - 1)} төрөл`,
              count: sorted.slice(topTypes - 1).reduce((sum, r) => sum + r.count, 0),
            },
          ]
        : sorted;

    // Насжилт
    const ages: AgeRow[] = AGE_BUCKETS.map((b) => ({ key: b.key, label: b.label, count: 0 }));
    let unknownAge = 0;
    let ageSum = 0;
    let over20 = 0;
    for (const item of rows) {
      const age = ageOf(item.year, currentYear);
      if (age === null) {
        unknownAge += 1;
        continue;
      }
      ageSum += age;
      if (age > 20) over20 += 1;
      const index = AGE_BUCKETS.findIndex((b) => age <= b.max);
      const bucket = ages[index];
      if (bucket) bucket.count += 1;
    }
    const known = rows.length - unknownAge;

    return {
      ...group,
      total: rows.length,
      types,
      ages,
      unknownAge,
      averageAge: known ? ageSum / known : null,
      over20,
    };
  });
}
