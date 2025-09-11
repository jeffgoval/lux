-- Primeiro, adicionar o novo valor 'visitante' ao enum
ALTER TYPE public.user_role_type ADD VALUE 'visitante';

-- Atualizar todos os registros existentes de 'cliente' para 'visitante'
UPDATE public.user_roles 
SET role = 'visitante' 
WHERE role = 'cliente';

-- Remover o valor 'cliente' do enum (isso será feito em uma migração separada se necessário)
-- Por enquanto, mantemos ambos para compatibilidade

-- Atualizar a função handle_new_user para usar 'visitante'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer SET search_path = public
AS $function$
BEGIN
  -- Inserir perfil
  INSERT INTO public.profiles (user_id, nome_completo, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    NEW.email
  );
  
  -- Atribuir role padrão "visitante"
  INSERT INTO public.user_roles (user_id, role, ativo, criado_por)
  VALUES (
    NEW.id,
    'visitante',
    true,
    NEW.id
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar perfil/role para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Atualizar a função get_user_role_in_context
CREATE OR REPLACE FUNCTION public.get_user_role_in_context(user_uuid uuid, org_id uuid DEFAULT NULL::uuid, clinic_id uuid DEFAULT NULL::uuid)
RETURNS user_role_type
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role 
  FROM public.user_roles 
  WHERE user_id = user_uuid 
    AND ativo = true
    AND (org_id IS NULL OR organizacao_id = org_id)
    AND (clinic_id IS NULL OR clinica_id = clinic_id)
  ORDER BY 
    CASE role 
      WHEN 'super_admin' THEN 1
      WHEN 'proprietaria' THEN 2
      WHEN 'gerente' THEN 3
      WHEN 'profissionais' THEN 4
      WHEN 'recepcionistas' THEN 5
      WHEN 'visitante' THEN 6
      WHEN 'cliente' THEN 7
    END
  LIMIT 1;
$function$;