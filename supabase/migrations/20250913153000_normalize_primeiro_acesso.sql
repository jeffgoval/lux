-- Migration: normalize primeiro_acesso for legacy users
-- Safe to run multiple times (idempotent)

begin;

-- 1) Add column if not exists
alter table if exists public.profiles
  add column if not exists primeiro_acesso boolean not null default true;

-- 2) Normalize legacy users: if user already has any active role, they shouldn't be in first access
DO $$
DECLARE
  has_user_id boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
  ) INTO has_user_id;

  IF has_user_id THEN
    UPDATE public.profiles p
       SET primeiro_acesso = false
     WHERE p.primeiro_acesso IS true
       AND EXISTS (
         SELECT 1
           FROM public.user_roles r
          WHERE r.user_id = p.user_id
            AND r.ativo = true
       );
  ELSE
    UPDATE public.profiles p
       SET primeiro_acesso = false
     WHERE p.primeiro_acesso IS true
       AND EXISTS (
         SELECT 1
           FROM public.user_roles r
          WHERE r.user_id = p.id
            AND r.ativo = true
       );
  END IF;
END $$;

commit;
