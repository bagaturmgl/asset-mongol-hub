import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, Factory, Loader2, Search, X } from "lucide-react";
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

function Index() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [unit, setUnit] = useState(ALL);
  const [section, setSection] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [selected, setSelected] = useState<Equipment | null>(null);
  const [editing, setEditing] = useState<Equipment | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Equipment[];
    },
  });

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


  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (unit !== ALL && item.unit !== unit) return false;
      if (section !== ALL && item.section !== section) return false;
      if (category !== ALL && item.category !== category) return false;
      if (!q) return true;
      return [item.tag_name, item.factory_serial, item.model, item.manufacturer, item.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [items, search, unit, section, category]);

  const hasFilters = search || unit !== ALL || section !== ALL || category !== ALL;

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
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Factory className="size-5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                ХХХА Тоног төхөөрөмж бүртгэл
              </h1>
              <p className="text-xs text-muted-foreground">
                Tag name генератор ба нэгдсэн бүртгэлийн сан
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="size-4" /> CSV / Excel экспорт
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        <StatsCards items={items} />

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
            onDone={() => {
              setEditing(null);
              void queryClient.invalidateQueries({ queryKey: ["equipment"] });
            }}
          />
        </section>

        <section className="rounded-xl border bg-card shadow-sm">
          <div className="flex flex-wrap items-end gap-3 border-b p-5 sm:p-6">
            <div className="min-w-56 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tag name, сериал, модель, үйлдвэрлэгчээр хайх"
                  className="pl-9"
                />
              </div>
            </div>
            <FilterSelect value={unit} onChange={setUnit} placeholder="Бүх эрхлэгч">
              {UNITS.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect value={section} onChange={setSection} placeholder="Бүх хэсэг">
              {SECTIONS.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.code}
                </SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect value={category} onChange={setCategory} placeholder="Бүх ангилал">
              {CATEGORIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
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
                  <TableHead>Ангилал</TableHead>
                  <TableHead>Үйлдвэрлэгч / Модель</TableHead>
                  <TableHead>Сериал №</TableHead>
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
                      Бүртгэл олдсонгүй.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((item) => (
                  <TableRow
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-mono text-xs font-medium">{item.tag_name}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      {sectionLabel(item.section)} / {subSectionLabel(item.section, item.sub_section)} / {item.main_equipment}
                    </TableCell>
                    <TableCell className="font-mono">
                      {item.category}
                      {item.subtype}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="block">{item.manufacturer || "—"}</span>
                      <span className="text-xs text-muted-foreground">{item.model || ""}</span>
                    </TableCell>
                    <TableCell className="text-sm">{item.factory_serial || "—"}</TableCell>
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
          <div className="border-t px-5 py-3 text-xs text-muted-foreground sm:px-6">
            Нийт {items.length} бүртгэлээс {filtered.length} харагдаж байна.
          </div>
        </section>
      </main>

      <EquipmentDetail
        item={selected}
        onClose={() => setSelected(null)}
        onEdit={(item) => {
          setEditing(item);
          setSelected(null);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onDelete={(item) => removeItem.mutate(item.id)}
        savingMaintenance={addMaintenance.isPending}
        onAddMaintenance={async (item, date, note) => {
          await addMaintenance.mutateAsync({ item, date, note });
          setSelected({
            ...item,
            maintenance_history: appendMaintenance(item.maintenance_history, date, note),
          });
        }}
      />
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
