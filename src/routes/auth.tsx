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
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error("Имэйл эсвэл нууц үг буруу байна.");
      navigate({ to: "/" });
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Имэйлээ шалгаж бүртгэлээ баталгаажуулна уу.");
      setMode("in");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Factory className="size-5" />
          </span>
          <h1 className="text-lg font-semibold">{mode === "in" ? "Нэвтрэх" : "Админ бүртгүүлэх"}</h1>
        </div>
        <div className="space-y-2">
          <Label>Имэйл</Label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Нууц үг</Label>
          <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {mode === "in" ? "Нэвтрэх" : "Бүртгүүлэх"}
        </Button>
        <div className="flex justify-between text-xs">
          <button type="button" className="text-primary underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "Админ анх удаа бүртгүүлэх" : "Нэвтрэх рүү буцах"}
          </button>
          <Link to="/" className="text-muted-foreground underline">Жагсаалт руу</Link>
        </div>
      </form>
    </div>
  );
}
