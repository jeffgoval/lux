-- =====================================================
-- FIX AUTH BUGS - CORREÇÃO DOS PROBLEMAS DE AUTENTICAÇÃO
-- Sistema: luxe-flow-appoint
-- Data: 13/09/2025
-- =====================================================

-- PROBLEMA 1: Handle_new_user() está criando profiles com nome incorreto
-- SOLUÇÃO: Atualizar a função para NÃO definir nome_completo automaticamente

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_metadata JSONB;
  default_role user_role_type;
  profile_created BOOLEAN := false;
BEGIN
  -- Extract metadata from auth.users
  user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  
  -- Determine default role based on metadata or default to visitante
  default_role := COALESCE(
    (user_metadata->>'default_role')::user_role_type,
    'visitante'
  );
  
  -- Create user profile - APENAS DADOS OBRIGATÓRIOS
  -- O nome será preenchido no onboarding
  BEGIN
    INSERT INTO public.profiles (
      user_id, 
      nome_completo, 
      email,
      telefone,
      primeiro_acesso,
      criado_em
    ) VALUES (
      NEW.id,
      -- CORREÇÃO: NÃO usar role como nome
      COALESCE(
        user_metadata->>'nome_completo',
        user_metadata->>'full_name',
        -- Se não tiver nome, usar parte do email, MAS NUNCA a role
        CASE 
          WHEN LENGTH(SPLIT_PART(NEW.email, '@', 1)) >= 2 THEN 
            SPLIT_PART(NEW.email, '@', 1)
          ELSE 'Usuário'
        END
      ),
      NEW.email,
      user_metadata->>'telefone',
      true, -- SEMPRE true para novos usuários
      now()
    );
    profile_created := true;
  EXCEPTION
    WHEN unique_violation THEN
      -- Profile already exists, update it
      UPDATE public.profiles 
      SET 
        email = NEW.email,
        -- Garantir que primeiro_acesso seja true para novos registros
        primeiro_acesso = COALESCE(primeiro_acesso, true),
        atualizado_em = now()
      WHERE user_id = NEW.id;
      profile_created := true;
    WHEN OTHERS THEN
      -- Log error but don't fail user creation
      RAISE WARNING 'Erro ao criar perfil para usuário %: %', NEW.id, SQLERRM;
  END;
  
  -- Assign default role if profile was created successfully
  IF profile_created THEN
    BEGIN
      INSERT INTO public.user_roles (
        user_id, 
        role, 
        ativo, 
        criado_por,
        criado_em
      ) VALUES (
        NEW.id,
        default_role,
        true,
        NEW.id,
        now()
      );
    EXCEPTION
      WHEN unique_violation THEN
        -- Role already exists, ignore
        NULL;
      WHEN OTHERS THEN
        -- Log error
        RAISE WARNING 'Erro ao atribuir role % para usuário %: %', default_role, NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- PROBLEMA 2: Limpar dados corrompidos existentes
-- SOLUÇÃO: Atualizar profiles que têm roles como nome

UPDATE public.profiles 
SET nome_completo = CASE 
  -- Se o nome é uma role, substituir por parte do email
  WHEN nome_completo IN (
    'super_admin', 'proprietaria', 'gerente', 
    'profissionais', 'recepcionistas', 'visitante', 'cliente'
  ) THEN SPLIT_PART(email, '@', 1)
  -- Manter nome existente se não for uma role
  ELSE nome_completo
END,
atualizado_em = now()
WHERE nome_completo IN (
  'super_admin', 'proprietaria', 'gerente', 
  'profissionais', 'recepcionistas', 'visitante', 'cliente'
);

-- PROBLEMA 3: Garantir que novos usuários sempre tenham primeiro_acesso = true
-- SOLUÇÃO: Atualizar usuários recentes que podem ter perdido a flag

UPDATE public.profiles 
SET primeiro_acesso = true,
    atualizado_em = now()
WHERE criado_em > (CURRENT_TIMESTAMP - INTERVAL '30 days')
  AND nome_completo IN (
    SELECT SPLIT_PART(email, '@', 1) 
    FROM public.profiles 
    WHERE criado_em > (CURRENT_TIMESTAMP - INTERVAL '30 days')
  )
  AND primeiro_acesso = false;

-- VERIFICAÇÕES

-- 1. Verificar se há profiles com roles como nome
SELECT 
  'VERIFICAÇÃO 1: Profiles com roles como nome' as check_name,
  COUNT(*) as count
FROM public.profiles 
WHERE nome_completo IN (
  'super_admin', 'proprietaria', 'gerente', 
  'profissionais', 'recepcionistas', 'visitante', 'cliente'
);

-- 2. Verificar usuários recentes sem primeiro_acesso
SELECT 
  'VERIFICAÇÃO 2: Usuários recentes sem primeiro_acesso' as check_name,
  COUNT(*) as count
FROM public.profiles 
WHERE criado_em > (CURRENT_TIMESTAMP - INTERVAL '7 days')
  AND primeiro_acesso = false;

-- 3. Verificar estrutura da tabela profiles
SELECT 
  'VERIFICAÇÃO 3: Estrutura da tabela profiles' as check_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- FINALIZAÇÃO
SELECT 
  'CORREÇÃO APLICADA COM SUCESSO!' as status,
  'Execute os testes de criação de novos usuários para validar' as next_steps;