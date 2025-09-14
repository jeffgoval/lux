-- =====================================================
-- ANÁLISE COMPLETA DA ESTRUTURA DO BANCO DE DADOS
-- Sistema de Gestão de Clínicas Estéticas Premium
-- =====================================================

-- =====================================================
-- 1. ENUMS NECESSÁRIOS
-- =====================================================

-- Roles de usuário
CREATE TYPE IF NOT EXISTS public.user_role_type AS ENUM (
  'super_admin',
  'proprietaria', 
  'gerente',
  'profissionais',
  'recepcionistas',
  'visitante',
  'cliente'
);

-- Tipos de procedimento
CREATE TYPE IF NOT EXISTS public.tipo_procedimento AS ENUM (
  'consulta',
  'botox_toxina',
  'preenchimento',
  'harmonizacao_facial',
  'laser_ipl',
  'peeling',
  'tratamento_corporal',
  'skincare_avancado',
  'limpeza_pele',
  'outros'
);

-- Status de agendamento
CREATE TYPE IF NOT EXISTS public.agendamento_status AS ENUM (
  'rascunho',
  'pendente',
  'confirmado', 
  'em_andamento',
  'finalizado',
  'cancelado',
  'nao_compareceu',
  'reagendado'
);

-- Tipos de bloqueio
CREATE TYPE IF NOT EXISTS public.bloqueio_tipo AS ENUM (
  'almoco',
  'reuniao',
  'procedimento_especial',
  'manutencao',
  'ferias',
  'licenca',
  'emergencia',
  'personalizado'
);

-- Status da lista de espera
CREATE TYPE IF NOT EXISTS public.lista_espera_status AS ENUM (
  'ativo',
  'notificado',
  'agendado',
  'cancelado',
  'expirado'
);

-- Categorias de cliente
CREATE TYPE IF NOT EXISTS public.cliente_categoria AS ENUM (
  'regular',
  'vip',
  'premium',
  'corporativo'
);

-- Níveis de prioridade
CREATE TYPE IF NOT EXISTS public.prioridade_nivel AS ENUM (
  'baixa',
  'normal',
  'alta',
  'urgente',
  'vip'
);

-- Status de prontuário
CREATE TYPE IF NOT EXISTS public.status_prontuario AS ENUM (
  'ativo',
  'inativo',
  'arquivado',
  'transferido'
);

-- Níveis de acesso médico
CREATE TYPE IF NOT EXISTS public.nivel_acesso_medico AS ENUM (
  'medico_responsavel',
  'medico_assistente',
  'enfermeiro',
  'esteticista',
  'administrador'
);

-- Tipos de consentimento
CREATE TYPE IF NOT EXISTS public.tipo_consentimento AS ENUM (
  'termo_responsabilidade',
  'autorizacao_imagem',
  'consentimento_procedimento',
  'termo_privacidade'
);

-- Tipos de imagem médica
CREATE TYPE IF NOT EXISTS public.tipo_imagem AS ENUM (
  'antes',
  'durante',
  'depois',
  'complicacao',
  'documento'
);

-- =====================================================
-- 2. TABELAS DE AUTENTICAÇÃO E USUÁRIOS
-- =====================================================

-- Perfis de usuário
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nome_completo TEXT NOT NULL,
  telefone TEXT,
  avatar_url TEXT,
  data_nascimento DATE,
  cpf TEXT,
  primeiro_acesso BOOLEAN NOT NULL DEFAULT true,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Roles de usuário por clínica
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role_type NOT NULL,
  clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
  organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 3. TABELAS DE ORGANIZAÇÃO E CLÍNICAS
-- =====================================================

-- Organizações (grupos de clínicas)
CREATE TABLE IF NOT EXISTS public.organizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  endereco JSONB DEFAULT '{}'::jsonb,
  telefone_principal TEXT,
  email_contato TEXT,
  plano public.plano_type NOT NULL DEFAULT 'basico',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Clínicas
CREATE TABLE IF NOT EXISTS public.clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj TEXT,
  endereco JSONB DEFAULT '{}'::jsonb,
  telefone_principal TEXT,
  email_contato TEXT,
  horario_funcionamento JSONB DEFAULT '{}'::jsonb,
  configuracoes JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Profissionais
CREATE TABLE IF NOT EXISTS public.profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registro_profissional TEXT NOT NULL,
  registro_conselho TEXT,
  especialidades TEXT[],
  data_formacao DATE,
  instituicao_formacao TEXT,
  curriculo_resumido TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT profissionais_unique_user UNIQUE (user_id)
);

-- Relacionamento clínica-profissionais
CREATE TABLE IF NOT EXISTS public.clinica_profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cargo TEXT NOT NULL DEFAULT 'Profissional',
  especialidades TEXT[],
  horario_trabalho JSONB,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  pode_criar_prontuarios BOOLEAN DEFAULT false,
  pode_editar_prontuarios BOOLEAN DEFAULT false,
  pode_visualizar_financeiro BOOLEAN DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clinica_id, user_id)
);

-- =====================================================
-- 4. TABELAS DE CLIENTES
-- =====================================================

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

-- =====================================================
-- 5. TABELAS DE SERVIÇOS E PROCEDIMENTOS
-- =====================================================

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

-- Templates de procedimentos
CREATE TABLE IF NOT EXISTS public.templates_procedimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_procedimento tipo_procedimento NOT NULL,
  nome_template TEXT NOT NULL,
  descricao TEXT,
  campos_obrigatorios JSONB DEFAULT '{}'::jsonb,
  campos_opcionais JSONB DEFAULT '{}'::jsonb,
  validacoes JSONB DEFAULT '{}'::jsonb,
  valores_padrao JSONB DEFAULT '{}'::jsonb,
  indicacoes TEXT[],
  contraindicacoes TEXT[],
  cuidados_pre_procedimento TEXT[],
  cuidados_pos_procedimento TEXT[],
  riscos_associados TEXT[],
  especialidades_requeridas TEXT[],
  nivel_experiencia_minimo TEXT,
  certificacoes_necessarias TEXT[],
  equipamentos_necessarios JSONB DEFAULT '[]'::jsonb,
  produtos_recomendados JSONB DEFAULT '[]'::jsonb,
  materiais_consumiveis JSONB DEFAULT '[]'::jsonb,
  duracao_estimada_minutos INTEGER,
  intervalo_minimo_dias INTEGER,
  numero_sessoes_tipico INTEGER,
  custo_base_estimado DECIMAL(10,2),
  margem_lucro_sugerida DECIMAL(5,2),
  personalizavel BOOLEAN NOT NULL DEFAULT true,
  permite_modificacao_campos BOOLEAN DEFAULT true,
  requer_aprovacao_modificacao BOOLEAN DEFAULT false,
  ordem_exibicao INTEGER DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 6. TABELAS DE AGENDAMENTOS
-- =====================================================

-- Agendamentos principais
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
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
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

-- =====================================================
-- 7. TABELAS DE PRONTUÁRIOS MÉDICOS
-- =====================================================

-- Prontuários
CREATE TABLE IF NOT EXISTS public.prontuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_prontuario TEXT NOT NULL UNIQUE DEFAULT public.gerar_numero_prontuario(),
  paciente_id UUID NOT NULL,
  medico_responsavel_id UUID NOT NULL REFERENCES auth.users(id),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id),
  status status_prontuario NOT NULL DEFAULT 'ativo',
  nivel_confidencialidade nivel_acesso_medico NOT NULL DEFAULT 'medico_responsavel',
  nome_completo TEXT NOT NULL,
  cpf_encrypted TEXT,
  rg_encrypted TEXT,
  data_nascimento_encrypted TEXT,
  telefone_encrypted TEXT,
  email_encrypted TEXT,
  endereco_encrypted TEXT,
  contato_emergencia_encrypted TEXT,
  anamnese TEXT,
  historico_medico TEXT,
  historico_familiar TEXT,
  medicamentos_atuais TEXT,
  alergias TEXT,
  contraindicacoes TEXT,
  cirurgias_anteriores TEXT,
  objetivos_esteticos TEXT,
  expectativas_tratamento TEXT,
  tratamentos_anteriores TEXT,
  produtos_utilizados_casa TEXT,
  exame_fisico TEXT,
  medidas_corporais JSONB,
  tipo_pele TEXT,
  fototipo TEXT,
  fatores_risco TEXT,
  hash_integridade TEXT,
  versao INTEGER NOT NULL DEFAULT 1,
  ultimo_backup TIMESTAMPTZ,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL,
  atualizado_por UUID
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

-- =====================================================
-- 8. TABELAS DE INVENTÁRIO E EQUIPAMENTOS
-- =====================================================

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

-- =====================================================
-- 9. TABELAS DE AUDITORIA E LOGS
-- =====================================================

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
-- 10. ÍNDICES PARA PERFORMANCE
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
-- 11. TRIGGERS PARA AUDITORIA AUTOMÁTICA
-- =====================================================

-- Função para auditoria automática
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.auditoria_medica (
      tabela_afetada,
      registro_id,
      operacao,
      dados_anteriores,
      usuario_id,
      ip_address,
      user_agent
    ) VALUES (
      TG_TABLE_NAME,
      OLD.id,
      'DELETE',
      row_to_json(OLD),
      auth.uid(),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.auditoria_medica (
      tabela_afetada,
      registro_id,
      operacao,
      dados_anteriores,
      dados_novos,
      usuario_id,
      ip_address,
      user_agent
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'UPDATE',
      row_to_json(OLD),
      row_to_json(NEW),
      auth.uid(),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.auditoria_medica (
      tabela_afetada,
      registro_id,
      operacao,
      dados_novos,
      usuario_id,
      ip_address,
      user_agent
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'INSERT',
      row_to_json(NEW),
      auth.uid(),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar triggers de auditoria nas tabelas críticas
CREATE TRIGGER audit_prontuarios_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.prontuarios
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_sessoes_atendimento_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.sessoes_atendimento
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_agendamentos_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- =====================================================
-- 12. FUNÇÕES UTILITÁRIAS
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
-- 13. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinica_profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloqueios_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista_espera ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disponibilidade_profissional ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imagens_medicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consentimentos_digitais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salas_clinica ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de RLS (serão expandidas conforme necessário)
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view accessible clinics" ON public.clinicas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND (clinica_id = public.clinicas.id OR role IN ('super_admin', 'proprietaria'))
      AND ativo = true
    )
  );

-- =====================================================
-- 14. DADOS INICIAIS DE REFERÊNCIA
-- =====================================================

-- Inserir especialidades médicas básicas
INSERT INTO public.especialidades_medicas (codigo, nome, descricao, conselho_regulamentador) VALUES
('DERM', 'Dermatologia', 'Especialidade médica que trata da pele', 'CRM'),
('ESTE', 'Estética', 'Tratamentos estéticos não invasivos', 'CRF'),
('CIRU', 'Cirurgia Plástica', 'Cirurgias estéticas e reconstrutivas', 'CRM'),
('FISI', 'Fisioterapia', 'Tratamentos fisioterapêuticos', 'CREFITO')
ON CONFLICT (codigo) DO NOTHING;

-- Inserir templates de procedimentos básicos
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
