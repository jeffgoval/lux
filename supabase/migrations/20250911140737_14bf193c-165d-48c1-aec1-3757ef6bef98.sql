-- Verificar e ajustar a tabela user_roles e suas políticas

-- Primeiro, vamos verificar se a função handle_new_user está criando o role corretamente
-- e ajustar as políticas RLS da tabela user_roles

-- Remover políticas existentes para recriar corretamente
DROP POLICY IF EXISTS "Users can create initial role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Criar políticas RLS mais robustas para user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (user_has_role(auth.uid(), 'super_admin'::user_role_type));

CREATE POLICY "Proprietarias and gerentes can view team roles" 
ON public.user_roles 
FOR SELECT 
USING (
  user_has_role(auth.uid(), 'super_admin'::user_role_type) OR
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

-- Política para inserção - apenas sistema pode criar roles iniciais
CREATE POLICY "System can create initial roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  -- Permite criar role inicial de visitante para próprio usuário
  (auth.uid() = criado_por AND role = 'visitante'::user_role_type) OR
  -- Permite sistema criar roles via trigger
  (criado_por IS NULL) OR
  -- Permite super_admin criar qualquer role
  user_has_role(auth.uid(), 'super_admin'::user_role_type) OR
  -- Permite proprietarias e gerentes criar roles em sua organização
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('proprietaria', 'gerente')
      AND ur.ativo = true
      AND ur.organizacao_id = user_roles.organizacao_id
  )
);

-- Política para atualização - apenas gestores podem alterar roles
CREATE POLICY "Managers can update roles" 
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

-- Criar função para validar hierarquia de roles
CREATE OR REPLACE FUNCTION public.validate_role_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- Impedir que roles inferiores criem roles superiores
  IF NEW.role = 'super_admin' AND NOT user_has_role(auth.uid(), 'super_admin'::user_role_type) THEN
    RAISE EXCEPTION 'Apenas super_admin pode criar roles de super_admin';
  END IF;
  
  IF NEW.role = 'proprietaria' AND NOT (
    user_has_role(auth.uid(), 'super_admin'::user_role_type) OR
    user_has_role(auth.uid(), 'proprietaria'::user_role_type)
  ) THEN
    RAISE EXCEPTION 'Apenas super_admin ou proprietaria pode criar roles de proprietaria';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para validar hierarquia
CREATE TRIGGER validate_role_hierarchy_trigger
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_hierarchy();

-- Atualizar a função handle_new_user para ser mais robusta
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
  
  -- Atribuir role padrão "visitante"
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

-- Criar função helper para gerenciar roles
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
BEGIN
  -- Verificar permissões
  IF NOT (
    user_has_role(auth.uid(), 'super_admin'::user_role_type) OR
    (new_role != 'super_admin' AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('proprietaria', 'gerente')
        AND ur.ativo = true
        AND (org_id IS NULL OR ur.organizacao_id = org_id)
    ))
  ) THEN
    RAISE EXCEPTION 'Sem permissão para atribuir este role';
  END IF;

  -- Desativar roles anteriores do mesmo tipo/contexto
  UPDATE user_roles 
  SET ativo = false, atualizado_em = now()
  WHERE user_id = target_user_id 
    AND (org_id IS NULL OR organizacao_id = org_id)
    AND (clinic_id IS NULL OR clinica_id = clinic_id);

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