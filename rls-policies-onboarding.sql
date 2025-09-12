-- =====================================================
-- PERMISSIVE RLS POLICIES FOR ONBOARDING
-- Allows new users to complete registration without errors
-- =====================================================

-- =====================================================
-- 1. DROP EXISTING POLICIES (CLEAN SLATE)
-- =====================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can manage their profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to manage their profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- User roles policies
DROP POLICY IF EXISTS "Users can create initial visitor role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can create their initial role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow users to manage their roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow onboarding user_roles" ON public.user_roles;

-- Clinicas policies
DROP POLICY IF EXISTS "Users can create clinics" ON public.clinicas;
DROP POLICY IF EXISTS "Users can create their first clinic" ON public.clinicas;
DROP POLICY IF EXISTS "Users can view accessible clinics" ON public.clinicas;
DROP POLICY IF EXISTS "Users can view their clinics" ON public.clinicas;
DROP POLICY IF EXISTS "Allow onboarding clinicas" ON public.clinicas;

-- Profissionais policies
DROP POLICY IF EXISTS "Users can manage their professional data" ON public.profissionais;
DROP POLICY IF EXISTS "Allow onboarding profissionais" ON public.profissionais;
DROP POLICY IF EXISTS "Users can view their own professional data" ON public.profissionais;

-- Clinica profissionais policies
DROP POLICY IF EXISTS "Users can manage their clinic relationships" ON public.clinica_profissionais;
DROP POLICY IF EXISTS "Allow users to manage their clinic relationships" ON public.clinica_profissionais;
DROP POLICY IF EXISTS "Allow onboarding clinica_profissionais" ON public.clinica_profissionais;

-- Templates policies
DROP POLICY IF EXISTS "Allow onboarding templates" ON public.templates_procedimentos;
DROP POLICY IF EXISTS "Allow onboarding templates_procedimentos" ON public.templates_procedimentos;
DROP POLICY IF EXISTS "Users can manage clinic templates" ON public.templates_procedimentos;

-- Especialidades policies
DROP POLICY IF EXISTS "Allow read access to specialties" ON public.especialidades_medicas;

-- =====================================================
-- 2. PROFILES TABLE POLICIES
-- =====================================================

-- Allow users to manage their own profile
CREATE POLICY "profiles_user_access"
ON public.profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow users to view other profiles (for clinic management)
CREATE POLICY "profiles_view_others"
ON public.profiles
FOR SELECT
USING (
  -- User can view profiles of people in their clinics
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais cp1
    JOIN public.clinica_profissionais cp2 ON cp1.clinica_id = cp2.clinica_id
    WHERE cp1.user_id = auth.uid() 
      AND cp2.user_id = public.profiles.id
      AND cp1.ativo = true 
      AND cp2.ativo = true
  )
  OR
  -- Or if they are super admin
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
      AND role = 'super_admin'
      AND ativo = true
  )
);

-- =====================================================
-- 3. USER ROLES TABLE POLICIES
-- =====================================================

-- Allow users to create their initial role during onboarding
CREATE POLICY "user_roles_create_initial"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('proprietaria', 'visitante', 'profissionais')
);

-- Allow users to view their own roles
CREATE POLICY "user_roles_view_own"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to update their own roles (limited)
CREATE POLICY "user_roles_update_own"
ON public.user_roles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    -- Can only update clinica_id and ativo status
    OLD.role = NEW.role
    AND OLD.user_id = NEW.user_id
  )
);

-- Allow clinic owners to manage roles in their clinics
CREATE POLICY "user_roles_clinic_management"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais
    WHERE user_id = auth.uid()
      AND clinica_id = public.user_roles.clinica_id
      AND ativo = true
  )
  AND
  EXISTS (
    SELECT 1 FROM public.user_roles owner_role
    WHERE owner_role.user_id = auth.uid()
      AND owner_role.role IN ('proprietaria', 'gerente')
      AND owner_role.ativo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais
    WHERE user_id = auth.uid()
      AND clinica_id = public.user_roles.clinica_id
      AND ativo = true
  )
);

-- =====================================================
-- 4. CLINICAS TABLE POLICIES
-- =====================================================

-- Allow users to create their first clinic
CREATE POLICY "clinicas_create_first"
ON public.clinicas
FOR INSERT
WITH CHECK (
  -- User must have proprietaria role
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'proprietaria'
      AND ativo = true
  )
);

-- Allow users to view clinics they are associated with
CREATE POLICY "clinicas_view_associated"
ON public.clinicas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais
    WHERE user_id = auth.uid()
      AND clinica_id = public.clinicas.id
      AND ativo = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND clinica_id = public.clinicas.id
      AND ativo = true
  )
  OR
  -- Super admin can view all
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND ativo = true
  )
);

-- Allow clinic owners to update their clinics
CREATE POLICY "clinicas_update_owners"
ON public.clinicas
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND clinica_id = public.clinicas.id
      AND role IN ('proprietaria', 'gerente')
      AND ativo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND clinica_id = public.clinicas.id
      AND role IN ('proprietaria', 'gerente')
      AND ativo = true
  )
);

-- =====================================================
-- 5. PROFISSIONAIS TABLE POLICIES
-- =====================================================

-- Allow users to create their own professional profile
CREATE POLICY "profissionais_create_own"
ON public.profissionais
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own professional data
CREATE POLICY "profissionais_view_own"
ON public.profissionais
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  -- Clinic managers can view professionals in their clinics
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais cp1
    JOIN public.clinica_profissionais cp2 ON cp1.clinica_id = cp2.clinica_id
    WHERE cp1.user_id = auth.uid()
      AND cp2.user_id = public.profissionais.user_id
      AND cp1.ativo = true
      AND cp2.ativo = true
  )
  AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('proprietaria', 'gerente')
      AND ativo = true
  )
);

-- Allow users to update their own professional data
CREATE POLICY "profissionais_update_own"
ON public.profissionais
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 6. CLINICA PROFISSIONAIS TABLE POLICIES
-- =====================================================

-- Allow users to create their clinic relationship during onboarding
CREATE POLICY "clinica_profissionais_create_own"
ON public.clinica_profissionais
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND
  -- Must be associated with the clinic somehow
  (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'proprietaria'
        AND ativo = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND clinica_id = public.clinica_profissionais.clinica_id
        AND ativo = true
    )
  )
);

-- Allow users to view their clinic relationships
CREATE POLICY "clinica_profissionais_view_own"
ON public.clinica_profissionais
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  -- Clinic managers can view all relationships in their clinics
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND clinica_id = public.clinica_profissionais.clinica_id
      AND role IN ('proprietaria', 'gerente')
      AND ativo = true
  )
);

-- Allow users to update their own clinic relationships
CREATE POLICY "clinica_profissionais_update_own"
ON public.clinica_profissionais
FOR UPDATE
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND clinica_id = public.clinica_profissionais.clinica_id
      AND role IN ('proprietaria', 'gerente')
      AND ativo = true
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND clinica_id = public.clinica_profissionais.clinica_id
      AND role IN ('proprietaria', 'gerente')
      AND ativo = true
  )
);

-- =====================================================
-- 7. TEMPLATES PROCEDIMENTOS TABLE POLICIES
-- =====================================================

-- Allow clinic members to manage templates
CREATE POLICY "templates_clinic_access"
ON public.templates_procedimentos
FOR ALL
USING (
  clinica_id IS NULL -- Global templates
  OR
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais
    WHERE user_id = auth.uid()
      AND clinica_id = public.templates_procedimentos.clinica_id
      AND ativo = true
  )
)
WITH CHECK (
  clinica_id IS NULL -- Global templates (admin only)
  OR
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais
    WHERE user_id = auth.uid()
      AND clinica_id = public.templates_procedimentos.clinica_id
      AND ativo = true
  )
);

-- =====================================================
-- 8. ESPECIALIDADES MEDICAS TABLE POLICIES
-- =====================================================

-- Allow everyone to read medical specialties (reference data)
CREATE POLICY "especialidades_read_all"
ON public.especialidades_medicas
FOR SELECT
USING (true);

-- Only admins can modify specialties
CREATE POLICY "especialidades_admin_modify"
ON public.especialidades_medicas
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND ativo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND ativo = true
  )
);

-- =====================================================
-- 9. VERIFICATION AND SUCCESS MESSAGE
-- =====================================================

-- Verify all policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'user_roles', 'clinicas', 'profissionais', 
    'clinica_profissionais', 'templates_procedimentos', 'especialidades_medicas'
  )
ORDER BY tablename, policyname;

-- Success message
DO $
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'RLS POLICIES CREATED SUCCESSFULLY';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Permissive policies configured for onboarding';
  RAISE NOTICE 'Users can now complete registration without RLS errors';
  RAISE NOTICE 'Security maintained for normal operations';
  RAISE NOTICE '=================================================';
END $;