import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Зөвхөн админ эрхтэй.");
}

export const listSectionUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role, section");
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    return (roles ?? []).map((r) => ({
      user_id: r.user_id,
      role: r.role as string,
      section: r.section,
      email: list?.users.find((u) => u.id === r.user_id)?.email ?? "",
    }));
  });

export const createSectionUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().email(), password: z.string().min(8), section: z.string().min(1).max(10) }).parse(d),
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
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "section_user", section: data.section });
    if (roleErr) throw new Error(roleErr.message);
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
