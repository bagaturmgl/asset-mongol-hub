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

export const ioTotal = (c: Pick<Controller, "io_ai" | "io_ao" | "io_di" | "io_do">) =>
  (c.io_ai ?? 0) + (c.io_ao ?? 0) + (c.io_di ?? 0) + (c.io_do ?? 0);

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
    "AI",
    "AO",
    "DI",
    "DO",
    "Нийт дохио",
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
      c.io_ai,
      c.io_ao,
      c.io_di,
      c.io_do,
      ioTotal(c),
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
