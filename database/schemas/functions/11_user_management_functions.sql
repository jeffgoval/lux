-- =====================================================
-- USER MANAGEMENT FUNCTIONS
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- =====================================================
-- ENHANCED USER REGISTRATION AND ONBOARDING
-- =====================================================

-- Enhanced function to handle new user registration with comprehensive setup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
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
  
  -- Create user profile
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
      COALESCE(
        user_metadata->>'nome_completo',
        user_metadata->>'full_name', 
        SPLIT_PART(NEW.email, '@', 1)
      ),
      NEW.email,
      user_metadata->>'telefone',
      true,
      now()
    );
    profile_created := true;
  EXCEPTION
    WHEN unique_violation THEN
      -- Profile already exists, update it
      UPDATE public.profiles 
      SET 
        email = NEW.email,
        atualizado_em = now()
      WHERE user_id = NEW.id;
      profile_created := true;
    WHEN OTHERS THEN
      -- Log error but don't fail user creation
      PERFORM public.log_evento_sistema(
        'profile_creation_error',
        'sistema',
        'error',
        'Failed to create user profile',
        format('Error creating profile for user %s: %s', NEW.id, SQLERRM),
        jsonb_build_object('user_id', NEW.id, 'error', SQLERRM)
      );
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
        PERFORM public.log_evento_sistema(
          'role_assignment_error',
          'sistema',
          'error',
          'Failed to assign default role',
          format('Error assigning role %s to user %s: %s', default_role, NEW.id, SQLERRM),
          jsonb_build_object('user_id', NEW.id, 'role', default_role, 'error', SQLERRM)
        );
    END;
    
    -- Log successful user creation
    PERFORM public.log_evento_sistema(
      'user_created',
      'usuario',
      'info',
      'New user registered',
      format('User %s (%s) registered successfully with role %s', NEW.email, NEW.id, default_role),
      jsonb_build_object('user_id', NEW.id, 'email', NEW.email, 'role', default_role)
    );
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- USER PROFILE MANAGEMENT FUNCTIONS
-- =====================================================

-- Enhanced function to update user profile during onboarding
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id UUID,
  p_nome_completo TEXT,
  p_telefone TEXT DEFAULT NULL,
  p_cpf TEXT DEFAULT NULL,
  p_data_nascimento DATE DEFAULT NULL,
  p_endereco JSONB DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_configuracoes_usuario JSONB DEFAULT NULL
)
RETURNS JSONB AS $
DECLARE
  updated_profile RECORD;
  validation_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Validate inputs
  IF p_nome_completo IS NULL OR LENGTH(TRIM(p_nome_completo)) < 2 THEN
    validation_errors := array_append(validation_errors, 'Nome completo deve ter pelo menos 2 caracteres');
  END IF;
  
  IF p_cpf IS NOT NULL AND NOT public.validate_cpf(p_cpf) THEN
    validation_errors := array_append(validation_errors, 'CPF inválido');
  END IF;
  
  IF p_telefone IS NOT NULL AND NOT (p_telefone ~ '^\+?[1-9]\d{1,14}$') THEN
    validation_errors := array_append(validation_errors, 'Telefone inválido');
  END IF;
  
  IF p_data_nascimento IS NOT NULL AND (p_data_nascimento > CURRENT_DATE OR p_data_nascimento < CURRENT_DATE - INTERVAL '120 years') THEN
    validation_errors := array_append(validation_errors, 'Data de nascimento inválida');
  END IF;
  
  -- Return validation errors if any
  IF array_length(validation_errors, 1) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', to_jsonb(validation_errors)
    );
  END IF;
  
  -- Update profile
  UPDATE public.profiles 
  SET 
    nome_completo = p_nome_completo,
    telefone = p_telefone,
    cpf = p_cpf,
    data_nascimento = p_data_nascimento,
    endereco = COALESCE(p_endereco, endereco),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    configuracoes_usuario = COALESCE(p_configuracoes_usuario, configuracoes_usuario),
    primeiro_acesso = false,
    atualizado_em = now()
  WHERE user_id = p_user_id
  RETURNING * INTO updated_profile;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Perfil não encontrado'
    );
  END IF;
  
  -- Log profile update
  PERFORM public.log_evento_sistema(
    'profile_updated',
    'usuario',
    'info',
    'User profile updated',
    format('Profile updated for user %s', p_user_id),
    jsonb_build_object('user_id', p_user_id, 'updated_fields', 
      ARRAY['nome_completo', 'telefone', 'cpf', 'data_nascimento', 'endereco'])
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'profile', row_to_json(updated_profile)
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get complete user profile with roles and permissions
CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id UUID DEFAULT NULL)
RETURNS JSONB AS $
DECLARE
  target_user_id UUID;
  user_profile RECORD;
  user_roles_data JSONB;
  user_permissions JSONB;
  user_clinics JSONB;
  user_organizations JSONB;
BEGIN
  target_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Check if user can access this profile
  IF target_user_id != auth.uid() AND NOT public.user_has_role(auth.uid(), 'super_admin') THEN
    -- Check if user is manager in same organization/clinic
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles ur1
      JOIN public.user_roles ur2 ON (
        ur1.organizacao_id = ur2.organizacao_id OR 
        ur1.clinica_id = ur2.clinica_id
      )
      WHERE ur1.user_id = auth.uid()
        AND ur1.role IN ('proprietaria', 'gerente')
        AND ur1.ativo = true
        AND ur2.user_id = target_user_id
        AND ur2.ativo = true
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Acesso negado'
      );
    END IF;
  END IF;
  
  -- Get user profile
  SELECT * INTO user_profile
  FROM public.profiles
  WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Perfil não encontrado'
    );
  END IF;
  
  -- Get user roles
  SELECT jsonb_agg(
    jsonb_build_object(
      'role', ur.role,
      'organizacao_id', ur.organizacao_id,
      'clinica_id', ur.clinica_id,
      'ativo', ur.ativo,
      'data_inicio', ur.data_inicio,
      'data_fim', ur.data_fim
    )
  ) INTO user_roles_data
  FROM public.user_roles ur
  WHERE ur.user_id = target_user_id;
  
  -- Get user permissions (from cache if available)
  SELECT jsonb_agg(
    jsonb_build_object(
      'organizacao_id', upc.organizacao_id,
      'clinica_id', upc.clinica_id,
      'permissions', upc.permissions
    )
  ) INTO user_permissions
  FROM public.user_permissions_cache upc
  WHERE upc.user_id = target_user_id;
  
  -- Get accessible clinics
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'nome', c.nome,
      'endereco_cidade', c.endereco_cidade,
      'endereco_estado', c.endereco_estado
    )
  ) INTO user_clinics
  FROM public.clinicas c
  WHERE c.id = ANY(public.get_user_clinics(target_user_id));
  
  -- Get accessible organizations
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'nome', o.nome,
      'plano', o.plano
    )
  ) INTO user_organizations
  FROM public.organizacoes o
  WHERE o.id = ANY(public.get_user_organizations(target_user_id));
  
  RETURN jsonb_build_object(
    'success', true,
    'profile', row_to_json(user_profile),
    'roles', COALESCE(user_roles_data, '[]'::jsonb),
    'permissions', COALESCE(user_permissions, '[]'::jsonb),
    'clinics', COALESCE(user_clinics, '[]'::jsonb),
    'organizations', COALESCE(user_organizations, '[]'::jsonb)
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- ROLE MANAGEMENT FUNCTIONS
-- =====================================================

-- Enhanced function to assign role to user with validation
CREATE OR REPLACE FUNCTION public.assign_user_role(
  p_user_id UUID,
  p_role user_role_type,
  p_organizacao_id UUID DEFAULT NULL,
  p_clinica_id UUID DEFAULT NULL,
  p_data_inicio DATE DEFAULT CURRENT_DATE,
  p_data_fim DATE DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL
)
RETURNS JSONB AS $
DECLARE
  new_role_id UUID;
  assigner_role user_role_type;
  validation_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Get assigner's role
  SELECT public.get_user_role_in_context(auth.uid(), p_organizacao_id, p_clinica_id) INTO assigner_role;
  
  -- Validate permissions to assign role
  IF NOT (
    assigner_role = 'super_admin' OR
    (assigner_role IN ('proprietaria', 'gerente') AND p_role NOT IN ('super_admin', 'proprietaria'))
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permissão insuficiente para atribuir este role'
    );
  END IF;
  
  -- Validate role assignment rules
  IF p_role = 'proprietaria' AND p_organizacao_id IS NULL THEN
    validation_errors := array_append(validation_errors, 'Proprietária deve estar associada a uma organização');
  END IF;
  
  IF p_role IN ('profissionais', 'recepcionistas') AND p_clinica_id IS NULL THEN
    validation_errors := array_append(validation_errors, 'Profissionais e recepcionistas devem estar associados a uma clínica');
  END IF;
  
  IF p_data_fim IS NOT NULL AND p_data_fim <= p_data_inicio THEN
    validation_errors := array_append(validation_errors, 'Data fim deve ser posterior à data início');
  END IF;
  
  -- Return validation errors if any
  IF array_length(validation_errors, 1) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', to_jsonb(validation_errors)
    );
  END IF;
  
  -- Check if user already has this role in this context
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id 
      AND role = p_role 
      AND COALESCE(organizacao_id, '00000000-0000-0000-0000-000000000000') = COALESCE(p_organizacao_id, '00000000-0000-0000-0000-000000000000')
      AND COALESCE(clinica_id, '00000000-0000-0000-0000-000000000000') = COALESCE(p_clinica_id, '00000000-0000-0000-0000-000000000000')
      AND ativo = true
      AND (data_fim IS NULL OR data_fim > CURRENT_DATE)
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário já possui este role no contexto especificado'
    );
  END IF;
  
  -- Insert new role
  INSERT INTO public.user_roles (
    user_id, 
    role, 
    organizacao_id, 
    clinica_id,
    data_inicio,
    data_fim,
    observacoes,
    criado_por
  ) VALUES (
    p_user_id,
    p_role,
    p_organizacao_id,
    p_clinica_id,
    p_data_inicio,
    p_data_fim,
    p_observacoes,
    auth.uid()
  ) RETURNING id INTO new_role_id;
  
  -- Refresh permissions cache
  PERFORM public.refresh_user_permissions_cache();
  
  -- Log role assignment
  PERFORM public.log_evento_sistema(
    'role_assigned',
    'usuario',
    'info',
    'Role assigned to user',
    format('Role %s assigned to user %s by %s', p_role, p_user_id, auth.uid()),
    jsonb_build_object(
      'user_id', p_user_id,
      'role', p_role,
      'organizacao_id', p_organizacao_id,
      'clinica_id', p_clinica_id,
      'assigned_by', auth.uid()
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'role_id', new_role_id,
    'message', 'Role atribuído com sucesso'
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to revoke user role with audit trail
CREATE OR REPLACE FUNCTION public.revoke_user_role(
  p_user_id UUID,
  p_role user_role_type,
  p_organizacao_id UUID DEFAULT NULL,
  p_clinica_id UUID DEFAULT NULL,
  p_motivo TEXT DEFAULT NULL
)
RETURNS JSONB AS $
DECLARE
  revoker_role user_role_type;
  revoked_count INTEGER;
BEGIN
  -- Get revoker's role
  SELECT public.get_user_role_in_context(auth.uid(), p_organizacao_id, p_clinica_id) INTO revoker_role;
  
  -- Validate permissions to revoke role
  IF NOT (
    revoker_role = 'super_admin' OR
    (revoker_role IN ('proprietaria', 'gerente') AND p_role NOT IN ('super_admin', 'proprietaria')) OR
    (auth.uid() = p_user_id AND p_role NOT IN ('super_admin', 'proprietaria', 'gerente'))
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permissão insuficiente para revogar este role'
    );
  END IF;
  
  -- Revoke role (set as inactive and add end date)
  UPDATE public.user_roles 
  SET 
    ativo = false,
    data_fim = CURRENT_DATE,
    observacoes = COALESCE(observacoes || ' | ', '') || 'Revogado: ' || COALESCE(p_motivo, 'Sem motivo especificado')
  WHERE user_id = p_user_id 
    AND role = p_role 
    AND COALESCE(organizacao_id, '00000000-0000-0000-0000-000000000000') = COALESCE(p_organizacao_id, '00000000-0000-0000-0000-000000000000')
    AND COALESCE(clinica_id, '00000000-0000-0000-0000-000000000000') = COALESCE(p_clinica_id, '00000000-0000-0000-0000-000000000000')
    AND ativo = true;
  
  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  
  IF revoked_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Role não encontrado ou já inativo'
    );
  END IF;
  
  -- Refresh permissions cache
  PERFORM public.refresh_user_permissions_cache();
  
  -- Log role revocation
  PERFORM public.log_evento_sistema(
    'role_revoked',
    'usuario',
    'warning',
    'Role revoked from user',
    format('Role %s revoked from user %s by %s. Reason: %s', p_role, p_user_id, auth.uid(), COALESCE(p_motivo, 'Not specified')),
    jsonb_build_object(
      'user_id', p_user_id,
      'role', p_role,
      'organizacao_id', p_organizacao_id,
      'clinica_id', p_clinica_id,
      'revoked_by', auth.uid(),
      'reason', p_motivo
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role revogado com sucesso'
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- INVITATION MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to create user invitation
CREATE OR REPLACE FUNCTION public.create_user_invitation(
  p_email TEXT,
  p_role user_role_type,
  p_organizacao_id UUID DEFAULT NULL,
  p_clinica_id UUID DEFAULT NULL,
  p_mensagem_personalizada TEXT DEFAULT NULL,
  p_expires_days INTEGER DEFAULT 7
)
RETURNS JSONB AS $
DECLARE
  new_invitation_id UUID;
  invitation_token TEXT;
  inviter_role user_role_type;
  validation_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Validate email
  IF NOT public.validate_email(p_email) THEN
    validation_errors := array_append(validation_errors, 'Email inválido');
  END IF;
  
  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    validation_errors := array_append(validation_errors, 'Usuário já existe no sistema');
  END IF;
  
  -- Check if there's already a pending invitation
  IF EXISTS (
    SELECT 1 FROM public.convites 
    WHERE email = p_email 
      AND status = 'pendente' 
      AND expires_at > now()
  ) THEN
    validation_errors := array_append(validation_errors, 'Já existe um convite pendente para este email');
  END IF;
  
  -- Get inviter's role
  SELECT public.get_user_role_in_context(auth.uid(), p_organizacao_id, p_clinica_id) INTO inviter_role;
  
  -- Validate permissions to invite
  IF NOT (
    inviter_role = 'super_admin' OR
    (inviter_role IN ('proprietaria', 'gerente') AND p_role NOT IN ('super_admin', 'proprietaria'))
  ) THEN
    validation_errors := array_append(validation_errors, 'Permissão insuficiente para convidar usuário com este role');
  END IF;
  
  -- Validate role assignment rules
  IF p_role = 'proprietaria' AND p_organizacao_id IS NULL THEN
    validation_errors := array_append(validation_errors, 'Convite para proprietária deve especificar organização');
  END IF;
  
  IF p_role IN ('profissionais', 'recepcionistas') AND p_clinica_id IS NULL THEN
    validation_errors := array_append(validation_errors, 'Convite para profissionais deve especificar clínica');
  END IF;
  
  -- Return validation errors if any
  IF array_length(validation_errors, 1) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', to_jsonb(validation_errors)
    );
  END IF;
  
  -- Generate secure invitation token
  invitation_token := public.generate_secure_token(32);
  
  -- Create invitation
  INSERT INTO public.convites (
    email,
    role,
    organizacao_id,
    clinica_id,
    token,
    expires_at,
    mensagem_personalizada,
    criado_por
  ) VALUES (
    p_email,
    p_role,
    p_organizacao_id,
    p_clinica_id,
    invitation_token,
    now() + (p_expires_days || ' days')::INTERVAL,
    p_mensagem_personalizada,
    auth.uid()
  ) RETURNING id INTO new_invitation_id;
  
  -- Log invitation creation
  PERFORM public.log_evento_sistema(
    'invitation_created',
    'usuario',
    'info',
    'User invitation created',
    format('Invitation created for %s with role %s by %s', p_email, p_role, auth.uid()),
    jsonb_build_object(
      'invitation_id', new_invitation_id,
      'email', p_email,
      'role', p_role,
      'organizacao_id', p_organizacao_id,
      'clinica_id', p_clinica_id,
      'created_by', auth.uid()
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', new_invitation_id,
    'token', invitation_token,
    'expires_at', now() + (p_expires_days || ' days')::INTERVAL,
    'message', 'Convite criado com sucesso'
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enhanced function to accept invitation with comprehensive validation
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token TEXT)
RETURNS JSONB AS $
DECLARE
  invite_record RECORD;
  new_role_id UUID;
  user_email TEXT;
BEGIN
  -- Get current user email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  IF user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário não autenticado'
    );
  END IF;
  
  -- Get invitation details
  SELECT * INTO invite_record
  FROM public.convites 
  WHERE token = p_token 
    AND status = 'pendente' 
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Convite inválido, expirado ou já utilizado'
    );
  END IF;
  
  -- Verify email matches
  IF user_email != invite_record.email THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Email do usuário não corresponde ao convite'
    );
  END IF;
  
  -- Assign role to user
  SELECT public.assign_user_role(
    auth.uid(),
    invite_record.role,
    invite_record.organizacao_id,
    invite_record.clinica_id,
    CURRENT_DATE,
    NULL,
    'Atribuído via convite'
  ) INTO new_role_id;
  
  -- Update invitation status
  UPDATE public.convites 
  SET 
    status = 'aceito',
    aceito_em = now(),
    aceito_por = auth.uid()
  WHERE id = invite_record.id;
  
  -- Log invitation acceptance
  PERFORM public.log_evento_sistema(
    'invitation_accepted',
    'usuario',
    'info',
    'User invitation accepted',
    format('Invitation accepted by %s (%s) for role %s', user_email, auth.uid(), invite_record.role),
    jsonb_build_object(
      'invitation_id', invite_record.id,
      'user_id', auth.uid(),
      'email', user_email,
      'role', invite_record.role,
      'organizacao_id', invite_record.organizacao_id,
      'clinica_id', invite_record.clinica_id
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'role', invite_record.role,
    'organizacao_id', invite_record.organizacao_id,
    'clinica_id', invite_record.clinica_id,
    'message', 'Convite aceito com sucesso'
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- USER SESSION MANAGEMENT
-- =====================================================

-- Function to create user session
CREATE OR REPLACE FUNCTION public.create_user_session(
  p_session_token TEXT,
  p_device_info JSONB DEFAULT NULL,
  p_location_info JSONB DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  new_session_id UUID;
  user_agent_info TEXT;
  client_ip INET;
BEGIN
  -- Get client information
  user_agent_info := current_setting('request.headers', true)::jsonb->>'user-agent';
  client_ip := inet_client_addr();
  
  -- Create session record
  INSERT INTO public.user_sessions (
    user_id,
    session_token,
    ip_address,
    user_agent,
    device_info,
    location_info,
    login_at,
    last_activity
  ) VALUES (
    auth.uid(),
    p_session_token,
    client_ip,
    user_agent_info,
    p_device_info,
    p_location_info,
    now(),
    now()
  ) RETURNING id INTO new_session_id;
  
  -- Log session creation
  PERFORM public.log_evento_sistema(
    'user_login',
    'usuario',
    'info',
    'User logged in',
    format('User %s logged in from %s', auth.uid(), client_ip),
    jsonb_build_object(
      'user_id', auth.uid(),
      'session_id', new_session_id,
      'ip_address', client_ip,
      'user_agent', user_agent_info
    )
  );
  
  RETURN new_session_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to end user session
CREATE OR REPLACE FUNCTION public.end_user_session(p_session_token TEXT)
RETURNS BOOLEAN AS $
DECLARE
  session_record RECORD;
  session_duration INTERVAL;
BEGIN
  -- Get session details
  SELECT * INTO session_record
  FROM public.user_sessions
  WHERE session_token = p_session_token
    AND user_id = auth.uid()
    AND ativo = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Calculate session duration
  session_duration := now() - session_record.login_at;
  
  -- Update session record
  UPDATE public.user_sessions
  SET 
    logout_at = now(),
    ativo = false,
    tempo_sessao_minutos = EXTRACT(EPOCH FROM session_duration) / 60
  WHERE id = session_record.id;
  
  -- Log session end
  PERFORM public.log_evento_sistema(
    'user_logout',
    'usuario',
    'info',
    'User logged out',
    format('User %s logged out after %s', auth.uid(), session_duration),
    jsonb_build_object(
      'user_id', auth.uid(),
      'session_id', session_record.id,
      'session_duration', session_duration,
      'ip_address', session_record.ip_address
    )
  );
  
  RETURN true;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- USER SEARCH AND MANAGEMENT
-- =====================================================

-- Function to search users with filters
CREATE OR REPLACE FUNCTION public.search_users(
  p_search_term TEXT DEFAULT NULL,
  p_role_filter user_role_type DEFAULT NULL,
  p_organizacao_id UUID DEFAULT NULL,
  p_clinica_id UUID DEFAULT NULL,
  p_ativo_filter BOOLEAN DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  user_id UUID,
  nome_completo TEXT,
  email TEXT,
  telefone TEXT,
  roles JSONB,
  ativo BOOLEAN,
  ultimo_acesso TIMESTAMP WITH TIME ZONE,
  criado_em TIMESTAMP WITH TIME ZONE
) AS $
BEGIN
  -- Check if user has permission to search users
  IF NOT public.user_has_permission_in_context(auth.uid(), 'admin', p_organizacao_id, p_clinica_id) THEN
    RAISE EXCEPTION 'Permissão insuficiente para buscar usuários';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.user_id,
    p.nome_completo,
    p.email,
    p.telefone,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'role', ur.role,
          'organizacao_id', ur.organizacao_id,
          'clinica_id', ur.clinica_id,
          'ativo', ur.ativo
        )
      )
      FROM public.user_roles ur
      WHERE ur.user_id = p.user_id
        AND (p_organizacao_id IS NULL OR ur.organizacao_id = p_organizacao_id)
        AND (p_clinica_id IS NULL OR ur.clinica_id = p_clinica_id)
        AND (p_role_filter IS NULL OR ur.role = p_role_filter)
    ) as roles,
    p.ativo,
    (
      SELECT MAX(us.last_activity)
      FROM public.user_sessions us
      WHERE us.user_id = p.user_id
    ) as ultimo_acesso,
    p.criado_em
  FROM public.profiles p
  WHERE (p_search_term IS NULL OR (
    p.nome_completo ILIKE '%' || p_search_term || '%' OR
    p.email ILIKE '%' || p_search_term || '%'
  ))
  AND (p_ativo_filter IS NULL OR p.ativo = p_ativo_filter)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.user_id
      AND (p_organizacao_id IS NULL OR ur.organizacao_id = p_organizacao_id)
      AND (p_clinica_id IS NULL OR ur.clinica_id = p_clinica_id)
      AND (p_role_filter IS NULL OR ur.role = p_role_filter)
  )
  ORDER BY p.nome_completo
  LIMIT p_limit OFFSET p_offset;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- USER STATISTICS AND REPORTING
-- =====================================================

-- Function to get user statistics
CREATE OR REPLACE FUNCTION public.get_user_statistics(
  p_organizacao_id UUID DEFAULT NULL,
  p_clinica_id UUID DEFAULT NULL
)
RETURNS JSONB AS $
DECLARE
  stats JSONB;
BEGIN
  -- Check permissions
  IF NOT public.user_has_permission_in_context(auth.uid(), 'admin', p_organizacao_id, p_clinica_id) THEN
    RAISE EXCEPTION 'Permissão insuficiente para visualizar estatísticas';
  END IF;
  
  SELECT jsonb_build_object(
    'total_users', (
      SELECT COUNT(DISTINCT ur.user_id)
      FROM public.user_roles ur
      WHERE (p_organizacao_id IS NULL OR ur.organizacao_id = p_organizacao_id)
        AND (p_clinica_id IS NULL OR ur.clinica_id = p_clinica_id)
        AND ur.ativo = true
    ),
    'users_by_role', (
      SELECT jsonb_object_agg(ur.role, count)
      FROM (
        SELECT ur.role, COUNT(DISTINCT ur.user_id) as count
        FROM public.user_roles ur
        WHERE (p_organizacao_id IS NULL OR ur.organizacao_id = p_organizacao_id)
          AND (p_clinica_id IS NULL OR ur.clinica_id = p_clinica_id)
          AND ur.ativo = true
        GROUP BY ur.role
      ) ur
    ),
    'active_sessions', (
      SELECT COUNT(*)
      FROM public.user_sessions us
      JOIN public.user_roles ur ON ur.user_id = us.user_id
      WHERE us.ativo = true
        AND (p_organizacao_id IS NULL OR ur.organizacao_id = p_organizacao_id)
        AND (p_clinica_id IS NULL OR ur.clinica_id = p_clinica_id)
        AND ur.ativo = true
    ),
    'new_users_last_30_days', (
      SELECT COUNT(DISTINCT ur.user_id)
      FROM public.user_roles ur
      JOIN public.profiles p ON p.user_id = ur.user_id
      WHERE (p_organizacao_id IS NULL OR ur.organizacao_id = p_organizacao_id)
        AND (p_clinica_id IS NULL OR ur.clinica_id = p_clinica_id)
        AND ur.ativo = true
        AND p.criado_em > now() - INTERVAL '30 days'
    ),
    'pending_invitations', (
      SELECT COUNT(*)
      FROM public.convites c
      WHERE (p_organizacao_id IS NULL OR c.organizacao_id = p_organizacao_id)
        AND (p_clinica_id IS NULL OR c.clinica_id = p_clinica_id)
        AND c.status = 'pendente'
        AND c.expires_at > now()
    )
  ) INTO stats;
  
  RETURN stats;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- COMPLETION VERIFICATION
-- =====================================================

-- Verify all functions were created successfully
DO $
DECLARE
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'handle_new_user',
      'update_user_profile',
      'get_user_profile',
      'assign_user_role',
      'revoke_user_role',
      'create_user_invitation',
      'accept_invitation',
      'create_user_session',
      'end_user_session',
      'search_users',
      'get_user_statistics'
    );
  
  IF function_count >= 11 THEN
    RAISE NOTICE 'User management functions created successfully: % functions', function_count;
  ELSE
    RAISE EXCEPTION 'User management functions incomplete - only % functions created', function_count;
  END IF;
END $;

-- Add comment to track completion
COMMENT ON SCHEMA public IS 'User management functions implemented - ' || now();