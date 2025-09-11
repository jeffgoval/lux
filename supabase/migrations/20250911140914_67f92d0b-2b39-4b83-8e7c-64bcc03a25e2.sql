-- Corrigir search_path das funções para segurança

-- Atualizar função assign_user_role
CREATE OR REPLACE FUNCTION public.assign_user_role(
  target_user_id uuid,
  new_role user_role_type,
  org_id uuid DEFAULT NULL,
  clinic_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_role user_role_type;
BEGIN
  -- Verificar se o usuário atual tem permissão
  current_user_role := get_user_role_in_context(auth.uid(), org_id, clinic_id);
  
  -- Validar hierarquia de permissões
  IF current_user_role != 'super_admin' THEN
    -- Apenas super_admin pode criar outros super_admins
    IF new_role = 'super_admin' THEN
      RAISE EXCEPTION 'Apenas super_admin pode atribuir role de super_admin';
    END IF;
    
    -- Apenas super_admin e proprietaria podem criar proprietarias
    IF new_role = 'proprietaria' AND current_user_role != 'proprietaria' THEN
      RAISE EXCEPTION 'Apenas super_admin ou proprietaria pode atribuir role de proprietaria';
    END IF;
    
    -- Apenas roles gerenciais podem atribuir roles
    IF current_user_role NOT IN ('proprietaria', 'gerente') THEN
      RAISE EXCEPTION 'Sem permissão para atribuir roles';
    END IF;
  END IF;

  -- Desativar roles anteriores do usuário no mesmo contexto
  UPDATE user_roles 
  SET ativo = false
  WHERE user_id = target_user_id 
    AND (org_id IS NULL OR organizacao_id = org_id)
    AND (clinic_id IS NULL OR clinica_id = clinic_id)
    AND ativo = true;

  -- Inserir novo role
  INSERT INTO user_roles (
    user_id, role, organizacao_id, clinica_id, 
    ativo, criado_por, criado_em
  ) VALUES (
    target_user_id, new_role, org_id, clinic_id,
    true, auth.uid(), now()
  );

  RETURN true;
END;
$$;

-- Verificar se precisa atualizar outras funções também
-- A função handle_new_user já tem search_path correto
-- As funções user_has_role e get_user_role_in_context já têm search_path correto