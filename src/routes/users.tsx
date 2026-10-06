import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { SECTIONS, sectionLabel } from "@/lib/equipment";
import { createSectionUser, listSectionUsers, removeSectionUser } from "@/lib/users.functions";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Хэрэглэгчид | ХХХА Тоног төхөөрөмж бүртгэл" },
      { name: "description", content: "Хэсгийн хэрэглэгчдийг админ удирдах хуудас." },
      { property: "og:title", content: "Хэрэглэгчид | ХХХА Тоног төхөөрөмж бүртгэл" },
      { property: "og:description", content: "Хэсгийн хэрэглэгчдийг админ удирдах хуудас." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const list = useServerFn(listSectionUsers);
  const create = useServerFn(createSectionUser);
  const remove = useServerFn(removeSectionUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [section, setSection] = useState("");

  const users = useQuery({ queryKey: ["section-users"], queryFn: () => list(), enabled: auth.isAdmin });
  const add = useMutation({
    mutationFn: () => create({ data: { email, password, section } }),
    onSuccess: () => {
      toast.success("Хэрэглэгч нэмэгдлээ.");
      setEmail(""); setPassword(""); setSection("");
      void qc.invalidateQueries({ queryKey: ["section-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (user_id: string) => remove({ data: { user_id } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["section-users"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (auth.loading) return null;
  if (!auth.isAdmin)
    return (
      <div className="p-8 text-center text-sm">
        Зөвхөн админ хандана. <Link to="/auth" className="text-primary underline">Нэвтрэх</Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Буцах</Link>
      <h1 className="text-xl font-semibold">Хэсгийн хэрэглэгчид</h1>
      <form
        className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-4 sm:items-end"
        onSubmit={(e) => { e.preventDefault(); add.mutate(); }}
      >
        <div className="space-y-1"><Label>Имэйл</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1"><Label>Нууц үг (8+)</Label><Input required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div className="space-y-1">
          <Label>Хэсэг</Label>
          <Select value={section} onValueChange={setSection}>
            <SelectTrigger><SelectValue placeholder="Сонгох..." /></SelectTrigger>
            <SelectContent>{SECTIONS.map((s) => <SelectItem key={s.code} value={s.code}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={!section || add.isPending}>Нэмэх</Button>
      </form>
      <ul className="divide-y rounded-xl border bg-card">
        {(users.data ?? []).map((u) => (
          <li key={u.user_id + u.role} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
            <span>{u.email}</span>
            <span className="text-muted-foreground">{u.role === "admin" ? "Админ" : sectionLabel(u.section ?? "")}</span>
            {u.role !== "admin" && (
              <Button size="icon" variant="ghost" onClick={() => del.mutate(u.user_id)}><Trash2 className="size-4" /></Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
