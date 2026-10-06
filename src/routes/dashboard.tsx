import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Factory, LayoutDashboard, List, Loader2 } from "lucide-react";

import { DeviceGroupPanel } from "@/components/DeviceGroupPanel";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Button, buttonVariants } from "@/components/ui/button";
import { useEquipment } from "@/hooks/useEquipment";
import { summarizeGroups } from "@/lib/dashboard";
import { useOnlineStatus } from "@/lib/pwa";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Хянах самбар | ХХХА Тоног төхөөрөмж бүртгэл" },
      {
        name: "description",
        content:
          "Мэдрэгч ба хувиргагч, гүйцэтгэх механизм, цацрагийн тоног төхөөрөмж, анализаторын тоо, төрөл, насжилт.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const online = useOnlineStatus();
  const { data: items = [], isLoading, isError, failureCount, dataUpdatedAt } = useEquipment();
  const groups = useMemo(() => summarizeGroups(items), [items]);

  const hasData = dataUpdatedAt > 0;
  const serverUnreachable = online && hasData && (isError || failureCount > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-4 py-5 sm:px-6">
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
            <span className={buttonVariants({ size: "sm" })} aria-current="page">
              <LayoutDashboard className="size-4" /> Хянах самбар
            </span>
          </nav>
        </div>
      </header>

      <OfflineBanner
        offline={!online}
        serverUnreachable={serverUnreachable}
        savedAt={dataUpdatedAt}
        hasData={hasData}
      />

      <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Хянах самбар</h2>
          <p className="text-sm text-muted-foreground">
            Нийт {items.length} тоног төхөөрөмж, бүлэг тус бүрээр төрөл ба насжилт.
          </p>
        </div>

        {isLoading && !items.length ? (
          <div className="flex justify-center py-20 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" aria-label="Ачаалж байна" />
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
            {groups.map((group) => (
              <DeviceGroupPanel key={group.code} group={group} grandTotal={items.length} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
