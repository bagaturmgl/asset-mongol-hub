import { STATUSES } from "@/lib/equipment";

/** RSL (РШШЛХ) бүртгэлийн нэг бичлэг — public.rsl_equipment. */
export type RslCategory = "analyzer" | "source" | "lab" | "dadas";

export type RslItem = {
  id: string;
  tag: string;
  category: RslCategory;
  /** Загварын төрөл: MEP-300, MSA-300, Cd-109, Quant'X, AP-31-M, HTP-40, NL-280, ПРО, БОП … */
  kind: string | null;
  /** Анализатор: A571, V MSA; лаборатори: Q-7, HTP-40 №2 */
  code: string | null;
  section: string | null;
  sub_section: string | null;
  points: string | null;
  sample_name: string | null;
  line: string | null;
  manufacturer: string | null;
  model: string | null;
  serial: string | null;
  /** YYYY эсвэл YYYY-MM-DD */
  commissioned: string | null;
  year: number | null;
  status: string;
  utilization: number | null;
  /** Үүсгүүрийн харьяалах анализатор (A571) */
  analyzer_code: string | null;
  isotope: string | null;
  source_code: string | null;
  activity_mbq: number | null;
  activity_date: string | null;
  permit_no: string | null;
  /** ДАДАС төхөөрөмжийн трасс (Т-85) */
  trace: string | null;
  notes: string | null;
  maintenance_history: string | null;
  created_at: string;
  updated_at: string;
};

export type RslTrace = {
  code: string;
  section: string | null;
  sub_section: string | null;
  length_m: number | null;
  signal_m: number | null;
  sample_name: string | null;
  ap_group: string | null;
  analyzer_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const RSL_STATUSES = STATUSES;

/** IFO-ийн секцүүд (шингэн дээжний анализаторын байршил) */
export const RSL_SECTIONS = [
  { code: "S1", label: "1-р секц", line: "I шугам" },
  { code: "S2", label: "2-р секц", line: "II шугам" },
  { code: "S3", label: "3-р секц", line: "III шугам" },
  { code: "S4", label: "4-р секц", line: "IV шугам" },
  { code: "S5", label: "5-р секц", line: "V шугам" },
  { code: "S6", label: "6-р секц", line: "VI шугам" },
  { code: "MS", label: "Селекц", line: "IV шугам (селекц)" },
] as const;

export const ANALYZER_KINDS = ["MEP-100", "MEP-200", "MEP-300", "MSA-300"] as const;
export const LAB_KINDS = ["Quant'X", "AP-31-M", "HTP-40", "NL-280"] as const;

/** ДАДАС: трасс бүрт байх төхөөрөмж + хатаах зуух */
export const DADAS_TYPES = [
  { k: "PRO", label: "ПРО", name: "Дээж авагч" },
  { k: "BOP", label: "БОП", name: "Дээж хуримтлуулагч" },
  { k: "BUP", label: "БУП", name: "Удирдлагын щит" },
  { k: "BPP", label: "БПП", name: "Дээж хүлээн авагч" },
  { k: "GDN", label: "ГДН", name: "Эргэлтийн насос" },
] as const;
export const DADAS_OVENS = [
  { k: "SHSP", label: "ШСП", name: "Дээж хатаах зуух" },
  { k: "XTDQ", label: "XTDQ", name: "Дээж хатаах зуух" },
] as const;
export const DADAS_ALL = [...DADAS_TYPES, ...DADAS_OVENS];

export const CATEGORY_LABEL: Record<RslCategory, string> = {
  analyzer: "Шингэн дээжний анализатор",
  source: "Cd-109 үүсгүүр",
  lab: "Лабораторийн тоног төхөөрөмж",
  dadas: "ДАДАС",
};

/** Tag-д орох код: зай, тэмдэгтгүй (II MSA → IIMSA, Q-7 → Q7, HTP-40 №2 → HTP402) */
export const compactCode = (s: string | null | undefined) =>
  (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Tag:
 *  анализатор  RSL-IFO-S5-A571-AN-2022
 *  үүсгүүр     RSL-IFO-S5-A571-CD-2023
 *  лаборатори  RSL-LAB-Q7-2024
 *  ДАДАС       RSL-DD-PRO012-2012 (трасс Tag-д орохгүй — оноох үед өөрчлөгдөхгүй)
 */
export function rslTagPrefix(i: Partial<RslItem>): string {
  const code = compactCode(i.category === "source" ? i.analyzer_code : i.code);
  switch (i.category) {
    case "analyzer":
      return ["RSL", "IFO", i.sub_section, code, "AN"].filter(Boolean).join("-");
    case "source":
      return ["RSL", "IFO", i.sub_section, code, "CD"].filter(Boolean).join("-");
    case "lab":
      return ["RSL", "LAB", code].filter(Boolean).join("-");
    case "dadas": {
      // Кирилл нэрийг латин кодоор: ПРО-С1 → PRO, БУП-24 → BUP, ШСП → SHSP
      const t = DADAS_ALL.find((x) => (i.kind ?? "").startsWith(x.label));
      return ["RSL", "DD", t ? t.k : compactCode(i.kind)].join("-");
    }
    default:
      return "RSL";
  }
}

export function buildRslTag(i: Partial<RslItem>, existing: string[]): string {
  const y = i.year ? String(i.year) : "0000";
  const prefix = rslTagPrefix(i);
  if (i.category !== "dadas") return `${prefix}-${y}`;
  // ДАДАС: төрөл тус бүрийн дараалал — RSL-DD-PRO012-2012
  const used = existing
    .filter((t) => t.startsWith(prefix))
    .map((t) => Number(t.slice(prefix.length).split("-")[0]) || 0);
  return `${prefix}${String(Math.max(0, ...used) + 1).padStart(3, "0")}-${y}`;
}

/** Ашиглалтын хугацааны норм (жил) */
export function normYears(i: Pick<RslItem, "category" | "kind">): number {
  if (i.category === "dadas") return 12.5;
  if (i.category === "source") return 5;
  if ((i.kind ?? "").startsWith("NL-280")) return 12.5;
  return 10;
}

export function ageYears(i: Pick<RslItem, "year">, now = new Date()): number | null {
  return i.year ? Math.max(0, now.getFullYear() - i.year) : null;
}

/** Насжилт / норм (≥ 1 — ашиглалтын хугацаа хэтэрсэн) */
export function wear(
  i: Pick<RslItem, "year" | "category" | "kind">,
  now = new Date(),
): number | null {
  const a = ageYears(i, now);
  return a === null ? null : a / normYears(i);
}

/* ---------- Cd-109 ---------- */
export const CD109_HALF_LIFE_DAYS = 461.4;
export const CD109_NOMINAL_MBQ = 740;
/** Энэ идэвхээс доош бол шинэчлэх (≈2% — 2026 оны судалгааны шалгуур) */
export const CD109_RENEW_MBQ = 15;

/** Лавлах идэвх, огнооноос өнөөдрийн идэвхийг хагас задралаар тооцно */
export function cdActivityNow(
  i: Pick<RslItem, "activity_mbq" | "activity_date">,
  now = new Date(),
): number | null {
  if (i.activity_mbq === null || !i.activity_date) return null;
  const days = (now.getTime() - new Date(i.activity_date).getTime()) / 86_400_000;
  return i.activity_mbq * Math.pow(0.5, days / CD109_HALF_LIFE_DAYS);
}

/** Идэвх шинэчлэх босгод хэзээ хүрэх (огноо) */
export function cdRenewDate(i: Pick<RslItem, "activity_mbq" | "activity_date">): Date | null {
  if (i.activity_mbq === null || !i.activity_date || i.activity_mbq <= 0) return null;
  const days = CD109_HALF_LIFE_DAYS * Math.log2(i.activity_mbq / CD109_RENEW_MBQ);
  return new Date(new Date(i.activity_date).getTime() + days * 86_400_000);
}

export const fmtPct = (r: number | null) => (r === null ? "—" : `${Math.round(r * 100)}%`);
export const fmtMbq = (v: number | null) =>
  v === null ? "—" : v >= 10 ? `${Math.round(v)} MBq` : `${v.toFixed(1)} MBq`;
