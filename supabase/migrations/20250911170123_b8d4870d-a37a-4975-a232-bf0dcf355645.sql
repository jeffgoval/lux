-- Corrigir funções sem search_path definido
CREATE OR REPLACE FUNCTION public.atualizar_timestamp_modificacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.atualizado_em = now();
  NEW.versao = OLD.versao + 1;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_active_roles()
 RETURNS TABLE(id uuid, role_name user_role_type, display_name text, description text, permissions jsonb, hierarchy_level integer, color_class text, ativo boolean, criado_em timestamp with time zone, atualizado_em timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;