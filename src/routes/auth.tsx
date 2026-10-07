import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Нэвтрэх | ХХХА Тоног төхөөрөмж бүртгэл" },
      { name: "description", content: "Хэсгийн хэрэглэгч болон админ нэвтрэх хуудас." },
      { property: "og:title", content: "Нэвтрэх | ХХХА Тоног төхөөрөмж бүртгэл" },
      { property: "og:description", content: "Хэсгийн хэрэглэгч болон админ нэвтрэх хуудас." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Олон нийтэд нээлттэй бүртгэл байхгүй: хэсгийн хэрэглэгчийг админ "Хэрэглэгчид" хуудаснаас үүсгэнэ.
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error("Имэйл эсвэл нууц үг буруу байна.");
        return;
      }
      navigate({ to: "/" });
    } catch {
      toast.error("Сервертэй холбогдож чадсангүй. Сүлжээгээ шалгаад дахин оролдоно уу.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Factory className="size-5" />
          </span>
          <h1 className="text-lg font-semibold">Нэвтрэх</h1>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Имэйл</Label>
          <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Нууц үг</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          Нэвтрэх
        </Button>
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground">Эрх авах бол админд хандана уу.</span>
          <Link to="/" className="shrink-0 text-muted-foreground underline">Жагсаалт руу</Link>
        </div>
      </form>
    </div>
  );
}
