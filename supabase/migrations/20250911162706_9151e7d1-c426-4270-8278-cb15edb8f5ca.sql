-- Verificar se usuários recém-cadastrados estão recebendo role visitante automaticamente
-- Primeiro verificar se existe o trigger handle_new_user para user_roles

-- Se não existir ainda, criar o trigger que assegura role visitante para novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Criar perfil do usuário
  INSERT INTO public.profiles (
    user_id, 
    nome_completo, 
    email, 
    primeiro_acesso
  ) VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'nome_completo', ''),
    NEW.email,
    true
  );

  -- Atribuir role visitante por padrão
  INSERT INTO public.user_roles (
    user_id,
    role,
    ativo,
    criado_por
  ) VALUES (
    NEW.id,
    'visitante'::user_role_type,
    true,
    NEW.id
  );

  RETURN NEW;
END;
$$;

-- Criar o trigger se não existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();