-- Remover a função validate_role_hierarchy que está causando o aviso de segurança
-- Esta função não está sendo usada pois removemos o trigger

DROP FUNCTION IF EXISTS public.validate_role_hierarchy() CASCADE;