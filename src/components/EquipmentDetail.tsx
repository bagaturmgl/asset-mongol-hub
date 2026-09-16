import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Pencil, Trash2, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Equipment,
  categoryLabel,
  parseMaintenance,
  statusLabel,
  subtypeLabel,
} from "@/lib/equipment";

export function EquipmentDetail({
  item,
  onClose,
  onEdit,
  onDelete,
  onAddMaintenance,
  savingMaintenance,
}: {
  item: Equipment | null;
  onClose: () => void;
  onEdit: (item: Equipment) => void;
  onDelete: (item: Equipment) => void;
  onAddMaintenance: (item: Equipment, date: string, note: string) => Promise<void> | void;
  savingMaintenance?: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (addOpen) {
      setDate(new Date().toISOString().slice(0, 10));
      setNote("");
    }
  }, [addOpen]);

  const entries = parseMaintenance(item?.maintenance_history ?? null);

  return (
    <>
      <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {item && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-lg tracking-tight">
                  {item.tag_name}
                </DialogTitle>
                <DialogDescription>
                  Бүртгэсэн: {new Date(item.created_at).toLocaleString("mn-MN")}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <Row label="Төлөв">
                    <Badge variant="secondary">{statusLabel(item.status)}</Badge>
                  </Row>
                  <Row label="Үйлчилгээ эрхлэгч">{item.unit}</Row>
                  <Row label="Үндсэн хэсэг">{item.section}</Row>
                  <Row label="Дэд хэсэг">{item.sub_section}</Row>
                  <Row label="Үндсэн тоног төхөөрөмж">{item.main_equipment}</Row>
                  <Row label="Үндсэн ангилал">{categoryLabel(item.category)}</Row>
                  <Row label="Дэд ангилал">{subtypeLabel(item.category, item.subtype)}</Row>
                  <Row label="Дарааллын дугаар">{item.sequence}</Row>
                  <Row label="Үйлдвэрлэсэн он">{item.year}</Row>
                  <Row label="Үйлдвэрлэгч">{item.manufacturer || "—"}</Row>
                  <Row label="Модель">{item.model || "—"}</Row>
                  <Row label="Үйлдвэрийн сериал №">{item.factory_serial || "—"}</Row>
                  <div className="sm:col-span-2">
                    <Row label="Байршил / Тайлбар">{item.notes || "—"}</Row>
                  </div>
                  <div className="sm:col-span-2">
                    <Row label="Засвар үйлчилгээний түүх">
                      {entries.length ? (
                        <ul className="space-y-1">
                          {entries.map((e, i) => (
                            <li key={i} className="flex gap-2 text-sm">
                              <span className="font-mono text-xs text-muted-foreground">
                                {e.date || "—"}
                              </span>
                              <span>{e.note}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "—"
                      )}
                    </Row>
                  </div>
                </dl>

                <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4">
                  <QRCodeSVG value={item.tag_name} size={148} level="M" />
                  <p className="max-w-[148px] text-center font-mono text-[10px] leading-tight text-muted-foreground">
                    {item.tag_name}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={() => onEdit(item)}>
                  <Pencil className="size-4" /> Засварлах
                </Button>
                <Button variant="secondary" onClick={() => setAddOpen(true)}>
                  <Wrench className="size-4" /> Засвар
                </Button>
                <Button variant="destructive" onClick={() => onDelete(item)}>
                  <Trash2 className="size-4" /> Устгах
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Засвар үйлчилгээ нэмэх</DialogTitle>
            <DialogDescription className="font-mono text-xs">{item?.tag_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Огноо</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Хийсэн ажил</Label>
              <Textarea
                rows={3}
                value={note}
                placeholder="Битүүмж солих, калибровка хийх"
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Болих
            </Button>
            <Button
              disabled={!date || !note.trim() || savingMaintenance}
              onClick={async () => {
                if (!item) return;
                await onAddMaintenance(item, date, note);
                setAddOpen(false);
              }}
            >
              Нэмэх
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}
