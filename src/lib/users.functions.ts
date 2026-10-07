import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SECTIONS } from "@/lib/equipment";

const SECTION_CODES = SECTIONS.map((s) => s.code as string);
/** 1+ хэсэг, зөвхөн мэдэгдэж буй кодууд, давхардалгүй. */
const sectionsSchema = z
  .array(z.string())
  .min(1, "Дор хаяж нэг хэсэг сонгоно уу.")
  .transform((list) => [...new Set(list)])
  .refine((list) => list.every((s) => SECTION_CODES.includes(s)), "Хэсгийн код буруу байна.");

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Зөвхөн админ эрхтэй.");
}

export type SectionUser = { user_id: string; email: string; isAdmin: boolean; sections: string[] };

export const listSectionUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SectionUser[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role, section");
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    // Нэг хэрэглэгч олон мөртэй байж болох тул хэрэглэгчээр нэгтгэнэ
    const byUser = new Map<string, SectionUser>();
    for (const r of roles ?? []) {
      const u = byUser.get(r.user_id) ?? {
        user_id: r.user_id,
        email: list?.users.find((x) => x.id === r.user_id)?.email ?? "",
        isAdmin: false,
        sections: [],
      };
      if (r.role === "admin") u.isAdmin = true;
      else if (r.section && !u.sections.includes(r.section)) u.sections.push(r.section);
      byUser.set(r.user_id, u);
    }
    return [...byUser.values()]
      .map((u) => ({ ...u, sections: u.sections.sort() }))
      .sort((a, b) => Number(b.isAdmin) - Number(a.isAdmin) || a.email.localeCompare(b.email));
  });

export const createSectionUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ email: z.string().email(), password: z.string().min(8), sections: sectionsSchema })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Хэрэглэгч үүсгэж чадсангүй.");
    const userId = created.user.id;
    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert(
      data.sections.map((section) => ({
        user_id: userId,
        role: "section_user" as const,
        section,
      })),
    );
    if (roleErr) {
      // Эрх оноож чадаагүй бол эрхгүй бүртгэл үлдээхгүй
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(roleErr.message);
    }
    return { ok: true };
  });

/** Хэрэглэгчийн хэсгүүдийг шинэ жагсаалтаар солино (нэмэх, хасах). */
export const setUserSections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), sections: sectionsSchema }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current, error: readErr } = await supabaseAdmin
      .from("user_roles")
      .select("section")
      .eq("user_id", data.user_id)
      .eq("role", "section_user");
    if (readErr) throw new Error(readErr.message);
    const have = new Set((current ?? []).map((r) => r.section as string));
    const toAdd = data.sections.filter((s) => !have.has(s));
    const toRemove = [...have].filter((s) => !data.sections.includes(s));
    // Эхлээд нэмнэ, дараа нь хасна — дундуур алдаа гарвал хэрэглэгч эрхгүй үлдэхгүй
    if (toAdd.length) {
      const { error } = await supabaseAdmin.from("user_roles").insert(
        toAdd.map((section) => ({
          user_id: data.user_id,
          role: "section_user" as const,
          section,
        })),
      );
      if (error) throw new Error(error.message);
    }
    if (toRemove.length) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", "section_user")
        .in("section", toRemove);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const removeSectionUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("Өөрийгөө устгах боломжгүй.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
