-- =====================================================
-- MIGRAÇÃO INCREMENTAL - TABELAS FALTANTES
-- Sistema de Gestão de Clínicas Estéticas Premium
-- =====================================================

-- =====================================================
-- 1. VERIFICAR E CRIAR ENUMS FALTANTES
-- =====================================================

-- Status de agendamento
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agendamento_status') THEN
    CREATE TYPE public.agendamento_status AS ENUM (
      'rascunho',
      'pendente',
      'confirmado', 
      'em_andamento',
      'finalizado',
      'cancelado',
      'nao_compareceu',
      'reagendado'
    );
  END IF;
END $$;

-- Tipos de bloqueio
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bloqueio_tipo') THEN
    CREATE TYPE public.bloqueio_tipo AS ENUM (
      'almoco',
      'reuniao',
      'procedimento_especial',
      'manutencao',
      'ferias',
      'licenca',
      'emergencia',
      'personalizado'
    );
  END IF;
END $$;

-- Status da lista de espera
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lista_espera_status') THEN
    CREATE TYPE public.lista_espera_status AS ENUM (
      'ativo',
      'notificado',
      'agendado',
      'cancelado',
      'expirado'
    );
  END IF;
END $$;

-- Categorias de cliente
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cliente_categoria') THEN
    CREATE TYPE public.cliente_categoria AS ENUM (
      'regular',
      'vip',
      'premium',
      'corporativo'
    );
  END IF;
END $$;

-- Níveis de prioridade
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prioridade_nivel') THEN
    CREATE TYPE public.prioridade_nivel AS ENUM (
      'baixa',
      'normal',
      'alta',
      'urgente',
      'vip'
    );
  END IF;
END $$;

-- Níveis de acesso médico
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nivel_acesso_medico') THEN
    CREATE TYPE public.nivel_acesso_medico AS ENUM (
      'medico_responsavel',
      'medico_assistente',
      'enfermeiro',
      'esteticista',
      'administrador'
    );
  END IF;
END $$;

-- Tipos de consentimento
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_consentimento') THEN
    CREATE TYPE public.tipo_consentimento AS ENUM (
      'termo_responsabilidade',
      'autorizacao_imagem',
      'consentimento_procedimento',
      'termo_privacidade'
    );
  END IF;
END $$;

-- Tipos de imagem médica
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_imagem') THEN
    CREATE TYPE public.tipo_imagem AS ENUM (
      'antes',
      'durante',
      'depois',
      'complicacao',
      'documento'
    );
  END IF;
END $$;

-- =====================================================
-- 2. CRIAR TABELAS FALTANTES
-- =====================================================

-- Organizações (se não existir)
CREATE TABLE IF NOT EXISTS public.organizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  endereco JSONB DEFAULT '{}'::jsonb,
  telefone_principal TEXT,
  email_contato TEXT,
  plano TEXT NOT NULL DEFAULT 'basico',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  data_nascimento DATE,
  cpf TEXT,
  endereco JSONB DEFAULT '{}'::jsonb,
  categoria cliente_categoria NOT NULL DEFAULT 'regular',
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Serviços
CREATE TABLE IF NOT EXISTS public.servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  nome_tecnico TEXT,
  codigo_interno TEXT,
  categoria TEXT NOT NULL,
  subcategoria TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  descricao_comercial TEXT,
  descricao_tecnica TEXT,
  descricao_detalhada TEXT,
  beneficios TEXT[],
  indicacoes TEXT[],
  contraindicacoes JSONB DEFAULT '[]'::jsonb,
  duracao_padrao INTEGER NOT NULL DEFAULT 60,
  duracao_minima INTEGER,
  duracao_maxima INTEGER,
  preco_base DECIMAL(10,2) NOT NULL,
  custo_produtos DECIMAL(10,2) DEFAULT 0,
  margem_lucro DECIMAL(5,2),
  preco_promocional DECIMAL(10,2),
  validade_promocao DATE,
  equipamentos_necessarios JSONB DEFAULT '[]'::jsonb,
  produtos_utilizados JSONB DEFAULT '[]'::jsonb,
  profissionais_habilitados UUID[],
  nivel_complexidade TEXT DEFAULT 'medio',
  tags TEXT[],
  idade_minima INTEGER,
  genero_recomendado TEXT,
  popularidade INTEGER DEFAULT 0,
  satisfacao_media DECIMAL(3,2),
  sazonal BOOLEAN DEFAULT false,
  meses_alta INTEGER[],
  meses_baixa INTEGER[],
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Agendamentos
CREATE TABLE IF NOT EXISTS public.agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  profissional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE RESTRICT,
  sala_id UUID REFERENCES public.salas_clinica(id) ON DELETE SET NULL,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  data_agendamento TIMESTAMPTZ NOT NULL,
  duracao_minutos INTEGER NOT NULL DEFAULT 60,
  data_inicio_real TIMESTAMPTZ,
  data_fim_real TIMESTAMPTZ,
  status agendamento_status NOT NULL DEFAULT 'pendente',
  prioridade prioridade_nivel NOT NULL DEFAULT 'normal',
  categoria_cliente cliente_categoria NOT NULL DEFAULT 'regular',
  valor_servico DECIMAL(10,2) NOT NULL,
  valor_final DECIMAL(10,2) NOT NULL,
  desconto_aplicado DECIMAL(10,2) DEFAULT 0,
  desconto_percentual DECIMAL(5,2) DEFAULT 0,
  taxa_adicional DECIMAL(10,2) DEFAULT 0,
  valor_pago DECIMAL(10,2) DEFAULT 0,
  forma_pagamento TEXT,
  observacoes TEXT,
  observacoes_internas TEXT,
  protocolo_medico JSONB DEFAULT '{}'::jsonb,
  equipamentos_reservados UUID[] DEFAULT ARRAY[]::UUID[],
  produtos_utilizados JSONB DEFAULT '[]'::jsonb,
  confirmado_em TIMESTAMPTZ,
  confirmado_por UUID REFERENCES auth.users(id),
  lembrete_enviado_24h BOOLEAN DEFAULT FALSE,
  lembrete_enviado_2h BOOLEAN DEFAULT FALSE,
  confirmacao_presenca BOOLEAN,
  agendamento_original_id UUID REFERENCES public.agendamentos(id),
  motivo_reagendamento TEXT,
  reagendado_por UUID REFERENCES auth.users(id),
  avaliacao_cliente INTEGER CHECK (avaliacao_cliente >= 1 AND avaliacao_cliente <= 5),
  feedback_cliente TEXT,
  avaliacao_profissional INTEGER CHECK (avaliacao_profissional >= 1 AND avaliacao_profissional <= 5),
  feedback_profissional TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Bloqueios de agenda
CREATE TABLE IF NOT EXISTS public.bloqueios_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  profissional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sala_id UUID REFERENCES public.salas_clinica(id) ON DELETE CASCADE,
  tipo bloqueio_tipo NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ NOT NULL,
  recorrente BOOLEAN DEFAULT false,
  padrao_recorrencia JSONB,
  cor_calendario TEXT DEFAULT '#ff6b6b',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Lista de espera
CREATE TABLE IF NOT EXISTS public.lista_espera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  profissional_preferido_id UUID REFERENCES auth.users(id),
  data_preferencia_inicio DATE,
  data_preferencia_fim DATE,
  horario_preferencia_inicio TIME,
  horario_preferencia_fim TIME,
  duracao_minutos INTEGER NOT NULL,
  categoria_cliente cliente_categoria NOT NULL DEFAULT 'regular',
  prioridade INTEGER DEFAULT 0,
  observacoes TEXT,
  status lista_espera_status NOT NULL DEFAULT 'ativo',
  agendamento_criado_id UUID REFERENCES public.agendamentos(id),
  notificado_em TIMESTAMPTZ,
  expira_em TIMESTAMPTZ,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Disponibilidade profissional
CREATE TABLE IF NOT EXISTS public.disponibilidade_profissional (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  intervalo_almoco_inicio TIME,
  intervalo_almoco_fim TIME,
  duracao_slot_padrao INTEGER DEFAULT 60,
  duracao_intervalo INTEGER DEFAULT 15,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessões de atendimento
CREATE TABLE IF NOT EXISTS public.sessoes_atendimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  agendamento_id UUID REFERENCES public.agendamentos(id),
  profissional_id UUID NOT NULL REFERENCES auth.users(id),
  data_atendimento TIMESTAMPTZ NOT NULL,
  duracao_minutos INTEGER NOT NULL,
  tipo_procedimento tipo_procedimento,
  procedimento_realizado TEXT,
  observacoes_profissional TEXT,
  prescricoes TEXT,
  orientacoes_paciente TEXT,
  proxima_consulta_recomendada DATE,
  equipamentos_utilizados JSONB DEFAULT '[]'::jsonb,
  produtos_aplicados JSONB DEFAULT '[]'::jsonb,
  reacoes_adversas TEXT,
  satisfacao_paciente INTEGER CHECK (satisfacao_paciente >= 1 AND satisfacao_paciente <= 5),
  feedback_paciente TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL
);

-- Imagens médicas
CREATE TABLE IF NOT EXISTS public.imagens_medicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  sessao_atendimento_id UUID REFERENCES public.sessoes_atendimento(id) ON DELETE CASCADE,
  tipo_imagem tipo_imagem NOT NULL,
  titulo TEXT,
  descricao TEXT,
  url_imagem TEXT NOT NULL,
  url_thumbnail TEXT,
  metadados JSONB DEFAULT '{}'::jsonb,
  hash_integridade TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL
);

-- Consentimentos digitais
CREATE TABLE IF NOT EXISTS public.consentimentos_digitais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  tipo_consentimento tipo_consentimento NOT NULL,
  conteudo_consentimento TEXT NOT NULL,
  versao_consentimento TEXT NOT NULL,
  hash_conteudo TEXT NOT NULL,
  assinatura_digital TEXT,
  ip_assinatura INET,
  user_agent_assinatura TEXT,
  data_assinatura TIMESTAMPTZ NOT NULL,
  valido_ate TIMESTAMPTZ,
  revogado BOOLEAN DEFAULT false,
  data_revogacao TIMESTAMPTZ,
  motivo_revogacao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL
);

-- Equipamentos
CREATE TABLE IF NOT EXISTS public.equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  modelo TEXT,
  fabricante TEXT,
  numero_serie TEXT,
  data_aquisicao DATE,
  data_ultima_manutencao DATE,
  proxima_manutencao DATE,
  status TEXT NOT NULL DEFAULT 'ativo',
  localizacao TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Produtos/Estoque
CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo_interno TEXT,
  categoria TEXT,
  unidade_medida TEXT NOT NULL,
  estoque_atual DECIMAL(10,3) NOT NULL DEFAULT 0,
  estoque_minimo DECIMAL(10,3) DEFAULT 0,
  preco_custo DECIMAL(10,2),
  preco_venda DECIMAL(10,2),
  data_validade DATE,
  fornecedor TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Salas da clínica
CREATE TABLE IF NOT EXISTS public.salas_clinica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  capacidade INTEGER DEFAULT 1,
  equipamentos_disponiveis UUID[],
  recursos_especiais TEXT[],
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Auditoria médica
CREATE TABLE IF NOT EXISTS public.auditoria_medica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela_afetada TEXT NOT NULL,
  registro_id UUID NOT NULL,
  operacao TEXT NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  usuario_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Logs de sistema
CREATE TABLE IF NOT EXISTS public.logs_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nivel TEXT NOT NULL,
  categoria TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  contexto JSONB DEFAULT '{}'::jsonb,
  usuario_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para agendamentos
CREATE INDEX IF NOT EXISTS idx_agendamentos_clinica_data ON public.agendamentos(clinica_id, data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_profissional_data ON public.agendamentos(profissional_id, data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON public.agendamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON public.agendamentos(status);

-- Índices para prontuários
CREATE INDEX IF NOT EXISTS idx_prontuarios_paciente ON public.prontuarios(paciente_id);
CREATE INDEX IF NOT EXISTS idx_prontuarios_medico ON public.prontuarios(medico_responsavel_id);
CREATE INDEX IF NOT EXISTS idx_prontuarios_clinica ON public.prontuarios(clinica_id);
CREATE INDEX IF NOT EXISTS idx_prontuarios_status ON public.prontuarios(status);

-- Índices para lista de espera
CREATE INDEX IF NOT EXISTS idx_lista_espera_clinica_status ON public.lista_espera(clinica_id, status);
CREATE INDEX IF NOT EXISTS idx_lista_espera_servico ON public.lista_espera(servico_id);
CREATE INDEX IF NOT EXISTS idx_lista_espera_prioridade ON public.lista_espera(prioridade DESC);

-- Índices para auditoria
CREATE INDEX IF NOT EXISTS idx_auditoria_tabela_registro ON public.auditoria_medica(tabela_afetada, registro_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_timestamp ON public.auditoria_medica(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_sistema_timestamp ON public.logs_sistema(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_sistema_nivel ON public.logs_sistema(nivel);

-- =====================================================
-- 4. CRIAR FUNÇÕES UTILITÁRIAS
-- =====================================================

-- Função para gerar número de prontuário
CREATE OR REPLACE FUNCTION public.gerar_numero_prontuario()
RETURNS TEXT AS $$
DECLARE
  numero_prontuario TEXT;
  contador INTEGER;
BEGIN
  -- Gerar número no formato: PRT-YYYY-NNNNNN
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_prontuario FROM 9) AS INTEGER)), 0) + 1
  INTO contador
  FROM public.prontuarios
  WHERE numero_prontuario LIKE 'PRT-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-%';
  
  numero_prontuario := 'PRT-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(contador::TEXT, 6, '0');
  
  RETURN numero_prontuario;
END;
$$ LANGUAGE plpgsql;

-- Função para hash de dados sensíveis
CREATE OR REPLACE FUNCTION public.hash_sensitive_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
  IF data IS NULL OR data = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN encode(digest(data || 'salt_key_here', 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Função para log de eventos do sistema
CREATE OR REPLACE FUNCTION public.log_evento_sistema(
  evento TEXT,
  categoria TEXT,
  nivel TEXT,
  mensagem TEXT,
  detalhes TEXT,
  contexto JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.logs_sistema (
    nivel,
    categoria,
    mensagem,
    contexto,
    usuario_id,
    ip_address,
    user_agent
  ) VALUES (
    nivel,
    categoria,
    mensagem,
    contexto || jsonb_build_object('detalhes', detalhes),
    auth.uid(),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloqueios_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista_espera ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disponibilidade_profissional ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imagens_medicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consentimentos_digitais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salas_clinica ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. POLÍTICAS RLS BÁSICAS
-- =====================================================

-- Políticas para organizações
CREATE POLICY "Users can view accessible organizations" ON public.organizacoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND (organizacao_id = public.organizacoes.id OR role IN ('super_admin'))
      AND ativo = true
    )
  );

-- Políticas para clientes
CREATE POLICY "Users can view clinic clients" ON public.clientes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.clientes.clinica_id
      AND ativo = true
    )
  );

CREATE POLICY "Users can manage clinic clients" ON public.clientes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.clientes.clinica_id
      AND role IN ('proprietaria', 'gerente', 'profissionais', 'recepcionistas')
      AND ativo = true
    )
  );

-- Políticas para serviços
CREATE POLICY "Users can view clinic services" ON public.servicos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.servicos.clinica_id
      AND ativo = true
    )
  );

CREATE POLICY "Users can manage clinic services" ON public.servicos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.servicos.clinica_id
      AND role IN ('proprietaria', 'gerente', 'profissionais')
      AND ativo = true
    )
  );

-- Políticas para agendamentos
CREATE POLICY "Users can view clinic appointments" ON public.agendamentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.agendamentos.clinica_id
      AND ativo = true
    )
  );

CREATE POLICY "Users can manage clinic appointments" ON public.agendamentos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.agendamentos.clinica_id
      AND role IN ('proprietaria', 'gerente', 'profissionais', 'recepcionistas')
      AND ativo = true
    )
  );

-- =====================================================
-- 7. DADOS INICIAIS DE REFERÊNCIA
-- =====================================================

-- Inserir especialidades médicas básicas (se não existir)
INSERT INTO public.especialidades_medicas (codigo, nome, descricao, conselho_regulamentador) VALUES
('DERM', 'Dermatologia', 'Especialidade médica que trata da pele', 'CRM'),
('ESTE', 'Estética', 'Tratamentos estéticos não invasivos', 'CRF'),
('CIRU', 'Cirurgia Plástica', 'Cirurgias estéticas e reconstrutivas', 'CRM'),
('FISI', 'Fisioterapia', 'Tratamentos fisioterapêuticos', 'CREFITO')
ON CONFLICT (codigo) DO NOTHING;

-- Inserir templates de procedimentos básicos (se não existir)
INSERT INTO public.templates_procedimentos (
  tipo_procedimento,
  nome_template,
  descricao,
  campos_obrigatorios,
  duracao_estimada_minutos,
  custo_base_estimado
) VALUES
('consulta', 'Consulta Inicial', 'Primeira consulta para avaliação do paciente', 
 '{"anamnese": {"type": "text", "required": true}, "exame_fisico": {"type": "text", "required": true}}'::jsonb,
 60, 150.00),
('botox_toxina', 'Aplicação de Botox', 'Procedimento de aplicação de toxina botulínica',
 '{"areas_tratadas": {"type": "array", "required": true}, "dose_aplicada": {"type": "number", "required": true}}'::jsonb,
 30, 800.00),
('preenchimento', 'Preenchimento com Ácido Hialurônico', 'Preenchimento facial com ácido hialurônico',
 '{"areas_preenchidas": {"type": "array", "required": true}, "volume_aplicado": {"type": "number", "required": true}}'::jsonb,
 45, 1200.00)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 8. VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se todas as tabelas foram criadas
DO $$
DECLARE
  table_count INTEGER;
  expected_tables TEXT[] := ARRAY[
    'organizacoes', 'clientes', 'servicos', 'agendamentos', 
    'bloqueios_agenda', 'lista_espera', 'disponibilidade_profissional',
    'sessoes_atendimento', 'imagens_medicas', 'consentimentos_digitais',
    'equipamentos', 'produtos', 'salas_clinica', 'auditoria_medica', 'logs_sistema'
  ];
  missing_tables TEXT[] := ARRAY[]::TEXT[];
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY expected_tables
  LOOP
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = table_name;
    
    IF table_count = 0 THEN
      missing_tables := array_append(missing_tables, table_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_tables, 1) > 0 THEN
    RAISE NOTICE 'Tabelas não criadas: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE 'Todas as tabelas foram criadas com sucesso!';
  END IF;
END $$;
