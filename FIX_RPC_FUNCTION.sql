-- Fix the RPC function to return the clinic ID correctly
-- Execute this in Supabase Dashboard SQL Editor

-- Drop the existing function
DROP FUNCTION IF EXISTS public.create_clinic_for_onboarding(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);

-- Create the function with correct return type
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
  p_horario_funcionamento JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_clinic_id UUID;
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

  -- Insert the clinic and return the ID
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
    horario_funcionamento
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
    p_horario_funcionamento
  ) RETURNING id INTO new_clinic_id;

  -- Return the clinic ID
  RETURN new_clinic_id;
END;
$$;

-- Verify the function was created
SELECT 'Function fixed to return UUID!' as status;
