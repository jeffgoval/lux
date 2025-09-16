-- Migration: Criar sistema de prontuários digitais
-- Description: Implementa tabela de prontuários com criptografia, numeração automática e controle de versões
-- Requirements: 6.1, 6.2

-- Criar enum para status de prontuários
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_prontuario') THEN
        CREATE TYPE status_prontuario AS ENUM (
            'ativo',
            'arquivado',
            'transferido'
        );
    END IF;
END $$;

-- Criar enum para especialidades médicas (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'especialidade_medica') THEN
        CREATE TYPE especialidade_medica AS ENUM (
            'dermatologia',
            'cirurgia_plastica',
            'medicina_estetica',
            'fisioterapia_dermatofuncional',
            'biomedicina_estetica',
            'enfermagem_estetica',
            'esteticista',
            'outro'
        );
    END IF;
END $$;

-- Criar tabela de prontuários
CREATE TABLE IF NOT EXISTS public.prontuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
    clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE RESTRICT,
    medico_responsavel_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    numero_prontuario TEXT NOT NULL,
    status status_prontuario DEFAULT 'ativo',
    
    -- Dados médicos criptografados
    anamnese_criptografada TEXT,
    historico_medico_criptografado TEXT,
    medicamentos_atuais_criptografado TEXT,
    alergias_criptografado TEXT,
    contraindicacoes_criptografado TEXT,
    
    -- Dados não sensíveis
    observacoes_gerais TEXT,
    tipo_pele TEXT,
    fototipo INTEGER CHECK (fototipo >= 1 AND fototipo <= 6),
    
    -- Metadados de auditoria
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID NOT NULL REFERENCES auth.users(id),
    atualizado_por UUID REFERENCES auth.users(id),
    versao INTEGER DEFAULT 1,
    hash_integridade TEXT NOT NULL,
    
    -- Constraints
    UNIQUE(clinica_id, numero_prontuario),
    CHECK (length(numero_prontuario) >= 3),
    CHECK (versao > 0)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_prontuarios_cliente_id ON public.prontuarios(cliente_id);
CREATE INDEX IF NOT EXISTS idx_prontuarios_clinica_id ON public.prontuarios(clinica_id);
CREATE INDEX IF NOT EXISTS idx_prontuarios_medico_responsavel ON public.prontuarios(medico_responsavel_id);
CREATE INDEX IF NOT EXISTS idx_prontuarios_numero ON public.prontuarios(clinica_id, numero_prontuario);
CREATE INDEX IF NOT EXISTS idx_prontuarios_status ON public.prontuarios(status) WHERE status = 'ativo';
CREATE INDEX IF NOT EXISTS idx_prontuarios_criado_em ON public.prontuarios(criado_em);

-- Criar sequência para numeração automática de prontuários
CREATE SEQUENCE IF NOT EXISTS prontuario_numero_seq;

-- Função para gerar número de prontuário automático
CREATE OR REPLACE FUNCTION public.gerar_numero_prontuario(p_clinica_id UUID)
RETURNS TEXT AS $$
DECLARE
    proximo_numero INTEGER;
    numero_formatado TEXT;
    ano_atual TEXT;
BEGIN
    -- Obter o próximo número da sequência
    SELECT nextval('prontuario_numero_seq') INTO proximo_numero;
    
    -- Formatar com ano atual
    ano_atual := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    numero_formatado := ano_atual || '-' || LPAD(proximo_numero::TEXT, 6, '0');
    
    -- Verificar se já existe (caso de reset de sequência)
    WHILE EXISTS (
        SELECT 1 FROM public.prontuarios 
        WHERE clinica_id = p_clinica_id 
        AND numero_prontuario = numero_formatado
    ) LOOP
        SELECT nextval('prontuario_numero_seq') INTO proximo_numero;
        numero_formatado := ano_atual || '-' || LPAD(proximo_numero::TEXT, 6, '0');
    END LOOP;
    
    RETURN numero_formatado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular hash de integridade
CREATE OR REPLACE FUNCTION public.calcular_hash_prontuario(
    p_cliente_id UUID,
    p_anamnese TEXT DEFAULT NULL,
    p_historico TEXT DEFAULT NULL,
    p_medicamentos TEXT DEFAULT NULL,
    p_alergias TEXT DEFAULT NULL,
    p_contraindicacoes TEXT DEFAULT NULL,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        digest(
            COALESCE(p_cliente_id::TEXT, '') || '|' ||
            COALESCE(p_anamnese, '') || '|' ||
            COALESCE(p_historico, '') || '|' ||
            COALESCE(p_medicamentos, '') || '|' ||
            COALESCE(p_alergias, '') || '|' ||
            COALESCE(p_contraindicacoes, '') || '|' ||
            COALESCE(p_observacoes, '') || '|' ||
            EXTRACT(EPOCH FROM now())::TEXT,
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar timestamp e versão
CREATE OR REPLACE FUNCTION public.trigger_atualizar_prontuario()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar timestamp
    NEW.atualizado_em = now();
    
    -- Incrementar versão se não for inserção
    IF TG_OP = 'UPDATE' THEN
        NEW.versao = OLD.versao + 1;
    END IF;
    
    -- Gerar número automático se não fornecido
    IF NEW.numero_prontuario IS NULL OR NEW.numero_prontuario = '' THEN
        NEW.numero_prontuario = public.gerar_numero_prontuario(NEW.clinica_id);
    END IF;
    
    -- Recalcular hash de integridade
    NEW.hash_integridade = public.calcular_hash_prontuario(
        NEW.cliente_id,
        NEW.anamnese_criptografada,
        NEW.historico_medico_criptografado,
        NEW.medicamentos_atuais_criptografado,
        NEW.alergias_criptografado,
        NEW.contraindicacoes_criptografado,
        NEW.observacoes_gerais
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_prontuarios_update ON public.prontuarios;
CREATE TRIGGER trigger_prontuarios_update
    BEFORE INSERT OR UPDATE ON public.prontuarios
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_atualizar_prontuario();

-- Comentários para documentação
COMMENT ON TABLE public.prontuarios IS 'Prontuários médicos digitais com criptografia e controle de versões';
COMMENT ON COLUMN public.prontuarios.numero_prontuario IS 'Número único do prontuário no formato YYYY-NNNNNN';
COMMENT ON COLUMN public.prontuarios.anamnese_criptografada IS 'Dados de anamnese criptografados';
COMMENT ON COLUMN public.prontuarios.hash_integridade IS 'Hash SHA-256 para verificação de integridade dos dados';
COMMENT ON COLUMN public.prontuarios.versao IS 'Versão do prontuário para controle de alterações';
COMMENT ON FUNCTION public.gerar_numero_prontuario(UUID) IS 'Gera número sequencial único para prontuário';
COMMENT ON FUNCTION public.calcular_hash_prontuario(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Calcula hash de integridade dos dados do prontuário';