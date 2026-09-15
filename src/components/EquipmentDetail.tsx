import { QRCodeSVG } from "qrcode.react";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Equipment, categoryLabel, statusLabel, subtypeLabel } from "@/lib/equipment";

export function EquipmentDetail({
  item,
  onClose,
  onEdit,
  onDelete,
}: {
  item: Equipment | null;
  onClose: () => void;
  onEdit: (item: Equipment) => void;
  onDelete: (item: Equipment) => void;
}) {
  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle className="font-mono text-lg tracking-tight">{item.tag_name}</DialogTitle>
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
                    <span className="whitespace-pre-wrap">{item.maintenance_history || "—"}</span>
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
              <Button variant="destructive" onClick={() => onDelete(item)}>
                <Trash2 className="size-4" /> Устгах
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
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
