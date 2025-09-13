-- 01 - Foundation Layer (idempotente)
-- Extensões e tipos base necessários pelo sistema

-- Extensões comuns
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum: roles de usuário (alinha com o frontend)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
    CREATE TYPE public.user_role_type AS ENUM (
      'super_admin', 'proprietaria', 'gerente', 'profissionais', 'recepcionistas', 'visitante', 'cliente'
    );
  END IF;
END $$;

-- Função utilitária para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;