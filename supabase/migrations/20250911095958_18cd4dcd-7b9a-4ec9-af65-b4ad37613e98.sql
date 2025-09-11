-- Criar tipos enumerados para o sistema médico
CREATE TYPE public.tipo_procedimento AS ENUM (
  'botox_toxina',
  'preenchimento',
  'harmonizacao_facial', 
  'laser_ipl',
  'peeling',
  'tratamento_corporal',
  'skincare_avancado',
  'outro'
);

CREATE TYPE public.nivel_acesso_medico AS ENUM (
  'medico',
  'enfermeiro', 
  'esteticista',
  'recepcionista',
  'admin'
);

CREATE TYPE public.status_prontuario AS ENUM (
  'ativo',
  'arquivado',
  'transferido'
);

CREATE TYPE public.tipo_consentimento AS ENUM (
  'procedimento',
  'anestesia',
  'imagem',
  'dados_pessoais'
);

-- Tabela de prontuários médicos com criptografia
CREATE TABLE public.prontuarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  medico_responsavel_id UUID NOT NULL,
  numero_prontuario TEXT NOT NULL UNIQUE,
  status status_prontuario NOT NULL DEFAULT 'ativo',
  
  -- Dados médicos criptografados
  anamnese_criptografada TEXT,
  historico_medico_criptografado TEXT,
  medicamentos_atuais_criptografado TEXT,
  alergias_criptografado TEXT,
  contraindicacoes_criptografado TEXT,
  
  -- Metadados de auditoria
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL,
  atualizado_por UUID NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1,
  hash_integridade TEXT NOT NULL
);

-- Tabela de sessões/atendimentos
CREATE TABLE public.sessoes_atendimento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  tipo_procedimento tipo_procedimento NOT NULL,
  data_atendimento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  profissional_id UUID NOT NULL,
  
  -- Dados do procedimento
  procedimento_detalhes JSONB NOT NULL,
  produtos_utilizados JSONB,
  equipamentos_utilizados JSONB,
  parametros_tecnicos JSONB,
  
  -- Observações médicas
  observacoes_pre TEXT,
  observacoes_pos TEXT,
  intercorrencias TEXT,
  orientacoes_paciente TEXT,
  
  -- Resultados e evolução
  resultados_imediatos TEXT,
  satisfacao_paciente INTEGER CHECK (satisfacao_paciente >= 1 AND satisfacao_paciente <= 10),
  proxima_sessao_recomendada DATE,
  
  -- Auditoria
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL,
  hash_integridade TEXT NOT NULL
);

-- Tabela de imagens médicas seguras
CREATE TABLE public.imagens_medicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sessao_id UUID NOT NULL REFERENCES public.sessoes_atendimento(id) ON DELETE CASCADE,
  tipo_imagem TEXT NOT NULL CHECK (tipo_imagem IN ('antes', 'durante', 'depois', 'evolucao')),
  
  -- Dados da imagem criptografados
  url_criptografada TEXT NOT NULL,
  nome_arquivo_original TEXT NOT NULL,
  tamanho_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  resolucao TEXT,
  
  -- Metadados médicos
  regiao_corporal TEXT NOT NULL,
  angulo_captura TEXT,
  condicoes_iluminacao TEXT,
  observacoes_imagem TEXT,
  
  -- Controle de acesso
  visivel_paciente BOOLEAN NOT NULL DEFAULT false,
  watermark_aplicado BOOLEAN NOT NULL DEFAULT true,
  
  -- Auditoria
  capturada_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  capturada_por UUID NOT NULL,
  hash_imagem TEXT NOT NULL
);

-- Tabela de consentimentos digitais
CREATE TABLE public.consentimentos_digitais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  tipo_consentimento tipo_consentimento NOT NULL,
  
  -- Dados do consentimento
  titulo TEXT NOT NULL,
  conteudo_documento TEXT NOT NULL,
  versao_documento TEXT NOT NULL,
  
  -- Assinatura digital
  assinatura_digital TEXT NOT NULL,
  hash_documento TEXT NOT NULL,
  timestamp_assinatura TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_assinatura INET NOT NULL,
  
  -- Validade
  data_inicio DATE NOT NULL,
  data_expiracao DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Auditoria
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL
);

-- Tabela de templates de procedimentos
CREATE TABLE public.templates_procedimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_procedimento tipo_procedimento NOT NULL,
  nome_template TEXT NOT NULL,
  
  -- Estrutura do template
  campos_obrigatorios JSONB NOT NULL,
  campos_opcionais JSONB,
  validacoes JSONB,
  valores_padrao JSONB,
  
  -- Configuração
  ativo BOOLEAN NOT NULL DEFAULT true,
  personalizavel BOOLEAN NOT NULL DEFAULT true,
  criado_por UUID NOT NULL,
  
  -- Auditoria
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de auditoria médica
CREATE TABLE public.auditoria_medica (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tabela_origem TEXT NOT NULL,
  registro_id UUID NOT NULL,
  operacao TEXT NOT NULL CHECK (operacao IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT')),
  
  -- Dados da operação
  dados_anteriores JSONB,
  dados_novos JSONB,
  usuario_id UUID NOT NULL,
  ip_origem INET NOT NULL,
  user_agent TEXT,
  
  -- Contexto médico
  justificativa TEXT,
  nivel_criticidade TEXT NOT NULL DEFAULT 'normal',
  
  -- Timestamp
  executado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de acessos ao prontuário
CREATE TABLE public.acessos_prontuario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  tipo_acesso TEXT NOT NULL CHECK (tipo_acesso IN ('visualizacao', 'edicao', 'impressao', 'exportacao')),
  
  -- Detalhes do acesso
  secoes_acessadas TEXT[],
  duracao_acesso INTERVAL,
  ip_acesso INET NOT NULL,
  dispositivo TEXT,
  
  -- Justificativa (obrigatória para alguns acessos)
  justificativa_clinica TEXT,
  
  -- Timestamp
  iniciado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finalizado_em TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imagens_medicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consentimentos_digitais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_medica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acessos_prontuario ENABLE ROW LEVEL SECURITY;

-- Função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION public.atualizar_timestamp_modificacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  NEW.versao = OLD.versao + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualização automática
CREATE TRIGGER trigger_atualizar_prontuarios
  BEFORE UPDATE ON public.prontuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_timestamp_modificacao();

-- Função para auditoria automática
CREATE OR REPLACE FUNCTION public.registrar_auditoria()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.auditoria_medica (
    tabela_origem,
    registro_id,
    operacao,
    dados_anteriores,
    dados_novos,
    usuario_id,
    ip_origem
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    inet_client_addr()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers de auditoria para todas as tabelas críticas
CREATE TRIGGER trigger_auditoria_prontuarios
  AFTER INSERT OR UPDATE OR DELETE ON public.prontuarios
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

CREATE TRIGGER trigger_auditoria_sessoes
  AFTER INSERT OR UPDATE OR DELETE ON public.sessoes_atendimento
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

CREATE TRIGGER trigger_auditoria_imagens
  AFTER INSERT OR UPDATE OR DELETE ON public.imagens_medicas
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

-- Políticas RLS básicas (serão refinadas por role posteriormente)
CREATE POLICY "Acesso baseado em autenticação" ON public.prontuarios
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Acesso baseado em autenticação" ON public.sessoes_atendimento
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Acesso baseado em autenticação" ON public.imagens_medicas
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Acesso baseado em autenticação" ON public.consentimentos_digitais
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Acesso baseado em autenticação" ON public.templates_procedimentos
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Auditoria somente leitura" ON public.auditoria_medica
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Acessos somente leitura" ON public.acessos_prontuario
  FOR SELECT USING (auth.uid() IS NOT NULL);

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
);