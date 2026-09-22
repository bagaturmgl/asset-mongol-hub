import { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, RotateCcw, Save } from "lucide-react";
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
import {
  buildTag,
  CATEGORIES,
  Equipment,
  SECTIONS,
  STATUSES,
  SUBTYPES,
  SUB_SECTIONS,
  UNITS,
} from "@/lib/equipment";
import { mainEquipmentOptions } from "@/lib/main-equipments";


type FormState = {
  unit: string;
  section: string;
  sub_section: string;
  main_equipment: string;
  main_equipment_name: string;
  category: string;
  subtype: string;
  sequence: string;
  year: string;
  manufacturer: string;
  model: string;
  factory_serial: string;
  status: string;
  notes: string;
  maintenance_history: string;
};

const CUSTOM_EQUIPMENT = "__custom__";

const emptyForm: FormState = {
  unit: "ASU",
  section: "KSI",
  sub_section: "S1",
  main_equipment: "",
  main_equipment_name: "",
  category: "S",
  subtype: "P",
  sequence: "001",
  year: String(new Date().getFullYear()),
  manufacturer: "",
  model: "",
  factory_serial: "",
  status: "active",
  notes: "",
  maintenance_history: "",
};

export function EquipmentForm({
  editing,
  onDone,
}: {
  editing?: Equipment | null;
  onDone?: () => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [manualEquipment, setManualEquipment] = useState(false);

  useEffect(() => {
    if (editing) {
      setManualEquipment(
        !mainEquipmentOptions(editing.section, editing.sub_section).some(
          (item) => item.code === editing.main_equipment,
        ),
      );
      setForm({
        unit: editing.unit,
        section: editing.section,
        sub_section: editing.sub_section,
        main_equipment: editing.main_equipment,
        main_equipment_name: editing.main_equipment_name ?? "",
        category: editing.category,
        subtype: editing.subtype,
        sequence: editing.sequence,
        year: editing.year,
        manufacturer: editing.manufacturer ?? "",
        model: editing.model ?? "",
        factory_serial: editing.factory_serial ?? "",
        status: editing.status,
        notes: editing.notes ?? "",
        maintenance_history: editing.maintenance_history ?? "",
      });
    } else {
      setManualEquipment(false);
      const first = mainEquipmentOptions(emptyForm.section, emptyForm.sub_section)[0];
      setForm({
        ...emptyForm,
        main_equipment: first?.code ?? "",
        main_equipment_name: first?.label ?? "",
      });
    }
  }, [editing]);


  const configuredUnits = UNITS.map((u) => ({ code: u.code, label: u.label }));
  const unitOptions = configuredUnits.some((item) => item.code === form.unit)
    ? configuredUnits
    : form.unit
      ? [{ code: form.unit, label: form.unit }, ...configuredUnits]
      : configuredUnits;
  const subtypeOptions = SUBTYPES[form.category] ?? [];
  const configuredSubSections = SUB_SECTIONS[form.section] ?? [];
  const subSectionOptions = configuredSubSections.some((item) => item.code === form.sub_section)
    ? configuredSubSections
    : form.sub_section
      ? [{ code: form.sub_section, label: form.sub_section }, ...configuredSubSections]
      : configuredSubSections;
  const equipmentList = mainEquipmentOptions(form.section, form.sub_section);
  const equipmentInList = equipmentList.some((item) => item.code === form.main_equipment);
  const tag = useMemo(() => buildTag(form), [form]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onCategoryChange = (category: string) => {
    const first = SUBTYPES[category]?.[0]?.code ?? "";
    setForm((prev) => ({ ...prev, category, subtype: first }));
  };

  const pickEquipment = (code: string) => {
    if (code === CUSTOM_EQUIPMENT) {
      setManualEquipment(true);
      setForm((prev) => ({ ...prev, main_equipment: "", main_equipment_name: "" }));
      return;
    }
    const found = mainEquipmentOptions(form.section, form.sub_section).find(
      (item) => item.code === code,
    );
    setManualEquipment(false);
    setForm((prev) => ({
      ...prev,
      main_equipment: code,
      main_equipment_name: found?.label ?? "",
    }));
  };

  const onSectionChange = (section: string) => {
    const first = SUB_SECTIONS[section]?.[0]?.code ?? "0";
    const firstEquipment = mainEquipmentOptions(section, first)[0];
    setManualEquipment(false);
    setForm((prev) => ({
      ...prev,
      section,
      sub_section: first,
      main_equipment: firstEquipment?.code ?? "",
      main_equipment_name: firstEquipment?.label ?? "",
    }));
  };

  const onSubSectionChange = (subSection: string) => {
    const firstEquipment = mainEquipmentOptions(form.section, subSection)[0];
    setManualEquipment(false);
    setForm((prev) => ({
      ...prev,
      sub_section: subSection,
      main_equipment: firstEquipment?.code ?? "",
      main_equipment_name: firstEquipment?.label ?? "",
    }));
  };


  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.sequence.trim() || !/^\d{4}$/.test(form.year)) {
      toast.error("Дарааллын дугаар болон 4 оронтой оныг зөв бөглөнө үү.");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      sequence: form.sequence.trim().padStart(3, "0"),
      main_equipment: form.main_equipment.trim().toUpperCase(),
      main_equipment_name: form.main_equipment_name.trim() || null,
      tag_name: tag,
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
          : "Хадгалахад алдаа гарлаа: " + error.message,
      );
      return;
    }
    toast.success(editing ? "Тоног төхөөрөмж шинэчлэгдлээ." : `${tag} бүртгэгдлээ.`);
    if (!editing) setForm({ ...emptyForm, year: form.year, unit: form.unit, section: form.section });
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Үйлчилгээ эрхлэгч">
          <Picker value={form.unit} onChange={(v) => v && set("unit", v)}>
            {unitOptions.map((u) => (
              <SelectItem key={u.code} value={u.code}>
                {u.label}
              </SelectItem>
            ))}
          </Picker>
        </Field>

        <Field label="Үндсэн хэсэг">
          <Picker value={form.section} onChange={onSectionChange}>
            {SECTIONS.map((s) => (
              <SelectItem key={s.code} value={s.code}>
                {s.label}
              </SelectItem>
            ))}
          </Picker>
        </Field>

        <Field label="Дэд хэсэг">
          <Picker value={form.sub_section} onChange={(v) => v && onSubSectionChange(v)}>
            {subSectionOptions.map((s) => (
              <SelectItem key={s.code} value={s.code}>
                {s.label}
              </SelectItem>
            ))}
          </Picker>
        </Field>

        <Field label="Үндсэн тоног төхөөрөмж">
          <Picker
            value={
              manualEquipment || (!equipmentInList && form.main_equipment)
                ? CUSTOM_EQUIPMENT
                : form.main_equipment
            }
            onChange={(v) => v && pickEquipment(v)}
          >
            {equipmentList.map((m) => (
              <SelectItem key={m.code} value={m.code}>
                {m.label} ({m.code})
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_EQUIPMENT}>Бусад (гараар бичих)</SelectItem>
          </Picker>
        </Field>

        {manualEquipment || (!equipmentInList && form.main_equipment) ? (
          <>
            <Field label="Тоног төхөөрөмжийн код">
              <Input
                value={form.main_equipment}
                placeholder="CRU1"
                onChange={(e) => set("main_equipment", e.target.value.toUpperCase())}
              />
            </Field>

            <Field label="Тоног төхөөрөмжийн нэр">
              <Input
                value={form.main_equipment_name}
                placeholder="Crusher #1"
                onChange={(e) => set("main_equipment_name", e.target.value)}
              />
            </Field>
          </>
        ) : (
          <Field label="Тоног төхөөрөмжийн код">
            <Input value={form.main_equipment} readOnly className="bg-muted/50 font-mono" />
          </Field>
        )}


        <Field label="Үндсэн ангилал">
          <Picker value={form.category} onChange={onCategoryChange}>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.label}
              </SelectItem>
            ))}
          </Picker>
        </Field>

        <Field label="Дэд ангилал / Параметр">
          <Picker value={form.subtype} onChange={(v) => set("subtype", v)}>
            {subtypeOptions.map((s) => (
              <SelectItem key={s.code} value={s.code}>
                {s.label}
              </SelectItem>
            ))}
          </Picker>
        </Field>

        <Field label="Дарааллын дугаар">
          <Input
            value={form.sequence}
            inputMode="numeric"
            maxLength={4}
            placeholder="001"
            onChange={(e) => set("sequence", e.target.value.replace(/\D/g, ""))}
          />
        </Field>

        <Field label="Үйлдвэрлэсэн он">
          <Input
            value={form.year}
            inputMode="numeric"
            maxLength={4}
            placeholder="2026"
            onChange={(e) => set("year", e.target.value.replace(/\D/g, ""))}
          />
        </Field>
      </div>

      <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Tag name / Сериал дугаар
            </p>
            <p className="mt-2 font-mono text-xl font-semibold tracking-tight text-primary sm:text-2xl">
              {tag}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard?.writeText(tag);
              toast.success("Tag name хуулагдлаа.");
            }}
          >
            <Copy className="size-4" /> Хуулах
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Формат: {"{Unit}"}-{"{Section}"}-{"{SubSection}"}-{"{MainEquip}"}-{"{Category}"}
          {"{Subtype}"}
          {"{Seq}"}-{"{Year}"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Үйлдвэрлэгч">
          <Input
            value={form.manufacturer}
            placeholder="Endress+Hauser"
            onChange={(e) => set("manufacturer", e.target.value)}
          />
        </Field>
        <Field label="Модель">
          <Input
            value={form.model}
            placeholder="Cerabar PMP71"
            onChange={(e) => set("model", e.target.value)}
          />
        </Field>
        <Field label="Үйлдвэрийн Сериал №">
          <Input
            value={form.factory_serial}
            placeholder="EH-77120451"
            onChange={(e) => set("factory_serial", e.target.value)}
          />
        </Field>
        <Field label="Төлөв">
          <Picker value={form.status} onChange={(v) => set("status", v)}>
            {STATUSES.map((s) => (
              <SelectItem key={s.code} value={s.code}>
                {s.label}
              </SelectItem>
            ))}
          </Picker>
        </Field>
      </div>

      <Field label="Ашиглалтын явцын түүх">
        <Textarea
          value={form.notes}
          rows={3}
          placeholder="Ашиглалтын явцад гарсан өөрчлөлт, тэмдэглэл"
          onChange={(e) => set("notes", e.target.value)}
        />
      </Field>

      <Field label="Засвар үйлчилгээний түүх">
        <Textarea
          value={form.maintenance_history}
          rows={4}
          placeholder={"2026-03-12 — Битүүмж солих\n2026-06-20 — Калибровка хийх"}
          onChange={(e) => set("maintenance_history", e.target.value)}
        />
      </Field>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {editing ? "Шинэчлэх" : "Бүртгэх"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => (editing ? onDone?.() : setForm(emptyForm))}>
          <RotateCcw className="size-4" /> {editing ? "Болих" : "Цэвэрлэх"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Picker({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}
