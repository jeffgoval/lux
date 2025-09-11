-- Fix RLS policies to allow proper signup and onboarding flow
-- This migration ensures users can create and update their own data during registration

-- First, let's check if we need to create the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Fix profiles table policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "System can create profiles" ON public.profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow system to create profiles (for new user registration)
CREATE POLICY "System can create profiles" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix user_roles table policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their role data" ON public.user_roles;

-- Allow users to view their own roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (
    auth.uid() = user_id OR
    public.user_has_role(auth.uid(), 'super_admin') OR
    EXISTS(
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = auth.uid()
        AND ur2.role IN ('proprietaria', 'gerente')
        AND ur2.organizacao_id = public.user_roles.organizacao_id
        AND ur2.ativo = true
    )
  );

-- Allow users to update their own role data (needed for onboarding)
CREATE POLICY "Users can update their role data" ON public.user_roles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow system to create initial roles for new users
CREATE POLICY "System can create initial roles" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix organizacoes table policies for independent clinic owners
DROP POLICY IF EXISTS "Proprietarias can create organizations" ON public.organizacoes;

-- Allow proprietarias to create organizations
CREATE POLICY "Proprietarias can create organizations" ON public.organizacoes
  FOR INSERT WITH CHECK (
    auth.uid() = criado_por AND
    public.user_has_role(auth.uid(), 'proprietaria')
  );

-- Allow proprietarias to update their organizations
DROP POLICY IF EXISTS "Proprietarias can update their organizations" ON public.organizacoes;
CREATE POLICY "Proprietarias can update their organizations" ON public.organizacoes
  FOR UPDATE USING (
    auth.uid() = criado_por OR
    public.user_has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    auth.uid() = criado_por OR
    public.user_has_role(auth.uid(), 'super_admin')
  );

-- Fix clinicas table policies - ensure the table structure supports independent clinics
-- First check if organizacao_id can be null
DO $$ 
BEGIN
  -- Make organizacao_id nullable to support independent clinics
  ALTER TABLE public.clinicas ALTER COLUMN organizacao_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  -- Column might already be nullable
  NULL;
END $$;

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add proprietaria_id column for independent clinics
  ALTER TABLE public.clinicas ADD COLUMN proprietaria_id UUID REFERENCES auth.users(id);
EXCEPTION WHEN duplicate_column THEN
  -- Column already exists
  NULL;
END $$;

-- Update existing clinicas policies
DROP POLICY IF EXISTS "Proprietárias podem criar clínicas independentes" ON public.clinicas;
DROP POLICY IF EXISTS "Proprietárias podem criar clínicas da organização" ON public.clinicas;
DROP POLICY IF EXISTS "Proprietárias podem ver suas clínicas" ON public.clinicas;
DROP POLICY IF EXISTS "Proprietárias podem atualizar suas clínicas" ON public.clinicas;
DROP POLICY IF EXISTS "Proprietárias podem excluir suas clínicas" ON public.clinicas;

-- Allow proprietarias to create independent clinics (without organization)
CREATE POLICY "Proprietarias can create independent clinics" ON public.clinicas
  FOR INSERT WITH CHECK (
    auth.uid() = criado_por AND
    public.user_has_role(auth.uid(), 'proprietaria') AND
    (organizacao_id IS NULL OR proprietaria_id = auth.uid())
  );

-- Allow proprietarias to create clinics within their organization
CREATE POLICY "Proprietarias can create organization clinics" ON public.clinicas
  FOR INSERT WITH CHECK (
    organizacao_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.organizacoes o
      WHERE o.id = clinicas.organizacao_id
        AND o.criado_por = auth.uid()
    )
  );

-- Allow users to view clinics they have access to
CREATE POLICY "Users can view accessible clinics" ON public.clinicas
  FOR SELECT USING (
    public.user_has_role(auth.uid(), 'super_admin') OR
    proprietaria_id = auth.uid() OR
    criado_por = auth.uid() OR
    EXISTS(
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
        AND (ur.organizacao_id = clinicas.organizacao_id OR ur.clinica_id = clinicas.id)
        AND ur.ativo = true
    ) OR
    (organizacao_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organizacoes o
      WHERE o.id = clinicas.organizacao_id
        AND o.criado_por = auth.uid()
    ))
  );

-- Allow proprietarias to update their clinics
CREATE POLICY "Proprietarias can update their clinics" ON public.clinicas
  FOR UPDATE USING (
    proprietaria_id = auth.uid() OR
    criado_por = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.clinica_id = clinicas.id
        AND ur.role = 'proprietaria'::user_role_type
        AND ur.ativo = true
    ) OR
    (organizacao_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organizacoes o
      WHERE o.id = clinicas.organizacao_id
        AND o.criado_por = auth.uid()
    ))
  )
  WITH CHECK (
    proprietaria_id = auth.uid() OR
    criado_por = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.clinica_id = clinicas.id
        AND ur.role = 'proprietaria'::user_role_type
        AND ur.ativo = true
    ) OR
    (organizacao_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organizacoes o
      WHERE o.id = clinicas.organizacao_id
        AND o.criado_por = auth.uid()
    ))
  );

-- Create policies for other tables that might be accessed during onboarding

-- Profissionais table policies
DROP POLICY IF EXISTS "Users can manage professionals in their clinics" ON public.profissionais;
CREATE POLICY "Users can manage professionals in their clinics" ON public.profissionais
  FOR ALL USING (
    public.user_has_role(auth.uid(), 'super_admin') OR
    user_id = auth.uid() OR
    EXISTS(
      SELECT 1 FROM public.clinicas c
      WHERE c.id = profissionais.clinica_id
        AND (c.proprietaria_id = auth.uid() OR c.criado_por = auth.uid())
    ) OR
    EXISTS(
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.clinica_id = profissionais.clinica_id
        AND ur.role IN ('proprietaria', 'gerente')
        AND ur.ativo = true
    )
  );

-- Servicos table policies  
DROP POLICY IF EXISTS "Users can manage services in their clinics" ON public.servicos;
CREATE POLICY "Users can manage services in their clinics" ON public.servicos
  FOR ALL USING (
    public.user_has_role(auth.uid(), 'super_admin') OR
    EXISTS(
      SELECT 1 FROM public.clinicas c
      WHERE c.id = servicos.clinica_id
        AND (c.proprietaria_id = auth.uid() OR c.criado_por = auth.uid())
    ) OR
    EXISTS(
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.clinica_id = servicos.clinica_id
        AND ur.role IN ('proprietaria', 'gerente', 'profissionais')
        AND ur.ativo = true
    )
  );

-- Create function to update user profile during onboarding
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id uuid,
  p_nome_completo text,
  p_telefone text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only allow users to update their own profile
  IF p_user_id != auth.uid() THEN
    RETURN json_build_object('error', 'Unauthorized');
  END IF;
  
  UPDATE public.profiles 
  SET 
    nome_completo = p_nome_completo,
    telefone = p_telefone,
    atualizado_em = now()
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Profile not found');
  END IF;
  
  RETURN json_build_object('success', true);
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error', SQLERRM);
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_profile(uuid, text, text) TO authenticated;