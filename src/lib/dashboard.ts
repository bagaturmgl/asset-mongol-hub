import {
  type Equipment,
  FUNCTIONS,
  PARAMETERS,
  MNU_DEVICES,
  STANDALONE_CODES,
  groupOfFunction,
  isMnu,
  isStandaloneCode,
  isaCode,
  canonicalVendor,
} from "@/lib/equipment";

/**
 * Хянах самбарын 4 бүлэг. Ангилал нь зөвхөн deviceGroupOf()-д байгаа тул
 * дүрэм өөрчлөгдвөл энэ нэг функцийг засна.
 */
export type DeviceGroup = "sensor" | "actuator" | "radiation" | "analyzer";

export const DEVICE_GROUPS: { code: DeviceGroup; label: string; rule: string }[] = [
  {
    code: "sensor",
    label: "Мэдрэгч ба хувиргагч",
    rule: "Бусад бүх мэдрэгч, хувиргагч, металл илрүүлэгч (M)",
  },
  {
    code: "actuator",
    label: "Гүйцэтгэх механизм",
    rule: "Функц V, VA, Y ба PU — хаалт, актуатор, соленойд, позиционер, насос",
  },
  {
    code: "radiation",
    label: "Цацрагийн тоног төхөөрөмж",
    rule: "Параметр R, MNU-ийн REC, RD, RL — цацраг, радиометр, үүсгүүр, детектор",
  },
  {
    code: "analyzer",
    label: "Анализатор",
    rule: "Параметр A, MNU-ийн A, V — шинжилгээ, pH, Ca%, чийгшил, анализатор",
  },
];

export function deviceGroupOf(
  item: Pick<Equipment, "category" | "parameter" | "function_code"> & { unit?: string | null },
): DeviceGroup {
  // MNU (УТХ): ерөнхий бүлэггүй — төхөөрөмжөөр нь ангилна
  if (isMnu(item.unit))
    return item.parameter === "A" || item.parameter === "V" ? "analyzer" : "radiation";
  // Хадгалсан category хуучирсан байж болно (позиционер өмнө нь "C" байсан),
  // тиймээс функц байвал бүлгийг түүнээс дахин тооцно.
  const category =
    item.parameter && item.parameter in STANDALONE_CODES
      ? STANDALONE_CODES[item.parameter]
      : item.function_code
        ? groupOfFunction(item.function_code)
        : item.category;
  if (category === "A") return "actuator";
  if (item.parameter === "R") return "radiation";
  if (item.parameter === "A") return "analyzer";
  // Металл илрүүлэгч (параметр M) болон бусад бүх мэдрэгч, хувиргагч
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

/** "P — Даралт" → "Даралт", "A — Шинжилгээ / pH / Ca% / Чийгшил" → "Шинжилгээ" */
const mainWord = (label: string) =>
  (label.split("— ")[1] ?? label).split(" / ")[0]?.trim() ?? label;

/** Ерөнхий дүрмээр гарахгүй тусгай нэрс (ISA код → нэр). */
const NAME_OVERRIDES: Record<string, string> = { XY: "Соленойд" };

/** Хянах самбарт кодын хажууд харагдах нэр, жишээ нь PIT → "Даралт · дэлгэцтэй хувиргагч". */
function typeName(item: Equipment): string {
  const code = isaCode(item);
  const override = NAME_OVERRIDES[code];
  if (override) return override;
  const p = isMnu(item.unit)
    ? MNU_DEVICES.find((x) => x.code === item.parameter)
    : PARAMETERS.find((x) => x.code === item.parameter);
  // Функцгүй код: PU → "Насос", REC → "Цацрагийн үүсгүүр ба сав"
  if (p && isStandaloneCode(p.code)) return mainWord(p.label).replace(/\s*\(.*\)$/, "");
  const f = FUNCTIONS.find((x) => x.code === item.function_code);
  if (!p || !f) return code;
  // X (Бусад / Ерөнхий) параметрт функцийн нэр л утга агуулна: XV → "Хаалт", XVA → "Актуатор"
  if (p.code === "X") return mainWord(f.label);
  return `${mainWord(p.label)} · ${mainWord(f.label).toLowerCase()}`;
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
  /** Үйлдвэрлэгчээр: хамгийн олон TOP_VENDORS + "Бусад". code = харуулах нэр. */
  vendors: TypeRow[];
  unknownVendor: number;
};

const OTHER = "Бусад";

/** Төрлийн диаграмд харуулах дээд мөр ("Бусад"-ыг оруулаад). */
export const TOP_TYPES = 8;

/** Үйлдвэрлэгчийн жагсаалтад нэрээр нь харуулах тоо ("Бусад"-аас гадна). */
export const TOP_VENDORS = 6;

/** Нэг үйлдвэрлэгчийн өөр бичлэгүүдийг ("SIEMENS", "Siemens") нэгдсэн нэрээр нь тоолно. */
function vendorBreakdown(rows: Equipment[]): { vendors: TypeRow[]; unknownVendor: number } {
  const counts = new Map<string, number>();
  let unknownVendor = 0;
  for (const item of rows) {
    const name = canonicalVendor(item.manufacturer);
    if (!name || ["тодруулах", "тодорхойгүй"].includes(name.toLowerCase())) {
      unknownVendor += 1;
      continue;
    }
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const all = [...counts.entries()]
    .map(([code, count]) => ({ code, name: "", count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
  const vendors =
    all.length > TOP_VENDORS + 1
      ? [
          ...all.slice(0, TOP_VENDORS),
          {
            code: OTHER,
            name: `${all.length - TOP_VENDORS} үйлдвэрлэгч`,
            count: all.slice(TOP_VENDORS).reduce((sum, r) => sum + r.count, 0),
          },
        ]
      : all;
  return { vendors, unknownVendor };
}

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
      ...vendorBreakdown(rows),
    };
  });
}
