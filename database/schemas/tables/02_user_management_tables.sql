-- =====================================================
-- USER MANAGEMENT TABLES
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- =====================================================
-- USER PROFILES TABLE
-- =====================================================

-- Table for user profiles extending auth.users
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  avatar_url TEXT,
  cpf TEXT,
  data_nascimento DATE,
  endereco JSONB,
  ativo BOOLEAN NOT NULL DEFAULT true,
  primeiro_acesso BOOLEAN NOT NULL DEFAULT true,
  configuracoes_usuario JSONB DEFAULT '{}'::jsonb,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT profiles_email_valid CHECK (public.validate_email(email)),
  CONSTRAINT profiles_cpf_valid CHECK (cpf IS NULL OR public.validate_cpf(cpf)),
  CONSTRAINT profiles_telefone_format CHECK (telefone IS NULL OR telefone ~ '^\+?[1-9]\d{1,14}$')
);

-- =====================================================
-- USER ROLES TABLE
-- =====================================================

-- Table for contextual user roles (multi-tenant support)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organizacao_id UUID, -- Will reference organizacoes(id) when that table is created
  clinica_id UUID,     -- Will reference clinicas(id) when that table is created
  role user_role_type NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  observacoes TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL,
  
  -- Constraints
  CONSTRAINT user_roles_date_logic CHECK (data_fim IS NULL OR data_fim > data_inicio),
  CONSTRAINT user_roles_unique_active UNIQUE(user_id, organizacao_id, clinica_id, role) DEFERRABLE INITIALLY DEFERRED
);

-- =====================================================
-- PROFESSIONAL SPECIALTIES TABLE
-- =====================================================

-- Table for professional specialties and certifications
CREATE TABLE public.profissionais_especialidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  especialidade especialidade_medica NOT NULL,
  certificacao TEXT,
  numero_registro TEXT,
  orgao_emissor TEXT,
  data_emissao DATE,
  data_validade DATE,
  documento_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT especialidades_validade_logic CHECK (data_validade IS NULL OR data_validade > data_emissao),
  UNIQUE(user_id, especialidade, numero_registro)
);

-- =====================================================
-- INVITATIONS TABLE
-- =====================================================

-- Table for user invitations to organizations/clinics
CREATE TABLE public.convites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role user_role_type NOT NULL,
  organizacao_id UUID, -- Will reference organizacoes(id) when that table is created
  clinica_id UUID,     -- Will reference clinicas(id) when that table is created
  status status_convite NOT NULL DEFAULT 'pendente',
  token TEXT NOT NULL UNIQUE DEFAULT public.generate_secure_token(32),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  mensagem_personalizada TEXT,
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  aceito_em TIMESTAMP WITH TIME ZONE,
  aceito_por UUID REFERENCES auth.users(id),
  cancelado_em TIMESTAMP WITH TIME ZONE,
  cancelado_por UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT convites_email_valid CHECK (public.validate_email(email)),
  CONSTRAINT convites_expires_future CHECK (expires_at > criado_em),
  CONSTRAINT convites_aceito_logic CHECK (
    (status = 'aceito' AND aceito_em IS NOT NULL AND aceito_por IS NOT NULL) OR
    (status != 'aceito' AND aceito_em IS NULL)
  ),
  CONSTRAINT convites_cancelado_logic CHECK (
    (status = 'cancelado' AND cancelado_em IS NOT NULL AND cancelado_por IS NOT NULL) OR
    (status != 'cancelado' AND cancelado_em IS NULL)
  )
);

-- =====================================================
-- USER SESSIONS TABLE
-- =====================================================

-- Table for tracking user sessions and activity
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  location_info JSONB,
  login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  logout_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Constraints
  CONSTRAINT sessions_logout_logic CHECK (logout_at IS NULL OR logout_at >= login_at),
  CONSTRAINT sessions_activity_logic CHECK (last_activity >= login_at)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for profiles table
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_cpf ON public.profiles(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX idx_profiles_ativo ON public.profiles(ativo);

-- Indexes for user_roles table
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_organizacao ON public.user_roles(organizacao_id) WHERE organizacao_id IS NOT NULL;
CREATE INDEX idx_user_roles_clinica ON public.user_roles(clinica_id) WHERE clinica_id IS NOT NULL;
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_user_roles_ativo ON public.user_roles(ativo);
CREATE INDEX idx_user_roles_composite ON public.user_roles(user_id, organizacao_id, clinica_id, ativo);

-- Indexes for specialties table
CREATE INDEX idx_especialidades_user_id ON public.profissionais_especialidades(user_id);
CREATE INDEX idx_especialidades_tipo ON public.profissionais_especialidades(especialidade);
CREATE INDEX idx_especialidades_ativo ON public.profissionais_especialidades(ativo);
CREATE INDEX idx_especialidades_validade ON public.profissionais_especialidades(data_validade) WHERE data_validade IS NOT NULL;

-- Indexes for invitations table
CREATE INDEX idx_convites_email ON public.convites(email);
CREATE INDEX idx_convites_token ON public.convites(token);
CREATE INDEX idx_convites_status ON public.convites(status);
CREATE INDEX idx_convites_organizacao ON public.convites(organizacao_id) WHERE organizacao_id IS NOT NULL;
CREATE INDEX idx_convites_clinica ON public.convites(clinica_id) WHERE clinica_id IS NOT NULL;
CREATE INDEX idx_convites_expires ON public.convites(expires_at);

-- Indexes for sessions table
CREATE INDEX idx_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_sessions_token ON public.user_sessions(session_token);
CREATE INDEX idx_sessions_ativo ON public.user_sessions(ativo);
CREATE INDEX idx_sessions_last_activity ON public.user_sessions(last_activity);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Trigger for updating timestamps in profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating timestamps in specialties
CREATE TRIGGER update_especialidades_updated_at
  BEFORE UPDATE ON public.profissionais_especialidades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating last activity in sessions
CREATE OR REPLACE FUNCTION public.update_session_activity()
RETURNS TRIGGER AS $
BEGIN
  NEW.last_activity = now();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER update_sessions_activity
  BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_activity();

-- =====================================================
-- USER MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
BEGIN
  -- Insert profile for new user
  INSERT INTO public.profiles (user_id, nome_completo, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    NEW.email
  );
  
  -- Assign default 'visitante' role
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
    -- Log error but don't block user creation
    RAISE WARNING 'Error creating profile/role for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update user profile during onboarding
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id UUID,
  p_nome_completo TEXT,
  p_telefone TEXT DEFAULT NULL,
  p_cpf TEXT DEFAULT NULL,
  p_data_nascimento DATE DEFAULT NULL,
  p_endereco JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $
BEGIN
  UPDATE public.profiles 
  SET 
    nome_completo = p_nome_completo,
    telefone = p_telefone,
    cpf = p_cpf,
    data_nascimento = p_data_nascimento,
    endereco = p_endereco,
    primeiro_acesso = false,
    atualizado_em = now()
  WHERE user_id = p_user_id;
  
  RETURN FOUND;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to assign role to user
CREATE OR REPLACE FUNCTION public.assign_user_role(
  p_user_id UUID,
  p_role user_role_type,
  p_organizacao_id UUID DEFAULT NULL,
  p_clinica_id UUID DEFAULT NULL,
  p_assigned_by UUID DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  new_role_id UUID;
BEGIN
  -- Check if user already has this role in this context
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id 
      AND role = p_role 
      AND COALESCE(organizacao_id, '00000000-0000-0000-0000-000000000000') = COALESCE(p_organizacao_id, '00000000-0000-0000-0000-000000000000')
      AND COALESCE(clinica_id, '00000000-0000-0000-0000-000000000000') = COALESCE(p_clinica_id, '00000000-0000-0000-0000-000000000000')
      AND ativo = true
  ) THEN
    RAISE EXCEPTION 'User already has role % in this context', p_role;
  END IF;
  
  -- Insert new role
  INSERT INTO public.user_roles (
    user_id, 
    role, 
    organizacao_id, 
    clinica_id, 
    criado_por
  ) VALUES (
    p_user_id,
    p_role,
    p_organizacao_id,
    p_clinica_id,
    COALESCE(p_assigned_by, auth.uid())
  ) RETURNING id INTO new_role_id;
  
  RETURN new_role_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to revoke user role
CREATE OR REPLACE FUNCTION public.revoke_user_role(
  p_user_id UUID,
  p_role user_role_type,
  p_organizacao_id UUID DEFAULT NULL,
  p_clinica_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $
BEGIN
  UPDATE public.user_roles 
  SET 
    ativo = false,
    data_fim = CURRENT_DATE
  WHERE user_id = p_user_id 
    AND role = p_role 
    AND COALESCE(organizacao_id, '00000000-0000-0000-0000-000000000000') = COALESCE(p_organizacao_id, '00000000-0000-0000-0000-000000000000')
    AND COALESCE(clinica_id, '00000000-0000-0000-0000-000000000000') = COALESCE(p_clinica_id, '00000000-0000-0000-0000-000000000000')
    AND ativo = true;
  
  RETURN FOUND;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token TEXT)
RETURNS JSONB AS $
DECLARE
  invite_record RECORD;
  new_role_id UUID;
BEGIN
  -- Get invitation details
  SELECT * INTO invite_record
  FROM public.convites 
  WHERE token = p_token 
    AND status = 'pendente' 
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Check if user exists and email matches
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
      AND email = invite_record.email
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email mismatch or user not found');
  END IF;
  
  -- Assign role to user
  SELECT public.assign_user_role(
    auth.uid(),
    invite_record.role,
    invite_record.organizacao_id,
    invite_record.clinica_id,
    invite_record.criado_por
  ) INTO new_role_id;
  
  -- Update invitation status
  UPDATE public.convites 
  SET 
    status = 'aceito',
    aceito_em = now(),
    aceito_por = auth.uid()
  WHERE id = invite_record.id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'role_id', new_role_id,
    'role', invite_record.role,
    'organizacao_id', invite_record.organizacao_id,
    'clinica_id', invite_record.clinica_id
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais_especialidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create profiles" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'super_admin' 
    AND ur.ativo = true
  )
);

CREATE POLICY "Managers can view organization roles" 
ON public.user_roles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('proprietaria', 'gerente') 
    AND ur.organizacao_id = user_roles.organizacao_id 
    AND ur.ativo = true
  )
);

CREATE POLICY "Users can create their initial role" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'visitante'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid()
  )
);

-- Policies for specialties
CREATE POLICY "Users can view their own specialties" ON public.profissionais_especialidades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own specialties" ON public.profissionais_especialidades
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Managers can view team specialties" ON public.profissionais_especialidades
  FOR SELECT USING (
    public.user_has_role(auth.uid(), 'super_admin') OR
    EXISTS(
      SELECT 1 FROM public.user_roles ur1
      JOIN public.user_roles ur2 ON ur1.organizacao_id = ur2.organizacao_id
      WHERE ur1.user_id = auth.uid() 
        AND ur1.role IN ('proprietaria', 'gerente')
        AND ur1.ativo = true
        AND ur2.user_id = public.profissionais_especialidades.user_id
        AND ur2.ativo = true
    )
  );

-- Policies for invitations
CREATE POLICY "Users can view invitations sent to their email" ON public.convites
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Managers can manage invitations for their organization" ON public.convites
  FOR ALL USING (
    public.user_has_role(auth.uid(), 'super_admin') OR
    EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND organizacao_id = public.convites.organizacao_id 
        AND role IN ('proprietaria', 'gerente')
        AND ativo = true
    )
  );

-- Policies for sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- CREATE TRIGGER FOR NEW USERS
-- =====================================================

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- COMPLETION VERIFICATION
-- =====================================================

-- Verify all tables were created successfully
DO $
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'user_roles', 'profissionais_especialidades', 'convites', 'user_sessions');
  
  IF table_count = 5 THEN
    RAISE NOTICE 'User management tables created successfully: % tables', table_count;
  ELSE
    RAISE EXCEPTION 'User management tables incomplete - only % tables created', table_count;
  END IF;
END $;

-- Add comment to track completion
COMMENT ON TABLE public.profiles IS 'User profiles table - created ' || now();
COMMENT ON TABLE public.user_roles IS 'User roles table with multi-tenant support - created ' || now();
COMMENT ON TABLE public.profissionais_especialidades IS 'Professional specialties table - created ' || now();
COMMENT ON TABLE public.convites IS 'User invitations table - created ' || now();
COMMENT ON TABLE public.user_sessions IS 'User sessions tracking table - created ' || now();