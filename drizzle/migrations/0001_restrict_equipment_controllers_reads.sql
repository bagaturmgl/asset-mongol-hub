DROP POLICY IF EXISTS "Equipment is publicly readable" ON public.equipment;
DROP POLICY IF EXISTS "Signed-in users read controllers" ON public.controllers;
CREATE POLICY "Authorized staff read equipment" ON public.equipment FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()));
CREATE POLICY "Authorized staff read controllers" ON public.controllers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()));
REVOKE SELECT ON public.equipment FROM anon;