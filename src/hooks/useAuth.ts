import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SECTIONS } from "@/lib/equipment";

export type Access = {
  user: User | null;
  isAdmin: boolean;
  /** Бүх бүртгэлийг засах эрх (устгах, хэрэглэгч удирдах эрхгүй). */
  isEditor: boolean;
  /** DCS/PLC бүртгэл нэмэх/засах эрх (админ эсвэл контроллерын инженер). */
  canEditControllers: boolean;
  /** RSL (РШШЛХ) бүртгэл нэмэх/засах эрх (админ эсвэл RSL инженер). */
  canEditRsl: boolean;
  /** Хэрэглэгчид оноосон бүх хэсгийн код (админд хоосон). */
  sections: string[];
  /**
   * Харуулахад зориулсан: нэг хэсэгтэй бол түүний код, олон бол "KSI, IFO", байхгүй бол null.
   * Эрхийг үүгээр биш, canEdit()-ээр шалгана.
   */
  section: string | null;
  loading: boolean;
};

const EMPTY: Omit<Access, "loading"> = {
  user: null,
  isAdmin: false,
  isEditor: false,
  canEditControllers: false,
  canEditRsl: false,
  sections: [],
  section: null,
};

export function useAuth(): Access & { canEdit: (section: string) => boolean } {
  const [state, setState] = useState<Access>({ ...EMPTY, loading: true });

  useEffect(() => {
    let active = true;
    async function load(user: User | null) {
      if (!user) {
        if (active) setState({ ...EMPTY, loading: false });
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role, section")
        .eq("user_id", user.id);
      if (!active) return;
      const rows = data ?? [];
      const isEditor = rows.some((r) => r.role === "editor");
      // Бүх бүртгэл засагч бүх хэсгийг засна
      const sections = isEditor
        ? SECTIONS.map((s) => s.code)
        : [
            ...new Set(
              rows
                .filter((r) => r.role === "section_user" && r.section)
                .map((r) => r.section as string),
            ),
          ].sort();
      setState({
        user,
        isAdmin: rows.some((r) => r.role === "admin"),
        isEditor,
        canEditControllers: rows.some(
          (r) => r.role === "admin" || r.role === "controller_editor" || r.role === "editor",
        ),
        canEditRsl: rows.some(
          (r) => r.role === "admin" || r.role === "rsl_editor" || r.role === "editor",
        ),
        sections,
        section: sections.length ? sections.join(", ") : null,
        loading: false,
      });
    }
    supabase.auth.getSession().then(({ data }) => load(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setTimeout(() => load(session?.user ?? null), 0);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    ...state,
    canEdit: (section: string) => state.isAdmin || state.sections.includes(section),
  };
}
