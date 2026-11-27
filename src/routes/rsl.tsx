import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Atom,
  Cpu,
  Factory,
  LayoutDashboard,
  List,
  LogIn,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { canonicalVendor } from "@/lib/equipment";
import {
  ANALYZER_KINDS,
  CATEGORY_LABEL,
  CD109_NOMINAL_MBQ,
  CD109_RENEW_MBQ,
  DADAS_ALL,
  DADAS_TYPES,
  LAB_KINDS,
  RSL_SECTIONS,
  RSL_STATUSES,
  buildRslTag,
  cdActivityNow,
  cdRenewDate,
  fmtMbq,
  fmtPct,
  pointRows,
  rslTagPrefix,
  wear,
  type RslCategory,
  type RslItem,
  type RslTrace,
} from "@/lib/rsl";

export const Route = createFileRoute("/rsl")({
  head: () => ({
    meta: [
      { title: "RSEL — Рентген шуурхай шинжилгээний лаборатори | ХХХА" },
      {
        name: "description",
        content:
          "Рентген шуурхай шинжилгээний лаборатори: шингэн дээжний анализатор, Cd-109 үүсгүүр, лаборатори, ДАДАС трасс.",
      },
      { property: "og:title", content: "RSEL — Рентген шуурхай шинжилгээний лаборатори | ХХХА" },
      {
        property: "og:description",
        content: "Рентген шуурхай шинжилгээний лабораторийн тоног төхөөрөмжийн бүртгэл.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RslPage,
});

const statusLabel = (s: string) => RSL_STATUSES.find((x) => x.code === s)?.label ?? s;
const secLabel = (code: string | null) =>
  RSL_SECTIONS.find((s) => s.code === code)?.label ?? code ?? "—";

/** Насжилтын зурвас: ногоон < 80%, улбар < 100%, улаан ≥ 100% */
function WearBar({ value }: { value: number | null }) {
  if (value === null) return <div className="h-1.5 rounded-full bg-muted" aria-hidden />;
  const color = value >= 1 ? "bg-destructive" : value >= 0.8 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="h-1.5 rounded-full bg-muted" aria-hidden>
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.min(100, value * 100)}%` }}
      />
    </div>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "bad" | "muted";
  children: React.ReactNode;
}) {
  const cls = {
    ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    warn: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    bad: "bg-destructive/15 text-destructive",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

function RslPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<RslCategory>("analyzer");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<RslItem> | null>(null);
  const [deleting, setDeleting] = useState<RslItem | null>(null);
  const [assigning, setAssigning] = useState<{ trace: string; type: string } | null>(null);

  const itemsQ = useQuery({
    queryKey: ["rsl-items"],
    enabled: !!auth.user,
    queryFn: async () => {
      const { data, error } = await supabase.from("rsl_equipment").select("*").order("tag");
      if (error) throw error;
      return (data ?? []) as RslItem[];
    },
  });
  const tracesQ = useQuery({
    queryKey: ["rsl-traces"],
    enabled: !!auth.user,
    queryFn: async () => {
      const { data, error } = await supabase.from("rsl_traces").select("*").order("code");
      if (error) throw error;
      return (data ?? []) as RslTrace[];
    },
  });
  const items = useMemo(() => itemsQ.data ?? [], [itemsQ.data]);
  const traces = useMemo(() => tracesQ.data ?? [], [tracesQ.data]);
  const refresh = () => void qc.invalidateQueries({ queryKey: ["rsl-items"] });

  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  const match = (i: RslItem) =>
    !terms.length ||
    terms.every((t) =>
      [
        i.tag,
        i.code,
        i.kind,
        i.model,
        i.serial,
        i.sample_name,
        i.points,
        i.trace,
        i.analyzer_code,
        i.permit_no,
      ]
        .join(" ")
        .toLowerCase()
        .includes(t),
    );
  const shown = items.filter(match);
  const sourceOf = useMemo(() => {
    const m = new Map<string, RslItem>();
    items
      .filter((i) => i.category === "source" && i.analyzer_code)
      .forEach((i) => m.set(i.analyzer_code!, i));
    return m;
  }, [items]);

  const analyzers = items.filter((i) => i.category === "analyzer");
  const expired = items.filter(
    (i) => (i.category === "analyzer" || i.category === "lab") && (wear(i) ?? 0) >= 1,
  );
  const renew = items.filter(
    (i) => i.category === "source" && (cdActivityNow(i) ?? Infinity) < CD109_RENEW_MBQ,
  );

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rsl_equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Бүртгэл устгагдлаа.");
      setDeleting(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const open = (i: RslItem) => setEditing(i);

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
            className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-1"
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
            <Button size="sm" variant="ghost" asChild>
              <Link to="/controllers">
                <Cpu className="size-4" /> DCS/PLC
              </Link>
            </Button>
            <span className={buttonVariants({ size: "sm" })} aria-current="page">
              <Atom className="size-4" /> RSEL
            </span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        {auth.loading ? null : !auth.user ? (
          <div className="mx-auto max-w-md rounded-xl border bg-card p-8 text-center">
            <Atom className="mx-auto size-8 text-primary" aria-hidden />
            <h2 className="mt-3 text-lg font-semibold">Рентген шуурхай шинжилгээний лаборатори</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Цацрагийн үүсгүүр, зөвшөөрлийн мэдээлэл агуулдаг тул зөвхөн нэвтэрсэн хэрэглэгчид
              харагдана.
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
                <h2 className="text-xl font-semibold tracking-tight">
                  Рентген шуурхай шинжилгээний лаборатори
                </h2>
                <p className="text-sm text-muted-foreground">
                  Шингэн дээжний анализатор, Cd-109 үүсгүүр, лаборатори, дээж авах трасс (ДАДАС).
                </p>
              </div>
              {auth.canEditRsl && (
                <Button onClick={() => setEditing({ category: tab, status: "active" })}>
                  <Plus className="size-4" /> Шинэ бүртгэл
                </Button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Шингэн дээжний анализатор"
                value={analyzers.length}
                note={`${items.filter((i) => i.category === "lab").length} лабораторийн, ${items.filter((i) => i.category === "dadas").length} ДАДАС`}
              />
              <Metric
                label="Ашиглалтын хугацаа хэтэрсэн"
                value={expired.length}
                tone="bad"
                note="анализатор ба лаборатори"
              />
              <Metric
                label="Cd-109 шинэчлэх"
                value={renew.length}
                tone="warn"
                note={`идэвх ${CD109_RENEW_MBQ} MBq-ээс бага`}
              />
              <Metric
                label="Сериал бөглөөгүй"
                value={items.filter((i) => !i.serial).length}
                tone="warn"
                note={`нийт ${items.length} бүртгэлээс`}
              />
            </div>

            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="A571, Cd-109, Q-7, Т-85, сериал…"
                className="pl-9"
              />
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as RslCategory)}>
              <TabsList className="flex-wrap">
                <TabsTrigger value="analyzer">Шингэн анализатор</TabsTrigger>
                <TabsTrigger value="source">Cd-109 үүсгүүр</TabsTrigger>
                <TabsTrigger value="lab">Лаборатори</TabsTrigger>
                <TabsTrigger value="dadas">ДАДАС трасс</TabsTrigger>
              </TabsList>

              <TabsContent value="analyzer" className="mt-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {RSL_SECTIONS.map((sec) => {
                    const list = shown.filter(
                      (i) => i.category === "analyzer" && i.sub_section === sec.code,
                    );
                    return (
                      <section key={sec.code} className="rounded-xl border bg-card p-3">
                        <h3 className="mb-2 flex items-baseline justify-between text-sm font-semibold">
                          {sec.label}
                          <span className="text-xs font-normal text-muted-foreground">
                            {list.length} анализатор
                          </span>
                        </h3>
                        <div className="space-y-2">
                          {list.map((i) => (
                            <AnalyzerCard
                              key={i.id}
                              i={i}
                              src={sourceOf.get(i.code ?? "")}
                              onOpen={() => open(i)}
                            />
                          ))}
                          {!list.length && (
                            <p className="text-xs text-muted-foreground">Бүртгэл алга.</p>
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="source" className="mt-4">
                <SourcesTable items={shown.filter((i) => i.category === "source")} onOpen={open} />
              </TabsContent>

              <TabsContent value="lab" className="mt-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {shown
                    .filter((i) => i.category === "lab")
                    .map((i) => (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => open(i)}
                        className="rounded-xl border bg-card p-3 text-left hover:bg-muted/40"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{i.code}</p>
                            <p className="text-xs text-muted-foreground">{i.model ?? i.kind}</p>
                          </div>
                          <ItemStatus i={i} />
                        </div>
                        <OverrunTag i={i} />
                        <div className="mt-3 flex items-baseline justify-between text-xs">
                          <span>{i.year ?? "он —"}</span>
                          <span className="text-muted-foreground">насжилт {fmtPct(wear(i))}</span>
                        </div>
                        <div className="mt-1">
                          <WearBar value={wear(i)} />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {i.permit_no
                            ? `Зөвшөөрөл ${i.permit_no}`
                            : i.kind === "Quant'X" || i.kind === "AP-31-M"
                              ? "Рентген зөвшөөрөл: —"
                              : "\u00a0"}
                        </p>
                      </button>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="dadas" className="mt-4">
                <DadasBoard
                  items={items}
                  traces={traces}
                  canEdit={auth.canEditRsl}
                  onOpen={open}
                  onAssign={(trace, type) => setAssigning({ trace, type })}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      {editing && (
        <ItemDialog
          row={editing}
          all={items}
          traces={traces}
          canEdit={auth.canEditRsl}
          canDelete={auth.isAdmin}
          onDelete={(i) => {
            setEditing(null);
            setDeleting(i);
          }}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      {assigning && (
        <AssignDialog
          trace={assigning.trace}
          type={assigning.type}
          items={items}
          onClose={() => setAssigning(null)}
          onSaved={() => {
            setAssigning(null);
            refresh();
          }}
        />
      )}

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && !remove.isPending && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Бүртгэлийг устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono font-medium text-foreground">{deleting?.tag}</span> устана.
              Энэ үйлдлийг буцаах боломжгүй.
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

function Metric({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: number;
  note: string;
  tone?: "bad" | "warn";
}) {
  const color =
    tone === "bad" && value
      ? "text-destructive"
      : tone === "warn" && value
        ? "text-amber-600 dark:text-amber-400"
        : "";
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function ItemStatus({ i }: { i: RslItem }) {
  return i.status === "active" ? (
    <Pill tone="ok">ажиллаж байна</Pill>
  ) : (
    <Pill tone="muted">{statusLabel(i.status)}</Pill>
  );
}

/** Ажлын төлөвийн дор: ашиглалтын хугацаа (норм) хэтэрсэн бол */
function OverrunTag({ i }: { i: RslItem }) {
  if ((wear(i) ?? 0) < 1) return null;
  return (
    <div className="mt-0.5 flex justify-end">
      <Pill tone="bad">ашиглалтын хугацаа хэтэрсэн</Pill>
    </div>
  );
}

/** Цэг ба дээжний нэр: олон цэгтэй (MSA) бол мөр мөрөөр доош цувуулна */
function PointList({ i }: { i: RslItem }) {
  const rows = pointRows(i);
  if (rows.length > 1)
    return (
      <ul className="mt-0.5 space-y-0.5 text-muted-foreground">
        {rows.map(([p, name]) => (
          <li key={p} className="truncate" title={name ?? ""}>
            <span className="tabular-nums text-foreground/80">{p}</span>
            {name ? ` · ${name}` : ""}
          </li>
        ))}
        {rows.every(([, n]) => n === null) && i.sample_name && (
          <li className="truncate" title={i.sample_name}>
            {i.sample_name}
          </li>
        )}
      </ul>
    );
  return (
    <p className="mt-0.5 truncate text-muted-foreground" title={i.sample_name ?? ""}>
      {[i.points, i.sample_name].filter(Boolean).join(" · ") || "—"}
    </p>
  );
}

function AnalyzerCard({
  i,
  src,
  onOpen,
}: {
  i: RslItem;
  src: RslItem | undefined;
  onOpen: () => void;
}) {
  const act = src ? cdActivityNow(src) : null;
  const w = wear(i);
  const border = (w ?? 0) >= 1 ? "border-destructive/40" : "";
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full rounded-lg border p-2 text-left text-xs hover:bg-muted/40 ${border}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium">
          {i.code} <span className="font-normal text-muted-foreground">· {i.kind}</span>
        </span>
        <ItemStatus i={i} />
      </div>
      <OverrunTag i={i} />
      <PointList i={i} />
      <div className="mt-1.5 flex items-baseline justify-between">
        <span>{i.year ?? "он —"}</span>
        <span className="text-muted-foreground">{fmtPct(w)}</span>
      </div>
      <div className="mt-1">
        <WearBar value={w} />
      </div>
      {src && (
        <p
          className={`mt-1.5 ${
            act === null
              ? "text-muted-foreground"
              : act < CD109_RENEW_MBQ
                ? "font-medium text-destructive"
                : "text-emerald-700 dark:text-emerald-400"
          }`}
        >
          Cd-109: {fmtMbq(act)} ({fmtPct(act === null ? null : act / CD109_NOMINAL_MBQ)})
          {act !== null && act < CD109_RENEW_MBQ ? " — шинэчлэх" : ""}
        </p>
      )}
    </button>
  );
}

function SourcesTable({ items, onOpen }: { items: RslItem[]; onOpen: (i: RslItem) => void }) {
  const rows = [...items].sort((a, b) => (cdActivityNow(a) ?? 1e9) - (cdActivityNow(b) ?? 1e9));
  const th = "px-3 py-2 text-left font-medium";
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className={th}>Анализатор</th>
            <th className={th}>Секц</th>
            <th className={th}>Үүсгүүр (код / сериал)</th>
            <th className={th}>Үйлдвэрлэсэн</th>
            <th className={`${th} text-right`}>Одоогийн идэвх</th>
            <th className={`${th} text-right`}>740 MBq-ийн</th>
            <th className={th}>Шинэчлэх хугацаа</th>
            <th className={th}>Зөвшөөрөл</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => {
            const act = cdActivityNow(i);
            const renewAt = cdRenewDate(i);
            const due = act !== null && act < CD109_RENEW_MBQ;
            return (
              <tr
                key={i.id}
                className="cursor-pointer border-t hover:bg-muted/40"
                onClick={() => onOpen(i)}
              >
                <td className="px-3 py-2 font-medium">{i.analyzer_code}</td>
                <td className="px-3 py-2">{secLabel(i.sub_section)}</td>
                <td className="px-3 py-2 text-xs">
                  {[i.source_code, i.serial].filter(Boolean).join(" · ") || (
                    <span className="text-muted-foreground">бөглөөгүй</span>
                  )}
                </td>
                <td className="px-3 py-2">{i.year ?? "—"}</td>
                <td
                  className={`px-3 py-2 text-right tabular-nums ${due ? "font-semibold text-destructive" : ""}`}
                >
                  {fmtMbq(act)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtPct(act === null ? null : act / CD109_NOMINAL_MBQ)}
                </td>
                <td className="px-3 py-2">
                  {due ? (
                    <Pill tone="bad">шинэчлэх</Pill>
                  ) : renewAt ? (
                    renewAt.toISOString().slice(0, 7)
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  {i.permit_no ?? <span className="text-muted-foreground">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
        Идэвхийг лавлах утга, огнооноос Cd-109-ийн хагас задралын хугацаагаар (461 хоног) өнөөдрийн
        байдлаар тооцов.
      </p>
    </div>
  );
}

function DadasBoard({
  items,
  traces,
  canEdit,
  onOpen,
  onAssign,
}: {
  items: RslItem[];
  traces: RslTrace[];
  canEdit: boolean;
  onOpen: (i: RslItem) => void;
  onAssign: (trace: string, type: string) => void;
}) {
  const dadas = items.filter((i) => i.category === "dadas");
  const byTrace = new Map<string, RslItem[]>();
  dadas
    .filter((i) => i.trace)
    .forEach((i) => byTrace.set(i.trace!, [...(byTrace.get(i.trace!) ?? []), i]));
  const typeOf = (i: RslItem) =>
    DADAS_ALL.find(
      (t) => t.label === (i.kind ?? "").split(/[-\s]/)[0] || (i.kind ?? "").startsWith(t.label),
    )?.k;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {DADAS_ALL.map((t) => {
          const list = dadas.filter((i) => typeOf(i) === t.k);
          const assigned = list.filter((i) => i.trace).length;
          const exp = list.filter((i) => (wear(i) ?? 0) >= 1).length;
          return (
            <div key={t.k} className="rounded-xl border bg-card p-3">
              <p className="text-xs font-semibold text-muted-foreground">
                {t.label} <span className="font-normal">· {t.name}</span>
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{list.length}</p>
              <p className="text-xs text-muted-foreground">
                трасст {assigned} ·{" "}
                <span className={exp ? "text-destructive" : ""}>хугацаа хэтэрсэн {exp}</span>
              </p>
            </div>
          );
        })}
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Трасс</th>
              <th className="px-3 py-2 text-left font-medium">Секц</th>
              <th className="px-3 py-2 text-left font-medium">Дээж</th>
              <th className="px-3 py-2 text-right font-medium">Урт, м</th>
              {DADAS_TYPES.map((t) => (
                <th key={t.k} className="px-2 py-2 text-left font-medium">
                  {t.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RSL_SECTIONS.flatMap((sec) =>
              traces
                .filter((tr) => tr.sub_section === sec.code)
                .map((tr) => {
                  const here = byTrace.get(tr.code) ?? [];
                  return (
                    <tr key={tr.code} className="border-t align-top">
                      <td className="px-3 py-2 font-medium">{tr.code}</td>
                      <td className="px-3 py-2 text-xs">{sec.label}</td>
                      <td className="px-3 py-2 text-xs">
                        {tr.sample_name ?? "—"}
                        {tr.analyzer_code && (
                          <span className="text-muted-foreground"> · {tr.analyzer_code}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs">
                        {tr.length_m ?? "—"}
                      </td>
                      {DADAS_TYPES.map((t) => {
                        const slot = here.filter((i) => typeOf(i) === t.k);
                        return (
                          <td key={t.k} className="px-2 py-1.5">
                            {slot.map((i) => (
                              <button
                                key={i.id}
                                type="button"
                                onClick={() => onOpen(i)}
                                className="block rounded border px-1.5 py-0.5 text-left text-[11px] hover:bg-muted/40"
                              >
                                {i.kind} · {i.year ?? "—"}
                              </button>
                            ))}
                            {!slot.length &&
                              (canEdit ? (
                                <button
                                  type="button"
                                  onClick={() => onAssign(tr.code, t.k)}
                                  className="rounded border border-dashed px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted/40"
                                >
                                  + оноох
                                </button>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">—</span>
                              ))}
                          </td>
                        );
                      })}
                    </tr>
                  );
                }),
            )}
          </tbody>
        </table>
      </div>
      <UnassignedList items={dadas.filter((i) => !i.trace)} onOpen={onOpen} />
    </div>
  );
}

function UnassignedList({ items, onOpen }: { items: RslItem[]; onOpen: (i: RslItem) => void }) {
  const groups = new Map<string, RslItem[]>();
  items.forEach((i) => {
    const k = `${i.kind ?? "—"} · ${i.year ?? "—"}`;
    groups.set(k, [...(groups.get(k) ?? []), i]);
  });
  if (!items.length) return null;
  return (
    <section className="rounded-xl border bg-card p-3">
      <h3 className="text-sm font-semibold">Трасс оноогоогүй ({items.length})</h3>
      <p className="mb-2 text-xs text-muted-foreground">
        Дээрх хүснэгтийн “+ оноох”-оор эсвэл төхөөрөмж дээр дарж трасс оноона.
      </p>
      <div className="flex flex-wrap gap-2">
        {[...groups.entries()].map(([k, list]) => (
          <button
            key={k}
            type="button"
            onClick={() => onOpen(list[0]!)}
            className="rounded-md border px-2 py-1 text-xs hover:bg-muted/40"
          >
            {k} <span className="text-muted-foreground">× {list.length}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function AssignDialog({
  trace,
  type,
  items,
  onClose,
  onSaved,
}: {
  trace: string;
  type: string;
  items: RslItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = DADAS_ALL.find((x) => x.k === type)!;
  const free = items.filter(
    (i) => i.category === "dadas" && !i.trace && (i.kind ?? "").startsWith(t.label),
  );
  const groups = new Map<string, RslItem[]>();
  free.forEach((i) =>
    groups.set(`${i.kind} · ${i.year ?? "—"}`, [
      ...(groups.get(`${i.kind} · ${i.year ?? "—"}`) ?? []),
      i,
    ]),
  );
  const [saving, setSaving] = useState(false);
  const pick = async (i: RslItem) => {
    setSaving(true);
    const { error } = await supabase.from("rsl_equipment").update({ trace }).eq("id", i.id);
    setSaving(false);
    if (error) {
      toast.error("Хадгалахад алдаа гарлаа: " + error.message);
      return;
    }
    toast.success(`${i.tag} → ${trace}`);
    onSaved();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {trace}: {t.label} ({t.name}) оноох
          </DialogTitle>
        </DialogHeader>
        {free.length ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Трасс оноогоогүй төхөөрөмжөөс сонгоно (загвар · он):
            </p>
            {[...groups.entries()].map(([k, list]) => (
              <Button
                key={k}
                variant="outline"
                className="w-full justify-between"
                disabled={saving}
                onClick={() => pick(list[0]!)}
              >
                <span>{k}</span>
                <span className="text-xs text-muted-foreground">{list.length} сул</span>
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Энэ төрлийн трасс оноогоогүй төхөөрөмж алга. Шинэ бүртгэл нэмнэ үү.
          </p>
        )}
      </DialogContent>
    </Dialog>
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
  // <label> нь талбарыг ороож холбоно — дэлгэц уншигч, товшилтод зөв ажиллана
  return (
    <Label className={`grid gap-1.5 font-normal ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </Label>
  );
}

function Pick({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
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
        <SelectValue placeholder="Сонгох…" />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const NONE = "__none__";
const STR_FIELDS = [
  "kind",
  "code",
  "sub_section",
  "points",
  "sample_name",
  "line",
  "manufacturer",
  "model",
  "serial",
  "commissioned",
  "analyzer_code",
  "isotope",
  "source_code",
  "activity_date",
  "permit_no",
  "trace",
  "notes",
  "maintenance_history",
] as const;
type StrField = (typeof STR_FIELDS)[number];

function ItemDialog({
  row,
  all,
  traces,
  canEdit,
  canDelete,
  onDelete,
  onClose,
  onSaved,
}: {
  row: Partial<RslItem>;
  all: RslItem[];
  traces: RslTrace[];
  canEdit: boolean;
  canDelete: boolean;
  onDelete: (i: RslItem) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !row.id;
  const [cat, setCat] = useState<RslCategory>(row.category ?? "analyzer");
  const [v, setV] = useState<Record<StrField, string>>(() => {
    const o = {} as Record<StrField, string>;
    for (const f of STR_FIELDS) o[f] = (row[f] as string | null | undefined) ?? "";
    return o;
  });
  const [year, setYear] = useState(row.year ? String(row.year) : "");
  const [util, setUtil] = useState(
    row.utilization !== null && row.utilization !== undefined
      ? String(Math.round(row.utilization * 10000) / 100)
      : "",
  );
  const [mbq, setMbq] = useState(
    row.activity_mbq !== null && row.activity_mbq !== undefined ? String(row.activity_mbq) : "",
  );
  const [status, setStatus] = useState(row.status ?? "active");
  const [saving, setSaving] = useState(false);
  const set = (k: StrField, val: string) => setV((p) => ({ ...p, [k]: val }));
  const ro = !canEdit;

  const analyzers = all.filter((i) => i.category === "analyzer");
  const srcAnalyzer = analyzers.find((a) => a.code === v.analyzer_code);
  const sub =
    cat === "source"
      ? (srcAnalyzer?.sub_section ?? (v.sub_section || null))
      : v.sub_section || null;
  const yr = /^\d{4}$/.test(year) ? Number(year) : null;
  const draft: Partial<RslItem> = {
    category: cat,
    code: v.code || null,
    kind: v.kind || null,
    analyzer_code: v.analyzer_code || null,
    sub_section: sub,
    year: yr,
  };
  const keepTag = !isNew && row.tag && row.tag.startsWith(rslTagPrefix(draft)) && row.year === yr;
  const tag = keepTag
    ? row.tag!
    : buildRslTag(
        draft,
        all.filter((i) => i.id !== row.id).map((i) => i.tag),
      );
  const ready =
    (cat === "analyzer" && !!v.code && !!v.sub_section && !!v.kind) ||
    (cat === "source" && !!v.analyzer_code) ||
    (cat === "lab" && !!v.code && !!v.kind) ||
    (cat === "dadas" && !!v.kind);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || ro) return;
    setSaving(true);
    const s = (f: StrField) => v[f].trim() || null;
    const payload = {
      tag,
      category: cat,
      kind: s("kind"),
      code: cat === "source" ? null : s("code"),
      section:
        cat === "lab" ||
        (cat === "dadas" && (v.kind.startsWith("ШСП") || v.kind.startsWith("XTDQ")))
          ? "LAB"
          : "IFO",
      sub_section: cat === "lab" ? null : sub,
      points: cat === "analyzer" ? s("points") : null,
      sample_name: cat === "analyzer" ? s("sample_name") : null,
      line: cat === "analyzer" ? s("line") : null,
      manufacturer: canonicalVendor(v.manufacturer),
      model: s("model"),
      serial: s("serial"),
      commissioned: s("commissioned"),
      year: yr,
      status,
      utilization: cat === "analyzer" && util.trim() !== "" ? Number(util) / 100 : null,
      analyzer_code: cat === "source" ? s("analyzer_code") : null,
      isotope: cat === "source" ? s("isotope") || "Cd-109" : null,
      source_code: cat === "source" ? s("source_code") : null,
      activity_mbq: cat === "source" && mbq.trim() !== "" ? Number(mbq) : null,
      activity_date: cat === "source" ? s("activity_date") : null,
      permit_no: cat === "source" || cat === "lab" ? s("permit_no") : null,
      trace: cat === "dadas" ? s("trace") : null,
      notes: s("notes"),
      maintenance_history: s("maintenance_history"),
    };
    const { error } = isNew
      ? await supabase.from("rsl_equipment").insert(payload)
      : await supabase.from("rsl_equipment").update(payload).eq("id", row.id!);
    setSaving(false);
    if (error) {
      toast.error(
        error.code === "23505"
          ? "Ийм Tag аль хэдийн бүртгэгдсэн байна."
          : error.code === "42501" || /row-level security/i.test(error.message)
            ? "RSL бүртгэл засах эрх танд байхгүй байна."
            : "Хадгалахад алдаа гарлаа: " + error.message,
      );
      return;
    }
    toast.success(isNew ? "Бүртгэл нэмэгдлээ." : "Хадгалагдлаа.");
    onSaved();
  };

  const In = (f: StrField, ph = "", type = "text") => (
    <Input
      value={v[f]}
      disabled={ro}
      type={type}
      placeholder={ph}
      onChange={(e) => set(f, e.target.value)}
    />
  );
  const act =
    cat === "source"
      ? cdActivityNow({
          activity_mbq: mbq.trim() === "" ? null : Number(mbq),
          activity_date: v.activity_date || null,
        })
      : null;

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Шинэ бүртгэл" : row.tag}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Ангилал">
              <Pick
                value={cat}
                onChange={(x) => setCat(x as RslCategory)}
                disabled={!isNew || ro}
                options={(Object.keys(CATEGORY_LABEL) as RslCategory[]).map((k) => [
                  k,
                  CATEGORY_LABEL[k],
                ])}
              />
            </F>
            <F label="Tag">
              <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 font-mono text-sm">
                {ready ? tag : "…"}
              </div>
            </F>

            {cat === "analyzer" && (
              <>
                <F label="Анализаторын ID">{In("code", "A571")}</F>
                <F label="Загвар">
                  <Pick
                    value={v.kind}
                    onChange={(x) => set("kind", x)}
                    disabled={ro}
                    options={ANALYZER_KINDS.map((k) => [k, k])}
                  />
                </F>
                <F label="Секц">
                  <Pick
                    value={v.sub_section}
                    onChange={(x) =>
                      setV((p) => ({
                        ...p,
                        sub_section: x,
                        line: p.line || (RSL_SECTIONS.find((s) => s.code === x)?.line ?? ""),
                      }))
                    }
                    disabled={ro}
                    options={RSL_SECTIONS.map((s) => [s.code, s.label])}
                  />
                </F>
                <F label="Шугам">{In("line", "V шугам")}</F>
                <F label="Цэг (Amdel код)">{In("points", "571 эсвэл 574, 575, 577")}</F>
                <F label="Дээжний нэр">{In("sample_name", "Руда5Сек")}</F>
                <F label="Ашиглалтын коэффициент, %">
                  <Input
                    value={util}
                    disabled={ro}
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    onChange={(e) => setUtil(e.target.value)}
                  />
                </F>
              </>
            )}

            {cat === "source" && (
              <>
                <F label="Анализатор">
                  <Pick
                    value={v.analyzer_code}
                    onChange={(x) => set("analyzer_code", x)}
                    disabled={ro}
                    options={analyzers.map((a) => [
                      a.code ?? "",
                      `${a.code} · ${secLabel(a.sub_section)}`,
                    ])}
                  />
                </F>
                <F label="Изотоп">{In("isotope", "Cd-109")}</F>
                <F label="Үүсгүүрийн код / төрөл">{In("source_code")}</F>
                <F label="Лавлах идэвх, MBq">
                  <Input
                    value={mbq}
                    disabled={ro}
                    type="number"
                    step="0.1"
                    min={0}
                    onChange={(e) => setMbq(e.target.value)}
                  />
                </F>
                <F label="Лавлах идэвхийн огноо">{In("activity_date", "", "date")}</F>
                <F label="Одоогийн идэвх (тооцоолсон)">
                  <div
                    className={`flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm ${act !== null && act < CD109_RENEW_MBQ ? "text-destructive" : ""}`}
                  >
                    {fmtMbq(act)} · {fmtPct(act === null ? null : act / CD109_NOMINAL_MBQ)}
                  </div>
                </F>
                <F label="Зөвшөөрлийн дугаар">{In("permit_no", "2023/02-13")}</F>
              </>
            )}

            {cat === "lab" && (
              <>
                <F label="ID">{In("code", "Q-7")}</F>
                <F label="Төрөл">
                  <Pick
                    value={v.kind}
                    onChange={(x) => set("kind", x)}
                    disabled={ro}
                    options={LAB_KINDS.map((k) => [k, k])}
                  />
                </F>
                <F label="Рентген / ашиглалтын зөвшөөрөл">{In("permit_no", "2023/01-66")}</F>
              </>
            )}

            {cat === "dadas" && (
              <>
                <F label="Төрөл, загвар">{In("kind", "ПРО-С1")}</F>
                <F label="Трасс">
                  <Pick
                    value={v.trace || NONE}
                    onChange={(x) => set("trace", x === NONE ? "" : x)}
                    disabled={ro}
                    options={[
                      [NONE, "— оноогоогүй"],
                      ...traces.map(
                        (t) =>
                          [t.code, `${t.code} · ${secLabel(t.sub_section)}`] as [string, string],
                      ),
                    ]}
                  />
                </F>
              </>
            )}

            <F label="Үйлдвэрлэгч">{In("manufacturer")}</F>
            <F label="Загварын нэр">{In("model")}</F>
            <F label="Сериал №">{In("serial")}</F>
            <F label="Үйлдвэрлэсэн он">
              <Input
                value={year}
                disabled={ro}
                inputMode="numeric"
                placeholder="2022"
                className={year && !yr ? "border-destructive" : ""}
                onChange={(e) => setYear(e.target.value)}
              />
            </F>
            <F label="Ашиглалтад орсон огноо">{In("commissioned", "2024-08-31")}</F>
            <F label="Төлөв">
              <Pick
                value={status}
                onChange={setStatus}
                disabled={ro}
                options={RSL_STATUSES.map((s) => [s.code, s.label])}
              />
            </F>
            <F label="Тэмдэглэл" wide>
              <Textarea
                value={v.notes}
                disabled={ro}
                rows={2}
                onChange={(e) => set("notes", e.target.value)}
              />
            </F>
            <F label="Засвар үйлчилгээний түүх" wide>
              <Textarea
                value={v.maintenance_history}
                disabled={ro}
                rows={2}
                placeholder="YYYY-MM-DD — хийсэн ажил"
                onChange={(e) => set("maintenance_history", e.target.value)}
              />
            </F>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              {!isNew && canDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => onDelete(row as RslItem)}
                >
                  <Trash2 className="size-4" /> Устгах
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                {ro ? "Хаах" : "Болих"}
              </Button>
              {!ro && (
                <Button type="submit" disabled={!ready || saving || (!!year && !yr)}>
                  {saving ? "Хадгалж байна…" : "Хадгалах"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
