CREATE TYPE public.app_role AS ENUM ('admin', 'section_user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  section text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.can_edit_section(_user_id uuid, _section text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND (role = 'admin' OR (role = 'section_user' AND section = _section))
  )
$$;

CREATE POLICY "Users read own role, admins read all" ON public.user_roles
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Grant admin to the designated verified email
CREATE OR REPLACE FUNCTION public.grant_designated_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND lower(NEW.email) = 'dbatbaatar@erdenetmc.mn' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created_grant_admin AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_designated_admin();
CREATE TRIGGER on_auth_user_confirmed_grant_admin AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_designated_admin();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE lower(email) = 'dbatbaatar@erdenetmc.mn' AND email_confirmed_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- Equipment policies
DROP POLICY IF EXISTS "Anyone can add equipment" ON public.equipment;
DROP POLICY IF EXISTS "Anyone can update equipment" ON public.equipment;
DROP POLICY IF EXISTS "Anyone can delete equipment" ON public.equipment;

REVOKE INSERT, UPDATE, DELETE ON public.equipment FROM anon;
GRANT SELECT ON public.equipment TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO authenticated;
GRANT ALL ON public.equipment TO service_role;

CREATE POLICY "Section users and admins add equipment" ON public.equipment
FOR INSERT TO authenticated WITH CHECK (public.can_edit_section(auth.uid(), section));
CREATE POLICY "Section users and admins update equipment" ON public.equipment
FOR UPDATE TO authenticated USING (public.can_edit_section(auth.uid(), section))
WITH CHECK (public.can_edit_section(auth.uid(), section));
CREATE POLICY "Only admins delete equipment" ON public.equipment
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));