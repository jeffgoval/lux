-- Corrigir RLS evitando recursão e resolver aviso de search_path

-- 1) Atualizar (ou criar) função usada em políticas para gerentes
CREATE OR REPLACE FUNCTION public.can_manager_view_user_roles(target_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    user_has_role(auth.uid(), 'super_admin'::user_role_type)
  ) OR EXISTS (
    SELECT 1
    FROM public.user_roles ur1
    JOIN public.user_roles ur2 ON ur1.organizacao_id = ur2.organizacao_id
    WHERE ur1.user_id = auth.uid()
      AND ur1.role IN ('proprietaria', 'gerente')
      AND ur1.ativo = true
      AND ur2.user_id = target_user
      AND ur2.ativo = true
  );
$$;

-- 2) Função helper para verificar se usuário atual é gestor da organização
CREATE OR REPLACE FUNCTION public.current_user_is_manager_of_org(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    user_has_role(auth.uid(), 'super_admin'::user_role_type)
  ) OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('proprietaria', 'gerente')
      AND ur.ativo = true
      AND (org_id IS NULL OR ur.organizacao_id = org_id)
  );
$$;

-- 3) Limpar políticas antigas potencialmente recursivas
DROP POLICY IF EXISTS "super_admins_can_view_all_roles" ON public.user_roles;
DROP POLICY IF EXISTS "managers_can_view_team_roles" ON public.user_roles;
DROP POLICY IF EXISTS "system_can_create_roles" ON public.user_roles;
DROP POLICY IF EXISTS "managers_can_update_roles" ON public.user_roles;

-- 4) Recriar políticas usando funções SECURITY DEFINER (evita recursão)
-- Visualização
CREATE POLICY "managers_can_view_team_roles" 
ON public.user_roles 
FOR SELECT 
USING (public.can_manager_view_user_roles(user_id));

-- Inserção
CREATE POLICY "system_can_create_roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  -- Trigger do sistema
  (criado_por IS NULL) OR
  -- Super admin
  user_has_role(auth.uid(), 'super_admin'::user_role_type) OR
  -- Role inicial do próprio usuário
  (auth.uid() = criado_por AND role = 'visitante'::user_role_type) OR
  -- Gestores na mesma organização
  public.current_user_is_manager_of_org(organizacao_id)
);

-- Atualização
CREATE POLICY "managers_can_update_roles" 
ON public.user_roles 
FOR UPDATE 
USING (
  user_has_role(auth.uid(), 'super_admin'::user_role_type) OR
  public.current_user_is_manager_of_org(organizacao_id)
);

-- 5) Corrigir função antiga sem search_path (se existir)
CREATE OR REPLACE FUNCTION public.validate_role_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'super_admin' AND NOT user_has_role(auth.uid(), 'super_admin'::user_role_type) THEN
    RAISE EXCEPTION 'Apenas super_admin pode criar roles de super_admin';
  END IF;
  IF NEW.role = 'proprietaria' AND NOT (
    user_has_role(auth.uid(), 'super_admin'::user_role_type) OR
    user_has_role(auth.uid(), 'proprietaria'::user_role_type)
  ) THEN
    RAISE EXCEPTION 'Apenas super_admin ou proprietaria pode criar roles de proprietaria';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
