-- =====================================================
-- CORREÇÃO DA FUNÇÃO handle_new_user
-- Execute este bloco completo no Supabase SQL Editor
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar perfil básico para novo usuário
  INSERT INTO public.profiles (
    user_id, 
    nome_completo, 
    email,
    primeiro_acesso,
    ativo,
    criado_em
  ) VALUES (
    NEW.id,
    -- NUNCA usar role como nome, sempre usar parte do email
    COALESCE(
      NEW.raw_user_meta_data->>'nome_completo',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1),
      'Usuário'
    ),
    NEW.email,
    true, -- SEMPRE true para novos usuários
    true,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = NEW.email,
    primeiro_acesso = COALESCE(public.profiles.primeiro_acesso, true),
    atualizado_em = now();

  -- Criar role padrão
  INSERT INTO public.user_roles (
    user_id, 
    role, 
    ativo, 
    criado_por,
    criado_em
  ) VALUES (
    NEW.id,
    'visitante',
    true,
    NEW.id,
    now()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log erro mas não bloquear criação do usuário
    RAISE WARNING 'Erro ao criar perfil/role para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;