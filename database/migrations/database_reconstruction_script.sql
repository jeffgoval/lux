-- =====================================================
-- SCRIPT CONSOLIDADO DE RECONSTRUÇÃO DO BANCO DE DADOS
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================
-- 
-- Este script consolida todas as migrações existentes em um único arquivo
-- para reconstrução completa do banco de dados.
-- 
-- Ordem de execução:
-- 1. ENUM Types
-- 2. Funções auxiliares
-- 3. Tabelas principais
-- 4. Índices
-- 5. Triggers
-- 6. Políticas RLS
-- 7. Dados iniciais (seed data)
-- 8. Storage buckets e políticas
-- =====================================================

-- =====================================================
-- SEÇÃO 1: ENUM TYPES
-- =====================================================

-- Tipos para procedimentos médicos
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

-- Tipos para níveis de acesso médico
CREATE TYPE public.nivel_acesso_medico AS ENUM (
  'medico_responsavel',
  'medico_assistente',
  'enfermeiro',
  'esteticista',
  'administrador'
);

-- Status de prontuários
CREATE TYPE public.status_prontuario AS ENUM (
  'ativo',
  'inativo',
  'arquivado',
  'transferido'
);

-- Tipos de consentimento
CREATE TYPE public.tipo_consentimento AS ENUM (
  'termo_responsabilidade',
  'autorizacao_imagem',
  'consentimento_procedimento',
  'termo_privacidade'
);

-- Tipos de imagem médica
CREATE TYPE public.tipo_imagem AS ENUM (
  'antes',
  'durante',
  'depois',
  'complicacao',
  'documento'
);

-- Tipos de acesso ao sistema
CREATE TYPE public.tipo_acesso AS ENUM (
  'visualizacao',
  'edicao',
  'criacao',
  'exclusao',
  'download'
);

-- Roles de usuário
CREATE TYPE public.user_role_type AS ENUM (
  'super_admin',
  'proprietaria', 
  'gerente',
  'profissionais',
  'recepcionistas',
  'visitante'
);

-- Planos de organização
CREATE TYPE public.plano_type AS ENUM (
  'basico', 
  'premium', 
  'enterprise'
);

-- Status de convites
CREATE TYPE public.status_convite AS ENUM (
  'pendente', 
  'aceito', 
  'expirado', 
  'cancelado'
);

-- Especialidades médicas
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

-- Categorias de produtos
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

-- Tipos de equipamentos
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

-- Status de produtos
CREATE TYPE public.status_produto AS ENUM (
  'disponivel',
  'baixo_estoque',
  'vencido',
  'descontinuado'
);

-- Status de equipamentos
CREATE TYPE public.status_equipamento AS ENUM (
  'ativo',
  'manutencao',
  'inativo',
  'calibracao'
);

-- Tipos de movimentação de estoque
CREATE TYPE public.tipo_movimentacao AS ENUM (
  'entrada',
  'saida',
  'ajuste',
  'vencimento'
);

-- Tipos de manutenção
CREATE TYPE public.tipo_manutencao AS ENUM (
  'preventiva',
  'corretiva',
  'calibracao',
  'limpeza'
);

-- Status de manutenção
CREATE TYPE public.status_manutencao AS ENUM (
  'agendada',
  'realizada',
  'cancelada',
  'pendente'
);

-- Tipos de prestadores
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
-- SEÇÃO 2: FUNÇÕES AUXILIARES
-- =====================================================

-- Função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$ LANGUAGE plpgsql SET search_path = public;

-- Função para gerar número de prontuário
CREATE OR REPLACE FUNCTION public.gerar_numero_prontuario()
RETURNS TEXT AS $
BEGIN
  RETURN 'PRONT-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
         LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(numero_prontuario FROM 11 FOR 6) AS INTEGER)), 0) + 1 
               FROM public.prontuarios 
               WHERE numero_prontuario LIKE 'PRONT-' || TO_CHAR(NOW(), 'YYYY') || '-%')::TEXT, 6, '0');
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para verificar role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role_in_context(user_uuid UUID, org_id UUID DEFAULT NULL, clinic_id UUID DEFAULT NULL)
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

-- Função para verificar se usuário tem role específico
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

-- =====================================================
-- SEÇÃO 3: TABELAS PRINCIPAIS
-- =====================================================

-- Tabela de organizações
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

-- Tabela de clínicas
CREATE TABLE public.clinicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj TEXT,
  endereco_rua TEXT,
  endereco_numero TEXT,
  endereco_complemento TEXT,
  endereco_bairro TEXT,
  endereco_cidade TEXT,
  endereco_estado TEXT,
  endereco_cep TEXT,
  telefone TEXT,
  email TEXT,
  horario_funcionamento JSONB,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id),
  configuracoes JSONB DEFAULT '{}'::jsonb
);

-- Tabela de perfis de usuário
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

-- Tabela de roles de usuário
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

-- Tabela de convites
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

-- Tabela de especialidades profissionais
CREATE TABLE public.profissionais_especialidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  especialidade TEXT NOT NULL,
  certificacao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de prontuários médicos
CREATE TABLE public.prontuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_prontuario TEXT NOT NULL UNIQUE,
  paciente_id UUID NOT NULL,
  medico_responsavel_id UUID NOT NULL,
  status status_prontuario NOT NULL DEFAULT 'ativo',
  
  -- Dados pessoais (criptografados)
  nome_completo TEXT NOT NULL,
  cpf_encrypted TEXT,
  rg_encrypted TEXT,
  data_nascimento_encrypted TEXT,
  telefone_encrypted TEXT,
  email_encrypted TEXT,
  endereco_encrypted TEXT,
  
  -- Dados médicos
  anamnese TEXT,
  historico_medico TEXT,
  medicamentos_atuais TEXT,
  alergias TEXT,
  contraindicacoes TEXT,
  
  -- Metadados de segurança
  hash_integridade TEXT,
  versao INTEGER NOT NULL DEFAULT 1,
  ultimo_backup TIMESTAMP WITH TIME ZONE,
  nivel_confidencialidade nivel_acesso_medico NOT NULL DEFAULT 'medico_responsavel',
  
  -- Auditoria
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL,
  atualizado_por UUID
);

-- Tabela de sessões de atendimento
CREATE TABLE public.sessoes_atendimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  data_sessao TIMESTAMP WITH TIME ZONE NOT NULL,
  tipo_procedimento tipo_procedimento NOT NULL,
  profissional_id UUID NOT NULL,
  duracao_minutos INTEGER,
  
  -- Dados do procedimento
  detalhes_procedimento JSONB,
  observacoes TEXT,
  resultados TEXT,
  complicacoes TEXT,
  
  -- Produtos utilizados
  produtos_utilizados JSONB,
  
  -- Valores
  valor_procedimento DECIMAL(10,2),
  desconto_aplicado DECIMAL(10,2),
  valor_final DECIMAL(10,2),
  
  -- Próxima sessão
  proxima_sessao_recomendada DATE,
  intervalo_recomendado_dias INTEGER,
  
  -- Auditoria
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL
);

-- Tabela de imagens médicas
CREATE TABLE public.imagens_medicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  sessao_id UUID REFERENCES public.sessoes_atendimento(id) ON DELETE CASCADE,
  
  -- Dados da imagem
  nome_arquivo TEXT NOT NULL,
  tipo_imagem tipo_imagem NOT NULL,
  caminho_storage TEXT NOT NULL,
  url_publica TEXT,
  tamanho_bytes BIGINT,
  dimensoes TEXT, -- formato: "1920x1080"
  
  -- Dados médicos da imagem
  regiao_anatomica TEXT,
  procedimento_relacionado tipo_procedimento,
  data_captura TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  equipamento_utilizado TEXT,
  configuracoes_camera JSONB,
  
  -- Metadados de segurança
  hash_arquivo TEXT,
  criptografada BOOLEAN NOT NULL DEFAULT false,
  watermark_aplicado BOOLEAN NOT NULL DEFAULT false,
  
  -- Consentimento
  consentimento_uso BOOLEAN NOT NULL DEFAULT false,
  consentimento_id UUID,
  
  -- Auditoria
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL
);

-- Tabela de consentimentos digitais
CREATE TABLE public.consentimentos_digitais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  tipo_consentimento tipo_consentimento NOT NULL,
  
  -- Conteúdo do consentimento
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  versao_documento TEXT NOT NULL,
  
  -- Assinatura digital
  assinatura_digital TEXT, -- Hash da assinatura
  ip_assinatura INET,
  dispositivo_assinatura TEXT,
  data_assinatura TIMESTAMP WITH TIME ZONE,
  
  -- Validade
  data_expiracao DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Testemunha (se aplicável)
  testemunha_nome TEXT,
  testemunha_documento TEXT,
  testemunha_assinatura TEXT,
  
  -- Auditoria
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL
);

-- Tabela de templates de procedimentos
CREATE TABLE public.templates_procedimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_procedimento tipo_procedimento NOT NULL,
  nome_template TEXT NOT NULL,
  descricao TEXT,
  
  -- Estrutura do template
  campos_obrigatorios JSONB NOT NULL,
  campos_opcionais JSONB,
  validacoes JSONB,
  valores_padrao JSONB,
  
  -- Configurações
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem_exibicao INTEGER,
  categoria TEXT,
  
  -- Auditoria
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID
);

-- Tabela de auditoria médica
CREATE TABLE public.auditoria_medica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referências
  prontuario_id UUID REFERENCES public.prontuarios(id),
  tabela_afetada TEXT NOT NULL,
  registro_id UUID,
  
  -- Ação realizada
  operacao TEXT NOT NULL, -- INSERT, UPDATE, DELETE, SELECT
  dados_anteriores JSONB,
  dados_novos JSONB,
  campos_modificados TEXT[],
  
  -- Criticidade e contexto
  nivel_criticidade TEXT NOT NULL DEFAULT 'baixo', -- baixo, medio, alto, critico
  contexto_operacao TEXT,
  justificativa TEXT,
  
  -- Dados do usuário
  usuario_id UUID NOT NULL,
  usuario_nome TEXT,
  usuario_role TEXT,
  ip_origem INET,
  user_agent TEXT,
  
  -- Dados da sessão
  sessao_id TEXT,
  timestamp_operacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duracao_operacao_ms INTEGER,
  
  -- Conformidade
  gdpr_compliant BOOLEAN NOT NULL DEFAULT true,
  lgpd_compliant BOOLEAN NOT NULL DEFAULT true,
  hipaa_compliant BOOLEAN NOT NULL DEFAULT true
);

-- Tabela de controle de acesso
CREATE TABLE public.acessos_prontuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  tipo_acesso tipo_acesso NOT NULL,
  
  -- Detalhes do acesso
  secoes_acessadas TEXT[],
  campos_visualizados TEXT[],
  tempo_sessao_minutos INTEGER,
  
  -- Auditoria
  data_acesso TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_acesso INET,
  dispositivo TEXT,
  navegador TEXT,
  localizacao TEXT,
  
  -- Autorização
  autorizado_por UUID,
  motivo_acesso TEXT,
  nivel_urgencia TEXT DEFAULT 'normal' -- normal, urgente, emergencial
);

-- Tabela de especialidades médicas (dados de referência)
CREATE TABLE public.especialidades_medicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo especialidade_medica NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  requisitos TEXT,
  conselho_regulamentador TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de fornecedores
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  contato TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  prazo_entrega_dias INTEGER DEFAULT 7,
  avaliacao INTEGER CHECK (avaliacao >= 1 AND avaliacao <= 5),
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Tabela de produtos
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  marca TEXT,
  categoria categoria_produto NOT NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  preco_custo DECIMAL(10,2),
  preco_venda DECIMAL(10,2),
  quantidade INTEGER NOT NULL DEFAULT 0,
  unidade_medida TEXT NOT NULL DEFAULT 'unidade',
  estoque_minimo INTEGER NOT NULL DEFAULT 1,
  estoque_maximo INTEGER,
  data_vencimento DATE,
  lote TEXT,
  codigo_barras TEXT,
  localizacao TEXT,
  status status_produto NOT NULL DEFAULT 'disponivel',
  descricao TEXT,
  indicacoes TEXT[],
  contraindicacoes TEXT[],
  modo_uso TEXT,
  composicao TEXT,
  registro_anvisa TEXT,
  imagem_url TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id),
  organizacao_id UUID REFERENCES public.organizacoes(id),
  clinica_id UUID REFERENCES public.clinicas(id)
);

-- Tabela de movimentação de estoque
CREATE TABLE public.movimentacao_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  tipo tipo_movimentacao NOT NULL,
  quantidade INTEGER NOT NULL,
  valor DECIMAL(10,2),
  motivo TEXT,
  responsavel_id UUID NOT NULL REFERENCES auth.users(id),
  data_movimentacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cliente_id UUID,
  servico_id UUID,
  lote TEXT,
  observacoes TEXT
);

-- Tabela de fabricantes de equipamentos
CREATE TABLE public.fabricantes_equipamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  contato TEXT,
  telefone TEXT,
  email TEXT,
  suporte_tecnico TEXT,
  garantia_meses INTEGER DEFAULT 12,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de equipamentos
CREATE TABLE public.equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  modelo TEXT,
  numero_serie TEXT UNIQUE,
  tipo tipo_equipamento NOT NULL,
  fabricante_id UUID REFERENCES public.fabricantes_equipamento(id),
  data_compra DATE,
  valor_compra DECIMAL(12,2),
  valor_atual DECIMAL(12,2),
  localizacao TEXT,
  status status_equipamento NOT NULL DEFAULT 'ativo',
  voltagem TEXT,
  potencia TEXT,
  frequencia TEXT,
  indicacoes TEXT[],
  contraindicacoes TEXT[],
  protocolos TEXT[],
  certificacoes TEXT[],
  manuais TEXT[],
  imagem_url TEXT,
  horas_uso INTEGER NOT NULL DEFAULT 0,
  proxima_manutencao DATE,
  ultima_calibracao DATE,
  observacoes TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id),
  organizacao_id UUID REFERENCES public.organizacoes(id),
  clinica_id UUID REFERENCES public.clinicas(id)
);

-- Tabela de manutenções de equipamentos
CREATE TABLE public.manutencoes_equipamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id),
  tipo tipo_manutencao NOT NULL,
  descricao TEXT NOT NULL,
  tecnico_responsavel TEXT,
  data_agendada DATE NOT NULL,
  data_realizada DATE,
  custo DECIMAL(10,2),
  observacoes TEXT,
  proxima_manutencao DATE,
  status status_manutencao NOT NULL DEFAULT 'agendada',
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id)
);

-- Tabela de uso de equipamentos
CREATE TABLE public.uso_equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id),
  cliente_id UUID,
  servico_id UUID,
  tempo_uso_minutos INTEGER,
  potencia_utilizada TEXT,
  observacoes TEXT,
  data_uso TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responsavel_id UUID NOT NULL REFERENCES auth.users(id)
);

-- Tabela de prestadores de serviços
CREATE TABLE public.prestadores_servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo tipo_prestador NOT NULL,
  cpf TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  empresa TEXT,
  cnpj_empresa TEXT,
  valor_hora DECIMAL(8,2),
  descricao_servicos TEXT,
  horarios_disponibilidade JSONB,
  documentos TEXT[],
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id),
  organizacao_id UUID REFERENCES public.organizacoes(id),
  clinica_id UUID REFERENCES public.clinicas(id)
);
-- ==
===================================================
-- SEÇÃO 4: ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para prontuários
CREATE INDEX idx_prontuarios_paciente ON public.prontuarios(paciente_id);
CREATE INDEX idx_prontuarios_medico ON public.prontuarios(medico_responsavel_id);
CREATE INDEX idx_prontuarios_numero ON public.prontuarios(numero_prontuario);
CREATE INDEX idx_prontuarios_status ON public.prontuarios(status);

-- Índices para sessões de atendimento
CREATE INDEX idx_sessoes_prontuario ON public.sessoes_atendimento(prontuario_id);
CREATE INDEX idx_sessoes_data ON public.sessoes_atendimento(data_sessao);
CREATE INDEX idx_sessoes_tipo ON public.sessoes_atendimento(tipo_procedimento);

-- Índices para imagens médicas
CREATE INDEX idx_imagens_prontuario ON public.imagens_medicas(prontuario_id);
CREATE INDEX idx_imagens_sessao ON public.imagens_medicas(sessao_id);
CREATE INDEX idx_imagens_tipo ON public.imagens_medicas(tipo_imagem);

-- Índices para consentimentos
CREATE INDEX idx_consentimentos_prontuario ON public.consentimentos_digitais(prontuario_id);
CREATE INDEX idx_consentimentos_tipo ON public.consentimentos_digitais(tipo_consentimento);

-- Índices para templates
CREATE INDEX idx_templates_tipo ON public.templates_procedimentos(tipo_procedimento);

-- Índices para auditoria
CREATE INDEX idx_auditoria_prontuario ON public.auditoria_medica(prontuario_id);
CREATE INDEX idx_auditoria_usuario ON public.auditoria_medica(usuario_id);
CREATE INDEX idx_auditoria_operacao ON public.auditoria_medica(operacao);
CREATE INDEX idx_auditoria_timestamp ON public.auditoria_medica(timestamp_operacao);

-- Índices para acessos
CREATE INDEX idx_acessos_prontuario ON public.acessos_prontuario(prontuario_id);
CREATE INDEX idx_acessos_usuario ON public.acessos_prontuario(usuario_id);
CREATE INDEX idx_acessos_data ON public.acessos_prontuario(data_acesso);

-- =====================================================
-- SEÇÃO 5: TRIGGERS
-- =====================================================

-- Trigger para atualizar timestamp em prontuários
CREATE TRIGGER update_prontuarios_updated_at
  BEFORE UPDATE ON public.prontuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar timestamp em sessões
CREATE TRIGGER update_sessoes_updated_at
  BEFORE UPDATE ON public.sessoes_atendimento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar timestamp em templates
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates_procedimentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar timestamp em organizações
CREATE TRIGGER update_organizacoes_updated_at
  BEFORE UPDATE ON public.organizacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar timestamp em clínicas
CREATE TRIGGER update_clinicas_updated_at
  BEFORE UPDATE ON public.clinicas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar timestamp em perfis
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar timestamp em fornecedores
CREATE TRIGGER update_fornecedores_updated_at
  BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar timestamp em produtos
CREATE TRIGGER update_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar timestamp em equipamentos
CREATE TRIGGER update_equipamentos_updated_at
  BEFORE UPDATE ON public.equipamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar timestamp em prestadores
CREATE TRIGGER update_prestadores_servicos_updated_at
  BEFORE UPDATE ON public.prestadores_servicos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função de auditoria automática
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

-- Triggers de auditoria para tabelas críticas
CREATE TRIGGER auditoria_prontuarios
  AFTER INSERT OR UPDATE OR DELETE ON public.prontuarios
  FOR EACH ROW EXECUTE FUNCTION public.log_auditoria();

CREATE TRIGGER auditoria_sessoes
  AFTER INSERT OR UPDATE OR DELETE ON public.sessoes_atendimento
  FOR EACH ROW EXECUTE FUNCTION public.log_auditoria();

-- Função para criar perfil de novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
BEGIN
  -- Inserir perfil
  INSERT INTO public.profiles (user_id, nome_completo, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    NEW.email
  );
  
  -- Atribuir role padrão "visitante"
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
    -- Log do erro mas não bloqueia o cadastro
    RAISE WARNING 'Erro ao criar perfil/role para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para novo usuário
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- SEÇÃO 6: HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais_especialidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imagens_medicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consentimentos_digitais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_medica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acessos_prontuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.especialidades_medicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacao_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabricantes_equipamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencoes_equipamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uso_equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestadores_servicos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SEÇÃO 7: POLÍTICAS RLS
-- =====================================================

-- Políticas para profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create profiles" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para user_roles
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

-- Políticas para organizações
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

-- Políticas para clínicas
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

CREATE POLICY "Proprietárias podem criar clínicas"
ON public.clinicas
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'proprietaria'::user_role_type
      AND ur.ativo = true
  )
);

-- Políticas para convites
CREATE POLICY "Super admins can manage all invites" ON public.convites
  FOR ALL USING (public.user_has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Proprietarias and gerentes can manage invites for their organization" ON public.convites
  FOR ALL USING (
    EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND organizacao_id = public.convites.organizacao_id 
        AND role IN ('proprietaria', 'gerente')
        AND ativo = true
    )
  );

-- Políticas para especialidades profissionais
CREATE POLICY "Users can view their own specialties" ON public.profissionais_especialidades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own specialties" ON public.profissionais_especialidades
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Proprietarias and gerentes can view team specialties" ON public.profissionais_especialidades
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

-- Políticas para prontuários
CREATE POLICY "Profissionais autenticados podem visualizar prontuários"
ON public.prontuarios FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem criar prontuários"
ON public.prontuarios FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND criado_por = auth.uid());

CREATE POLICY "Profissionais podem atualizar prontuários"
ON public.prontuarios FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Políticas para sessões
CREATE POLICY "Profissionais podem visualizar sessões"
ON public.sessoes_atendimento FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem criar sessões"
ON public.sessoes_atendimento FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND criado_por = auth.uid());

CREATE POLICY "Profissionais podem atualizar sessões"
ON public.sessoes_atendimento FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Políticas para imagens
CREATE POLICY "Profissionais podem visualizar imagens"
ON public.imagens_medicas FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem fazer upload de imagens"
ON public.imagens_medicas FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND criado_por = auth.uid());

-- Políticas para consentimentos
CREATE POLICY "Profissionais podem visualizar consentimentos"
ON public.consentimentos_digitais FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem criar consentimentos"
ON public.consentimentos_digitais FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND criado_por = auth.uid());

-- Políticas para templates
CREATE POLICY "Profissionais podem visualizar templates"
ON public.templates_procedimentos FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas administradores podem modificar templates"
ON public.templates_procedimentos FOR ALL
USING (auth.uid() IS NOT NULL);

-- Políticas para auditoria (apenas leitura)
CREATE POLICY "Profissionais podem visualizar auditoria"
ON public.auditoria_medica FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Políticas para acessos
CREATE POLICY "Profissionais podem visualizar próprios acessos"
ON public.acessos_prontuario FOR SELECT
USING (auth.uid() = usuario_id);

CREATE POLICY "Sistema pode registrar acessos"
ON public.acessos_prontuario FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para especialidades médicas (somente leitura)
CREATE POLICY "Todos podem visualizar especialidades"
  ON public.especialidades_medicas FOR SELECT
  USING (true);

-- Políticas para fabricantes (somente leitura)
CREATE POLICY "Todos podem visualizar fabricantes"
  ON public.fabricantes_equipamento FOR SELECT
  USING (true);

-- Políticas para fornecedores
CREATE POLICY "Profissionais podem visualizar fornecedores"
  ON public.fornecedores FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem gerenciar fornecedores"
  ON public.fornecedores FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (criado_por IS NULL OR auth.uid() = criado_por);

-- Políticas para produtos
CREATE POLICY "Profissionais podem visualizar produtos"
  ON public.produtos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem gerenciar produtos"
  ON public.produtos FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (criado_por IS NULL OR auth.uid() = criado_por);

-- Políticas para movimentação de estoque
CREATE POLICY "Profissionais podem visualizar movimentações"
  ON public.movimentacao_estoque FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem registrar movimentações"
  ON public.movimentacao_estoque FOR INSERT
  WITH CHECK (auth.uid() = responsavel_id);

-- Políticas para equipamentos
CREATE POLICY "Profissionais podem visualizar equipamentos"
  ON public.equipamentos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem gerenciar equipamentos"
  ON public.equipamentos FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (criado_por IS NULL OR auth.uid() = criado_por);

-- Políticas para manutenções
CREATE POLICY "Profissionais podem visualizar manutenções"
  ON public.manutencoes_equipamento FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem gerenciar manutenções"
  ON public.manutencoes_equipamento FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() = criado_por);

-- Políticas para uso de equipamentos
CREATE POLICY "Profissionais podem visualizar usos"
  ON public.uso_equipamentos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem registrar usos"
  ON public.uso_equipamentos FOR INSERT
  WITH CHECK (auth.uid() = responsavel_id);

-- Políticas para prestadores
CREATE POLICY "Profissionais podem visualizar prestadores"
  ON public.prestadores_servicos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem gerenciar prestadores"
  ON public.prestadores_servicos FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (criado_por IS NULL OR auth.uid() = criado_por);

-- =====================================================
-- SEÇÃO 8: DADOS INICIAIS (SEED DATA)
-- =====================================================

-- Inserir especialidades médicas
INSERT INTO public.especialidades_medicas (codigo, nome, descricao, conselho_regulamentador) VALUES
('medico_dermatologista', 'Médico Dermatologista', 'Responsável por procedimentos médicos e estéticos da pele', 'CFM'),
('medico_cirurgiao_plastico', 'Médico Cirurgião Plástico', 'Atua em intervenções estéticas mais invasivas', 'CFM'),
('biomedico_esteta', 'Biomédico Esteta', 'Realiza diversos procedimentos estéticos minimamente invasivos', 'CFBM'),
('enfermeiro_esteta', 'Enfermeiro Esteta', 'Habilitado para procedimentos estéticos sob regulamentação', 'COFEN'),
('fisioterapeuta_dermato_funcional', 'Fisioterapeuta Dermato-funcional', 'Trabalha com estética corporal e reabilitação da pele', 'COFFITO'),
('nutricionista', 'Nutricionista', 'Acompanha planos alimentares voltados para estética e bem-estar', 'CFN'),
('esteticista_cosmetologo', 'Esteticista/Cosmetólogo', 'Atua em tratamentos faciais, corporais e cuidados de pele', 'Não aplicável'),
('tricologista', 'Tricologista', 'Especializado em cuidados estéticos e terapêuticos do couro cabeludo', 'Não aplicável'),
('dentista_harmonizacao', 'Dentista (Harmonização Orofacial)', 'Procedimentos faciais e dentários estéticos', 'CFO'),
('farmaceutico_esteta', 'Farmacêutico Esteta', 'Pode aplicar técnicas de estética injetável e outros recursos', 'CFF'),
('terapeuta_capilar', 'Terapeuta Capilar', 'Atua em estética e saúde dos cabelos', 'Não aplicável'),
('massoterapeuta', 'Massoterapeuta', 'Massagens estéticas e terapêuticas', 'Não aplicável'),
('maquiador_profissional', 'Maquiador Profissional', 'Serviços de embelezamento imediato em clínicas', 'Não aplicável');

-- Inserir fabricantes de equipamentos
INSERT INTO public.fabricantes_equipamento (nome, contato, telefone, email, suporte_tecnico, garantia_meses) VALUES
('Alma Lasers', 'Suporte Alma', '(11) 3456-7890', 'suporte@alma.com', '24h', 24),
('Solta Medical', 'Suporte Solta', '(11) 3456-7891', 'suporte@solta.com', 'Comercial', 12),
('Inmode', 'Suporte Inmode', '(11) 3456-7892', 'suporte@inmode.com', '24h', 18),
('BTL', 'Suporte BTL', '(11) 3456-7893', 'suporte@btl.com', 'Comercial', 24),
('Lavieen', 'Suporte Lavieen', '(11) 3456-7894', 'suporte@lavieen.com', '24h', 12);

-- Inserir templates padrão para procedimentos
INSERT INTO public.templates_procedimentos (tipo_procedimento, nome_template, campos_obrigatorios, campos_opcionais) VALUES
('botox_toxina', 'Aplicação de Toxina Botulínica', 
 '{"regioes_aplicacao": {"type": "array", "required": true}, "unidades_totais": {"type": "number", "required": true}, "produto_utilizado": {"type": "string", "required": true}, "tecnica_aplicacao": {"type": "string", "required": true}}',
 '{"dilucao": {"type": "string"}, "tempo_aplicacao": {"type": "string"}, "orientacoes_pos": {"type": "text"}}'
),
('preenchimento', 'Preenchimento com Ácido Hialurônico',
 '{"area_tratada": {"type": "string", "required": true}, "volume_aplicado": {"type": "number", "required": true}, "produto_utilizado": {"type": "string", "required": true}, "tecnica_injecao": {"type": "string", "required": true}}',
 '{"anestesia_utilizada": {"type": "string"}, "tempo_procedimento": {"type": "string"}, "retorno_recomendado": {"type": "date"}}'
),
('harmonizacao_facial', 'Harmonização Facial Completa',
 '{"areas_tratamento": {"type": "array", "required": true}, "plano_tratamento": {"type": "text", "required": true}, "procedimentos_realizados": {"type": "array", "required": true}, "profissional_responsavel": {"type": "string", "required": true}}',
 '{"faseamento": {"type": "text"}, "cronograma": {"type": "text"}, "custo_total": {"type": "number"}}'
),
('laser_ipl', 'Tratamento a Laser/IPL',
 '{"tipo_equipamento": {"type": "string", "required": true}, "parametros_laser": {"type": "object", "required": true}, "area_tratada": {"type": "string", "required": true}, "numero_disparos": {"type": "number", "required": true}}',
 '{"fluencia": {"type": "string"}, "spot_size": {"type": "string"}, "cooling": {"type": "string"}}'
),
('peeling', 'Peeling Químico',
 '{"tipo_acido": {"type": "string", "required": true}, "concentracao": {"type": "string", "required": true}, "tempo_aplicacao": {"type": "string", "required": true}, "camadas_aplicadas": {"type": "number", "required": true}}',
 '{"neutralizacao": {"type": "string"}, "tempo_neutralizacao": {"type": "string"}, "cuidados_pos": {"type": "text"}}'
),
('tratamento_corporal', 'Tratamento Corporal',
 '{"procedimento_realizado": {"type": "string", "required": true}, "areas_tratadas": {"type": "array", "required": true}, "medidas_iniciais": {"type": "object", "required": true}, "protocolo_aplicado": {"type": "string", "required": true}}',
 '{"numero_sessoes_previstas": {"type": "number"}, "intervalo_sessoes": {"type": "string"}, "medidas_finais": {"type": "object"}}'
);

-- =====================================================
-- SEÇÃO 9: FUNÇÕES RPC PARA ONBOARDING
-- =====================================================

-- Função para criar clínica durante onboarding
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
BEGIN
  -- Check if user is authenticated and has proprietaria role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'proprietaria'::user_role_type
      AND ur.ativo = true
  ) THEN
    RAISE EXCEPTION 'User must have proprietaria role to create clinics';
  END IF;

  -- Insert the clinic and return the ID
  INSERT INTO public.clinicas (
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
    horario_funcionamento
  ) VALUES (
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
    p_horario_funcionamento
  ) RETURNING id INTO new_clinic_id;

  -- Return the clinic ID
  RETURN new_clinic_id;
END;
$;

-- =====================================================
-- SEÇÃO 10: STORAGE BUCKETS E POLÍTICAS
-- =====================================================

-- Criar bucket para imagens médicas seguras
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imagens-medicas',
  'imagens-medicas',
  false,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Políticas de storage para imagens médicas
CREATE POLICY "Profissionais podem visualizar imagens médicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'imagens-medicas' AND auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem fazer upload de imagens médicas"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'imagens-medicas' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Profissionais podem atualizar suas imagens médicas"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'imagens-medicas' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Profissionais podem deletar suas imagens médicas"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'imagens-medicas' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- FIM DO SCRIPT DE RECONSTRUÇÃO
-- =====================================================

-- Comentário final para verificação
COMMENT ON SCHEMA public IS 'Database reconstruction completed - ' || now();

-- Verificar se todas as tabelas foram criadas
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;