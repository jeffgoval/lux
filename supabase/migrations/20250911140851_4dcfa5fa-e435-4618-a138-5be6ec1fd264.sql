-- Remover todas as políticas existentes da tabela user_roles
DO $$
DECLARE
    pol_name text;
BEGIN
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_roles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', pol_name);
    END LOOP;
END $$;

-- Remover triggers existentes
DROP TRIGGER IF EXISTS validate_role_hierarchy_trigger ON public.user_roles;

-- Recriar políticas RLS para user_roles
CREATE POLICY "users_can_view_own_roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "super_admins_can_view_all_roles" 
ON public.user_roles 
FOR SELECT 
USING (user_has_role(auth.uid(), 'super_admin'::user_role_type));

CREATE POLICY "managers_can_view_team_roles" 
ON public.user_roles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur1
    JOIN user_roles ur2 ON ur1.organizacao_id = ur2.organizacao_id
    WHERE ur1.user_id = auth.uid() 
      AND ur1.role IN ('proprietaria', 'gerente')
      AND ur1.ativo = true
      AND ur2.user_id = user_roles.user_id
      AND ur2.ativo = true
  )
);

-- Política para inserção
CREATE POLICY "system_can_create_roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  -- Sistema pode criar via trigger (criado_por NULL)
  (criado_por IS NULL) OR
  -- Super_admin pode criar qualquer role
  user_has_role(auth.uid(), 'super_admin'::user_role_type) OR
  -- Usuário pode criar seu próprio role inicial de visitante
  (auth.uid() = criado_por AND role = 'visitante'::user_role_type) OR
  -- Proprietarias e gerentes podem criar roles em sua organização
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('proprietaria', 'gerente')
      AND ur.ativo = true
      AND ur.organizacao_id = user_roles.organizacao_id
  )
);

-- Política para atualização
CREATE POLICY "managers_can_update_roles" 
ON public.user_roles 
FOR UPDATE 
USING (
  user_has_role(auth.uid(), 'super_admin'::user_role_type) OR
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('proprietaria', 'gerente')
      AND ur.ativo = true
      AND ur.organizacao_id = user_roles.organizacao_id
  )
);

-- Atualizar a função handle_new_user para não usar criado_por
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Inserir perfil
  INSERT INTO public.profiles (user_id, nome_completo, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    NEW.email
  );
  
  -- Atribuir role padrão "visitante" sem criado_por para permitir inserção via sistema
  INSERT INTO public.user_roles (user_id, role, ativo, criado_em)
  VALUES (
    NEW.id,
    'visitante'::user_role_type,
    true,
    now()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar perfil/role para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Criar função helper para gerenciar roles com melhor controle
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