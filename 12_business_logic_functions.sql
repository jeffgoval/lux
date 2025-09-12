-- =====================================================
-- BUSINESS LOGIC FUNCTIONS
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- =====================================================
-- MEDICAL RECORD NUMBER GENERATION
-- =====================================================

-- Enhanced function to generate medical record numbers with validation
CREATE OR REPLACE FUNCTION public.gerar_numero_prontuario()
RETURNS TEXT AS $
DECLARE
  current_year TEXT;
  next_number INTEGER;
  new_number TEXT;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Get next sequential number for current year
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_prontuario FROM 11 FOR 6) AS INTEGER)), 0) + 1 
  INTO next_number
  FROM public.prontuarios 
  WHERE numero_prontuario LIKE 'PRONT-' || current_year || '-%';
  
  -- Format the new number
  new_number := 'PRONT-' || current_year || '-' || LPAD(next_number::TEXT, 6, '0');
  
  -- Ensure uniqueness (in case of concurrent access)
  WHILE EXISTS (SELECT 1 FROM public.prontuarios WHERE numero_prontuario = new_number) LOOP
    next_number := next_number + 1;
    new_number := 'PRONT-' || current_year || '-' || LPAD(next_number::TEXT, 6, '0');
  END LOOP;
  
  RETURN new_number;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- CLINIC ONBOARDING FUNCTIONS
-- =====================================================

-- Enhanced function to create clinic during onboarding with comprehensive validation
CREATE OR REPLACE FUNCTION public.create_clinic_for_onboarding(
  p_nome TEXT,
  p_cnpj TEXT DEFAULT NULL,
  p_endereco_rua TEXT DEFAULT NULL,
  p_endereco_numero TEXT DEFAULT NULL,
  p_endereco_complemento TEXT DEFAULT NULL,
  p_endereco_bairro TEXT DEFAULT NULL,
  p_endereco_cidade TEXT DEFAULT NULL,
  p_endereco_estado TEXT DEFAULT NULL,
  p_endereco_cep TEXT DEFAULT NULL,
  p_telefone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_horario_funcionamento JSONB DEFAULT NULL
)
RETURNS JSONB AS $DECL
ARE
  new_clinic_id UUID;
  user_role_record RECORD;
  validation_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Validate required fields
  IF p_nome IS NULL OR LENGTH(TRIM(p_nome)) < 2 THEN
    validation_errors := array_append(validation_errors, 'Nome da clínica é obrigatório');
  END IF;
  
  -- Validate CNPJ if provided
  IF p_cnpj IS NOT NULL AND NOT public.validate_cnpj(p_cnpj) THEN
    validation_errors := array_append(validation_errors, 'CNPJ inválido');
  END IF;
  
  -- Validate email if provided
  IF p_email IS NOT NULL AND NOT public.validate_email(p_email) THEN
    validation_errors := array_append(validation_errors, 'Email inválido');
  END IF;
  
  -- Validate CEP format if provided
  IF p_endereco_cep IS NOT NULL AND NOT (p_endereco_cep ~ '^\d{5}-?\d{3}$') THEN
    validation_errors := array_append(validation_errors, 'CEP inválido');
  END IF;
  
  -- Return validation errors if any
  IF array_length(validation_errors, 1) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', to_jsonb(validation_errors)
    );
  END IF;
  
  -- Check if user has proprietaria role
  SELECT * INTO user_role_record
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
    AND ur.role = 'proprietaria'::user_role_type
    AND ur.ativo = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário deve ter role proprietária para criar clínicas'
    );
  END IF;

  -- Insert the clinic
  INSERT INTO public.clinicas (
    organizacao_id,
    nome,
    cnpj,
    endereco_rua,
    endereco_numero,
    endereco_complemento,
    endereco_bairro,
    endereco_cidade,
    endereco_estado,
    endereco_cep,
    telefone,
    email,
    horario_funcionamento,
    criado_por
  ) VALUES (
    user_role_record.organizacao_id,
    p_nome,
    p_cnpj,
    p_endereco_rua,
    p_endereco_numero,
    p_endereco_complemento,
    p_endereco_bairro,
    p_endereco_cidade,
    p_endereco_estado,
    p_endereco_cep,
    p_telefone,
    p_email,
    p_horario_funcionamento,
    auth.uid()
  ) RETURNING id INTO new_clinic_id;

  -- Assign user to the clinic with proprietaria role
  INSERT INTO public.user_roles (
    user_id,
    organizacao_id,
    clinica_id,
    role,
    criado_por
  ) VALUES (
    auth.uid(),
    user_role_record.organizacao_id,
    new_clinic_id,
    'proprietaria',
    auth.uid()
  ) ON CONFLICT (user_id, organizacao_id, clinica_id, role) DO NOTHING;

  -- Log clinic creation
  PERFORM public.log_evento_sistema(
    'clinic_created',
    'sistema',
    'info',
    'New clinic created during onboarding',
    format('Clinic %s created by user %s', p_nome, auth.uid()),
    jsonb_build_object(
      'clinic_id', new_clinic_id,
      'clinic_name', p_nome,
      'created_by', auth.uid()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'clinic_id', new_clinic_id,
    'message', 'Clínica criada com sucesso'
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- APPOINTMENT AND SESSION MANAGEMENT
-- =====================================================

-- Function to schedule treatment session with comprehensive validation
CREATE OR REPLACE FUNCTION public.schedule_treatment_session(
  p_prontuario_id UUID,
  p_data_sessao TIMESTAMP WITH TIME ZONE,
  p_tipo_procedimento tipo_procedimento,
  p_profissional_id UUID,
  p_sala_id UUID DEFAULT NULL,
  p_duracao_minutos INTEGER DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL
)
RETURNS JSONB AS $
DECLARE
  new_session_id UUID;
  validation_errors TEXT[] := ARRAY[]::TEXT[];
  clinic_context RECORD;
BEGIN
  -- Validate session date
  IF p_data_sessao <= now() THEN
    validation_errors := array_append(validation_errors, 'Data da sessão deve ser futura');
  END IF;
  
  -- Validate duration
  IF p_duracao_minutos IS NOT NULL AND p_duracao_minutos <= 0 THEN
    validation_errors := array_append(validation_errors, 'Duração deve ser positiva');
  END IF;
  
  -- Get clinic context from medical record
  SELECT c.id as clinica_id, c.organizacao_id
  INTO clinic_context
  FROM public.prontuarios p
  JOIN public.clinicas c ON c.id = p.clinica_id
  WHERE p.id = p_prontuario_id;
  
  IF NOT FOUND THEN
    validation_errors := array_append(validation_errors, 'Prontuário não encontrado');
  END IF;
  
  -- Check if professional has access to the clinic
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_profissional_id
      AND (ur.organizacao_id = clinic_context.organizacao_id OR ur.clinica_id = clinic_context.clinica_id)
      AND ur.role IN ('proprietaria', 'gerente', 'profissionais')
      AND ur.ativo = true
  ) THEN
    validation_errors := array_append(validation_errors, 'Profissional não tem acesso a esta clínica');
  END IF;
  
  -- Check if room belongs to the clinic (if specified)
  IF p_sala_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.salas_clinica sc
    WHERE sc.id = p_sala_id
      AND sc.clinica_id = clinic_context.clinica_id
      AND sc.ativo = true
      AND sc.disponivel_agendamento = true
  ) THEN
    validation_errors := array_append(validation_errors, 'Sala não disponível para agendamento');
  END IF;
  
  -- Check for scheduling conflicts
  IF EXISTS (
    SELECT 1 FROM public.sessoes_atendimento sa
    WHERE sa.profissional_id = p_profissional_id
      AND sa.status IN ('agendado', 'em_andamento')
      AND sa.data_sessao BETWEEN p_data_sessao - INTERVAL '30 minutes' AND p_data_sessao + INTERVAL '30 minutes'
  ) THEN
    validation_errors := array_append(validation_errors, 'Conflito de horário com outra sessão do profissional');
  END IF;
  
  -- Check room availability if specified
  IF p_sala_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.sessoes_atendimento sa
    WHERE sa.sala_id = p_sala_id
      AND sa.status IN ('agendado', 'em_andamento')
      AND sa.data_sessao BETWEEN p_data_sessao - INTERVAL '1 hour' AND p_data_sessao + INTERVAL '1 hour'
  ) THEN
    validation_errors := array_append(validation_errors, 'Sala não disponível no horário solicitado');
  END IF;
  
  -- Return validation errors if any
  IF array_length(validation_errors, 1) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', to_jsonb(validation_errors)
    );
  END IF;
  
  -- Insert session
  INSERT INTO public.sessoes_atendimento (
    prontuario_id,
    data_sessao,
    tipo_procedimento,
    profissional_id,
    sala_id,
    duracao_minutos,
    detalhes_procedimento,
    observacoes_durante,
    status,
    criado_por
  ) VALUES (
    p_prontuario_id,
    p_data_sessao,
    p_tipo_procedimento,
    p_profissional_id,
    p_sala_id,
    p_duracao_minutos,
    '{}'::jsonb,
    p_observacoes,
    'agendado',
    auth.uid()
  ) RETURNING id INTO new_session_id;
  
  -- Log session scheduling
  PERFORM public.log_evento_sistema(
    'session_scheduled',
    'medica',
    'info',
    'Treatment session scheduled',
    format('Session %s scheduled for %s', p_tipo_procedimento, p_data_sessao),
    jsonb_build_object(
      'session_id', new_session_id,
      'prontuario_id', p_prontuario_id,
      'tipo_procedimento', p_tipo_procedimento,
      'profissional_id', p_profissional_id,
      'data_sessao', p_data_sessao
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'session_id', new_session_id,
    'message', 'Sessão agendada com sucesso'
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- MEDICAL RECORD MANAGEMENT
-- =====================================================

-- Function to create comprehensive medical record
CREATE OR REPLACE FUNCTION public.create_medical_record(
  p_paciente_id UUID,
  p_clinica_id UUID,
  p_nome_completo TEXT,
  p_cpf TEXT DEFAULT NULL,
  p_data_nascimento DATE DEFAULT NULL,
  p_telefone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_endereco JSONB DEFAULT NULL,
  p_anamnese TEXT DEFAULT NULL
)
RETURNS JSONB AS $
DECLARE
  new_record_id UUID;
  encrypted_cpf TEXT;
  encrypted_birth TEXT;
  encrypted_phone TEXT;
  encrypted_email TEXT;
  encrypted_address TEXT;
  validation_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Validate required fields
  IF p_nome_completo IS NULL OR LENGTH(TRIM(p_nome_completo)) < 2 THEN
    validation_errors := array_append(validation_errors, 'Nome completo é obrigatório');
  END IF;
  
  -- Validate CPF if provided
  IF p_cpf IS NOT NULL AND NOT public.validate_cpf(p_cpf) THEN
    validation_errors := array_append(validation_errors, 'CPF inválido');
  END IF;
  
  -- Validate email if provided
  IF p_email IS NOT NULL AND NOT public.validate_email(p_email) THEN
    validation_errors := array_append(validation_errors, 'Email inválido');
  END IF;
  
  -- Validate birth date
  IF p_data_nascimento IS NOT NULL AND (
    p_data_nascimento > CURRENT_DATE OR 
    p_data_nascimento < CURRENT_DATE - INTERVAL '120 years'
  ) THEN
    validation_errors := array_append(validation_errors, 'Data de nascimento inválida');
  END IF;
  
  -- Check if user has access to create records in this clinic
  IF NOT public.user_has_permission_in_context(auth.uid(), 'write', 
    (SELECT organizacao_id FROM public.clinicas WHERE id = p_clinica_id), 
    p_clinica_id
  ) THEN
    validation_errors := array_append(validation_errors, 'Sem permissão para criar prontuários nesta clínica');
  END IF;
  
  -- Return validation errors if any
  IF array_length(validation_errors, 1) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', to_jsonb(validation_errors)
    );
  END IF;
  
  -- Encrypt sensitive data
  encrypted_cpf := CASE WHEN p_cpf IS NOT NULL THEN public.hash_sensitive_data(p_cpf) ELSE NULL END;
  encrypted_birth := CASE WHEN p_data_nascimento IS NOT NULL THEN public.hash_sensitive_data(p_data_nascimento::text) ELSE NULL END;
  encrypted_phone := CASE WHEN p_telefone IS NOT NULL THEN public.hash_sensitive_data(p_telefone) ELSE NULL END;
  encrypted_email := CASE WHEN p_email IS NOT NULL THEN public.hash_sensitive_data(p_email) ELSE NULL END;
  encrypted_address := CASE WHEN p_endereco IS NOT NULL THEN public.hash_sensitive_data(p_endereco::text) ELSE NULL END;
  
  -- Insert medical record
  INSERT INTO public.prontuarios (
    paciente_id,
    medico_responsavel_id,
    clinica_id,
    nome_completo,
    cpf_encrypted,
    data_nascimento_encrypted,
    telefone_encrypted,
    email_encrypted,
    endereco_encrypted,
    anamnese,
    criado_por
  ) VALUES (
    p_paciente_id,
    auth.uid(),
    p_clinica_id,
    p_nome_completo,
    encrypted_cpf,
    encrypted_birth,
    encrypted_phone,
    encrypted_email,
    encrypted_address,
    p_anamnese,
    auth.uid()
  ) RETURNING id INTO new_record_id;
  
  -- Log medical record creation
  PERFORM public.log_evento_sistema(
    'medical_record_created',
    'medica',
    'info',
    'New medical record created',
    format('Medical record created for patient %s', p_nome_completo),
    jsonb_build_object(
      'prontuario_id', new_record_id,
      'paciente_nome', p_nome_completo,
      'clinica_id', p_clinica_id,
      'created_by', auth.uid()
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'prontuario_id', new_record_id,
    'numero_prontuario', (SELECT numero_prontuario FROM public.prontuarios WHERE id = new_record_id),
    'message', 'Prontuário criado com sucesso'
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- BUSINESS ANALYTICS AND REPORTING
-- =====================================================

-- Function to get clinic dashboard statistics
CREATE OR REPLACE FUNCTION public.get_clinic_dashboard_stats(p_clinica_id UUID)
RETURNS JSONB AS $
DECLARE
  stats JSONB;
BEGIN
  -- Check permissions
  IF NOT public.user_has_permission_in_context(auth.uid(), 'read', 
    (SELECT organizacao_id FROM public.clinicas WHERE id = p_clinica_id), 
    p_clinica_id
  ) THEN
    RAISE EXCEPTION 'Sem permissão para visualizar estatísticas desta clínica';
  END IF;
  
  SELECT jsonb_build_object(
    'total_prontuarios', (
      SELECT COUNT(*) FROM public.prontuarios 
      WHERE clinica_id = p_clinica_id AND status = 'ativo'
    ),
    'sessoes_hoje', (
      SELECT COUNT(*) FROM public.sessoes_atendimento sa
      JOIN public.prontuarios p ON p.id = sa.prontuario_id
      WHERE p.clinica_id = p_clinica_id 
        AND sa.data_sessao::date = CURRENT_DATE
        AND sa.status IN ('agendado', 'em_andamento')
    ),
    'sessoes_semana', (
      SELECT COUNT(*) FROM public.sessoes_atendimento sa
      JOIN public.prontuarios p ON p.id = sa.prontuario_id
      WHERE p.clinica_id = p_clinica_id 
        AND sa.data_sessao >= date_trunc('week', CURRENT_DATE)
        AND sa.data_sessao < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week'
    ),
    'procedimentos_populares', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'tipo_procedimento', tipo_procedimento,
          'total', count
        )
      )
      FROM (
        SELECT sa.tipo_procedimento, COUNT(*) as count
        FROM public.sessoes_atendimento sa
        JOIN public.prontuarios p ON p.id = sa.prontuario_id
        WHERE p.clinica_id = p_clinica_id 
          AND sa.data_sessao >= CURRENT_DATE - INTERVAL '30 days'
          AND sa.status = 'concluido'
        GROUP BY sa.tipo_procedimento
        ORDER BY count DESC
        LIMIT 5
      ) popular
    ),
    'profissionais_ativos', (
      SELECT COUNT(DISTINCT ur.user_id)
      FROM public.user_roles ur
      WHERE ur.clinica_id = p_clinica_id
        AND ur.role = 'profissionais'
        AND ur.ativo = true
    ),
    'equipamentos_ativos', (
      SELECT COUNT(*) FROM public.equipamentos
      WHERE clinica_id = p_clinica_id AND status = 'ativo'
    ),
    'produtos_estoque_baixo', (
      SELECT COUNT(*) FROM public.produtos
      WHERE clinica_id = p_clinica_id 
        AND quantidade <= estoque_minimo
        AND ativo = true
    ),
    'receita_mes_atual', (
      SELECT COALESCE(SUM(sa.valor_final), 0)
      FROM public.sessoes_atendimento sa
      JOIN public.prontuarios p ON p.id = sa.prontuario_id
      WHERE p.clinica_id = p_clinica_id 
        AND sa.data_sessao >= date_trunc('month', CURRENT_DATE)
        AND sa.status = 'concluido'
        AND sa.valor_final IS NOT NULL
    )
  ) INTO stats;
  
  RETURN stats;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- AUTOMATED TIMESTAMP FUNCTIONS
-- =====================================================

-- Enhanced function to update timestamps with version control
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
  NEW.atualizado_em = now();
  
  -- Update version if column exists
  IF TG_TABLE_NAME = 'prontuarios' THEN
    NEW.versao = OLD.versao + 1;
    NEW.atualizado_por = auth.uid();
    NEW.hash_integridade = md5(NEW.id::text || NEW.atualizado_em::text || random()::text);
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql SET search_path = public;

-- =====================================================
-- BUSINESS VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate business hours
CREATE OR REPLACE FUNCTION public.validate_business_hours(
  p_horario_funcionamento JSONB,
  p_data_hora TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $
DECLARE
  day_of_week TEXT;
  time_of_day TIME;
  day_schedule JSONB;
BEGIN
  IF p_horario_funcionamento IS NULL THEN
    RETURN true; -- No restrictions
  END IF;
  
  -- Get day of week (0=Sunday, 1=Monday, etc.)
  day_of_week := EXTRACT(DOW FROM p_data_hora)::TEXT;
  time_of_day := p_data_hora::TIME;
  
  -- Get schedule for this day
  day_schedule := p_horario_funcionamento->day_of_week;
  
  IF day_schedule IS NULL OR day_schedule->>'closed' = 'true' THEN
    RETURN false; -- Clinic is closed
  END IF;
  
  -- Check if time is within business hours
  RETURN time_of_day BETWEEN 
    (day_schedule->>'start')::TIME AND 
    (day_schedule->>'end')::TIME;
END;
$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate age from birth date
CREATE OR REPLACE FUNCTION public.calculate_age(birth_date DATE)
RETURNS INTEGER AS $
BEGIN
  IF birth_date IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN EXTRACT(YEAR FROM age(CURRENT_DATE, birth_date))::INTEGER;
END;
$ LANGUAGE plpgsql IMMUTABLE;

-- Function to format Brazilian phone number
CREATE OR REPLACE FUNCTION public.format_phone_number(phone TEXT)
RETURNS TEXT AS $
DECLARE
  clean_phone TEXT;
BEGIN
  IF phone IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove all non-numeric characters
  clean_phone := regexp_replace(phone, '[^0-9]', '', 'g');
  
  -- Format based on length
  CASE LENGTH(clean_phone)
    WHEN 10 THEN
      RETURN '(' || SUBSTRING(clean_phone, 1, 2) || ') ' || 
             SUBSTRING(clean_phone, 3, 4) || '-' || 
             SUBSTRING(clean_phone, 7, 4);
    WHEN 11 THEN
      RETURN '(' || SUBSTRING(clean_phone, 1, 2) || ') ' || 
             SUBSTRING(clean_phone, 3, 5) || '-' || 
             SUBSTRING(clean_phone, 8, 4);
    ELSE
      RETURN phone; -- Return original if format not recognized
  END CASE;
END;
$ LANGUAGE plpgsql IMMUTABLE;

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
      'gerar_numero_prontuario',
      'create_clinic_for_onboarding',
      'schedule_treatment_session',
      'create_medical_record',
      'get_clinic_dashboard_stats',
      'validate_business_hours',
      'calculate_age',
      'format_phone_number'
    );
  
  IF function_count >= 8 THEN
    RAISE NOTICE 'Business logic functions created successfully: % functions', function_count;
  ELSE
    RAISE EXCEPTION 'Business logic functions incomplete - only % functions created', function_count;
  END IF;
END $;

-- Add comment to track completion
COMMENT ON SCHEMA public IS 'Business logic functions implemented - ' || now();