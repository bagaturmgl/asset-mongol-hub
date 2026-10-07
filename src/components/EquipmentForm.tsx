import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Copy, Loader2, Plus, RotateCcw, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineStatus } from "@/lib/pwa";
import {
  appendMaintenance,
  buildTag,
  categoryLabel,
  Equipment,
  FUNCTIONS,
  groupOf,
  isStandaloneCode,
  nextAssetSerial,
  PARAMETERS,
  SECTIONS,
  STATUSES,
  SUB_SECTIONS,
  UNITS,
  vendorIsaDefault,
  modelIsaDefault,
} from "@/lib/equipment";
import { mainEquipmentOptions } from "@/lib/main-equipments";

type FormState = {
  unit: string;
  section: string;
  sub_section: string;
  main_equipment: string;
  main_equipment_name: string;
  parameter: string;
  function_code: string;
  sequence: string;
  year: string;
  asset_serial: string;
  manufacturer: string;
  model: string;
  factory_serial: string;
  status: string;
  notes: string;
  maintenance_history: string;
};

const CUSTOM_EQUIPMENT = "__custom__";

/** Tag name-ээс бүрэлдэхүүнийг задлах (хуучин/дутуу бүртгэлд) */
function parseTag(tag: string) {
  const parts = tag.split("-");
  if (parts.length < 6) return null;
  const [unit, section, sub_section] = parts;
  const year = parts[parts.length - 1];
  const isa = parts[parts.length - 2] ?? "";
  const main_equipment = parts.slice(3, -2).join("-");
  const letters = isa.replace(/\d+$/, "");
  if (isStandaloneCode(letters)) {
    return { unit, section, sub_section, main_equipment, parameter: letters, function_code: "", sequence: isa.slice(letters.length), year };
  }
  const m = isa.match(/^([A-Z])([A-Z]{1,2}?)(\d+)$/);
  const fnCodes = FUNCTIONS.map((f) => f.code as string);
  let parameter = m?.[1] ?? "";
  let function_code = m?.[2] ?? "";
  if (m && !fnCodes.includes(function_code)) {
    const rest = isa.replace(/\d+$/, "").slice(1);
    function_code = fnCodes.includes(rest) ? rest : function_code;
  }
  return { unit, section, sub_section, main_equipment, parameter, function_code, sequence: m?.[3] ?? "", year };
}

const emptyForm: FormState = {
  unit: "",
  section: "",
  sub_section: "",
  main_equipment: "",
  main_equipment_name: "",
  parameter: "",
  function_code: "",
  sequence: "",
  year: String(new Date().getFullYear()),
  asset_serial: "",
  manufacturer: "",
  model: "",
  factory_serial: "",
  status: "active",
  notes: "",
  maintenance_history: "",
};

export function EquipmentForm({
  editing,
  items,
  onDone,
}: {
  editing?: Equipment | null;
  items: Equipment[];
  onDone?: () => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const online = useOnlineStatus();
  const [manualEquipment, setManualEquipment] = useState(false);
  const [seqTouched, setSeqTouched] = useState(false);
  const [serialTouched, setSerialTouched] = useState(false);

  useEffect(() => {
    setSeqTouched(Boolean(editing));
    setSerialTouched(Boolean(editing));
    if (editing) {
      const t = parseTag(editing.tag_name ?? "");
      const section = editing.section || t?.section || "";
      const sub_section = editing.sub_section || t?.sub_section || "";
      const main_equipment = editing.main_equipment || t?.main_equipment || "";
      const found = mainEquipmentOptions(section, sub_section).find((item) => item.code === main_equipment);
      setManualEquipment(!found);
      setForm({
        unit: editing.unit || t?.unit || "",
        section,
        sub_section,
        main_equipment,
        main_equipment_name: editing.main_equipment_name ?? found?.label ?? "",
        parameter: editing.parameter || t?.parameter || editing.subtype || "",
        function_code: editing.function_code || t?.function_code || "",
        sequence: editing.sequence || t?.sequence || "",
        year: editing.year || t?.year || "",
        asset_serial: editing.asset_serial ?? "",
        manufacturer: editing.manufacturer ?? "",
        model: editing.model ?? "",
        factory_serial: editing.factory_serial ?? "",
        status: editing.status,
        notes: editing.notes ?? "",
        maintenance_history: editing.maintenance_history ?? "",
      });
    } else {
      setManualEquipment(false);
      setForm(emptyForm);
    }
  }, [editing]);

  // PU (насос) гэх мэт функцгүй код
  const standalone = isStandaloneCode(form.parameter);

  // Same-slot records (excluding the one being edited)
  const siblings = useMemo(
    () =>
      items.filter(
        (i) =>
          i.id !== editing?.id &&
          i.unit === form.unit &&
          i.section === form.section &&
          i.sub_section === form.sub_section &&
          i.main_equipment === form.main_equipment &&
          i.parameter === form.parameter &&
          (i.function_code ?? "") === form.function_code,
      ),
    [items, editing, form.unit, form.section, form.sub_section, form.main_equipment, form.parameter, form.function_code],
  );
  const suggestedSeq = useMemo(() => {
    const used = new Set(siblings.map((s) => Number(s.sequence)));
    let n = 1;
    while (used.has(n)) n++;
    return String(n).padStart(3, "0");
  }, [siblings]);
  const seqConflict = siblings.some((s) => Number(s.sequence) === Number(form.sequence || 0));

  const suggestedSerial = useMemo(
    () => nextAssetSerial(form.section, items.map((i) => i.asset_serial)),
    [items, form.section],
  );
  const serialConflict =
    !!form.asset_serial &&
    items.some((i) => i.id !== editing?.id && i.asset_serial === form.asset_serial.trim());

  useEffect(() => {
    if (!seqTouched && !editing && form.parameter && (standalone || form.function_code) && form.main_equipment) setForm((p) => (p.sequence === suggestedSeq ? p : { ...p, sequence: suggestedSeq }));
  }, [suggestedSeq, seqTouched, editing, form.parameter, form.function_code, form.main_equipment, standalone]);
  useEffect(() => {
    if (!serialTouched && !editing && form.section)
      setForm((p) => (p.asset_serial === suggestedSerial ? p : { ...p, asset_serial: suggestedSerial }));
  }, [suggestedSerial, serialTouched, editing, form.section]);

  // Vendor / model suggestions — never alter parameter/function
  const manufacturers = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of items) {
      const v = i.manufacturer?.trim();
      if (v && !map.has(v.toLowerCase())) map.set(v.toLowerCase(), v);
    }
    return [...map.values()].sort((a, b) => a.localeCompare(b));
  }, [items]);
  const models = useMemo(() => {
    const mf = form.manufacturer.trim().toLowerCase();
    const set = new Set<string>();
    for (const i of items) {
      if (mf && i.manufacturer?.trim().toLowerCase() !== mf) continue;
      const v = i.model?.trim();
      if (v) set.add(v);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [items, form.manufacturer]);

  const configuredUnits = UNITS.map((u) => ({ code: u.code, label: u.label }));
  const unitOptions = configuredUnits.some((item) => item.code === form.unit)
    ? configuredUnits
    : form.unit
      ? [{ code: form.unit, label: form.unit }, ...configuredUnits]
      : configuredUnits;
  const configuredSubSections = SUB_SECTIONS[form.section] ?? [];
  const subSectionOptions = configuredSubSections.some((item) => item.code === form.sub_section)
    ? configuredSubSections
    : form.sub_section
      ? [{ code: form.sub_section, label: form.sub_section }, ...configuredSubSections]
      : configuredSubSections;
  const equipmentList = mainEquipmentOptions(form.section, form.sub_section);
  const equipmentInList = equipmentList.some((item) => item.code === form.main_equipment);
  const tag = useMemo(
    () =>
      buildTag({
        ...form,
        unit: form.unit || "???",
        section: form.section || "???",
        sub_section: form.sub_section || "??",
        main_equipment: form.main_equipment || "???",
        parameter: form.parameter || "?",
        function_code: form.function_code || (standalone ? "" : "?"),
        sequence: form.sequence || "000",
        year: form.year || "????",
      }),
    [form, standalone],
  );
  const group = groupOf(form.parameter, form.function_code);
  const ready = Boolean(
    form.unit && form.section && form.sub_section && form.main_equipment && form.parameter && (standalone || form.function_code),
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const pickEquipment = (code: string) => {
    if (code === CUSTOM_EQUIPMENT) {
      setManualEquipment(true);
      setForm((prev) => ({ ...prev, main_equipment: "", main_equipment_name: "" }));
      return;
    }
    const found = equipmentList.find((item) => item.code === code);
    setManualEquipment(false);
    setForm((prev) => ({ ...prev, main_equipment: code, main_equipment_name: found?.label ?? "" }));
  };

  // Хэрэглэгч зөвхөн өөрт оноосон хэсгүүдээ сонгоно (админ бүгдийг)
  const auth = useAuth();
  const allowedSections = auth.isAdmin ? SECTIONS : SECTIONS.filter((s) => auth.sections.includes(s.code));

  const onSectionChange = (section: string) => {
    if (!section || section === form.section) return;
    const subs = SUB_SECTIONS[section] ?? [];
    const sub = subs.length === 1 ? subs[0]!.code : "";
    setManualEquipment(false);
    setForm((prev) => ({ ...prev, section, sub_section: sub, main_equipment: "", main_equipment_name: "" }));
  };

  useEffect(() => {
    const only = allowedSections.length === 1 ? allowedSections[0]!.code : "";
    if (!editing && !form.section && only) onSectionChange(only);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, form.section, allowedSections.length]);

  const onSubSectionChange = (subSection: string) => {
    if (!subSection || subSection === form.sub_section) return;
    setManualEquipment(false);
    setForm((prev) => ({ ...prev, sub_section: subSection, main_equipment: "", main_equipment_name: "" }));
  };

  function reset() {
    setSeqTouched(false);
    setSerialTouched(false);
    setManualEquipment(false);
    setForm(emptyForm);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.unit || !form.section || !form.sub_section || !form.main_equipment.trim() || !form.parameter || (!standalone && !form.function_code)) {
      toast.error("Байршил, параметр, функцийг бүрэн сонгоно уу.");
      return;
    }
    if (!form.sequence.trim() || !/^\d{4}$/.test(form.year)) {
      toast.error("Байрлалын дугаар болон 4 оронтой оныг зөв бөглөнө үү.");
      return;
    }
    if (seqConflict) {
      toast.error("Энэ байрлалын дугаар аль хэдийн бүртгэлтэй байна.");
      return;
    }
    if (serialConflict) {
      toast.error("Энэ хөрөнгийн сериал аль хэдийн бүртгэлтэй байна.");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      category: group,
      function_code: standalone ? null : form.function_code,
      subtype: form.parameter,
      sequence: form.sequence.trim().padStart(3, "0"),
      main_equipment: form.main_equipment.trim().toUpperCase(),
      main_equipment_name: form.main_equipment_name.trim() || null,
      tag_name: tag,
      asset_serial: form.asset_serial.trim() || null,
      manufacturer: form.manufacturer.trim() || null,
      model: form.model.trim() || null,
      factory_serial: form.factory_serial.trim() || null,
      notes: form.notes.trim() || null,
      maintenance_history: form.maintenance_history.trim() || null,
    };

    const { error } = editing
      ? await supabase.from("equipment").update(payload).eq("id", editing.id)
      : await supabase.from("equipment").insert(payload);
    setSaving(false);

    if (error) {
      toast.error(
        error.code === "23505"
          ? "Ийм Tag name аль хэдийн бүртгэгдсэн байна."
          : error.code === "42501" || /row-level security/i.test(error.message)
            ? "Энэ хэсэгт бүртгэл хийх эрх танд байхгүй байна. Админд хандана уу."
            : "Хадгалахад алдаа гарлаа: " + error.message,
      );
      return;
    }
    toast.success(editing ? "Тоног төхөөрөмж шинэчлэгдлээ." : `${tag} бүртгэгдлээ.`);
    if (!editing) reset();
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Step n={1} title="Байршил">
        <Field label="Үйлчилгээ эрхлэгч">
          <Picker value={form.unit} onChange={(v) => v && set("unit", v)}>
            {unitOptions.map((u) => (
              <SelectItem key={u.code} value={u.code}>{u.label}</SelectItem>
            ))}
          </Picker>
        </Field>
        <Field label="Үндсэн хэсэг">
          <Picker value={form.section} onChange={onSectionChange} disabled={auth.loading}>
            {allowedSections.map((s) => (
              <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>
            ))}
          </Picker>
        </Field>
        <Field label="Дэд хэсэг">
          <Picker value={form.sub_section} disabled={!form.section} onChange={(v) => v && onSubSectionChange(v)}>
            {subSectionOptions.map((s) => (
              <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>
            ))}
          </Picker>
        </Field>
        <Field label="Үндсэн тоног төхөөрөмж">
          <Picker
            value={manualEquipment || (!equipmentInList && form.main_equipment) ? CUSTOM_EQUIPMENT : form.main_equipment}
            disabled={!form.sub_section}
            onChange={(v) => v && pickEquipment(v)}
          >
            {equipmentList.map((m) => (
              <SelectItem key={m.code} value={m.code}>{m.label} ({m.code})</SelectItem>
            ))}
            <SelectItem value={CUSTOM_EQUIPMENT}>Бусад (гараар бичих)</SelectItem>
          </Picker>
        </Field>
        {manualEquipment || (!equipmentInList && form.main_equipment) ? (
          <>
            <Field label="Тоног төхөөрөмжийн код">
              <Input value={form.main_equipment} placeholder="CRU1" onChange={(e) => set("main_equipment", e.target.value.toUpperCase())} />
            </Field>
            <Field label="Тоног төхөөрөмжийн нэр">
              <Input value={form.main_equipment_name} placeholder="Crusher #1" onChange={(e) => set("main_equipment_name", e.target.value)} />
            </Field>
          </>
        ) : (
          <Field label="Тоног төхөөрөмжийн код">
            <Input value={form.main_equipment} readOnly className="bg-muted/50 font-mono" />
          </Field>
        )}
      </Step>

      <Step n={2} title="Параметр ба функц (ISA-5.1)">
        <Field label="Параметр">
          <Picker
            value={form.parameter}
            onChange={(v) =>
              v && setForm((prev) => ({ ...prev, parameter: v, function_code: isStandaloneCode(v) ? "" : prev.function_code }))
            }
          >
            {PARAMETERS.map((p) => (
              <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>
            ))}
          </Picker>
        </Field>
        <Field label="Функц">
          {standalone ? (
            <Input value="Шаардлагагүй" readOnly className="bg-muted/50" />
          ) : (
            <Picker value={form.function_code} onChange={(v) => v && set("function_code", v)}>
              {FUNCTIONS.map((f) => (
                <SelectItem key={f.code} value={f.code}>{f.label}</SelectItem>
              ))}
            </Picker>
          )}
        </Field>
        <Field label="Ерөнхий бүлэг">
          <Input value={standalone || form.function_code ? categoryLabel(group) : ""} readOnly className="bg-muted/50" />
        </Field>
        <Field label="Байрлалын дугаар">
          <Input
            value={form.sequence}
            inputMode="numeric"
            maxLength={4}
            placeholder="001"
            className={seqConflict ? "border-destructive" : ""}
            onChange={(e) => {
              setSeqTouched(true);
              set("sequence", e.target.value.replace(/\D/g, ""));
            }}
          />
          {seqConflict ? (
            <Hint warn>Давхардаж байна. Санал: {suggestedSeq}</Hint>
          ) : (
            form.sequence !== suggestedSeq && (
              <button type="button" className="text-xs text-primary underline" onClick={() => { setSeqTouched(false); set("sequence", suggestedSeq); }}>
                Санал болгох: {suggestedSeq}
              </button>
            )
          )}
        </Field>
      </Step>

      <Step n={3} title="Үйлдвэрлэгч ба загвар">
        <Field label="Үйлдвэрлэгч">
          <Input
            value={form.manufacturer}
            list="mf-list"
            placeholder="Endress+Hauser"
            onChange={(e) => {
              const v = e.target.value;
              const d = vendorIsaDefault(v);
              setForm((p) => ({
                ...p,
                manufacturer: v,
                ...(d ? { parameter: d.parameter, function_code: d.function_code } : {}),
              }));
            }}
          />
          <datalist id="mf-list">
            {manufacturers.map((m) => <option key={m} value={m} />)}
          </datalist>
        </Field>
        <Field label="Модель">
          <Input
            value={form.model}
            list="model-list"
            placeholder="Cerabar PMC51"
            onChange={(e) => {
              const v = e.target.value;
              const d = modelIsaDefault(v);
              setForm((p) => ({
                ...p,
                model: v,
                ...(d ? { parameter: d.parameter, function_code: d.function_code } : {}),
              }));
            }}
          />
          <datalist id="model-list">
            {models.slice(0, 200).map((m) => <option key={m} value={m} />)}
          </datalist>
        </Field>
        <Field label="Үйлдвэрийн сериал №">
          <Input value={form.factory_serial} placeholder="EH-77120451" onChange={(e) => set("factory_serial", e.target.value)} />
        </Field>
        <Field label="Үйлдвэрлэсэн он">
          <Input value={form.year} inputMode="numeric" maxLength={4} placeholder="2026" onChange={(e) => set("year", e.target.value.replace(/\D/g, ""))} />
        </Field>
        <Field label="Хөрөнгийн сериал (байнгын)">
          <Input
            value={form.asset_serial}
            placeholder="1-00001"
            className={`font-mono ${serialConflict ? "border-destructive" : ""}`}
            onChange={(e) => { setSerialTouched(true); set("asset_serial", e.target.value); }}
          />
          {serialConflict ? (
            <Hint warn>Давхардаж байна. Санал: {suggestedSerial}</Hint>
          ) : editing ? (
            <Hint>Шилжсэн ч сериал өөрчлөгдөхгүй.</Hint>
          ) : null}
        </Field>
        <Field label="Төлөв">
          <Picker value={form.status} onChange={(v) => v && set("status", v)}>
            {STATUSES.map((s) => (
              <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>
            ))}
          </Picker>
        </Field>
      </Step>

      <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tag name</p>
            <p className="mt-2 font-mono text-xl font-semibold tracking-tight text-primary sm:text-2xl">{tag}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">Хөрөнгийн сериал: {form.asset_serial || "—"}</p>
            {!ready && <p className="mt-1 text-xs text-muted-foreground">Бүх сонголтыг бөглөхөд Tag name бүрэн үүснэ.</p>}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => { void navigator.clipboard?.writeText(tag); toast.success("Tag name хуулагдлаа."); }}>
            <Copy className="size-4" /> Хуулах
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Формат: {"{Эрхлэгч}-{Хэсэг}-{ДэдХэсэг}-{Төхөөрөмж}-{Параметр}{Функц}{Байрлал}-{Он}"}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HistoryEditor
          label="Ашиглалтын явцын түүх"
          placeholder="Суурилуулсан / шилжүүлсэн / буулгасан"
          value={form.notes}
          onChange={(v) => set("notes", v)}
        />
        <HistoryEditor
          label="Засвар үйлчилгээний түүх"
          placeholder="Битүүмж солих, калибровка"
          value={form.maintenance_history}
          onChange={(v) => set("maintenance_history", v)}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving || !online}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {editing ? "Шинэчлэх" : "Бүртгэх"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => (editing ? onDone?.() : reset())}>
          <RotateCcw className="size-4" /> {editing ? "Болих" : "Цэвэрлэх"}
        </Button>
        {!online && (
          <p className="self-center text-xs text-muted-foreground" role="status">
            Сүлжээгүй байна. Холболт сэргэмэгц хадгалах боломжтой — оруулсан мэдээлэл хуудсан дээр хэвээр үлдэнэ.
          </p>
        )}
      </div>
    </form>
  );
}

function HistoryEditor({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40 shrink-0" />
        <Input value={note} placeholder={placeholder} onChange={(e) => setNote(e.target.value)} />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          disabled={!date || !note.trim()}
          onClick={() => { onChange(appendMaintenance(value, date, note)); setNote(""); }}
          aria-label="Нэмэх"
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <Textarea value={value} rows={4} placeholder="YYYY-MM-DD — тэмдэглэл" className="font-mono text-xs" onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{n}</span>
        {title}
      </legend>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </fieldset>
  );
}

function Hint({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <p className={`flex items-center gap-1 text-xs ${warn ? "text-destructive" : "text-muted-foreground"}`}>
      {warn ? <AlertTriangle className="size-3" /> : <Sparkles className="size-3" />}
      {children}
    </p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Picker({
  value,
  onChange,
  children,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => { if (v) onChange(v); }} disabled={Boolean(disabled)}>
      <SelectTrigger className="w-full"><SelectValue placeholder="Сонгох..." /></SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}
