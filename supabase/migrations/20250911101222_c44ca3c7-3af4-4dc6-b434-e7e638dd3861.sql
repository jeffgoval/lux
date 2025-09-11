-- Migração completa para sistema de prontuários médicos

-- Criar tipos ENUM necessários
CREATE TYPE public.tipo_procedimento AS ENUM (
  'botox_toxina',
  'preenchimento',
  'harmonizacao_facial',
  'laser_ipl',
  'peeling',
  'tratamento_corporal',
  'consulta',
  'avaliacao'
);

CREATE TYPE public.nivel_acesso_medico AS ENUM (
  'medico_responsavel',
  'medico_assistente',
  'enfermeiro',
  'esteticista',
  'administrador'
);

CREATE TYPE public.status_prontuario AS ENUM (
  'ativo',
  'inativo',
  'arquivado',
  'transferido'
);

CREATE TYPE public.tipo_consentimento AS ENUM (
  'termo_responsabilidade',
  'autorizacao_imagem',
  'consentimento_procedimento',
  'termo_privacidade'
);

CREATE TYPE public.tipo_imagem AS ENUM (
  'antes',
  'durante',
  'depois',
  'complicacao',
  'documento'
);

CREATE TYPE public.tipo_acesso AS ENUM (
  'visualizacao',
  'edicao',
  'criacao',
  'exclusao',
  'download'
);

-- Tabela principal de prontuários
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

-- Índices para performance
CREATE INDEX idx_prontuarios_paciente ON public.prontuarios(paciente_id);
CREATE INDEX idx_prontuarios_medico ON public.prontuarios(medico_responsavel_id);
CREATE INDEX idx_prontuarios_numero ON public.prontuarios(numero_prontuario);
CREATE INDEX idx_prontuarios_status ON public.prontuarios(status);

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

CREATE INDEX idx_sessoes_prontuario ON public.sessoes_atendimento(prontuario_id);
CREATE INDEX idx_sessoes_data ON public.sessoes_atendimento(data_sessao);
CREATE INDEX idx_sessoes_tipo ON public.sessoes_atendimento(tipo_procedimento);

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

CREATE INDEX idx_imagens_prontuario ON public.imagens_medicas(prontuario_id);
CREATE INDEX idx_imagens_sessao ON public.imagens_medicas(sessao_id);
CREATE INDEX idx_imagens_tipo ON public.imagens_medicas(tipo_imagem);

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

CREATE INDEX idx_consentimentos_prontuario ON public.consentimentos_digitais(prontuario_id);
CREATE INDEX idx_consentimentos_tipo ON public.consentimentos_digitais(tipo_consentimento);

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
  criado_por UUID NOT NULL
);

CREATE INDEX idx_templates_tipo ON public.templates_procedimentos(tipo_procedimento);

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

CREATE INDEX idx_auditoria_prontuario ON public.auditoria_medica(prontuario_id);
CREATE INDEX idx_auditoria_usuario ON public.auditoria_medica(usuario_id);
CREATE INDEX idx_auditoria_operacao ON public.auditoria_medica(operacao);
CREATE INDEX idx_auditoria_timestamp ON public.auditoria_medica(timestamp_operacao);

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

CREATE INDEX idx_acessos_prontuario ON public.acessos_prontuario(prontuario_id);
CREATE INDEX idx_acessos_usuario ON public.acessos_prontuario(usuario_id);
CREATE INDEX idx_acessos_data ON public.acessos_prontuario(data_acesso);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imagens_medicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consentimentos_digitais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_medica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acessos_prontuario ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para prontuários
CREATE POLICY "Profissionais autenticados podem visualizar prontuários"
ON public.prontuarios FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem criar prontuários"
ON public.prontuarios FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND criado_por = auth.uid());

CREATE POLICY "Profissionais podem atualizar prontuários"
ON public.prontuarios FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Políticas RLS para sessões
CREATE POLICY "Profissionais podem visualizar sessões"
ON public.sessoes_atendimento FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem criar sessões"
ON public.sessoes_atendimento FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND criado_por = auth.uid());

CREATE POLICY "Profissionais podem atualizar sessões"
ON public.sessoes_atendimento FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Políticas RLS para imagens
CREATE POLICY "Profissionais podem visualizar imagens"
ON public.imagens_medicas FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem fazer upload de imagens"
ON public.imagens_medicas FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND criado_por = auth.uid());

-- Políticas RLS para consentimentos
CREATE POLICY "Profissionais podem visualizar consentimentos"
ON public.consentimentos_digitais FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem criar consentimentos"
ON public.consentimentos_digitais FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND criado_por = auth.uid());

-- Políticas RLS para templates (leitura para todos, edição restrita)
CREATE POLICY "Profissionais podem visualizar templates"
ON public.templates_procedimentos FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas administradores podem modificar templates"
ON public.templates_procedimentos FOR ALL
USING (auth.uid() IS NOT NULL);

-- Políticas RLS para auditoria (apenas leitura)
CREATE POLICY "Profissionais podem visualizar auditoria"
ON public.auditoria_medica FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Políticas RLS para acessos
CREATE POLICY "Profissionais podem visualizar próprios acessos"
ON public.acessos_prontuario FOR SELECT
USING (auth.uid() = usuario_id);

CREATE POLICY "Sistema pode registrar acessos"
ON public.acessos_prontuario FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Função para gerar número de prontuário
CREATE OR REPLACE FUNCTION public.gerar_numero_prontuario()
RETURNS TEXT AS $$
BEGIN
  RETURN 'PRONT-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
         LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(numero_prontuario FROM 11 FOR 6) AS INTEGER)), 0) + 1 
               FROM public.prontuarios 
               WHERE numero_prontuario LIKE 'PRONT-' || TO_CHAR(NOW(), 'YYYY') || '-%')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Aplicar trigger nas tabelas necessárias
CREATE TRIGGER update_prontuarios_updated_at
  BEFORE UPDATE ON public.prontuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessoes_updated_at
  BEFORE UPDATE ON public.sessoes_atendimento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates_procedimentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função de auditoria automática
CREATE OR REPLACE FUNCTION public.log_auditoria()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar triggers de auditoria
CREATE TRIGGER auditoria_prontuarios
  AFTER INSERT OR UPDATE OR DELETE ON public.prontuarios
  FOR EACH ROW EXECUTE FUNCTION public.log_auditoria();

CREATE TRIGGER auditoria_sessoes
  AFTER INSERT OR UPDATE OR DELETE ON public.sessoes_atendimento
  FOR EACH ROW EXECUTE FUNCTION public.log_auditoria();

-- Inserir templates padrão
INSERT INTO public.templates_procedimentos (tipo_procedimento, nome_template, campos_obrigatorios, campos_opcionais, criado_por) VALUES
('botox_toxina', 'Aplicação de Toxina Botulínica', 
 '{"regioes_aplicacao": {"type": "array", "required": true}, "unidades_totais": {"type": "number", "required": true}, "produto_utilizado": {"type": "string", "required": true}, "tecnica_aplicacao": {"type": "string", "required": true}}',
 '{"dilucao": {"type": "string"}, "tempo_aplicacao": {"type": "string"}, "orientacoes_pos": {"type": "text"}}',
 '00000000-0000-0000-0000-000000000000'
),
('preenchimento', 'Preenchimento com Ácido Hialurônico',
 '{"area_tratada": {"type": "string", "required": true}, "volume_aplicado": {"type": "number", "required": true}, "produto_utilizado": {"type": "string", "required": true}, "tecnica_injecao": {"type": "string", "required": true}}',
 '{"anestesia_utilizada": {"type": "string"}, "tempo_procedimento": {"type": "string"}, "retorno_recomendado": {"type": "date"}}',
 '00000000-0000-0000-0000-000000000000'
);

-- Criar bucket para imagens médicas
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