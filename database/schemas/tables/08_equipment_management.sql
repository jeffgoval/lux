-- =====================================================
-- EQUIPMENT MANAGEMENT SYSTEM
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- =====================================================
-- EQUIPMENT MANUFACTURERS TABLE
-- =====================================================

-- Table for equipment manufacturers and vendors
CREATE TABLE public.fabricantes_equipamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic information
  nome TEXT NOT NULL,
  razao_social TEXT,
  cnpj TEXT,
  
  -- Contact information
  contato_principal TEXT,
  telefone TEXT,
  email TEXT,
  website TEXT,
  
  -- Support information
  suporte_tecnico TEXT,
  telefone_suporte TEXT,
  email_suporte TEXT,
  horario_suporte TEXT,
  
  -- Business terms
  garantia_meses INTEGER DEFAULT 12,
  prazo_entrega_dias INTEGER DEFAULT 30,
  
  -- Address information
  endereco JSONB,
  
  -- Specialties and certifications
  especialidades TEXT[],
  certificacoes TEXT[],
  paises_atuacao TEXT[],
  
  -- Performance metrics
  avaliacao INTEGER CHECK (avaliacao >= 1 AND avaliacao <= 5),
  tempo_resposta_medio_horas INTEGER,
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- =====================================================
-- EQUIPMENT TABLE
-- =====================================================

-- Main table for equipment management
CREATE TABLE public.equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Equipment identification
  nome TEXT NOT NULL,
  modelo TEXT,
  numero_serie TEXT UNIQUE,
  codigo_patrimonio TEXT,
  
  -- Classification
  tipo tipo_equipamento NOT NULL,
  categoria TEXT, -- 'laser', 'radiofrequencia', 'ultrassom', 'injetavel', 'diagnostico'
  subcategoria TEXT,
  
  -- Manufacturer information
  fabricante_id UUID REFERENCES public.fabricantes_equipamento(id),
  pais_origem TEXT,
  ano_fabricacao INTEGER,
  
  -- Purchase information
  data_compra DATE,
  fornecedor_compra TEXT,
  valor_compra DECIMAL(12,2),
  valor_atual DECIMAL(12,2),
  nota_fiscal TEXT,
  
  -- Physical characteristics
  peso_kg DECIMAL(8,2),
  dimensoes JSONB, -- {length, width, height}
  cor TEXT,
  
  -- Technical specifications
  voltagem TEXT,
  potencia TEXT,
  frequencia TEXT,
  consumo_energia_watts INTEGER,
  
  -- Medical information
  indicacoes TEXT[],
  contraindicacoes TEXT[],
  protocolos TEXT[],
  
  -- Regulatory compliance
  registro_anvisa TEXT,
  certificacoes TEXT[],
  normas_tecnicas TEXT[],
  
  -- Documentation
  manual_usuario_url TEXT,
  manual_tecnico_url TEXT,
  certificado_calibracao_url TEXT,
  laudo_tecnico_url TEXT,
  
  -- Location and assignment
  localizacao TEXT,
  sala_id UUID REFERENCES public.salas_clinica(id),
  responsavel_id UUID REFERENCES auth.users(id),
  
  -- Usage tracking
  horas_uso INTEGER NOT NULL DEFAULT 0,
  ciclos_uso INTEGER DEFAULT 0,
  ultima_utilizacao TIMESTAMP WITH TIME ZONE,
  
  -- Maintenance scheduling
  proxima_manutencao DATE,
  intervalo_manutencao_dias INTEGER DEFAULT 90,
  ultima_calibracao DATE,
  proxima_calibracao DATE,
  intervalo_calibracao_dias INTEGER DEFAULT 365,
  
  -- Status and condition
  status status_equipamento NOT NULL DEFAULT 'ativo',
  condicao TEXT DEFAULT 'excelente', -- 'excelente', 'bom', 'regular', 'ruim'
  motivo_inativacao TEXT,
  data_inativacao DATE,
  
  -- Warranty information
  garantia_ativa BOOLEAN DEFAULT true,
  data_fim_garantia DATE,
  contrato_manutencao TEXT,
  
  -- Multi-tenant support
  organizacao_id UUID REFERENCES public.organizacoes(id),
  clinica_id UUID REFERENCES public.clinicas(id),
  
  -- Images and media
  imagem_url TEXT,
  fotos_equipamento TEXT[],
  
  -- Notes and observations
  observacoes TEXT,
  historico_problemas TEXT,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT equipamentos_valor_positivo CHECK (valor_compra IS NULL OR valor_compra >= 0),
  CONSTRAINT equipamentos_horas_uso_positivas CHECK (horas_uso >= 0),
  CONSTRAINT equipamentos_ano_valido CHECK (ano_fabricacao IS NULL OR ano_fabricacao >= 1900),
  CONSTRAINT equipamentos_garantia_valida CHECK (data_fim_garantia IS NULL OR data_fim_garantia >= data_compra)
);

-- =====================================================
-- EQUIPMENT MAINTENANCE TABLE
-- =====================================================

-- Table for tracking equipment maintenance activities
CREATE TABLE public.manutencoes_equipamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  
  -- Maintenance identification
  numero_manutencao TEXT NOT NULL UNIQUE DEFAULT ('MAN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('manutencao_sequence')::TEXT, 6, '0')),
  tipo tipo_manutencao NOT NULL,
  
  -- Scheduling
  data_agendada DATE NOT NULL,
  hora_agendada TIME,
  data_realizada DATE,
  hora_inicio TIME,
  hora_fim TIME,
  
  -- Service details
  descricao TEXT NOT NULL,
  procedimentos_realizados TEXT[],
  pecas_substituidas JSONB,
  materiais_utilizados JSONB,
  
  -- Technical information
  problema_identificado TEXT,
  solucao_aplicada TEXT,
  testes_realizados TEXT,
  parametros_verificados JSONB,
  
  -- Service provider
  tecnico_responsavel TEXT,
  empresa_manutencao TEXT,
  contato_tecnico TEXT,
  certificacao_tecnico TEXT,
  
  -- Financial information
  custo DECIMAL(10,2),
  custo_pecas DECIMAL(10,2),
  custo_mao_obra DECIMAL(10,2),
  custo_deslocamento DECIMAL(10,2),
  
  -- Results and follow-up
  resultado_manutencao TEXT, -- 'sucesso', 'parcial', 'falha'
  equipamento_funcionando BOOLEAN,
  proxima_manutencao DATE,
  recomendacoes TEXT,
  
  -- Documentation
  relatorio_tecnico_url TEXT,
  fotos_antes TEXT[],
  fotos_depois TEXT[],
  certificado_servico_url TEXT,
  
  -- Status and approval
  status status_manutencao NOT NULL DEFAULT 'agendada',
  aprovado_por UUID REFERENCES auth.users(id),
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  
  -- Quality assessment
  avaliacao_servico INTEGER CHECK (avaliacao_servico >= 1 AND avaliacao_servico <= 5),
  comentarios_avaliacao TEXT,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT manutencoes_data_realizacao_valida CHECK (data_realizada IS NULL OR data_realizada >= data_agendada),
  CONSTRAINT manutencoes_custo_positivo CHECK (custo IS NULL OR custo >= 0),
  CONSTRAINT manutencoes_hora_valida CHECK (hora_fim IS NULL OR hora_inicio IS NULL OR hora_fim >= hora_inicio)
);

-- =====================================================
-- EQUIPMENT USAGE LOG TABLE
-- =====================================================

-- Table for tracking equipment usage in procedures
CREATE TABLE public.uso_equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  
  -- Usage context
  sessao_id UUID REFERENCES public.sessoes_atendimento(id) ON DELETE CASCADE,
  prontuario_id UUID REFERENCES public.prontuarios(id),
  profissional_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Usage details
  data_uso TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tempo_uso_minutos INTEGER,
  
  -- Technical parameters
  potencia_utilizada TEXT,
  frequencia_utilizada TEXT,
  parametros_configuracao JSONB,
  modo_operacao TEXT,
  
  -- Procedure information
  tipo_procedimento tipo_procedimento,
  regiao_tratada TEXT,
  numero_disparos INTEGER,
  energia_total_joules DECIMAL(10,2),
  
  -- Results and observations
  resultado_procedimento TEXT,
  intercorrencias TEXT,
  observacoes TEXT,
  
  -- Equipment condition
  condicao_antes TEXT,
  condicao_depois TEXT,
  problemas_identificados TEXT,
  
  -- Consumables used
  consumiveis_utilizados JSONB,
  
  -- Performance metrics
  eficiencia_energetica DECIMAL(5,2),
  temperatura_operacao DECIMAL(4,1),
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT uso_tempo_positivo CHECK (tempo_uso_minutos IS NULL OR tempo_uso_minutos > 0),
  CONSTRAINT uso_disparos_positivos CHECK (numero_disparos IS NULL OR numero_disparos >= 0),
  CONSTRAINT uso_energia_positiva CHECK (energia_total_joules IS NULL OR energia_total_joules >= 0)
);

-- =====================================================
-- EQUIPMENT CALIBRATION TABLE
-- =====================================================

-- Table for equipment calibration records
CREATE TABLE public.calibracoes_equipamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  
  -- Calibration identification
  numero_calibracao TEXT NOT NULL UNIQUE DEFAULT ('CAL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('calibracao_sequence')::TEXT, 6, '0')),
  
  -- Scheduling and execution
  data_agendada DATE NOT NULL,
  data_realizada DATE,
  
  -- Service provider
  empresa_calibracao TEXT NOT NULL,
  tecnico_responsavel TEXT,
  certificacao_tecnico TEXT,
  
  -- Calibration details
  tipo_calibracao TEXT, -- 'inicial', 'periodica', 'pos_manutencao', 'verificacao'
  norma_aplicada TEXT,
  procedimento_utilizado TEXT,
  
  -- Measurements and results
  parametros_verificados JSONB NOT NULL,
  valores_antes JSONB,
  valores_depois JSONB,
  desvios_encontrados JSONB,
  ajustes_realizados JSONB,
  
  -- Compliance and certification
  resultado TEXT NOT NULL, -- 'aprovado', 'aprovado_com_restricoes', 'reprovado'
  certificado_numero TEXT,
  certificado_url TEXT,
  validade_certificado DATE,
  
  -- Next calibration
  proxima_calibracao DATE,
  intervalo_recomendado_dias INTEGER,
  
  -- Financial information
  custo DECIMAL(10,2),
  
  -- Status
  status TEXT DEFAULT 'concluida', -- 'agendada', 'em_andamento', 'concluida', 'cancelada'
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT calibracoes_data_valida CHECK (data_realizada IS NULL OR data_realizada >= data_agendada),
  CONSTRAINT calibracoes_custo_positivo CHECK (custo IS NULL OR custo >= 0),
  CONSTRAINT calibracoes_validade_valida CHECK (validade_certificado IS NULL OR validade_certificado > data_realizada)
);

-- =====================================================
-- EQUIPMENT ALERTS TABLE
-- =====================================================

-- Table for equipment-related alerts and notifications
CREATE TABLE public.alertas_equipamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  
  -- Alert details
  tipo_alerta TEXT NOT NULL, -- 'manutencao_vencida', 'calibracao_vencida', 'garantia_expirando', 'uso_excessivo'
  nivel_prioridade TEXT NOT NULL DEFAULT 'medio', -- 'baixo', 'medio', 'alto', 'critico'
  
  -- Alert content
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  dados_contexto JSONB,
  
  -- Status and resolution
  ativo BOOLEAN NOT NULL DEFAULT true,
  resolvido BOOLEAN DEFAULT false,
  data_resolucao TIMESTAMP WITH TIME ZONE,
  resolvido_por UUID REFERENCES auth.users(id),
  acao_tomada TEXT,
  
  -- Notification settings
  notificar_email BOOLEAN DEFAULT true,
  notificar_sistema BOOLEAN DEFAULT true,
  usuarios_notificados UUID[],
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SEQUENCES FOR NUMBERING
-- =====================================================

CREATE SEQUENCE IF NOT EXISTS manutencao_sequence START 1;
CREATE SEQUENCE IF NOT EXISTS calibracao_sequence START 1;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for fabricantes_equipamento table
CREATE INDEX idx_fabricantes_ativo ON public.fabricantes_equipamento(ativo);
CREATE INDEX idx_fabricantes_avaliacao ON public.fabricantes_equipamento(avaliacao) WHERE avaliacao IS NOT NULL;

-- Indexes for equipamentos table
CREATE INDEX idx_equipamentos_tipo ON public.equipamentos(tipo);
CREATE INDEX idx_equipamentos_fabricante ON public.equipamentos(fabricante_id) WHERE fabricante_id IS NOT NULL;
CREATE INDEX idx_equipamentos_numero_serie ON public.equipamentos(numero_serie) WHERE numero_serie IS NOT NULL;
CREATE INDEX idx_equipamentos_status ON public.equipamentos(status);
CREATE INDEX idx_equipamentos_sala ON public.equipamentos(sala_id) WHERE sala_id IS NOT NULL;
CREATE INDEX idx_equipamentos_responsavel ON public.equipamentos(responsavel_id) WHERE responsavel_id IS NOT NULL;
CREATE INDEX idx_equipamentos_organizacao ON public.equipamentos(organizacao_id) WHERE organizacao_id IS NOT NULL;
CREATE INDEX idx_equipamentos_clinica ON public.equipamentos(clinica_id) WHERE clinica_id IS NOT NULL;
CREATE INDEX idx_equipamentos_manutencao ON public.equipamentos(proxima_manutencao) WHERE proxima_manutencao IS NOT NULL;
CREATE INDEX idx_equipamentos_calibracao ON public.equipamentos(proxima_calibracao) WHERE proxima_calibracao IS NOT NULL;

-- Indexes for manutencoes_equipamento table
CREATE INDEX idx_manutencoes_equipamento ON public.manutencoes_equipamento(equipamento_id);
CREATE INDEX idx_manutencoes_tipo ON public.manutencoes_equipamento(tipo);
CREATE INDEX idx_manutencoes_status ON public.manutencoes_equipamento(status);
CREATE INDEX idx_manutencoes_data_agendada ON public.manutencoes_equipamento(data_agendada);
CREATE INDEX idx_manutencoes_data_realizada ON public.manutencoes_equipamento(data_realizada) WHERE data_realizada IS NOT NULL;

-- Indexes for uso_equipamentos table
CREATE INDEX idx_uso_equipamento ON public.uso_equipamentos(equipamento_id);
CREATE INDEX idx_uso_sessao ON public.uso_equipamentos(sessao_id) WHERE sessao_id IS NOT NULL;
CREATE INDEX idx_uso_profissional ON public.uso_equipamentos(profissional_id);
CREATE INDEX idx_uso_data ON public.uso_equipamentos(data_uso);
CREATE INDEX idx_uso_tipo_procedimento ON public.uso_equipamentos(tipo_procedimento) WHERE tipo_procedimento IS NOT NULL;

-- Indexes for calibracoes_equipamento table
CREATE INDEX idx_calibracoes_equipamento ON public.calibracoes_equipamento(equipamento_id);
CREATE INDEX idx_calibracoes_data_agendada ON public.calibracoes_equipamento(data_agendada);
CREATE INDEX idx_calibracoes_data_realizada ON public.calibracoes_equipamento(data_realizada) WHERE data_realizada IS NOT NULL;
CREATE INDEX idx_calibracoes_status ON public.calibracoes_equipamento(status);
CREATE INDEX idx_calibracoes_resultado ON public.calibracoes_equipamento(resultado);

-- Indexes for alertas_equipamento table
CREATE INDEX idx_alertas_equip_equipamento ON public.alertas_equipamento(equipamento_id);
CREATE INDEX idx_alertas_equip_tipo ON public.alertas_equipamento(tipo_alerta);
CREATE INDEX idx_alertas_equip_ativo ON public.alertas_equipamento(ativo);
CREATE INDEX idx_alertas_equip_prioridade ON public.alertas_equipamento(nivel_prioridade);
CREATE INDEX idx_alertas_equip_resolvido ON public.alertas_equipamento(resolvido);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Triggers for updating timestamps
CREATE TRIGGER update_fabricantes_equip_updated_at
  BEFORE UPDATE ON public.fabricantes_equipamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipamentos_updated_at
  BEFORE UPDATE ON public.equipamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_manutencoes_updated_at
  BEFORE UPDATE ON public.manutencoes_equipamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calibracoes_updated_at
  BEFORE UPDATE ON public.calibracoes_equipamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alertas_equip_updated_at
  BEFORE UPDATE ON public.alertas_equipamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update equipment usage statistics
CREATE OR REPLACE FUNCTION public.update_equipment_usage_stats()
RETURNS TRIGGER AS $
BEGIN
  UPDATE public.equipamentos 
  SET 
    horas_uso = horas_uso + COALESCE(NEW.tempo_uso_minutos, 0) / 60.0,
    ciclos_uso = ciclos_uso + 1,
    ultima_utilizacao = NEW.data_uso
  WHERE id = NEW.equipamento_id;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER update_equipment_stats
  AFTER INSERT ON public.uso_equipamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_equipment_usage_stats();

-- Trigger to check for equipment alerts
CREATE OR REPLACE FUNCTION public.check_equipment_alerts()
RETURNS TRIGGER AS $
DECLARE
  equipment_record RECORD;
BEGIN
  -- Get equipment details
  SELECT * INTO equipment_record
  FROM public.equipamentos
  WHERE id = NEW.equipamento_id;
  
  -- Check for maintenance due
  IF equipment_record.proxima_manutencao IS NOT NULL AND equipment_record.proxima_manutencao <= CURRENT_DATE THEN
    INSERT INTO public.alertas_equipamento (
      equipamento_id,
      tipo_alerta,
      nivel_prioridade,
      titulo,
      mensagem,
      dados_contexto
    ) VALUES (
      NEW.equipamento_id,
      'manutencao_vencida',
      CASE WHEN equipment_record.proxima_manutencao < CURRENT_DATE THEN 'alto' ELSE 'medio' END,
      'Manutenção vencida',
      format('Equipamento %s está com manutenção vencida desde %s', 
             equipment_record.nome, 
             equipment_record.proxima_manutencao),
      jsonb_build_object(
        'data_vencimento', equipment_record.proxima_manutencao,
        'dias_atraso', CURRENT_DATE - equipment_record.proxima_manutencao
      )
    ) ON CONFLICT DO NOTHING;
  END IF;
  
  -- Check for calibration due
  IF equipment_record.proxima_calibracao IS NOT NULL AND equipment_record.proxima_calibracao <= CURRENT_DATE THEN
    INSERT INTO public.alertas_equipamento (
      equipamento_id,
      tipo_alerta,
      nivel_prioridade,
      titulo,
      mensagem,
      dados_contexto
    ) VALUES (
      NEW.equipamento_id,
      'calibracao_vencida',
      'alto',
      'Calibração vencida',
      format('Equipamento %s está com calibração vencida desde %s', 
             equipment_record.nome, 
             equipment_record.proxima_calibracao),
      jsonb_build_object(
        'data_vencimento', equipment_record.proxima_calibracao,
        'dias_atraso', CURRENT_DATE - equipment_record.proxima_calibracao
      )
    ) ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER check_equipment_alerts_on_use
  AFTER INSERT ON public.uso_equipamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.check_equipment_alerts();

-- =====================================================
-- EQUIPMENT MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to register equipment usage
CREATE OR REPLACE FUNCTION public.register_equipment_usage(
  p_equipamento_id UUID,
  p_sessao_id UUID DEFAULT NULL,
  p_tempo_uso_minutos INTEGER DEFAULT NULL,
  p_potencia_utilizada TEXT DEFAULT NULL,
  p_parametros_configuracao JSONB DEFAULT NULL,
  p_tipo_procedimento tipo_procedimento DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  new_usage_id UUID;
  equipment_status status_equipamento;
BEGIN
  -- Check equipment status
  SELECT status INTO equipment_status
  FROM public.equipamentos
  WHERE id = p_equipamento_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Equipment not found';
  END IF;
  
  IF equipment_status != 'ativo' THEN
    RAISE EXCEPTION 'Equipment is not active (status: %)', equipment_status;
  END IF;
  
  -- Insert usage record
  INSERT INTO public.uso_equipamentos (
    equipamento_id,
    sessao_id,
    profissional_id,
    tempo_uso_minutos,
    potencia_utilizada,
    parametros_configuracao,
    tipo_procedimento,
    observacoes
  ) VALUES (
    p_equipamento_id,
    p_sessao_id,
    auth.uid(),
    p_tempo_uso_minutos,
    p_potencia_utilizada,
    p_parametros_configuracao,
    p_tipo_procedimento,
    p_observacoes
  ) RETURNING id INTO new_usage_id;
  
  RETURN new_usage_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to schedule equipment maintenance
CREATE OR REPLACE FUNCTION public.schedule_equipment_maintenance(
  p_equipamento_id UUID,
  p_tipo tipo_manutencao,
  p_data_agendada DATE,
  p_descricao TEXT,
  p_tecnico_responsavel TEXT DEFAULT NULL,
  p_empresa_manutencao TEXT DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  new_maintenance_id UUID;
BEGIN
  -- Insert maintenance record
  INSERT INTO public.manutencoes_equipamento (
    equipamento_id,
    tipo,
    data_agendada,
    descricao,
    tecnico_responsavel,
    empresa_manutencao,
    criado_por
  ) VALUES (
    p_equipamento_id,
    p_tipo,
    p_data_agendada,
    p_descricao,
    p_tecnico_responsavel,
    p_empresa_manutencao,
    auth.uid()
  ) RETURNING id INTO new_maintenance_id;
  
  RETURN new_maintenance_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to complete equipment maintenance
CREATE OR REPLACE FUNCTION public.complete_equipment_maintenance(
  p_maintenance_id UUID,
  p_data_realizada DATE,
  p_procedimentos_realizados TEXT[],
  p_custo DECIMAL DEFAULT NULL,
  p_resultado_manutencao TEXT DEFAULT 'sucesso',
  p_proxima_manutencao DATE DEFAULT NULL
)
RETURNS BOOLEAN AS $
DECLARE
  maintenance_record RECORD;
BEGIN
  -- Get maintenance record
  SELECT * INTO maintenance_record
  FROM public.manutencoes_equipamento
  WHERE id = p_maintenance_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Maintenance record not found';
  END IF;
  
  -- Update maintenance record
  UPDATE public.manutencoes_equipamento
  SET 
    data_realizada = p_data_realizada,
    procedimentos_realizados = p_procedimentos_realizados,
    custo = p_custo,
    resultado_manutencao = p_resultado_manutencao,
    proxima_manutencao = p_proxima_manutencao,
    status = 'realizada'
  WHERE id = p_maintenance_id;
  
  -- Update equipment next maintenance date
  IF p_proxima_manutencao IS NOT NULL THEN
    UPDATE public.equipamentos
    SET proxima_manutencao = p_proxima_manutencao
    WHERE id = maintenance_record.equipamento_id;
  END IF;
  
  RETURN true;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get equipment maintenance history
CREATE OR REPLACE FUNCTION public.get_equipment_maintenance_history(p_equipamento_id UUID)
RETURNS TABLE(
  id UUID,
  tipo tipo_manutencao,
  data_agendada DATE,
  data_realizada DATE,
  descricao TEXT,
  custo DECIMAL,
  resultado_manutencao TEXT,
  status status_manutencao
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.tipo,
    m.data_agendada,
    m.data_realizada,
    m.descricao,
    m.custo,
    m.resultado_manutencao,
    m.status
  FROM public.manutencoes_equipamento m
  WHERE m.equipamento_id = p_equipamento_id
  ORDER BY m.data_agendada DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get equipment usage statistics
CREATE OR REPLACE FUNCTION public.get_equipment_usage_stats(
  p_equipamento_id UUID,
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL
)
RETURNS JSONB AS $
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_usos', COUNT(*),
    'tempo_total_horas', SUM(COALESCE(tempo_uso_minutos, 0)) / 60.0,
    'tempo_medio_uso_minutos', AVG(tempo_uso_minutos),
    'profissionais_usuarios', COUNT(DISTINCT profissional_id),
    'procedimentos_realizados', COUNT(DISTINCT tipo_procedimento),
    'ultimo_uso', MAX(data_uso),
    'uso_por_procedimento', (
      SELECT jsonb_object_agg(
        tipo_procedimento,
        COUNT(*)
      )
      FROM public.uso_equipamentos
      WHERE equipamento_id = p_equipamento_id
        AND tipo_procedimento IS NOT NULL
        AND (p_data_inicio IS NULL OR data_uso::date >= p_data_inicio)
        AND (p_data_fim IS NULL OR data_uso::date <= p_data_fim)
      GROUP BY tipo_procedimento
    )
  ) INTO stats
  FROM public.uso_equipamentos
  WHERE equipamento_id = p_equipamento_id
    AND (p_data_inicio IS NULL OR data_uso::date >= p_data_inicio)
    AND (p_data_fim IS NULL OR data_uso::date <= p_data_fim);
  
  RETURN stats;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get equipment alerts
CREATE OR REPLACE FUNCTION public.get_equipment_alerts(p_clinica_id UUID DEFAULT NULL)
RETURNS TABLE(
  equipamento_id UUID,
  equipamento_nome TEXT,
  tipo_alerta TEXT,
  nivel_prioridade TEXT,
  titulo TEXT,
  mensagem TEXT,
  criado_em TIMESTAMP WITH TIME ZONE
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    a.equipamento_id,
    e.nome as equipamento_nome,
    a.tipo_alerta,
    a.nivel_prioridade,
    a.titulo,
    a.mensagem,
    a.criado_em
  FROM public.alertas_equipamento a
  JOIN public.equipamentos e ON e.id = a.equipamento_id
  WHERE a.ativo = true
    AND a.resolvido = false
    AND (p_clinica_id IS NULL OR e.clinica_id = p_clinica_id)
  ORDER BY 
    CASE a.nivel_prioridade 
      WHEN 'critico' THEN 1
      WHEN 'alto' THEN 2
      WHEN 'medio' THEN 3
      WHEN 'baixo' THEN 4
    END,
    a.criado_em DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- INSERT DEFAULT EQUIPMENT MANUFACTURERS
-- =====================================================

-- Insert default equipment manufacturers
INSERT INTO public.fabricantes_equipamento (nome, contato_principal, telefone, email, suporte_tecnico, garantia_meses) VALUES
('Alma Lasers', 'Suporte Alma', '(11) 3456-7890', 'suporte@alma.com', '24h', 24),
('Solta Medical', 'Suporte Solta', '(11) 3456-7891', 'suporte@solta.com', 'Comercial', 12),
('Inmode', 'Suporte Inmode', '(11) 3456-7892', 'suporte@inmode.com', '24h', 18),
('BTL', 'Suporte BTL', '(11) 3456-7893', 'suporte@btl.com', 'Comercial', 24),
('Lavieen', 'Suporte Lavieen', '(11) 3456-7894', 'suporte@lavieen.com', '24h', 12),
('Fotona', 'Suporte Fotona', '(11) 3456-7895', 'suporte@fotona.com', 'Comercial', 18),
('Candela', 'Suporte Candela', '(11) 3456-7896', 'suporte@candela.com', '24h', 24),
('Cynosure', 'Suporte Cynosure', '(11) 3456-7897', 'suporte@cynosure.com', 'Comercial', 12);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.fabricantes_equipamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencoes_equipamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uso_equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibracoes_equipamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_equipamento ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Policies for fabricantes_equipamento (public read access)
CREATE POLICY "Todos podem visualizar fabricantes"
ON public.fabricantes_equipamento FOR SELECT
USING (ativo = true);

CREATE POLICY "Administradores podem gerenciar fabricantes"
ON public.fabricantes_equipamento FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'proprietaria')
      AND ur.ativo = true
  )
);

-- Policies for equipamentos
CREATE POLICY "Profissionais podem visualizar equipamentos de suas clínicas"
ON public.equipamentos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.organizacao_id = public.equipamentos.organizacao_id OR ur.clinica_id = public.equipamentos.clinica_id)
      AND ur.ativo = true
  )
);

CREATE POLICY "Gerentes podem gerenciar equipamentos"
ON public.equipamentos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.organizacao_id = public.equipamentos.organizacao_id OR ur.clinica_id = public.equipamentos.clinica_id)
      AND ur.role IN ('proprietaria', 'gerente')
      AND ur.ativo = true
  )
) WITH CHECK (criado_por IS NULL OR auth.uid() = criado_por);

-- Policies for manutencoes_equipamento
CREATE POLICY "Profissionais podem visualizar manutenções de suas clínicas"
ON public.manutencoes_equipamento FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.equipamentos e
    JOIN public.user_roles ur ON (ur.organizacao_id = e.organizacao_id OR ur.clinica_id = e.clinica_id)
    WHERE e.id = public.manutencoes_equipamento.equipamento_id
      AND ur.user_id = auth.uid()
      AND ur.ativo = true
  )
);

CREATE POLICY "Gerentes podem gerenciar manutenções"
ON public.manutencoes_equipamento FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.equipamentos e
    JOIN public.user_roles ur ON (ur.organizacao_id = e.organizacao_id OR ur.clinica_id = e.clinica_id)
    WHERE e.id = public.manutencoes_equipamento.equipamento_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('proprietaria', 'gerente')
      AND ur.ativo = true
  )
) WITH CHECK (criado_por IS NULL OR auth.uid() = criado_por);

-- Policies for uso_equipamentos
CREATE POLICY "Profissionais podem visualizar uso de equipamentos de suas clínicas"
ON public.uso_equipamentos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.equipamentos e
    JOIN public.user_roles ur ON (ur.organizacao_id = e.organizacao_id OR ur.clinica_id = e.clinica_id)
    WHERE e.id = public.uso_equipamentos.equipamento_id
      AND ur.user_id = auth.uid()
      AND ur.ativo = true
  )
);

CREATE POLICY "Profissionais podem registrar uso de equipamentos"
ON public.uso_equipamentos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.equipamentos e
    JOIN public.user_roles ur ON (ur.organizacao_id = e.organizacao_id OR ur.clinica_id = e.clinica_id)
    WHERE e.id = public.uso_equipamentos.equipamento_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('proprietaria', 'gerente', 'profissionais')
      AND ur.ativo = true
  )
  AND profissional_id = auth.uid()
);

-- Policies for calibracoes_equipamento
CREATE POLICY "Profissionais podem visualizar calibrações de suas clínicas"
ON public.calibracoes_equipamento FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.equipamentos e
    JOIN public.user_roles ur ON (ur.organizacao_id = e.organizacao_id OR ur.clinica_id = e.clinica_id)
    WHERE e.id = public.calibracoes_equipamento.equipamento_id
      AND ur.user_id = auth.uid()
      AND ur.ativo = true
  )
);

CREATE POLICY "Gerentes podem gerenciar calibrações"
ON public.calibracoes_equipamento FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.equipamentos e
    JOIN public.user_roles ur ON (ur.organizacao_id = e.organizacao_id OR ur.clinica_id = e.clinica_id)
    WHERE e.id = public.calibracoes_equipamento.equipamento_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('proprietaria', 'gerente')
      AND ur.ativo = true
  )
) WITH CHECK (criado_por IS NULL OR auth.uid() = criado_por);

-- Policies for alertas_equipamento
CREATE POLICY "Profissionais podem visualizar alertas de suas clínicas"
ON public.alertas_equipamento FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.equipamentos e
    JOIN public.user_roles ur ON (ur.organizacao_id = e.organizacao_id OR ur.clinica_id = e.clinica_id)
    WHERE e.id = public.alertas_equipamento.equipamento_id
      AND ur.user_id = auth.uid()
      AND ur.ativo = true
  )
);

CREATE POLICY "Sistema pode criar alertas automaticamente"
ON public.alertas_equipamento FOR INSERT
WITH CHECK (true); -- Allows system-generated alerts

CREATE POLICY "Gerentes podem resolver alertas"
ON public.alertas_equipamento FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.equipamentos e
    JOIN public.user_roles ur ON (ur.organizacao_id = e.organizacao_id OR ur.clinica_id = e.clinica_id)
    WHERE e.id = public.alertas_equipamento.equipamento_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('proprietaria', 'gerente')
      AND ur.ativo = true
  )
);

CREATE POLICY "Gerentes podem gerenciar manutenções"
ON public.manutencoes_equipamento FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.equipamentos e
    JOIN public.user_roles ur ON (ur.organizacao_id = e.organizacao_id OR ur.clinica_id = e.clinica_id)
    WHERE e.id = public.manutencoes_equipamento.equipamento_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('proprietaria', 'gerente')
      AND ur.ativo = true
  )
) WITH CHECK (auth.uid() = criado_por);

-- Policies for uso_equipamentos
CREATE POLICY "Profissionais podem visualizar usos de equipamentos de suas clínicas"
ON public.uso_equipamentos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.equipamentos e
    JOIN public.user_roles ur ON (ur.organizacao_id = e.organizacao_id OR ur.clinica_id = e.clinica_id)
    WHERE e.id = public.uso_equipamentos.equipamento_id
      AND ur.user_id = auth.uid()
      AND ur.ativo = true
  )
);

CREATE POLICY "Profissionais podem registrar uso de equipamentos"
ON public.uso_equipamentos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.equipamentos e
    JOIN public.user_roles ur ON (ur.organizacao_id = e.organizacao_id OR ur.clinica_id = e.clinica_id)
    WHERE e.id = NEW.equipamento_id
      AND ur.user_id = auth.uid()
      AND ur.ativo = true
  ) AND profissional_id = auth.uid()
);

-- Policies for calibracoes_equipamento
CREATE POLICY "Profissionais podem visualizar calibrações de suas clínicas"
ON public.calibracoes_equipamento FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.equipamentos e
    JOIN public.user_roles ur ON (ur.organizacao_id = e.organizacao_id OR ur.clinica_id = e.clinica_id)
    WHERE e.id = public.calibracoes_equipamento.equipamento_id
      AND ur.user_id = auth.uid()
      AND ur.ativo = true
  )
);

-- Policies for alertas_equipamento
CREATE POLICY "Profissionais podem visualizar alertas de suas clínicas"
ON public.alertas_equipamento FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.equipamentos e
    JOIN public.user_roles ur ON (ur.organizacao_id = e.organizacao_id OR ur.clinica_id = e.clinica_id)
    WHERE e.id = public.alertas_equipamento.equipamento_id
      AND ur.user_id = auth.uid()
      AND ur.ativo = true
  )
);

-- =====================================================
-- COMPLETION VERIFICATION
-- =====================================================

-- Verify all tables were created successfully
DO $
DECLARE
  table_count INTEGER;
  manufacturer_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('fabricantes_equipamento', 'equipamentos', 'manutencoes_equipamento', 'uso_equipamentos', 'calibracoes_equipamento', 'alertas_equipamento');
  
  SELECT COUNT(*) INTO manufacturer_count
  FROM public.fabricantes_equipamento
  WHERE ativo = true;
  
  IF table_count = 6 THEN
    RAISE NOTICE 'Equipment management system created successfully: % tables, % manufacturers', table_count, manufacturer_count;
  ELSE
    RAISE EXCEPTION 'Equipment management system incomplete - only % tables created', table_count;
  END IF;
END $;

-- Add comments to track completion
COMMENT ON TABLE public.fabricantes_equipamento IS 'Equipment manufacturers table - created ' || now();
COMMENT ON TABLE public.equipamentos IS 'Equipment catalog and management table - created ' || now();
COMMENT ON TABLE public.manutencoes_equipamento IS 'Equipment maintenance tracking table - created ' || now();
COMMENT ON TABLE public.uso_equipamentos IS 'Equipment usage logging table - created ' || now();
COMMENT ON TABLE public.calibracoes_equipamento IS 'Equipment calibration records table - created ' || now();
COMMENT ON TABLE public.alertas_equipamento IS 'Equipment alerts and notifications table - created ' || now();