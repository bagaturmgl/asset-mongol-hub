CREATE OR REPLACE FUNCTION public.dashboard_equipment_stats()
RETURNS TABLE(unit text, category text, subtype text, parameter text, function_code text, year text, manufacturer text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT unit, category, subtype, parameter, function_code, year, manufacturer FROM public.equipment $$;
REVOKE ALL ON FUNCTION public.dashboard_equipment_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_equipment_stats() TO anon, authenticated;