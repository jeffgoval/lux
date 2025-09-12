-- =====================================================
-- ORGANIZATION AND CLINIC TABLES
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- =====================================================
-- ORGANIZATIONS TABLE
-- =====================================================

-- Table for organizations (groups of clinics)
CREATE TABLE public.organizacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  razao_social TEXT,
  nome_fantasia TEXT,
  plano plano_type NOT NULL DEFAULT 'basico',
  
  -- Contact information
  email TEXT,
  telefone TEXT,
  website TEXT,
  
  -- Address information
  endereco JSONB,
  
  -- Business information
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  atividade_principal TEXT,
  data_fundacao DATE,
  
  -- System configuration
  configuracoes JSONB DEFAULT '{}'::jsonb,
  limite_clinicas INTEGER DEFAULT 1,
  limite_usuarios INTEGER DEFAULT 10,
  recursos_habilitados TEXT[] DEFAULT ARRAY['prontuarios', 'agenda', 'estoque'],
  
  -- Status and metadata
  ativo BOOLEAN NOT NULL DEFAULT true,
  verificado BOOLEAN NOT NULL DEFAULT false,
  data_verificacao TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT organizacoes_cnpj_valid CHECK (cnpj IS NULL OR public.validate_cnpj(cnpj)),
  CONSTRAINT organizacoes_email_valid CHECK (email IS NULL OR public.validate_email(email)),
  CONSTRAINT organizacoes_limite_positivo CHECK (limite_clinicas > 0 AND limite_usuarios > 0)
);

-- =====================================================
-- CLINICS TABLE
-- =====================================================

-- Table for clinics (can be independent or part of an organization)
CREATE TABLE public.clinicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj TEXT,
  
  -- Address information
  endereco_rua TEXT,
  endereco_numero TEXT,
  endereco_complemento TEXT,
  endereco_bairro TEXT,
  endereco_cidade TEXT,
  endereco_estado TEXT,
  endereco_cep TEXT,
  endereco_pais TEXT DEFAULT 'Brasil',
  
  -- Contact information
  telefone TEXT,
  email TEXT,
  website TEXT,
  whatsapp TEXT,
  
  -- Business information
  especialidades TEXT[],
  horario_funcionamento JSONB,
  capacidade_atendimento INTEGER,
  numero_salas INTEGER,
  
  -- Registration and licenses
  registro_anvisa TEXT,
  alvara_funcionamento TEXT,
  licenca_sanitaria TEXT,
  responsavel_tecnico_nome TEXT,
  responsavel_tecnico_registro TEXT,
  
  -- Configuration
  configuracoes JSONB DEFAULT '{}'::jsonb,
  aceita_convenios BOOLEAN DEFAULT false,
  convenios_aceitos TEXT[],
  
  -- Status and metadata
  ativo BOOLEAN NOT NULL DEFAULT true,
  verificado BOOLEAN NOT NULL DEFAULT false,
  data_verificacao TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT clinicas_cnpj_valid CHECK (cnpj IS NULL OR public.validate_cnpj(cnpj)),
  CONSTRAINT clinicas_email_valid CHECK (email IS NULL OR public.validate_email(email)),
  CONSTRAINT clinicas_cep_format CHECK (endereco_cep IS NULL OR endereco_cep ~ '^\d{5}-?\d{3}$'),
  CONSTRAINT clinicas_capacidade_positiva CHECK (capacidade_atendimento IS NULL OR capacidade_atendimento > 0),
  CONSTRAINT clinicas_salas_positiva CHECK (numero_salas IS NULL OR numero_salas > 0)
);

-- =====================================================
-- CLINIC PROFESSIONALS TABLE
-- =====================================================

-- Table linking professionals to clinics with specific roles and permissions
CREATE TABLE public.clinica_profissionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cargo TEXT NOT NULL,
  especialidades especialidade_medica[],
  
  -- Work schedule and availability
  horario_trabalho JSONB,
  disponibilidade_agenda JSONB,
  carga_horaria_semanal INTEGER,
  
  -- Permissions and access
  permissoes JSONB DEFAULT '{}'::jsonb,
  pode_criar_prontuarios BOOLEAN DEFAULT false,
  pode_editar_prontuarios BOOLEAN DEFAULT false,
  pode_visualizar_financeiro BOOLEAN DEFAULT false,
  pode_gerenciar_estoque BOOLEAN DEFAULT false,
  
  -- Employment information
  tipo_vinculo TEXT, -- 'clt', 'pj', 'autonomo', 'sociedade'
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  salario_base DECIMAL(10,2),
  comissao_percentual DECIMAL(5,2),
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT clinica_profissionais_unique UNIQUE(clinica_id, user_id),
  CONSTRAINT clinica_profissionais_data_logic CHECK (data_fim IS NULL OR data_fim > data_inicio),
  CONSTRAINT clinica_profissionais_carga_horaria CHECK (carga_horaria_semanal IS NULL OR (carga_horaria_semanal > 0 AND carga_horaria_semanal <= 60)),
  CONSTRAINT clinica_profissionais_comissao CHECK (comissao_percentual IS NULL OR (comissao_percentual >= 0 AND comissao_percentual <= 100))
);

-- =====================================================
-- CLINIC ROOMS TABLE
-- =====================================================

-- Table for clinic rooms and treatment areas
CREATE TABLE public.salas_clinica (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  numero TEXT,
  tipo TEXT NOT NULL, -- 'consultorio', 'procedimento', 'cirurgia', 'recuperacao', 'espera'
  
  -- Physical characteristics
  area_m2 DECIMAL(6,2),
  capacidade_pessoas INTEGER,
  tem_pia BOOLEAN DEFAULT false,
  tem_ar_condicionado BOOLEAN DEFAULT false,
  tem_ventilacao_natural BOOLEAN DEFAULT false,
  
  -- Equipment and resources
  equipamentos_fixos TEXT[],
  recursos_disponiveis TEXT[],
  
  -- Scheduling and availability
  disponivel_agendamento BOOLEAN DEFAULT true,
  horario_funcionamento JSONB,
  
  -- Configuration
  configuracoes JSONB DEFAULT '{}'::jsonb,
  observacoes TEXT,
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  em_manutencao BOOLEAN DEFAULT false,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT salas_area_positiva CHECK (area_m2 IS NULL OR area_m2 > 0),
  CONSTRAINT salas_capacidade_positiva CHECK (capacidade_pessoas IS NULL OR capacidade_pessoas > 0),
  CONSTRAINT salas_nome_clinica_unique UNIQUE(clinica_id, nome)
);

-- =====================================================
-- ORGANIZATION SETTINGS TABLE
-- =====================================================

-- Table for organization-level settings and configurations
CREATE TABLE public.organizacao_configuracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL, -- 'sistema', 'financeiro', 'agenda', 'prontuarios', 'estoque'
  chave TEXT NOT NULL,
  valor JSONB NOT NULL,
  descricao TEXT,
  tipo_valor TEXT NOT NULL DEFAULT 'string', -- 'string', 'number', 'boolean', 'object', 'array'
  
  -- Validation and constraints
  valor_padrao JSONB,
  opcoes_validas JSONB, -- For enum-like values
  obrigatorio BOOLEAN DEFAULT false,
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT org_config_unique UNIQUE(organizacao_id, categoria, chave)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for organizacoes table
CREATE INDEX idx_organizacoes_cnpj ON public.organizacoes(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX idx_organizacoes_plano ON public.organizacoes(plano);
CREATE INDEX idx_organizacoes_ativo ON public.organizacoes(ativo);
CREATE INDEX idx_organizacoes_criado_por ON public.organizacoes(criado_por);

-- Indexes for clinicas table
CREATE INDEX idx_clinicas_organizacao ON public.clinicas(organizacao_id) WHERE organizacao_id IS NOT NULL;
CREATE INDEX idx_clinicas_cnpj ON public.clinicas(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX idx_clinicas_cidade ON public.clinicas(endereco_cidade) WHERE endereco_cidade IS NOT NULL;
CREATE INDEX idx_clinicas_estado ON public.clinicas(endereco_estado) WHERE endereco_estado IS NOT NULL;
CREATE INDEX idx_clinicas_ativo ON public.clinicas(ativo);
CREATE INDEX idx_clinicas_criado_por ON public.clinicas(criado_por) WHERE criado_por IS NOT NULL;

-- Indexes for clinica_profissionais table
CREATE INDEX idx_clinica_prof_clinica ON public.clinica_profissionais(clinica_id);
CREATE INDEX idx_clinica_prof_user ON public.clinica_profissionais(user_id);
CREATE INDEX idx_clinica_prof_ativo ON public.clinica_profissionais(ativo);
CREATE INDEX idx_clinica_prof_cargo ON public.clinica_profissionais(cargo);

-- Indexes for salas_clinica table
CREATE INDEX idx_salas_clinica ON public.salas_clinica(clinica_id);
CREATE INDEX idx_salas_tipo ON public.salas_clinica(tipo);
CREATE INDEX idx_salas_ativo ON public.salas_clinica(ativo);
CREATE INDEX idx_salas_disponivel ON public.salas_clinica(disponivel_agendamento);

-- Indexes for organizacao_configuracoes table
CREATE INDEX idx_org_config_organizacao ON public.organizacao_configuracoes(organizacao_id);
CREATE INDEX idx_org_config_categoria ON public.organizacao_configuracoes(categoria);
CREATE INDEX idx_org_config_ativo ON public.organizacao_configuracoes(ativo);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Triggers for updating timestamps
CREATE TRIGGER update_organizacoes_updated_at
  BEFORE UPDATE ON public.organizacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinicas_updated_at
  BEFORE UPDATE ON public.clinicas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinica_profissionais_updated_at
  BEFORE UPDATE ON public.clinica_profissionais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_salas_clinica_updated_at
  BEFORE UPDATE ON public.salas_clinica
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_org_configuracoes_updated_at
  BEFORE UPDATE ON public.organizacao_configuracoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- BUSINESS LOGIC FUNCTIONS
-- =====================================================

-- Function to create clinic during onboarding
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
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $
DECLARE
  new_clinic_id UUID;
  user_role_record RECORD;
BEGIN
  -- Check if user is authenticated and has proprietaria role
  SELECT * INTO user_role_record
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
    AND ur.role = 'proprietaria'::user_role_type
    AND ur.ativo = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User must have proprietaria role to create clinics';
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
    user_role_record.organizacao_id, -- Use organization from user's role
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
  );

  -- Return the clinic ID
  RETURN new_clinic_id;
END;
$;

-- Function to add professional to clinic
CREATE OR REPLACE FUNCTION public.add_professional_to_clinic(
  p_clinica_id UUID,
  p_user_id UUID,
  p_cargo TEXT,
  p_especialidades especialidade_medica[] DEFAULT NULL,
  p_tipo_vinculo TEXT DEFAULT 'clt',
  p_salario_base DECIMAL DEFAULT NULL,
  p_comissao_percentual DECIMAL DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  new_professional_id UUID;
BEGIN
  -- Check if user has permission to add professionals
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.clinica_id = p_clinica_id
      AND ur.role IN ('proprietaria', 'gerente')
      AND ur.ativo = true
  ) THEN
    RAISE EXCEPTION 'User does not have permission to add professionals to this clinic';
  END IF;
  
  -- Check if professional is not already linked to this clinic
  IF EXISTS (
    SELECT 1 FROM public.clinica_profissionais
    WHERE clinica_id = p_clinica_id AND user_id = p_user_id AND ativo = true
  ) THEN
    RAISE EXCEPTION 'Professional is already linked to this clinic';
  END IF;
  
  -- Add professional to clinic
  INSERT INTO public.clinica_profissionais (
    clinica_id,
    user_id,
    cargo,
    especialidades,
    tipo_vinculo,
    salario_base,
    comissao_percentual,
    criado_por
  ) VALUES (
    p_clinica_id,
    p_user_id,
    p_cargo,
    p_especialidades,
    p_tipo_vinculo,
    p_salario_base,
    p_comissao_percentual,
    auth.uid()
  ) RETURNING id INTO new_professional_id;
  
  -- Assign professional role to user for this clinic
  INSERT INTO public.user_roles (
    user_id,
    clinica_id,
    role,
    criado_por
  ) VALUES (
    p_user_id,
    p_clinica_id,
    'profissionais',
    auth.uid()
  ) ON CONFLICT (user_id, organizacao_id, clinica_id, role) DO NOTHING;
  
  RETURN new_professional_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get clinic statistics
CREATE OR REPLACE FUNCTION public.get_clinic_stats(p_clinica_id UUID)
RETURNS JSONB AS $
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_profissionais', (
      SELECT COUNT(*) FROM public.clinica_profissionais 
      WHERE clinica_id = p_clinica_id AND ativo = true
    ),
    'total_salas', (
      SELECT COUNT(*) FROM public.salas_clinica 
      WHERE clinica_id = p_clinica_id AND ativo = true
    ),
    'salas_disponiveis', (
      SELECT COUNT(*) FROM public.salas_clinica 
      WHERE clinica_id = p_clinica_id AND ativo = true AND disponivel_agendamento = true
    ),
    'especialidades_oferecidas', (
      SELECT array_agg(DISTINCT unnest(especialidades)) 
      FROM public.clinica_profissionais 
      WHERE clinica_id = p_clinica_id AND ativo = true AND especialidades IS NOT NULL
    )
  ) INTO stats;
  
  RETURN stats;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- ADD FOREIGN KEY CONSTRAINTS TO USER_ROLES
-- =====================================================

-- Now that organizacoes and clinicas tables exist, add the foreign key constraints
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_organizacao_fk 
FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id) ON DELETE CASCADE;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_clinica_fk 
FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE CASCADE;

-- Add foreign key constraints to convites table
ALTER TABLE public.convites 
ADD CONSTRAINT convites_organizacao_fk 
FOREIGN KEY (organizacao_id) REFERENCES public.organizacoes(id) ON DELETE CASCADE;

ALTER TABLE public.convites 
ADD CONSTRAINT convites_clinica_fk 
FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE CASCADE;

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinica_profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salas_clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizacao_configuracoes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Policies for organizacoes
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

CREATE POLICY "Proprietarias can create organizations" ON public.organizacoes
  FOR INSERT WITH CHECK (
    public.user_has_role(auth.uid(), 'proprietaria') AND
    criado_por = auth.uid()
  );

CREATE POLICY "Proprietarias can update their organizations" ON public.organizacoes
  FOR UPDATE USING (
    EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND organizacao_id = public.organizacoes.id 
        AND role = 'proprietaria'
        AND ativo = true
    )
  );

-- Policies for clinicas
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

CREATE POLICY "Proprietárias podem criar clínicas" ON public.clinicas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'proprietaria'::user_role_type
        AND ur.ativo = true
    )
  );

CREATE POLICY "Proprietarias can update their clinics" ON public.clinicas
  FOR UPDATE USING (
    EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND (organizacao_id = public.clinicas.organizacao_id OR clinica_id = public.clinicas.id)
        AND role IN ('proprietaria', 'gerente')
        AND ativo = true
    )
  );

-- Policies for clinica_profissionais
CREATE POLICY "Users can view professionals in their clinics" ON public.clinica_profissionais
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND clinica_id = public.clinica_profissionais.clinica_id
        AND ativo = true
    )
  );

CREATE POLICY "Managers can manage clinic professionals" ON public.clinica_profissionais
  FOR ALL USING (
    EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND clinica_id = public.clinica_profissionais.clinica_id
        AND role IN ('proprietaria', 'gerente')
        AND ativo = true
    )
  );

-- Policies for salas_clinica
CREATE POLICY "Users can view rooms in their clinics" ON public.salas_clinica
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND clinica_id = public.salas_clinica.clinica_id
        AND ativo = true
    )
  );

CREATE POLICY "Managers can manage clinic rooms" ON public.salas_clinica
  FOR ALL USING (
    EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND clinica_id = public.salas_clinica.clinica_id
        AND role IN ('proprietaria', 'gerente')
        AND ativo = true
    )
  );

-- Policies for organizacao_configuracoes
CREATE POLICY "Users can view organization configurations" ON public.organizacao_configuracoes
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND organizacao_id = public.organizacao_configuracoes.organizacao_id
        AND ativo = true
    )
  );

CREATE POLICY "Proprietarias can manage organization configurations" ON public.organizacao_configuracoes
  FOR ALL USING (
    EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND organizacao_id = public.organizacao_configuracoes.organizacao_id
        AND role = 'proprietaria'
        AND ativo = true
    )
  );

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
    AND table_name IN ('organizacoes', 'clinicas', 'clinica_profissionais', 'salas_clinica', 'organizacao_configuracoes');
  
  IF table_count = 5 THEN
    RAISE NOTICE 'Organization and clinic tables created successfully: % tables', table_count;
  ELSE
    RAISE EXCEPTION 'Organization and clinic tables incomplete - only % tables created', table_count;
  END IF;
END $;

-- Add comments to track completion
COMMENT ON TABLE public.organizacoes IS 'Organizations table - created ' || now();
COMMENT ON TABLE public.clinicas IS 'Clinics table with independent and organization support - created ' || now();
COMMENT ON TABLE public.clinica_profissionais IS 'Clinic professionals linking table - created ' || now();
COMMENT ON TABLE public.salas_clinica IS 'Clinic rooms and treatment areas table - created ' || now();
COMMENT ON TABLE public.organizacao_configuracoes IS 'Organization-level configurations table - created ' || now();