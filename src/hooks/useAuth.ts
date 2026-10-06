import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Access = { user: User | null; isAdmin: boolean; section: string | null; loading: boolean };

export function useAuth(): Access & { canEdit: (section: string) => boolean } {
  const [state, setState] = useState<Access>({ user: null, isAdmin: false, section: null, loading: true });

  useEffect(() => {
    let active = true;
    async function load(user: User | null) {
      if (!user) {
        if (active) setState({ user: null, isAdmin: false, section: null, loading: false });
        return;
      }
      const { data } = await supabase.from("user_roles").select("role, section").eq("user_id", user.id);
      if (!active) return;
      const rows = data ?? [];
      setState({
        user,
        isAdmin: rows.some((r) => r.role === "admin"),
        section: rows.find((r) => r.role === "section_user")?.section ?? null,
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
    canEdit: (section: string) => state.isAdmin || (!!state.section && state.section === section),
  };
}
