-- Fix user_roles RLS policies to allow users to update their own organizacao_id and clinica_id
DROP POLICY IF EXISTS "Users can update their roles" ON public.user_roles;

CREATE POLICY "Users can update their own roles" 
ON public.user_roles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure profiles can be upserted during onboarding
DROP POLICY IF EXISTS "System can upsert profiles" ON public.profiles;

CREATE POLICY "System can upsert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

-- Update the user trigger to ensure profiles are always created/updated
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Upsert profile do usuário
  INSERT INTO public.profiles (
    user_id, 
    nome_completo, 
    email, 
    primeiro_acesso
  ) VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'nome_completo', ''),
    NEW.email,
    true
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    atualizado_em = now();

  -- Check if user already has a role, if not create proprietaria role
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (
      user_id,
      role,
      ativo,
      criado_por
    ) VALUES (
      NEW.id,
      'proprietaria'::user_role_type,
      true,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;