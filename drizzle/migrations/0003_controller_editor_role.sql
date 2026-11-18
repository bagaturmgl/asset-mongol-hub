ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'controller_editor';

CREATE OR REPLACE FUNCTION public.can_edit_controllers(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin', 'controller_editor')
  )
$$;

DROP POLICY IF EXISTS "Section users and admins add controllers" ON public.controllers;
DROP POLICY IF EXISTS "Section users and admins update controllers" ON public.controllers;
CREATE POLICY "Controller engineers and admins add controllers" ON public.controllers
FOR INSERT TO authenticated WITH CHECK (public.can_edit_controllers(auth.uid()));
CREATE POLICY "Controller engineers and admins update controllers" ON public.controllers
FOR UPDATE TO authenticated USING (public.can_edit_controllers(auth.uid()))
WITH CHECK (public.can_edit_controllers(auth.uid()));