import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Atom,
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
  Eye,
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
  FIELDBUS,
  IO_KINDS,
  allSignals,
  fbTotal,
  fbValue,
  ioChannels,
  ioModules,
  ioPerModule,
  ioSpare,
  ioSummary,
  ioUsed,
  pct,
  type FieldbusKind,
  type IoKind,
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
      { property: "og:title", content: "DCS/PLC | ХХХА Тоног төхөөрөмж бүртгэл" },
      { property: "og:description", content: "DCS ба PLC контроллерын бүртгэл: байршил, загвар, дохионы тоо, насжилт." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const [viewing, setViewing] = useState<Controller | null>(null);

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

  const canAdd = auth.canEditControllers;

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
            <Button size="sm" variant="ghost" asChild>
              <Link to="/rsl">
                <Atom className="size-4" /> RSEL
              </Link>
            </Button>
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
                      <TableHead className="text-right">Ашигласан сигнал</TableHead>
                      <TableHead className="text-right">Нийт суваг</TableHead>
                      <TableHead className="text-right">Нөөц</TableHead>
                      <TableHead className="text-right">Fieldbus ТТ / сигнал</TableHead>
                      <TableHead>Төлөв</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {query.isLoading && (
                      <TableRow>
                        <TableCell colSpan={11} className="py-10 text-center">
                          <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    )}
                    {!query.isLoading && !filtered.length && (
                      <TableRow>
                        <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                          Бүртгэл олдсонгүй.
                        </TableCell>
                      </TableRow>
                    )}
                    {filtered.map((c) => {
                      const age = controllerAge(c);
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="whitespace-nowrap font-mono text-xs">
                            <button
                              type="button"
                              className="text-left underline-offset-2 hover:underline"
                              onClick={() => setViewing(c)}
                            >
                              {c.tag}
                            </button>
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
                          <TableCell className="text-right font-medium tabular-nums">
                            {ioTotal(c)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {ioSummary(c).channels ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <SpareBadge
                              spare={ioSummary(c).spare}
                              ratio={ioSummary(c).sparePct}
                              over={ioSummary(c).over}
                            />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right tabular-nums">
                            {fbTotal(c, "devices") || fbTotal(c, "signals")
                              ? `${fbTotal(c, "devices")} / ${fbTotal(c, "signals")}`
                              : "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {statusLabel(c.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label={`${c.tag} дэлгэрэнгүй`}
                                onClick={() => setViewing(c)}
                              >
                                <Eye className="size-4" />
                              </Button>
                              {auth.canEditControllers && (
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

      {viewing && (
        <ControllerView
          c={viewing}
          onClose={() => setViewing(null)}
          onEdit={
            auth.canEditControllers
              ? () => {
                  setEditing(viewing);
                  setViewing(null);
                }
              : null
          }
        />
      )}

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
  const sum = (k: IoKind) => rows.reduce((s, r) => s + (ioUsed(r, k) ?? 0), 0);
  const withCh = rows.filter((r) => ioSummary(r).channels !== null);
  const totalCh = withCh.reduce((s, r) => s + (ioSummary(r).channels ?? 0), 0);
  const totalSpare = withCh.reduce((s, r) => s + (ioSummary(r).spare ?? 0), 0);
  const fbSig = rows.reduce((s, r) => s + fbTotal(r, "signals"), 0);
  const fbDev = rows.reduce((s, r) => s + fbTotal(r, "devices"), 0);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
        <p className="text-xs font-semibold text-muted-foreground">Нийт сигнал</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">
          {rows.reduce((s, r) => s + allSignals(r), 0)}
        </p>
        <p className="mt-2 text-xs tabular-nums">
          {IO_KINDS.map(({ k, label }) => `${label} ${sum(k)}`).join(" · ")}
        </p>
        <p className="text-xs tabular-nums text-muted-foreground">
          Fieldbus: {fbDev} ТТ, {fbSig} сигнал
        </p>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground">Нөөц суваг</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">
          {withCh.length ? totalSpare : "—"}
        </p>
        <p className="text-xs text-muted-foreground">
          {withCh.length
            ? `нийт ${totalCh} сувгийн ${Math.round((pct(totalSpare, totalCh) ?? 0) * 100)}%`
            : "модулийн мэдээлэл оруулаагүй"}
        </p>
        <p className="mt-2 text-xs">
          Модулийн мэдээлэлтэй: {withCh.length} / {rows.length}
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
    ...ioFormValues(row),
    ip: row.ip ?? "",
    status: row.status ?? "active",
    notes: row.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof v, val: string) => setV((p) => ({ ...p, [k]: val }));

  const units = UNITS.filter((u) => controllerUnitAllowed(u.code));
  const sections = sectionsForUnit(v.unit).filter((s) => !!s);
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
      ...ioPayload(v, num),
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
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
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
          <IoMatrixEditor values={v} onChange={(k, val) => setV((p) => ({ ...p, [k]: val }))} />
          <FieldbusEditor values={v} onChange={(k, val) => setV((p) => ({ ...p, [k]: val }))} />
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

/* ---------- Модуль, суваг, нөөц ба fieldbus ---------- */

const IO_FIELDS = IO_KINDS.flatMap(({ k }) => [`mod_${k}`, `ch_${k}`, `io_${k}`] as const);
const FB_FIELDS = FIELDBUS.flatMap(
  ({ k }) => [`${k}_capacity`, `${k}_devices`, `${k}_signals`] as const,
);
type IoFormKey = (typeof IO_FIELDS)[number] | (typeof FB_FIELDS)[number];
type IoForm = Record<IoFormKey, string>;

function ioFormValues(row: Partial<Controller>): IoForm {
  const out = {} as IoForm;
  for (const f of [...IO_FIELDS, ...FB_FIELDS]) {
    const val = row[f];
    out[f] = typeof val === "number" ? String(val) : "";
  }
  return out;
}

function ioPayload(v: IoForm, num: (s: string) => number | null) {
  const out = {} as Record<IoFormKey, number | null>;
  for (const f of [...IO_FIELDS, ...FB_FIELDS]) out[f] = num(v[f]);
  return out;
}

const fmtPct = (r: number | null) => (r === null ? "—" : `${Math.round(r * 100)}%`);

/** Нөөцийн хувийг өнгөөр: хэтэрсэн (улаан), < 10% (улбар), бусад */
function SpareBadge({
  spare,
  ratio,
  over,
}: {
  spare: number | null;
  ratio: number | null;
  over: readonly string[];
}) {
  if (spare === null) return <span className="text-muted-foreground">—</span>;
  const cls =
    spare < 0 || over.length
      ? "bg-destructive/15 text-destructive"
      : (ratio ?? 0) < 0.1
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums ${cls}`}
    >
      {spare} · {fmtPct(ratio)}
      {over.length > 0 && (
        <span className="ml-1">({over.map((k) => k.toUpperCase()).join(", ")} хэтэрсэн)</span>
      )}
    </span>
  );
}

/** Харах горимын хүснэгт: модуль → суваг/модуль → нийт → ашигласан → нөөц → нөөц % */
function IoMatrix({ c }: { c: Partial<Controller> }) {
  const sum = ioSummary(c);
  const totalMods = sum.modules;
  const cell = "px-2 py-1.5 text-right tabular-nums";
  const rows: [string, (k: IoKind) => React.ReactNode, React.ReactNode][] = [
    ["Модулийн тоо", (k) => ioModules(c, k) ?? "—", totalMods ?? "—"],
    ["Модулийн сувгийн тоо", (k) => ioPerModule(c, k) ?? "—", ""],
    ["Нийт суваг", (k) => ioChannels(c, k) ?? "—", sum.channels ?? "—"],
    ["Ашиглаж буй физик сигнал", (k) => ioUsed(c, k) ?? "—", sum.used],
    ["Нөөц суваг", (k) => ioSpare(c, k) ?? "—", sum.spare ?? "—"],
    ["Нөөц %", (k) => fmtPct(pct(ioSpare(c, k), ioChannels(c, k))), fmtPct(sum.sparePct)],
  ];
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-2 py-1.5 text-left font-medium">Оролт / гаралт</th>
            {IO_KINDS.map(({ k, label }) => (
              <th key={k} className="px-2 py-1.5 text-right font-medium">
                {label}
              </th>
            ))}
            <th className="px-2 py-1.5 text-right font-medium">Нийт</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, f, total]) => (
            <tr key={name} className="border-t">
              <td className="px-2 py-1.5">{name}</td>
              {IO_KINDS.map(({ k }) => {
                const over = name === "Нөөц суваг" && (ioSpare(c, k) ?? 0) < 0;
                return (
                  <td key={k} className={`${cell} ${over ? "font-semibold text-destructive" : ""}`}>
                    {f(k)}
                  </td>
                );
              })}
              <td className={`${cell} font-medium`}>{total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FieldbusTable({ c }: { c: Partial<Controller> }) {
  const cell = "px-2 py-1.5 text-right tabular-nums";
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="px-2 py-1.5 text-left font-medium">Протокол</th>
            <th className="px-2 py-1.5 text-right font-medium">Холбох боломж (ТТ)</th>
            <th className="px-2 py-1.5 text-right font-medium">Холбогдсон ТТ</th>
            <th className="px-2 py-1.5 text-right font-medium">Сул</th>
            <th className="px-2 py-1.5 text-right font-medium">Сигналын тоо</th>
          </tr>
        </thead>
        <tbody>
          {FIELDBUS.map(({ k, label, name }) => {
            const cap = fbValue(c, k, "capacity"),
              dev = fbValue(c, k, "devices");
            return (
              <tr key={k} className="border-t">
                <td className="px-2 py-1.5">
                  {label} <span className="text-xs text-muted-foreground">({name})</span>
                </td>
                <td className={cell}>{cap ?? "—"}</td>
                <td className={cell}>{dev ?? "—"}</td>
                <td
                  className={`${cell} ${cap !== null && dev !== null && dev > cap ? "font-semibold text-destructive" : ""}`}
                >
                  {cap === null ? "—" : cap - (dev ?? 0)}
                </td>
                <td className={cell}>{fbValue(c, k, "signals") ?? "—"}</td>
              </tr>
            );
          })}
          <tr className="border-t font-medium">
            <td className="px-2 py-1.5">Нийт</td>
            <td className={cell}>{fbTotal(c, "capacity") || "—"}</td>
            <td className={cell}>{fbTotal(c, "devices") || "—"}</td>
            <td className={cell} />
            <td className={cell}>{fbTotal(c, "signals") || "—"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ControllerView({
  c,
  onClose,
  onEdit,
}: {
  c: Controller;
  onClose: () => void;
  onEdit: (() => void) | null;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono">{c.tag}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            {locationLabel(c)} · {[c.manufacturer, c.model].filter(Boolean).join(" ") || "—"} ·{" "}
            {c.commissioned ?? "он тодорхойгүй"}
          </p>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Модуль, суваг, нөөц</h3>
            <IoMatrix c={c} />
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Fieldbus холболт</h3>
            <FieldbusTable c={c} />
          </section>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <span>
              Нийт сигнал: <b className="tabular-nums">{allSignals(c)}</b>
              <span className="text-muted-foreground">
                {" "}
                (физик {ioTotal(c)} + fieldbus {fbTotal(c, "signals")})
              </span>
            </span>
            {onEdit && (
              <Button size="sm" onClick={onEdit}>
                <Pencil className="size-4" /> Засах
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NumIn({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <Input
      type="number"
      min={0}
      inputMode="numeric"
      aria-label={label}
      className="h-8 px-2 text-right tabular-nums"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** Засах горим: модулийн тоо, суваг/модуль, ашигласан сигналыг оруулж, нийт ба нөөцийг шууд тооцно */
function IoMatrixEditor({
  values,
  onChange,
}: {
  values: IoForm;
  onChange: (k: IoFormKey, v: string) => void;
}) {
  const toNum = (s: string) => (s.trim() === "" ? null : Math.max(0, Math.round(Number(s))));
  const preview: Partial<Controller> = {};
  for (const f of IO_FIELDS) (preview as Record<string, number | null>)[f] = toNum(values[f]);
  const sum = ioSummary(preview);
  const inputs: [string, (k: IoKind) => IoFormKey][] = [
    ["Модулийн тоо", (k) => `mod_${k}`],
    ["Модулийн сувгийн тоо", (k) => `ch_${k}`],
  ];
  const cell = "px-1.5 py-1 text-right tabular-nums";
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Модуль, суваг, нөөц</h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">Оролт / гаралт</th>
              {IO_KINDS.map(({ k, label }) => (
                <th key={k} className="px-1.5 py-1.5 text-right font-medium">
                  {label}
                </th>
              ))}
              <th className="px-2 py-1.5 text-right font-medium">Нийт</th>
            </tr>
          </thead>
          <tbody>
            {inputs.map(([name, key]) => (
              <tr key={name} className="border-t">
                <td className="px-2 py-1">{name}</td>
                {IO_KINDS.map(({ k, label }) => (
                  <td key={k} className="px-1.5 py-1">
                    <NumIn
                      label={`${label} ${name}`}
                      value={values[key(k)]}
                      onChange={(v) => onChange(key(k), v)}
                    />
                  </td>
                ))}
                <td className={`${cell} font-medium`}>
                  {name === "Модулийн тоо" ? (sum.modules ?? "—") : ""}
                </td>
              </tr>
            ))}
            <tr className="border-t bg-muted/30">
              <td className="px-2 py-1">Нийт суваг</td>
              {IO_KINDS.map(({ k }) => (
                <td key={k} className={cell}>
                  {ioChannels(preview, k) ?? "—"}
                </td>
              ))}
              <td className={`${cell} font-medium`}>{sum.channels ?? "—"}</td>
            </tr>
            <tr className="border-t">
              <td className="px-2 py-1">Ашиглаж буй физик сигнал</td>
              {IO_KINDS.map(({ k, label }) => (
                <td key={k} className="px-1.5 py-1">
                  <NumIn
                    label={`${label} ашигласан`}
                    value={values[`io_${k}`]}
                    onChange={(v) => onChange(`io_${k}`, v)}
                  />
                </td>
              ))}
              <td className={`${cell} font-medium`}>{sum.used}</td>
            </tr>
            <tr className="border-t bg-muted/30">
              <td className="px-2 py-1">Нөөц суваг</td>
              {IO_KINDS.map(({ k }) => {
                const sp = ioSpare(preview, k);
                return (
                  <td
                    key={k}
                    className={`${cell} ${sp !== null && sp < 0 ? "font-semibold text-destructive" : ""}`}
                  >
                    {sp ?? "—"}
                  </td>
                );
              })}
              <td className={`${cell} font-medium`}>{sum.spare ?? "—"}</td>
            </tr>
            <tr className="border-t bg-muted/30">
              <td className="px-2 py-1">Нөөц %</td>
              {IO_KINDS.map(({ k }) => (
                <td key={k} className={cell}>
                  {fmtPct(pct(ioSpare(preview, k), ioChannels(preview, k)))}
                </td>
              ))}
              <td className={`${cell} font-medium`}>{fmtPct(sum.sparePct)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {sum.over.length > 0 && (
        <p className="text-xs text-destructive">
          {sum.over.map((k) => k.toUpperCase()).join(", ")}: ашигласан сигнал нийт сувгаас их байна
          — модуль эсвэл сувгийн тоог шалгана уу.
        </p>
      )}
    </section>
  );
}

function FieldbusEditor({
  values,
  onChange,
}: {
  values: IoForm;
  onChange: (k: IoFormKey, v: string) => void;
}) {
  const cols: ["capacity" | "devices" | "signals", string][] = [
    ["capacity", "Холбох боломж (ТТ)"],
    ["devices", "Холбогдсон ТТ"],
    ["signals", "Сигналын тоо"],
  ];
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Fieldbus холболт</h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">Протокол</th>
              {cols.map(([, l]) => (
                <th key={l} className="px-1.5 py-1.5 text-right font-medium">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FIELDBUS.map(
              ({ k, label, name }: { k: FieldbusKind; label: string; name: string }) => (
                <tr key={k} className="border-t">
                  <td className="px-2 py-1">
                    {label} <span className="text-xs text-muted-foreground">({name})</span>
                  </td>
                  {cols.map(([f, l]) => (
                    <td key={f} className="px-1.5 py-1">
                      <NumIn
                        label={`${label} ${l}`}
                        value={values[`${k}_${f}`]}
                        onChange={(v) => onChange(`${k}_${f}`, v)}
                      />
                    </td>
                  ))}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
