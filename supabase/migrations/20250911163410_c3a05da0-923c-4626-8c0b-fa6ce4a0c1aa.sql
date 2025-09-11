-- Criar função para buscar roles ativas
CREATE OR REPLACE FUNCTION public.get_active_roles()
RETURNS TABLE (
  id uuid,
  role_name user_role_type,
  display_name text,
  description text,
  permissions jsonb,
  hierarchy_level integer,
  color_class text,
  ativo boolean,
  criado_em timestamp with time zone,
  atualizado_em timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    role_name,
    display_name,
    description,
    permissions,
    hierarchy_level,
    color_class,
    ativo,
    criado_em,
    atualizado_em
  FROM public.roles 
  WHERE ativo = true 
  ORDER BY hierarchy_level;
$$;