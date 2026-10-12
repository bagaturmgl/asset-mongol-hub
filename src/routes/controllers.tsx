import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Cpu,
  Download,
  Factory,
  LayoutDashboard,
  List,
  Loader2,
  LogIn,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  CONTROLLER_STATUSES,
  CONTROLLER_TYPES,
  controllerAge,
  controllerTagPrefix,
  controllersToCsv,
  controllerUnitAllowed,
  ioTotal,
  nextControllerTag,
  type Controller,
} from "@/lib/controllers";
import {
  SUB_SECTIONS,
  UNITS,
  canonicalVendor,
  sectionLabel,
  sectionsForUnit,
  subSectionLabel,
} from "@/lib/equipment";
import { mainEquipmentOptions } from "@/lib/main-equipments";

export const Route = createFileRoute("/controllers")({
  head: () => ({
    meta: [
      { title: "DCS/PLC | ХХХА Тоног төхөөрөмж бүртгэл" },
      {
        name: "description",
        content: "DCS ба PLC контроллерын бүртгэл: байршил, загвар, дохионы тоо, насжилт.",
      },
    ],
  }),
  component: ControllersPage,
});

const ALL = "__all__";
const NONE = "__none__";

function locationLabel(
  c: Pick<Controller, "section" | "sub_section" | "main_equipment" | "main_equipment_name">,
) {
  return [
    sectionLabel(c.section),
    c.sub_section ? subSectionLabel(c.section, c.sub_section) : null,
    c.main_equipment_name || c.main_equipment,
  ]
    .filter(Boolean)
    .join(" / ");
}

const statusLabel = (s: string) => CONTROLLER_STATUSES.find((x) => x.code === s)?.label ?? s;

function ControllersPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [type, setType] = useState<string>(ALL);
  const [section, setSection] = useState<string>(ALL);
  const [vendor, setVendor] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Controller> | null>(null);
  const [deleting, setDeleting] = useState<Controller | null>(null);

  const query = useQuery({
    queryKey: ["controllers"],
    enabled: !!auth.user, // OT мэдээлэл — зөвхөн нэвтэрсэн үед
    queryFn: async () => {
      const { data, error } = await supabase.from("controllers").select("*").order("tag");
      if (error) throw error;
      return (data ?? []) as Controller[];
    },
  });
  const rows = useMemo(() => query.data ?? [], [query.data]);

  const vendors = useMemo(
    () => [...new Set(rows.map((r) => r.manufacturer).filter(Boolean) as string[])].sort(),
    [rows],
  );
  const sections = useMemo(() => [...new Set(rows.map((r) => r.section))].sort(), [rows]);

  const filtered = useMemo(() => {
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter((r) => {
      if (type !== ALL && r.ctype !== type) return false;
      if (section !== ALL && r.section !== section) return false;
      if (vendor !== ALL && r.manufacturer !== vendor) return false;
      if (!terms.length) return true;
      const hay = [r.tag, r.manufacturer, r.model, r.ip, r.notes, locationLabel(r)]
        .join(" ")
        .toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [rows, type, section, vendor, search]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("controllers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Контроллер устгагдлаа.");
      setDeleting(null);
      void qc.invalidateQueries({ queryKey: ["controllers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportCsv = () => {
    const blob = new Blob([controllersToCsv(filtered, locationLabel)], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `dcs-plc-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const canAdd = auth.isAdmin || auth.sections.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Factory className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight">ХХХА Тоног төхөөрөмж бүртгэл</h1>
              <p className="text-xs text-muted-foreground">
                Tag name генератор ба нэгдсэн бүртгэлийн сан
              </p>
            </div>
          </div>
          <nav
            className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1"
            aria-label="Үндсэн цэс"
          >
            <Button size="sm" variant="ghost" asChild>
              <Link to="/">
                <List className="size-4" /> Бүртгэлийн жагсаалт
              </Link>
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/dashboard">
                <LayoutDashboard className="size-4" /> Хянах самбар
              </Link>
            </Button>
            <span className={buttonVariants({ size: "sm" })} aria-current="page">
              <Cpu className="size-4" /> DCS/PLC
            </span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        {auth.loading ? null : !auth.user ? (
          <div className="mx-auto max-w-md rounded-xl border bg-card p-8 text-center">
            <Cpu className="mx-auto size-8 text-primary" aria-hidden />
            <h2 className="mt-3 text-lg font-semibold">DCS/PLC бүртгэл</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Контроллерын IP хаяг зэрэг үйлдвэрлэлийн сүлжээний мэдээлэл агуулдаг тул зөвхөн
              нэвтэрсэн хэрэглэгчид харагдана.
            </p>
            <Button className="mt-5" asChild>
              <Link to="/auth">
                <LogIn className="size-4" /> Нэвтрэх
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">DCS/PLC контроллерууд</h2>
                <p className="text-sm text-muted-foreground">
                  Байршил, загвар, ашиглалтад орсон он, дохионы тоо.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
                  <Download className="size-4" /> CSV
                </Button>
                {canAdd && (
                  <Button
                    onClick={() => setEditing({ unit: "ASU", ctype: "PLC", status: "active" })}
                  >
                    <Plus className="size-4" /> Контроллер нэмэх
                  </Button>
                )}
              </div>
            </div>

            <Summary rows={rows} />

            <div className="rounded-xl border bg-card">
              <div className="flex flex-wrap items-center gap-3 border-b p-4">
                <div className="relative min-w-56 flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tag, загвар, IP, байршил…"
                    className="pl-9"
                  />
                </div>
                <Filter
                  value={type}
                  onChange={setType}
                  all="Бүх төрөл"
                  options={CONTROLLER_TYPES.map((t) => [t, t])}
                />
                <Filter
                  value={section}
                  onChange={setSection}
                  all="Бүх хэсэг"
                  options={sections.map((s) => [s, sectionLabel(s)])}
                />
                <Filter
                  value={vendor}
                  onChange={setVendor}
                  all="Бүх үйлдвэрлэгч"
                  options={vendors.map((v) => [v, v])}
                />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tag</TableHead>
                      <TableHead>Төрөл</TableHead>
                      <TableHead>Байршил</TableHead>
                      <TableHead>Үйлдвэрлэгч / Загвар</TableHead>
                      <TableHead>Ашиглалтад</TableHead>
                      <TableHead className="text-right">AI</TableHead>
                      <TableHead className="text-right">AO</TableHead>
                      <TableHead className="text-right">DI</TableHead>
                      <TableHead className="text-right">DO</TableHead>
                      <TableHead className="text-right">Нийт</TableHead>
                      <TableHead>Төлөв</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {query.isLoading && (
                      <TableRow>
                        <TableCell colSpan={12} className="py-10 text-center">
                          <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    )}
                    {!query.isLoading && !filtered.length && (
                      <TableRow>
                        <TableCell colSpan={12} className="py-10 text-center text-muted-foreground">
                          Бүртгэл олдсонгүй.
                        </TableCell>
                      </TableRow>
                    )}
                    {filtered.map((c) => {
                      const age = controllerAge(c);
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="whitespace-nowrap font-mono text-xs">
                            {c.tag}
                          </TableCell>
                          <TableCell>
                            <Badge variant={c.ctype === "DCS" ? "default" : "secondary"}>
                              {c.ctype}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{locationLabel(c)}</TableCell>
                          <TableCell>
                            <div className="text-sm">{c.manufacturer ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">{c.model}</div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {c.commissioned ?? "—"}
                            {age !== null && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({age} жил)
                              </span>
                            )}
                          </TableCell>
                          {(["io_ai", "io_ao", "io_di", "io_do"] as const).map((k) => (
                            <TableCell key={k} className="text-right tabular-nums">
                              {c[k] ?? "—"}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-medium tabular-nums">
                            {ioTotal(c)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {statusLabel(c.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              {auth.canEdit(c.section) && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label={`${c.tag} засах`}
                                  onClick={() => setEditing(c)}
                                >
                                  <Pencil className="size-4" />
                                </Button>
                              )}
                              {auth.isAdmin && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label={`${c.tag} устгах`}
                                  onClick={() => setDeleting(c)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <p className="border-t px-4 py-3 text-xs text-muted-foreground">
                Нийт {rows.length} контроллероос {filtered.length} илэрц
              </p>
            </div>
          </>
        )}
      </main>

      {editing && (
        <ControllerDialog
          row={editing}
          all={rows}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void qc.invalidateQueries({ queryKey: ["controllers"] });
          }}
        />
      )}

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && !remove.isPending && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Контроллерыг устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono font-medium text-foreground">{deleting?.tag}</span> бүртгэл
              устана. Энэ үйлдлийг буцаах боломжгүй.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Болих</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleting) remove.mutate(deleting.id);
              }}
            >
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Filter({
  value,
  onChange,
  all,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  all: string;
  options: [string, string][];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{all}</SelectItem>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Дээд хэсгийн хураангуй: төрөл тус бүрийн тоо, дохио, үйлдвэрлэгч; дундаж нас. */
function Summary({ rows }: { rows: Controller[] }) {
  const byType = CONTROLLER_TYPES.map((t) => {
    const list = rows.filter((r) => r.ctype === t);
    const vendors = new Map<string, number>();
    list.forEach(
      (r) => r.manufacturer && vendors.set(r.manufacturer, (vendors.get(r.manufacturer) ?? 0) + 1),
    );
    return {
      t,
      count: list.length,
      io: list.reduce((s, r) => s + ioTotal(r), 0),
      vendors: [...vendors.entries()].sort((a, b) => b[1] - a[1]),
    };
  });
  const ages = rows.map((r) => controllerAge(r)).filter((a): a is number => a !== null);
  const avg = ages.length ? ages.reduce((s, a) => s + a, 0) / ages.length : null;
  const sum = (k: "io_ai" | "io_ao" | "io_di" | "io_do") =>
    rows.reduce((s, r) => s + (r[k] ?? 0), 0);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {byType.map((x) => (
        <div key={x.t} className="rounded-xl border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground">{x.t}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{x.count}</p>
          <p className="text-xs text-muted-foreground">{x.io} дохио</p>
          <p className="mt-2 text-xs">
            {x.vendors.map(([v, n]) => `${v} ${n}`).join(" · ") || "—"}
          </p>
        </div>
      ))}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground">Нийт дохио</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">
          {rows.reduce((s, r) => s + ioTotal(r), 0)}
        </p>
        <p className="mt-2 text-xs tabular-nums">
          AI {sum("io_ai")} · AO {sum("io_ao")} · DI {sum("io_di")} · DO {sum("io_do")}
        </p>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground">Дундаж нас</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">
          {avg === null ? "—" : `${avg.toFixed(1)}`}
        </p>
        <p className="text-xs text-muted-foreground">жил, ашиглалтад орсон оноос</p>
        <p className="mt-2 text-xs">15-аас дээш жил: {ages.filter((a) => a > 15).length}</p>
      </div>
    </div>
  );
}

function F({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Pick({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(x) => {
        if (x) onChange(x);
      }}
      disabled={!!disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder ?? "Сонгох…"} />
      </SelectTrigger>
      <SelectContent>
        {options.map(([val, l]) => (
          <SelectItem key={val} value={val}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ControllerDialog({
  row,
  all,
  onClose,
  onSaved,
}: {
  row: Partial<Controller>;
  all: Controller[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const isNew = !row.id;
  const [v, setV] = useState({
    unit: row.unit ?? "ASU",
    ctype: (row.ctype ?? "PLC") as string,
    section: row.section ?? "",
    sub_section: row.sub_section ?? "",
    main_equipment: row.main_equipment ?? "",
    manufacturer: row.manufacturer ?? "",
    model: row.model ?? "",
    commissioned: row.commissioned ?? "",
    io_ai: row.io_ai?.toString() ?? "",
    io_ao: row.io_ao?.toString() ?? "",
    io_di: row.io_di?.toString() ?? "",
    io_do: row.io_do?.toString() ?? "",
    ip: row.ip ?? "",
    status: row.status ?? "active",
    notes: row.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof v, val: string) => setV((p) => ({ ...p, [k]: val }));

  const units = UNITS.filter((u) => controllerUnitAllowed(u.code));
  const sections = sectionsForUnit(v.unit).filter(
    (s) => auth.isAdmin || auth.sections.includes(s.code),
  );
  const subs = SUB_SECTIONS[v.section] ?? [];
  const mains = v.section && v.sub_section ? mainEquipmentOptions(v.section, v.sub_section) : [];
  const vendorList = useMemo(
    () => [...new Set(all.map((c) => c.manufacturer).filter(Boolean) as string[])].sort(),
    [all],
  );
  const needsMain = v.ctype === "PLC";

  // Байршил эсвэл төрөл өөрчлөгдвөл шинэ Tag; эс бөгөөс хуучнаа хадгална
  const prefix = controllerTagPrefix({
    unit: v.unit,
    section: v.section,
    sub_section: v.sub_section,
    main_equipment: v.main_equipment,
    ctype: v.ctype,
  });
  const tag =
    !isNew && row.tag?.startsWith(prefix + "-")
      ? row.tag
      : nextControllerTag(
          prefix,
          all.filter((c) => c.id !== row.id).map((c) => c.tag),
        );
  const ready = !!(
    v.unit &&
    v.section &&
    v.ctype &&
    (!needsMain || (v.sub_section && v.main_equipment))
  );
  const commissionedOk = !v.commissioned || /^\d{4}(-(0[1-9]|1[0-2]))?$/.test(v.commissioned);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || !commissionedOk) return;
    setSaving(true);
    const num = (s: string) => (s.trim() === "" ? null : Math.max(0, Math.round(Number(s))));
    const main = mains.find((m) => m.code === v.main_equipment);
    const payload = {
      tag,
      unit: v.unit,
      ctype: v.ctype,
      section: v.section,
      sub_section: v.sub_section || null,
      main_equipment: needsMain ? v.main_equipment || null : null,
      main_equipment_name: needsMain ? (main?.label ?? null) : null,
      manufacturer: canonicalVendor(v.manufacturer),
      model: v.model.trim() || null,
      commissioned: v.commissioned.trim() || null,
      io_ai: num(v.io_ai),
      io_ao: num(v.io_ao),
      io_di: num(v.io_di),
      io_do: num(v.io_do),
      ip: v.ip.trim() || null,
      status: v.status,
      notes: v.notes.trim() || null,
    };
    const { error } = isNew
      ? await supabase.from("controllers").insert(payload)
      : await supabase.from("controllers").update(payload).eq("id", row.id!);
    setSaving(false);
    if (error) {
      toast.error(
        error.code === "23505"
          ? "Ийм Tag аль хэдийн бүртгэгдсэн байна."
          : error.code === "42501" || /row-level security/i.test(error.message)
            ? "Энэ хэсэгт бүртгэл хийх эрх танд байхгүй байна."
            : "Хадгалахад алдаа гарлаа: " + error.message,
      );
      return;
    }
    toast.success(isNew ? "Контроллер нэмэгдлээ." : "Хадгалагдлаа.");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Шинэ контроллер" : `Засах: ${row.tag}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Үйлчилгээ эрхлэгч">
              <Pick
                value={v.unit}
                onChange={(x) =>
                  setV((p) => ({ ...p, unit: x, section: "", sub_section: "", main_equipment: "" }))
                }
                options={units.map((u) => [u.code, u.label])}
              />
            </F>
            <F label="Төрөл">
              <Pick
                value={v.ctype}
                onChange={(x) => setV((p) => ({ ...p, ctype: x, main_equipment: "" }))}
                options={CONTROLLER_TYPES.map((t) => [t, t])}
              />
            </F>
            <F label="Хэсэг">
              <Pick
                value={v.section}
                onChange={(x) =>
                  setV((p) => ({ ...p, section: x, sub_section: "", main_equipment: "" }))
                }
                options={sections.map((s) => [s.code, s.label])}
              />
            </F>
            <F label={needsMain ? "Дэд хэсэг" : "Дэд хэсэг (хэсэг бүхэлдээ бол хоосон)"}>
              <Pick
                value={v.sub_section || (needsMain ? "" : NONE)}
                onChange={(x) =>
                  setV((p) => ({ ...p, sub_section: x === NONE ? "" : x, main_equipment: "" }))
                }
                options={[
                  ...(needsMain ? [] : ([[NONE, "— Хэсэг бүхэлдээ"]] as [string, string][])),
                  ...subs.map((s) => [s.code, s.label] as [string, string]),
                ]}
                disabled={!v.section}
              />
            </F>
            {needsMain && (
              <F label="Үндсэн тоног төхөөрөмж" wide>
                <Pick
                  value={v.main_equipment}
                  onChange={(x) => set("main_equipment", x)}
                  options={mains.map((m) => [m.code, `${m.label} (${m.code})`])}
                  disabled={!v.sub_section}
                />
              </F>
            )}
            <F label="Үйлдвэрлэгч">
              <Input
                value={v.manufacturer}
                list="ctrl-vendors"
                onChange={(e) => set("manufacturer", e.target.value)}
                placeholder="Allen Bradley"
              />
              <datalist id="ctrl-vendors">
                {vendorList.map((x) => (
                  <option key={x} value={x} />
                ))}
              </datalist>
            </F>
            <F label="Загвар">
              <Input
                value={v.model}
                onChange={(e) => set("model", e.target.value)}
                placeholder="ControlLogix 5580 1756-L85E"
              />
            </F>
            <F label="Ашиглалтад орсон (ОООО эсвэл ОООО-СС)">
              <Input
                value={v.commissioned}
                onChange={(e) => set("commissioned", e.target.value)}
                placeholder="2024-11"
                className={commissionedOk ? "" : "border-destructive"}
              />
            </F>
            <F label="IP хаяг (заавал биш)">
              <Input
                value={v.ip}
                onChange={(e) => set("ip", e.target.value)}
                placeholder="10.10.1.20"
                className="font-mono"
              />
            </F>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {(["io_ai", "io_ao", "io_di", "io_do"] as const).map((k) => (
              <F key={k} label={k.slice(3).toUpperCase()}>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={v[k]}
                  onChange={(e) => set(k, e.target.value)}
                />
              </F>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Төлөв">
              <Pick
                value={v.status}
                onChange={(x) => set("status", x)}
                options={CONTROLLER_STATUSES.map((s) => [s.code, s.label])}
              />
            </F>
            <F label="Tag">
              <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 font-mono text-sm">
                {ready ? tag : "…"}
              </div>
            </F>
            <F label="Тэмдэглэл" wide>
              <Textarea value={v.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
            </F>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Болих
            </Button>
            <Button type="submit" disabled={!ready || !commissionedOk || saving}>
              {saving ? "Хадгалж байна…" : "Хадгалах"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
