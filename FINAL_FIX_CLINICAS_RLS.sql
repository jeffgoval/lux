-- FINAL FIX: Execute this in Supabase Dashboard SQL Editor
-- This will create only what's missing

-- Step 1: Create the RPC function (drop if exists first)
DROP FUNCTION IF EXISTS public.create_clinic_for_onboarding(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID);

CREATE OR REPLACE FUNCTION public.create_clinic_for_onboarding(
  p_nome TEXT,
  p_cnpj TEXT DEFAULT NULL,
  p_endereco_rua TEXT DEFAULT NULL,
  p_endereco_numero TEXT DEFAULT NULL,
  p_endereco_complemento TEXT DEFAULT NULL,
  p_endereco_bairro TEXT DEFAULT NULL,
  p_endereco_cidade TEXT DEFAULT NULL,
  p_endereco_estado TEXT DEFAULT NULL,
  p_endereco_cep TEXT DEFAULT NULL,
  p_telefone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_horario_funcionamento JSONB DEFAULT NULL,
  p_organizacao_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  nome TEXT,
  cnpj TEXT,
  endereco_rua TEXT,
  endereco_numero TEXT,
  endereco_complemento TEXT,
  endereco_bairro TEXT,
  endereco_cidade TEXT,
  endereco_estado TEXT,
  endereco_cep TEXT,
  telefone TEXT,
  email TEXT,
  horario_funcionamento JSONB,
  organizacao_id UUID,
  ativo BOOLEAN,
  criado_em TIMESTAMP WITH TIME ZONE,
  atualizado_em TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result_record RECORD;
BEGIN
  -- Check if user is authenticated and has proprietaria role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'proprietaria'::user_role_type
      AND ur.ativo = true
  ) THEN
    RAISE EXCEPTION 'User must have proprietaria role to create clinics';
  END IF;

  -- Insert the clinic
  INSERT INTO public.clinicas (
    nome,
    cnpj,
    endereco_rua,
    endereco_numero,
    endereco_complemento,
    endereco_bairro,
    endereco_cidade,
    endereco_estado,
    endereco_cep,
    telefone,
    email,
    horario_funcionamento,
    organizacao_id
  ) VALUES (
    p_nome,
    p_cnpj,
    p_endereco_rua,
    p_endereco_numero,
    p_endereco_complemento,
    p_endereco_bairro,
    p_endereco_cidade,
    p_endereco_estado,
    p_endereco_cep,
    p_telefone,
    p_email,
    p_horario_funcionamento,
    p_organizacao_id
  ) RETURNING clinicas.* INTO result_record;

  -- Return the created clinic
  RETURN QUERY SELECT 
    result_record.id,
    result_record.nome,
    result_record.cnpj,
    result_record.endereco_rua,
    result_record.endereco_numero,
    result_record.endereco_complemento,
    result_record.endereco_bairro,
    result_record.endereco_cidade,
    result_record.endereco_estado,
    result_record.endereco_cep,
    result_record.telefone,
    result_record.email,
    result_record.horario_funcionamento,
    result_record.organizacao_id,
    result_record.ativo,
    result_record.criado_em,
    result_record.atualizado_em;
END;
$$;

-- Step 2: Check if INSERT policy exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'clinicas' 
      AND policyname = 'Proprietárias podem criar clínicas'
      AND cmd = 'INSERT'
  ) THEN
    CREATE POLICY "Proprietárias podem criar clínicas"
    ON public.clinicas
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role = 'proprietaria'::user_role_type
          AND ur.ativo = true
      )
    );
    RAISE NOTICE 'INSERT policy created successfully';
  ELSE
    RAISE NOTICE 'INSERT policy already exists';
  END IF;
END $$;

-- Verify everything is working
SELECT 'Function and policies are ready!' as status;
