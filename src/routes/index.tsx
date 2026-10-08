import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

const PAGE_SIZE = 50;
const LIST_STATE_KEY = "equipment-list-state";
import {
  CircleHelp,
  ClipboardPlus,
  Download,
  Factory,
  LayoutDashboard,
  List,
  Loader2,
  LogIn,
  LogOut,
  MonitorSmartphone,
  Search,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEquipment } from "@/hooks/useEquipment";
import { useInstallPrompt, useOnlineStatus } from "@/lib/pwa";
import { OfflineBanner } from "@/components/OfflineBanner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import { EquipmentDetail } from "@/components/EquipmentDetail";
import { EquipmentForm } from "@/components/EquipmentForm";
import { StatsCards } from "@/components/StatsCards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORIES,
  Equipment,
  PARAMETERS,
  isaCode,
  parameterLabel,
  MNU_DEVICES,
  SECTIONS,
  UNITS,
  appendMaintenance,
  lastMaintenance,
  parseMaintenance,
  sectionLabel,
  statusLabel,
  subSectionLabel,
  toCsv,
} from "@/lib/equipment";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ХХХА Тоног төхөөрөмж бүртгэл | Tag генератор ба нэгдсэн сан" },
      {
        name: "description",
        content:
          "Тоног төхөөрөмжийн Tag name автоматаар үүсгэж бүртгэх, хайх, шүүх, QR код болон CSV экспорттой нэгдсэн бүртгэлийн систем.",
      },
      { property: "og:title", content: "ХХХА Тоног төхөөрөмж бүртгэл" },
      {
        property: "og:description",
        content:
          "Tag name генератор, тоног төхөөрөмжийн нэгдсэн сан, хайлт, шүүлтүүр, QR код, CSV экспорт.",
      },
    ],
  }),
  component: Index,
});

const ALL = "__all__";

/**
 * Хайлтын мөрийг задлана: зай = бүгд таарах (БА), таслал = аль нэг бүлэг (ЭСВЭЛ),
 * хашилт доторх үгс нэг нэр томьёо. Жишээ: `KSI PIT 2015, IFO "ball mill"`
 * → [["ksi","pit","2015"], ["ifo","ball mill"]]
 */
function parseSearch(q: string): string[][] {
  return q
    .toLowerCase()
    .split(",")
    .map((group) => [...group.matchAll(/"([^"]+)"|(\S+)/g)].map((m) => (m[1] ?? m[2] ?? "").trim()).filter(Boolean))
    .filter((group) => group.length > 0);
}

const SECTION_BY_CODE = new Map(SECTIONS.map((s) => [s.code.toLowerCase(), s.code as string]));
type ViewMode = "register" | "inventory";

function Index() {
  const queryClient = useQueryClient();
  const [view, setViewRaw] = useState<ViewMode>("inventory");
  const [search, setSearchRaw] = useState("");
  const [unit, setUnitRaw] = useState(ALL);
  const [section, setSectionRaw] = useState(ALL);
  const [category, setCategoryRaw] = useState(ALL);
  const [parameter, setParameterRaw] = useState(ALL);
  const [page, setPage] = useState(1);
  const [restored, setRestored] = useState(false);
  const scrollRef = useRef(0);

  const setSearch = (v: string) => { setSearchRaw(v); setPage(1); };
  const setUnit = (v: string) => { setUnitRaw(v); setPage(1); };
  const setSection = (v: string) => { setSectionRaw(v); setPage(1); };
  const setCategory = (v: string) => { setCategoryRaw(v); setPage(1); };
  const setParameter = (v: string) => { setParameterRaw(v); setPage(1); };

  function setView(next: ViewMode) {
    if (next === "register" && view === "inventory") scrollRef.current = window.scrollY;
    setViewRaw(next);
    if (next === "inventory") {
      requestAnimationFrame(() => window.scrollTo({ top: scrollRef.current }));
    }
  }

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LIST_STATE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.search === "string") setSearchRaw(s.search);
        if (typeof s.unit === "string") setUnitRaw(s.unit);
        if (typeof s.section === "string") setSectionRaw(s.section);
        if (typeof s.category === "string") setCategoryRaw(s.category);
        if (typeof s.parameter === "string") setParameterRaw(s.parameter);
        if (typeof s.page === "number") setPage(s.page);
      }
    } catch {
      /* ignore */
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    sessionStorage.setItem(
      LIST_STATE_KEY,
      JSON.stringify({ search, unit, section, category, parameter, page }),
    );
  }, [restored, search, unit, section, category, parameter, page]);
  const [selected, setSelected] = useState<Equipment | null>(null);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [deleting, setDeleting] = useState<Equipment | null>(null);
  const [deletePw, setDeletePw] = useState("");
  const auth = useAuth();
  const online = useOnlineStatus();
  const { canInstall, install } = useInstallPrompt();
  useEffect(() => {
    if (!auth.loading && !auth.isAdmin && !auth.section && view === "register") setViewRaw("inventory");
  }, [auth.loading, auth.isAdmin, auth.section, view]);

  const {
    data: items = [],
    isLoading,
    isError,
    failureCount,
    dataUpdatedAt,
  } = useEquipment();

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Бүртгэл устгагдлаа.");
      setSelected(null);
      void queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: () => toast.error("Устгахад алдаа гарлаа."),
  });

  const addMaintenance = useMutation({
    mutationFn: async ({ item, date, note }: { item: Equipment; date: string; note: string }) => {
      const { error } = await supabase
        .from("equipment")
        .update({ maintenance_history: appendMaintenance(item.maintenance_history, date, note) })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Засвар үйлчилгээ нэмэгдлээ.");
      await queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: () => toast.error("Засвар нэмэхэд алдаа гарлаа."),
  });


  // Мөр бүрийн хайх текстийг нэг удаа бэлдэнэ (товчлуур дарах бүрт дахин бүтээхгүй)
  const haystacks = useMemo(
    () =>
      new Map(
        items.map((item) => [
          item.id,
          [
            item.tag_name,
            item.asset_serial,
            item.factory_serial,
            item.model,
            item.manufacturer,
            item.main_equipment,
            item.main_equipment_name,
            isaCode(item),
            parameterLabel(item.parameter, item.unit),
            sectionLabel(item.section),
            item.notes,
          ]
            .filter(Boolean)
            .join(" \u0001 ")
            .toLowerCase(),
        ]),
      ),
    [items],
  );

  const filtered = useMemo(() => {
    const groups = parseSearch(search);
    // Хэсгийн код (KSI, RO…) яг таарахаар шүүнэ — "ro" нь Rosemount, Krohne-д таарахгүйн тулд
    const termHits = (item: Equipment, term: string) => {
      const sectionCode = SECTION_BY_CODE.get(term);
      if (sectionCode) return item.section === sectionCode;
      return (haystacks.get(item.id) ?? "").includes(term);
    };
    return items.filter((item) => {
      if (unit !== ALL && item.unit !== unit) return false;
      if (section !== ALL && item.section !== section) return false;
      if (category !== ALL && item.category !== category) return false;
      if (parameter !== ALL && item.parameter !== parameter) return false;
      if (!groups.length) return true;
      return groups.some((terms) => terms.every((term) => termHits(item, term)));
    });
  }, [items, haystacks, search, unit, section, category, parameter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Офлайн/сервер холбогдохгүй үед IndexedDB-ээс сэргээсэн хуулбарыг харуулна (src/lib/offline-cache.ts).
  const hasData = dataUpdatedAt > 0;
  // supabase-js өөрөө ч дахин оролддог тул isError хүлээвэл ~30 сек болно — эхний алдаан дээр мэдэгдэнэ.
  const serverUnreachable = online && hasData && (isError || failureCount > 0);

  const hasFilters = search || unit !== ALL || section !== ALL || category !== ALL || parameter !== ALL;

  function exportCsv() {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tonog-tohooromj-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} бүртгэл экспортлогдлоо.`);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Factory className="size-5" />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold tracking-tight">
                  ХХХА Тоног төхөөрөмж бүртгэл
                </h1>
                <p className="text-xs text-muted-foreground">
                  Tag name генератор ба нэгдсэн бүртгэлийн сан
                </p>
              </div>
            </div>
            <nav className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1" aria-label="Үндсэн цэс">
              {(auth.isAdmin || auth.section) && (
                <Button
                  type="button"
                  size="sm"
                  variant={view === "register" ? "default" : "ghost"}
                  disabled={!online && view !== "register"}
                  title={online ? undefined : "Офлайн үед бүртгэл хийх боломжгүй"}
                  onClick={() => { setEditing(null); setView("register"); }}
                >
                  <ClipboardPlus className="size-4" /> Бүртгэл хийх
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant={view === "inventory" ? "default" : "ghost"}
                onClick={() => setView("inventory")}
              >
                <List className="size-4" /> Бүртгэлийн жагсаалт
              </Button>
              {/* preload="render": офлайн үед ч нээгдэхээр хуудасны кодыг урьдчилан татаж кэшлүүлнэ */}
              <Button type="button" size="sm" variant="ghost" asChild>
                <Link to="/dashboard" preload="render">
                  <LayoutDashboard className="size-4" /> Хянах самбар
                </Link>
              </Button>
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canInstall && (
              <Button variant="outline" onClick={() => void install()}>
                <MonitorSmartphone className="size-4" /> Апп суулгах
              </Button>
            )}
            {view === "inventory" && (
              <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
                <Download className="size-4" /> CSV / Excel экспорт
              </Button>
            )}
            {auth.isAdmin && (
              <Button variant="outline" asChild>
                <Link to="/users"><Users className="size-4" /> Хэрэглэгчид</Link>
              </Button>
            )}
            {auth.user ? (
              <Button variant="ghost" onClick={() => supabase.auth.signOut()}>
                <LogOut className="size-4" />
                {auth.isAdmin ? "Админ" : auth.section ? sectionLabel(auth.section) : auth.user.email}
              </Button>
            ) : (
              <Button variant="ghost" asChild>
                <Link to="/auth"><LogIn className="size-4" /> Нэвтрэх</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <OfflineBanner
        offline={!online}
        serverUnreachable={serverUnreachable}
        savedAt={dataUpdatedAt}
        hasData={hasData}
      />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        {view === "register" && (
          <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  {editing ? "Бүртгэл засварлах" : "Шинэ тоног төхөөрөмж бүртгэх"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Сонголт хийх үед Tag name автоматаар шинэчлэгдэнэ.
                </p>
              </div>
              {editing && (
                <Badge variant="secondary" className="font-mono">
                  {editing.tag_name}
                </Badge>
              )}
            </div>
            <EquipmentForm
              editing={editing}
              items={items}
              onDone={() => {
                const wasEditing = Boolean(editing);
                setEditing(null);
                void queryClient.invalidateQueries({ queryKey: ["equipment"] });
                if (wasEditing) setView("inventory");
              }}
            />
          </section>
        )}

        {view === "inventory" && (
          <>
            <StatsCards items={items} />
            <section className="rounded-xl border bg-card shadow-sm">
          <div className="flex flex-wrap items-end gap-3 border-b p-5 sm:p-6">
            <div className="min-w-56 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tag, сериал, хэсэг, ISA код, модель… Жишээ: KSI PIT 2015"
                  className="pl-9 pr-9"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Хайлтын заавар"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                      <CircleHelp className="size-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 space-y-2 text-xs">
                    <p className="font-medium">Олон утгаар хайх</p>
                    <p>
                      <span className="font-mono">KSI PIT 2015</span> — зайгаар тусгаарласан бүх утга таарна (БА)
                    </p>
                    <p>
                      <span className="font-mono">PIT, LIT</span> — таслалаар тусгаарласан аль нэг нь таарна (ЭСВЭЛ)
                    </p>
                    <p>
                      <span className="font-mono">KSI PIT, IFO LIT</span> — хоёуланг хослуулж болно
                    </p>
                    <p>
                      <span className="font-mono">"ball mill"</span> — хашилт доторх хэллэгийг бүтнээр нь хайна
                    </p>
                    <p className="text-muted-foreground">
                      Хэсгийн код (KSI, RO…) зөвхөн тухайн хэсгийг шүүнэ. Том жижиг үсэг ялгахгүй.
                    </p>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <FilterSelect value={unit} onChange={setUnit} placeholder="Бүх эрхлэгч">
              {UNITS.map((u) => (
                <SelectItem key={u.code} value={u.code}>
                  {u.label}
                </SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect value={section} onChange={setSection} placeholder="Бүх хэсэг">
              {SECTIONS.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.label}
                </SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect value={category} onChange={setCategory} placeholder="Бүх бүлэг">
              {CATEGORIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect value={parameter} onChange={setParameter} placeholder="Бүх параметр">
              {PARAMETERS.map((p) => (
                <SelectItem key={p.code} value={p.code}>
                  {p.label}
                </SelectItem>
              ))}
              {/* MNU-ийн төхөөрөмжүүд (A, V нь дээрх параметртэй ижил код тул давхардуулахгүй) */}
              {MNU_DEVICES.filter((d) => !PARAMETERS.some((p) => p.code === d.code)).map((d) => (
                <SelectItem key={d.code} value={d.code}>
                  {d.label} (MNU)
                </SelectItem>
              ))}
            </FilterSelect>
            {hasFilters && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  setUnit(ALL);
                  setSection(ALL);
                  setCategory(ALL);
                  setParameter(ALL);
                }}
              >
                <X className="size-4" /> Цэвэрлэх
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag name</TableHead>
                  <TableHead>Эрхлэгч</TableHead>
                  <TableHead>Хэсэг</TableHead>
                  <TableHead>ISA код</TableHead>
                  <TableHead>Үйлдвэрлэгч / Модель</TableHead>
                  <TableHead>Хөрөнгийн сериал</TableHead>
                  <TableHead>Он</TableHead>
                  <TableHead>Төлөв</TableHead>
                  <TableHead>Бүртгэсэн</TableHead>
                  <TableHead>Үйлчилгээ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto size-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !filtered.length && (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                      {!online && !items.length
                        ? "Офлайн байна. Энэ төхөөрөмж дээр хадгалсан бүртгэл алга."
                        : "Бүртгэл олдсонгүй."}
                    </TableCell>
                  </TableRow>
                )}
                {pageItems.map((item) => (
                  <TableRow
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-mono text-xs font-medium">{item.tag_name}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      <span className="block text-sm">
                        {sectionLabel(item.section)} / {subSectionLabel(item.section, item.sub_section)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.main_equipment_name || item.main_equipment}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">
                      {isaCode(item)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="block">{item.manufacturer || "—"}</span>
                      <span className="text-xs text-muted-foreground">{item.model || ""}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.asset_serial || "—"}</TableCell>
                    <TableCell>{item.year}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === "active" ? "default" : "secondary"}>
                        {statusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("mn-MN")}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <MaintenanceCell item={item} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-xs text-muted-foreground sm:px-6">
            <span>
              Нийт {items.length} бүртгэлээс {filtered.length} илэрц
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                Өмнөх
              </Button>
              <span>
                {safePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
              >
                Дараах
              </Button>
            </div>
          </div>
            </section>
          </>
        )}
      </main>

      <EquipmentDetail
        item={selected}
        canEdit={online && !!selected && auth.canEdit(selected.section)}
        canDelete={online && auth.isAdmin}
        offline={!online}
        onClose={() => setSelected(null)}
        onEdit={(item) => {
          setEditing(item);
          setSelected(null);
          setView("register");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onDelete={(item) => { setDeleting(item); setDeletePw(""); }}
        savingMaintenance={addMaintenance.isPending}
        onAddMaintenance={async (item, date, note) => {
          await addMaintenance.mutateAsync({ item, date, note });
          setSelected({
            ...item,
            maintenance_history: appendMaintenance(item.maintenance_history, date, note),
          });
        }}
      />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Устгахыг баталгаажуулах</DialogTitle>
            <DialogDescription className="font-mono text-xs">{deleting?.tag_name}</DialogDescription>
          </DialogHeader>
          <Input type="password" placeholder="Админ нууц үг" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Болих</Button>
            <Button
              variant="destructive"
              disabled={!online || !deletePw || removeItem.isPending}
              onClick={async () => {
                if (!deleting || !auth.user?.email) return;
                if (!navigator.onLine) {
                  toast.error("Сүлжээгүй байна. Холболт сэргэсний дараа устгана уу.");
                  return;
                }
                const { error } = await supabase.auth.signInWithPassword({ email: auth.user.email, password: deletePw });
                if (error) {
                  toast.error("Нууц үг буруу байна.");
                  return;
                }
                removeItem.mutate(deleting.id);
                setDeleting(null);
              }}
            >
              Устгах
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MaintenanceCell({ item }: { item: Equipment }) {
  const entries = parseMaintenance(item.maintenance_history);
  const last = lastMaintenance(item.maintenance_history);

  if (!entries.length) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto px-2 py-1 font-mono text-xs">
          {last?.date || "—"}
          <span className="ml-1 font-sans text-[10px] text-muted-foreground">
            ({entries.length})
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Засвар үйлчилгээний түүх
        </p>
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {entries.map((e, i) => (
            <li key={i} className="border-b pb-2 last:border-0 last:pb-0">
              <span className="block font-mono text-xs text-muted-foreground">{e.date || "—"}</span>
              <span className="text-sm">{e.note}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-44">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {children}
      </SelectContent>
    </Select>
  );
}
