-- 03 - Tabela de roles para UI (useSystemRoles)

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  hierarchy_level INTEGER NOT NULL DEFAULT 1,
  color_class TEXT DEFAULT 'bg-gray-100 text-gray-800',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roles_ativo ON public.roles(ativo);
CREATE INDEX IF NOT EXISTS idx_roles_hierarchy ON public.roles(hierarchy_level);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_roles_updated_at'
  ) THEN
    CREATE TRIGGER update_roles_updated_at
      BEFORE UPDATE ON public.roles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'roles_select_all' AND schemaname = 'public' AND tablename = 'roles'
  ) THEN
    CREATE POLICY roles_select_all ON public.roles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'roles_admin_manage' AND schemaname = 'public' AND tablename = 'roles'
  ) THEN
    CREATE POLICY roles_admin_manage ON public.roles FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin','proprietaria') AND ur.ativo = true
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin','proprietaria') AND ur.ativo = true
      )
    );
  END IF;
END $$;

-- Seed roles padrão (idempotente)
INSERT INTO public.roles (role_name, display_name, hierarchy_level, color_class, permissions)
VALUES
  ('super_admin', 'Super Admin', 100, 'bg-purple-600 text-white', '{}'::jsonb),
  ('proprietaria', 'Proprietária', 90, 'bg-pink-600 text-white', '{}'::jsonb),
  ('gerente', 'Gerente', 80, 'bg-blue-600 text-white', '{}'::jsonb),
  ('profissionais', 'Profissional', 60, 'bg-emerald-600 text-white', '{}'::jsonb),
  ('recepcionistas', 'Recepcionista', 40, 'bg-amber-600 text-white', '{}'::jsonb),
  ('visitante', 'Visitante', 10, 'bg-gray-200 text-gray-800', '{}'::jsonb),
  ('cliente', 'Cliente', 5, 'bg-gray-100 text-gray-800', '{}'::jsonb)
ON CONFLICT (role_name) DO NOTHING;