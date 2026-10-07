import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { SECTIONS } from "@/lib/equipment";
import {
  createSectionUser,
  listSectionUsers,
  removeSectionUser,
  setUserSections,
  type SectionUser,
} from "@/lib/users.functions";

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

const shortName = (label: string) => label.split("— ")[1] ?? label;

/** Олон хэсэг сонгох товчлуурууд. */
function SectionPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (code: string) =>
    onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Хэсгүүд">
      {SECTIONS.map((s) => {
        const on = value.includes(s.code);
        return (
          <button
            key={s.code}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(s.code)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            {on && <Check className="size-3" aria-hidden />}
            <span className="font-mono font-semibold">{s.code}</span>
            <span className={on ? "opacity-90" : "text-muted-foreground"}>
              {shortName(s.label)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SectionBadges({ sections }: { sections: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {sections.map((code) => (
        <span
          key={code}
          title={SECTIONS.find((s) => s.code === code)?.label ?? code}
          className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-primary"
        >
          {code}
        </span>
      ))}
    </span>
  );
}

function UsersPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const list = useServerFn(listSectionUsers);
  const create = useServerFn(createSectionUser);
  const saveSections = useServerFn(setUserSections);
  const remove = useServerFn(removeSectionUser);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sections, setSections] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ user_id: string; sections: string[] } | null>(null);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["section-users"] });
  const users = useQuery({
    queryKey: ["section-users"],
    queryFn: () => list(),
    enabled: auth.isAdmin,
  });

  const add = useMutation({
    mutationFn: () => create({ data: { email, password, sections } }),
    onSuccess: () => {
      toast.success("Хэрэглэгч нэмэгдлээ.");
      setEmail("");
      setPassword("");
      setSections([]);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: (v: { user_id: string; sections: string[] }) => saveSections({ data: v }),
    onSuccess: () => {
      toast.success("Хэсгүүд шинэчлэгдлээ.");
      setEditing(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (user_id: string) => remove({ data: { user_id } }),
    onSuccess: () => {
      toast.success("Хэрэглэгч устгагдлаа.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (auth.loading) return null;
  if (!auth.isAdmin)
    return (
      <div className="p-8 text-center text-sm">
        Зөвхөн админ хандана.{" "}
        <Link to="/auth" className="text-primary underline">
          Нэвтрэх
        </Link>
      </div>
    );

  const confirmDelete = (u: SectionUser) => {
    if (window.confirm(`${u.email} хэрэглэгчийг устгах уу? Энэ үйлдлийг буцаах боломжгүй.`))
      del.mutate(u.user_id);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Буцах
      </Link>
      <div>
        <h1 className="text-xl font-semibold">Хэсгийн хэрэглэгчид</h1>
        <p className="text-sm text-muted-foreground">
          Хэрэглэгч оноосон хэсгүүдийнхээ тоног төхөөрөмжийг бүртгэж, засварлах эрхтэй. Нэг
          хэрэглэгчид олон хэсэг оноож болно.
        </p>
      </div>

      <form
        className="space-y-4 rounded-xl border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <h2 className="text-sm font-medium">Шинэ хэрэглэгч</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="new-email">Имэйл</Label>
            <Input
              id="new-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-password">Нууц үг (8+)</Label>
            <Input
              id="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Хэсгүүд</Label>
          <SectionPicker value={sections} onChange={setSections} />
        </div>
        <Button type="submit" disabled={!sections.length || add.isPending}>
          Нэмэх
        </Button>
      </form>

      <ul className="divide-y rounded-xl border bg-card">
        {(users.data ?? []).map((u) => {
          const isEditing = editing?.user_id === u.user_id;
          return (
            <li key={u.user_id} className="space-y-3 px-4 py-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate">{u.email}</span>
                {u.isAdmin ? (
                  <span className="text-muted-foreground">Админ</span>
                ) : (
                  !isEditing && <SectionBadges sections={u.sections} />
                )}
                {!u.isAdmin && !isEditing && (
                  <span className="flex shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`${u.email}-ийн хэсгүүдийг засах`}
                      onClick={() => setEditing({ user_id: u.user_id, sections: u.sections })}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`${u.email}-ийг устгах`}
                      onClick={() => confirmDelete(u)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </span>
                )}
              </div>
              {isEditing && editing && (
                <div className="space-y-3 rounded-lg bg-muted/40 p-3">
                  <SectionPicker
                    value={editing.sections}
                    onChange={(next) => setEditing({ user_id: u.user_id, sections: next })}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!editing.sections.length || update.isPending}
                      onClick={() => update.mutate(editing)}
                    >
                      <Check className="size-4" /> Хадгалах
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      <X className="size-4" /> Болих
                    </Button>
                    {!editing.sections.length && (
                      <span className="self-center text-xs text-muted-foreground">
                        Дор хаяж нэг хэсэг сонгоно уу. Эрхийг бүрэн хасах бол хэрэглэгчийг устгана.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
