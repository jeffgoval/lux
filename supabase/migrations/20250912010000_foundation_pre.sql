-- Foundation pre-requisites to satisfy older migrations
-- Ensure enums and functions exist before other migrations that depend on them

-- Enum: user_role_type used by older migrations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
    CREATE TYPE public.user_role_type AS ENUM (
      'super_admin', 'proprietaria', 'gerente', 'profissionais', 'recepcionistas', 'visitante', 'cliente'
    );
  END IF;
END $$;

-- Utility function for updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;