-- Create user role enum
CREATE TYPE public.user_role_type AS ENUM (
  'super_admin',
  'proprietaria', 
  'gerente',
  'profissionais',
  'recepcionistas',
  'cliente'
);

-- Create organization plan enum
CREATE TYPE public.plano_type AS ENUM ('basico', 'premium', 'enterprise');

-- Create invitation status enum
CREATE TYPE public.status_convite AS ENUM ('pendente', 'aceito', 'expirado', 'cancelado');

-- Create organizations table
CREATE TABLE public.organizacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  plano plano_type NOT NULL DEFAULT 'basico',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL,
  configuracoes JSONB DEFAULT '{}'::jsonb
);

-- Create clinics table
CREATE TABLE public.clinicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL,
  configuracoes JSONB DEFAULT '{}'::jsonb
);

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  avatar_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  primeiro_acesso BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user roles table (contextual roles)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
  role user_role_type NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL,
  UNIQUE(user_id, organizacao_id, clinica_id, role)
);

-- Create invitations table
CREATE TABLE public.convites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role user_role_type NOT NULL,
  organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
  status status_convite NOT NULL DEFAULT 'pendente',
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  criado_por UUID NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  aceito_em TIMESTAMP WITH TIME ZONE,
  aceito_por UUID REFERENCES auth.users(id)
);

-- Create professional specialties table
CREATE TABLE public.profissionais_especialidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  especialidade TEXT NOT NULL,
  certificacao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais_especialidades ENABLE ROW LEVEL SECURITY;

-- Create security definer functions
CREATE OR REPLACE FUNCTION public.get_user_role_in_context(user_uuid UUID, org_id UUID DEFAULT NULL, clinic_id UUID DEFAULT NULL)
RETURNS user_role_type
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
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
      WHEN 'cliente' THEN 6
    END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_has_role(user_uuid UUID, required_role user_role_type)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = user_uuid 
      AND role = required_role 
      AND ativo = true
  );
$$;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create profiles" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for organizations
CREATE POLICY "Super admins can view all organizations" ON public.organizacoes
  FOR SELECT USING (public.user_has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Proprietarias can view their organizations" ON public.organizacoes
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND organizacao_id = public.organizacoes.id 
        AND role IN ('proprietaria', 'gerente')
        AND ativo = true
    )
  );

-- Create RLS policies for clinics
CREATE POLICY "Users can view clinics they have access to" ON public.clinicas
  FOR SELECT USING (
    public.user_has_role(auth.uid(), 'super_admin') OR
    EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND (organizacao_id = public.clinicas.organizacao_id OR clinica_id = public.clinicas.id)
        AND ativo = true
    )
  );

-- Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (
    auth.uid() = user_id OR
    public.user_has_role(auth.uid(), 'super_admin') OR
    EXISTS(
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = auth.uid()
        AND ur2.role IN ('proprietaria', 'gerente')
        AND ur2.organizacao_id = public.user_roles.organizacao_id
        AND ur2.ativo = true
    )
  );

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome_completo, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add timestamps triggers
CREATE TRIGGER update_organizacoes_updated_at
  BEFORE UPDATE ON public.organizacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinicas_updated_at
  BEFORE UPDATE ON public.clinicas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();