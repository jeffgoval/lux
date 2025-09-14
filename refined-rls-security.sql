-- =====================================================
-- POLÍTICAS RLS REFINADAS - MAIOR SEGURANÇA
-- Execute APÓS confirmar que o onboarding está funcionando
-- =====================================================

-- 1. POLÍTICA MAIS SEGURA PARA user_roles (substitui a temporária)
-- Remove a política temporária permissiva
DROP POLICY IF EXISTS "onboarding_user_roles_full_access" ON public.user_roles;

-- Política para SELECT - usuarios podem ver seus próprios roles
CREATE POLICY "user_roles_select_own" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Política para INSERT - apenas durante onboarding ou por admins
CREATE POLICY "user_roles_insert_controlled" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  -- Usuário criando seu próprio role inicial
  (auth.uid() = user_id AND role = 'proprietaria' AND criado_por = auth.uid())
  OR
  -- Super admin pode criar qualquer role
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'super_admin'
    AND ur.ativo = true
  )
  OR
  -- Proprietária pode criar roles em sua clínica
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.clinica_id = user_roles.clinica_id
    AND ur.role = 'proprietaria'
    AND ur.ativo = true
  )
);

-- Política para UPDATE - apenas o próprio usuário ou admins
CREATE POLICY "user_roles_update_controlled" 
ON public.user_roles 
FOR UPDATE 
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND (ur.role = 'super_admin' OR 
         (ur.role = 'proprietaria' AND ur.clinica_id = user_roles.clinica_id))
    AND ur.ativo = true
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND (ur.role = 'super_admin' OR 
         (ur.role = 'proprietaria' AND ur.clinica_id = user_roles.clinica_id))
    AND ur.ativo = true
  )
);

-- 2. POLÍTICA MAIS SEGURA PARA clinicas
DROP POLICY IF EXISTS "clinicas_full_access_onboarding" ON public.clinicas;

-- SELECT: usuários podem ver clínicas onde têm acesso
CREATE POLICY "clinicas_select_accessible" 
ON public.clinicas 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.clinica_id = clinicas.id
    AND ur.ativo = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'super_admin'
    AND ur.ativo = true
  )
);

-- INSERT: proprietários podem criar clínicas
CREATE POLICY "clinicas_insert_owners" 
ON public.clinicas 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'proprietaria'
    AND ur.ativo = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'super_admin'
    AND ur.ativo = true
  )
);

-- UPDATE: apenas proprietários e gerentes da clínica
CREATE POLICY "clinicas_update_managers" 
ON public.clinicas 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.clinica_id = clinicas.id
    AND ur.role IN ('proprietaria', 'gerente')
    AND ur.ativo = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'super_admin'
    AND ur.ativo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.clinica_id = clinicas.id
    AND ur.role IN ('proprietaria', 'gerente')
    AND ur.ativo = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'super_admin'
    AND ur.ativo = true
  )
);

-- 3. POLÍTICA MAIS SEGURA PARA templates_procedimentos
DROP POLICY IF EXISTS "templates_permissive_onboarding" ON public.templates_procedimentos;

CREATE POLICY "templates_clinic_controlled" 
ON public.templates_procedimentos 
FOR ALL
USING (
  -- Templates globais (clinica_id IS NULL) visíveis para todos
  clinica_id IS NULL
  OR
  -- Templates da clínica visíveis para membros da clínica
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.clinica_id = templates_procedimentos.clinica_id
    AND ur.ativo = true
  )
)
WITH CHECK (
  -- Templates globais apenas para super admin
  (clinica_id IS NULL AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'super_admin'
    AND ur.ativo = true
  ))
  OR
  -- Templates da clínica para membros da clínica
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.clinica_id = templates_procedimentos.clinica_id
    AND ur.ativo = true
  )
);

-- 4. POLÍTICA MAIS SEGURA PARA profissionais
DROP POLICY IF EXISTS "profissionais_permissive_onboarding" ON public.profissionais;

CREATE POLICY "profissionais_controlled_access" 
ON public.profissionais 
FOR ALL
USING (
  -- Próprio usuário
  auth.uid() = user_id
  OR
  -- Membros da mesma clínica podem ver
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais cp1
    JOIN public.clinica_profissionais cp2 ON cp1.clinica_id = cp2.clinica_id
    WHERE cp1.user_id = auth.uid()
    AND cp2.user_id = profissionais.user_id
    AND cp1.ativo = true
    AND cp2.ativo = true
  )
)
WITH CHECK (
  -- Apenas o próprio usuário pode criar/editar
  auth.uid() = user_id
);

-- 5. POLÍTICA MAIS SEGURA PARA clinica_profissionais
DROP POLICY IF EXISTS "clinica_profissionais_permissive_onboarding" ON public.clinica_profissionais;

CREATE POLICY "clinica_profissionais_controlled_access" 
ON public.clinica_profissionais 
FOR ALL
USING (
  -- Próprio usuário
  auth.uid() = user_id
  OR
  -- Proprietários e gerentes da clínica
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.clinica_id = clinica_profissionais.clinica_id
    AND ur.role IN ('proprietaria', 'gerente')
    AND ur.ativo = true
  )
)
WITH CHECK (
  -- Próprio usuário pode criar sua associação
  auth.uid() = user_id
  OR
  -- Proprietários e gerentes podem gerenciar associações
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.clinica_id = clinica_profissionais.clinica_id
    AND ur.role IN ('proprietaria', 'gerente')
    AND ur.ativo = true
  )
);

-- 6. VERIFICAR POLÍTICAS REFINADAS
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_roles', 'clinicas', 'profiles', 'templates_procedimentos', 'profissionais', 'clinica_profissionais')
ORDER BY tablename, policyname;

-- 7. CONFIRMAR APLICAÇÃO
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔒 POLÍTICAS RLS REFINADAS APLICADAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Segurança aprimorada mantendo funcionalidade';
  RAISE NOTICE '✅ Controle granular de acesso implementado';
  RAISE NOTICE '✅ Políticas baseadas em roles e contexto de clínica';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  TESTE NOVAMENTE após aplicar estas políticas';
  RAISE NOTICE '⚠️  Se houver problemas, volte às políticas temporárias';
  RAISE NOTICE '========================================';
END $$;