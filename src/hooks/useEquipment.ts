import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Equipment } from "@/lib/equipment";

/** Бүртгэлийн жагсаалт, хянах самбар хоёр нэг кэшийг хуваалцана (офлайн хуулбар ч мөн). */
export const EQUIPMENT_QUERY_KEY = ["equipment"] as const;

async function fetchAllEquipment(): Promise<Equipment[]> {
  const PAGE = 1000;
  const all: Equipment[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("equipment")
      .select("*")
      .order("created_at", { ascending: false })
      .order("tag_name", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...((data ?? []) as Equipment[]));
    if (!data || data.length < PAGE) break;
  }
  return all;
}

export function useEquipment() {
  return useQuery({ queryKey: EQUIPMENT_QUERY_KEY, queryFn: fetchAllEquipment });
}
