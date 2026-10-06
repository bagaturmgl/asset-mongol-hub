import { CloudOff, WifiOff } from "lucide-react";

/** Хөтчийн locale-оос үл хамааран апп доторх огнооны хэлбэртэй (YYYY-MM-DD) ижил харагдана. */
function formatSavedAt(ts: number) {
  if (!ts) return null;
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * offline — төхөөрөмж сүлжээгүй (navigator.onLine === false)
 * serverUnreachable — сүлжээтэй ч Supabase-аас татаж чадаагүй, хадгалсан хуулбар харуулж байна
 */
export function OfflineBanner({
  offline,
  serverUnreachable,
  savedAt,
  hasData,
}: {
  offline: boolean;
  serverUnreachable: boolean;
  savedAt: number;
  hasData: boolean;
}) {
  if (!offline && !serverUnreachable) return null;

  const when = formatSavedAt(savedAt);
  const Icon = offline ? WifiOff : CloudOff;

  let title: string;
  let detail: string;
  if (offline) {
    title = "Сүлжээгүй байна.";
    detail = hasData
      ? `${when ? `${when}-ны байдлаар ` : ""}хадгалсан бүртгэлийг харуулж байна. Бүртгэх, засварлах, устгах үйлдэл холболт сэргэхэд идэвхжинэ.`
      : "Энэ төхөөрөмж дээр хадгалсан бүртгэл алга. Холболт сэргэхэд жагсаалт автоматаар ачаалагдана.";
  } else {
    title = "Сервертэй холбогдож чадсангүй.";
    detail = `${when ? `${when}-ны байдлаар ` : ""}хадгалсан бүртгэлийг харуулж байна.`;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-2.5 text-sm sm:px-6">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <span className="font-medium">{title}</span> {detail}
        </p>
      </div>
    </div>
  );
}
