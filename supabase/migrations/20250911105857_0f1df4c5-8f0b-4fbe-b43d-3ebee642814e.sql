-- Remover TODAS as políticas da tabela user_roles primeiro
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Managers can view organization roles" ON public.user_roles;

-- Recriar políticas simples sem recursão
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Fase 2: Modificar trigger para atribuir role padrão
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Função melhorada para criar perfil e atribuir role padrão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir perfil
  INSERT INTO public.profiles (user_id, nome_completo, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    NEW.email
  );
  
  -- Atribuir role padrão "cliente"
  INSERT INTO public.user_roles (user_id, role, ativo, criado_por)
  VALUES (
    NEW.id,
    'cliente',
    true,
    NEW.id
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro mas não bloqueia o cadastro
    RAISE WARNING 'Erro ao criar perfil/role para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recriar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Permitir usuários criarem seus próprios roles iniciais
CREATE POLICY "Users can create their initial role" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'cliente'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid()
  )
);