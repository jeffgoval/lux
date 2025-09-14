-- =====================================================
-- FOUNDATION LAYER: ENUMs, Extensions and Utility Functions
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- Enable necessary PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUM TYPES DEFINITION
-- =====================================================

-- User role types for the system
CREATE TYPE public.user_role_type AS ENUM (
  'super_admin',
  'proprietaria', 
  'gerente',
  'profissionais',
  'recepcionistas',
  'visitante'
);

-- Organization plan types
CREATE TYPE public.plano_type AS ENUM (
  'basico', 
  'premium', 
  'enterprise'
);

-- Invitation status types
CREATE TYPE public.status_convite AS ENUM (
  'pendente', 
  'aceito', 
  'expirado', 
  'cancelado'
);

-- Medical procedure types
CREATE TYPE public.tipo_procedimento AS ENUM (
  'botox_toxina',
  'preenchimento',
  'harmonizacao_facial', 
  'laser_ipl',
  'peeling',
  'tratamento_corporal',
  'skincare_avancado',
  'consulta',
  'avaliacao',
  'outro'
);

-- Medical access levels
CREATE TYPE public.nivel_acesso_medico AS ENUM (
  'medico_responsavel',
  'medico_assistente',
  'enfermeiro',
  'esteticista',
  'administrador'
);

-- Medical record status
CREATE TYPE public.status_prontuario AS ENUM (
  'ativo',
  'inativo',
  'arquivado',
  'transferido'
);

-- Consent types
CREATE TYPE public.tipo_consentimento AS ENUM (
  'termo_responsabilidade',
  'autorizacao_imagem',
  'consentimento_procedimento',
  'termo_privacidade'
);

-- Medical image types
CREATE TYPE public.tipo_imagem AS ENUM (
  'antes',
  'durante',
  'depois',
  'complicacao',
  'documento'
);

-- System access types
CREATE TYPE public.tipo_acesso AS ENUM (
  'visualizacao',
  'edicao',
  'criacao',
  'exclusao',
  'download'
);

-- Medical specialties
CREATE TYPE public.especialidade_medica AS ENUM (
  'medico_dermatologista',
  'medico_cirurgiao_plastico', 
  'biomedico_esteta',
  'enfermeiro_esteta',
  'fisioterapeuta_dermato_funcional',
  'nutricionista',
  'esteticista_cosmetologo',
  'tricologista',
  'dentista_harmonizacao',
  'farmaceutico_esteta',
  'terapeuta_capilar',
  'massoterapeuta',
  'maquiador_profissional'
);

-- Product categories
CREATE TYPE public.categoria_produto AS ENUM (
  'toxina_botulinica',
  'preenchedores_dermicos',
  'bioestimuladores_colageno',
  'peelings_quimicos',
  'cosmeceuticos',
  'produtos_limpeza',
  'filtros_solares',
  'mascaras_faciais',
  'terapia_capilar',
  'intradermoterapia',
  'anestesicos_topicos'
);

-- Equipment types
CREATE TYPE public.tipo_equipamento AS ENUM (
  'ultrassom_microfocado',
  'laser_fracionado',
  'radiofrequencia',
  'luz_intensa_pulsada',
  'criolipolise',
  'microagulhamento',
  'exossomos',
  'pdrn',
  'eletroterapia',
  'peeling_cristal',
  'ultrassom_estetico'
);

-- Product status
CREATE TYPE public.status_produto AS ENUM (
  'disponivel',
  'baixo_estoque',
  'vencido',
  'descontinuado'
);

-- Equipment status
CREATE TYPE public.status_equipamento AS ENUM (
  'ativo',
  'manutencao',
  'inativo',
  'calibracao'
);

-- Stock movement types
CREATE TYPE public.tipo_movimentacao AS ENUM (
  'entrada',
  'saida',
  'ajuste',
  'vencimento'
);

-- Maintenance types
CREATE TYPE public.tipo_manutencao AS ENUM (
  'preventiva',
  'corretiva',
  'calibracao',
  'limpeza'
);

-- Maintenance status
CREATE TYPE public.status_manutencao AS ENUM (
  'agendada',
  'realizada',
  'cancelada',
  'pendente'
);

-- Service provider types
CREATE TYPE public.tipo_prestador AS ENUM (
  'secretaria',
  'limpeza',
  'seguranca',
  'ti',
  'contabilidade',
  'juridico',
  'marketing',
  'outro'
);

-- =====================================================
-- BASIC UTILITY FUNCTIONS
-- =====================================================

-- Function to update timestamp automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$ LANGUAGE plpgsql SET search_path = public;

-- Function to generate medical record numbers
CREATE OR REPLACE FUNCTION public.gerar_numero_prontuario()
RETURNS TEXT AS $
BEGIN
  RETURN 'PRONT-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
         LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(numero_prontuario FROM 11 FOR 6) AS INTEGER)), 0) + 1 
               FROM public.prontuarios 
               WHERE numero_prontuario LIKE 'PRONT-' || TO_CHAR(NOW(), 'YYYY') || '-%')::TEXT, 6, '0');
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check user role in context
CREATE OR REPLACE FUNCTION public.get_user_role_in_context(
  user_uuid UUID, 
  org_id UUID DEFAULT NULL, 
  clinic_id UUID DEFAULT NULL
)
RETURNS user_role_type
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $
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
      WHEN 'visitante' THEN 6
    END
  LIMIT 1;
$;

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION public.user_has_role(user_uuid UUID, required_role user_role_type)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $
  SELECT EXISTS(
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = user_uuid 
      AND role = required_role 
      AND ativo = true
  );
$;

-- Function to generate secure tokens
CREATE OR REPLACE FUNCTION public.generate_secure_token(length INTEGER DEFAULT 32)
RETURNS TEXT AS $
BEGIN
  RETURN encode(gen_random_bytes(length), 'hex');
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to hash sensitive data
CREATE OR REPLACE FUNCTION public.hash_sensitive_data(data TEXT, salt TEXT DEFAULT NULL)
RETURNS TEXT AS $
BEGIN
  IF salt IS NULL THEN
    salt := gen_random_uuid()::TEXT;
  END IF;
  RETURN crypt(data, gen_salt('bf', 8));
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate CPF format (Brazilian tax ID)
CREATE OR REPLACE FUNCTION public.validate_cpf(cpf TEXT)
RETURNS BOOLEAN AS $
DECLARE
  clean_cpf TEXT;
  sum1 INTEGER := 0;
  sum2 INTEGER := 0;
  digit1 INTEGER;
  digit2 INTEGER;
  i INTEGER;
BEGIN
  -- Remove non-numeric characters
  clean_cpf := regexp_replace(cpf, '[^0-9]', '', 'g');
  
  -- Check length
  IF length(clean_cpf) != 11 THEN
    RETURN FALSE;
  END IF;
  
  -- Check for known invalid patterns
  IF clean_cpf IN ('00000000000', '11111111111', '22222222222', '33333333333', 
                   '44444444444', '55555555555', '66666666666', '77777777777',
                   '88888888888', '99999999999') THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate first verification digit
  FOR i IN 1..9 LOOP
    sum1 := sum1 + (substring(clean_cpf, i, 1)::INTEGER * (11 - i));
  END LOOP;
  
  digit1 := 11 - (sum1 % 11);
  IF digit1 >= 10 THEN
    digit1 := 0;
  END IF;
  
  -- Calculate second verification digit
  FOR i IN 1..10 LOOP
    sum2 := sum2 + (substring(clean_cpf, i, 1)::INTEGER * (12 - i));
  END LOOP;
  
  digit2 := 11 - (sum2 % 11);
  IF digit2 >= 10 THEN
    digit2 := 0;
  END IF;
  
  -- Verify digits
  RETURN (substring(clean_cpf, 10, 1)::INTEGER = digit1 AND 
          substring(clean_cpf, 11, 1)::INTEGER = digit2);
END;
$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate CNPJ format (Brazilian company ID)
CREATE OR REPLACE FUNCTION public.validate_cnpj(cnpj TEXT)
RETURNS BOOLEAN AS $
DECLARE
  clean_cnpj TEXT;
  sum1 INTEGER := 0;
  sum2 INTEGER := 0;
  digit1 INTEGER;
  digit2 INTEGER;
  weights1 INTEGER[] := ARRAY[5,4,3,2,9,8,7,6,5,4,3,2];
  weights2 INTEGER[] := ARRAY[6,5,4,3,2,9,8,7,6,5,4,3,2];
  i INTEGER;
BEGIN
  -- Remove non-numeric characters
  clean_cnpj := regexp_replace(cnpj, '[^0-9]', '', 'g');
  
  -- Check length
  IF length(clean_cnpj) != 14 THEN
    RETURN FALSE;
  END IF;
  
  -- Check for known invalid patterns
  IF clean_cnpj IN ('00000000000000', '11111111111111', '22222222222222', '33333333333333',
                    '44444444444444', '55555555555555', '66666666666666', '77777777777777',
                    '88888888888888', '99999999999999') THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate first verification digit
  FOR i IN 1..12 LOOP
    sum1 := sum1 + (substring(clean_cnpj, i, 1)::INTEGER * weights1[i]);
  END LOOP;
  
  digit1 := sum1 % 11;
  IF digit1 < 2 THEN
    digit1 := 0;
  ELSE
    digit1 := 11 - digit1;
  END IF;
  
  -- Calculate second verification digit
  FOR i IN 1..13 LOOP
    sum2 := sum2 + (substring(clean_cnpj, i, 1)::INTEGER * weights2[i]);
  END LOOP;
  
  digit2 := sum2 % 11;
  IF digit2 < 2 THEN
    digit2 := 0;
  ELSE
    digit2 := 11 - digit2;
  END IF;
  
  -- Verify digits
  RETURN (substring(clean_cnpj, 13, 1)::INTEGER = digit1 AND 
          substring(clean_cnpj, 14, 1)::INTEGER = digit2);
END;
$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate email format
CREATE OR REPLACE FUNCTION public.validate_email(email TEXT)
RETURNS BOOLEAN AS $
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- AUDIT AND LOGGING FUNCTIONS
-- =====================================================

-- Function for automatic audit logging
CREATE OR REPLACE FUNCTION public.log_auditoria()
RETURNS TRIGGER AS $
DECLARE
  usuario_atual UUID;
  operacao_tipo TEXT;
BEGIN
  usuario_atual := auth.uid();
  
  CASE TG_OP
    WHEN 'INSERT' THEN operacao_tipo := 'INSERT';
    WHEN 'UPDATE' THEN operacao_tipo := 'UPDATE';
    WHEN 'DELETE' THEN operacao_tipo := 'DELETE';
  END CASE;
  
  INSERT INTO public.auditoria_medica (
    prontuario_id,
    tabela_afetada,
    registro_id,
    operacao,
    dados_anteriores,
    dados_novos,
    usuario_id,
    ip_origem
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    operacao_tipo,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
    usuario_atual,
    inet_client_addr()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- COMPLETION VERIFICATION
-- =====================================================

-- Verify all ENUMs were created successfully
DO $
DECLARE
  enum_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO enum_count
  FROM pg_type 
  WHERE typtype = 'e' 
    AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  IF enum_count >= 20 THEN
    RAISE NOTICE 'Foundation layer created successfully with % ENUM types', enum_count;
  ELSE
    RAISE EXCEPTION 'Foundation layer incomplete - only % ENUM types created', enum_count;
  END IF;
END $;

-- Add comment to track completion
COMMENT ON SCHEMA public IS 'Foundation layer with ENUMs and extensions completed - ' || now();