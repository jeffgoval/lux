-- Migration: Criar tabela de sessões de atendimento
-- Description: Implementa registros de procedimentos com relacionamento a templates e produtos
-- Requirements: 6.1, 6.4

-- Criar enum para tipos de imagem médica
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_imagem') THEN
        CREATE TYPE tipo_imagem AS ENUM (
            'antes',
            'durante',
            'depois',
            'evolucao'
        );
    END IF;
END $$;

-- Criar enum para status de sessão
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_sessao') THEN
        CREATE TYPE status_sessao AS ENUM (
            'agendada',
            'em_andamento',
            'concluida',
            'cancelada',
            'reagendada'
        );
    END IF;
END $$;

-- Criar tabela de sessões de atendimento
CREATE TABLE IF NOT EXISTS public.sessoes_atendimento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE RESTRICT,
    agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
    tipo_procedimento tipo_procedimento NOT NULL,
    template_id UUID REFERENCES public.templates_procedimentos(id) ON DELETE SET NULL,
    data_atendimento TIMESTAMPTZ NOT NULL,
    profissional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    status status_sessao DEFAULT 'agendada',
    
    -- Dados do procedimento baseados no template
    procedimento_detalhes JSONB DEFAULT '{}',
    produtos_utilizados JSONB DEFAULT '[]',
    equipamentos_utilizados TEXT[],
    parametros_tecnicos JSONB DEFAULT '{}',
    
    -- Observações médicas
    observacoes_pre TEXT,
    observacoes_pos TEXT,
    intercorrencias TEXT,
    orientacoes_paciente TEXT,
    
    -- Resultados e evolução
    resultados_imediatos TEXT,
    satisfacao_paciente INTEGER CHECK (satisfacao_paciente >= 1 AND satisfacao_paciente <= 10),
    proxima_sessao_recomendada DATE,
    
    -- Valores financeiros
    valor_procedimento DECIMAL(10,2),
    valor_produtos DECIMAL(10,2),
    valor_desconto DECIMAL(10,2) DEFAULT 0,
    valor_total DECIMAL(10,2),
    
    -- Duração da sessão
    duracao_prevista_minutos INTEGER,
    duracao_real_minutos INTEGER,
    
    -- Auditoria e integridade
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID NOT NULL REFERENCES auth.users(id),
    atualizado_por UUID REFERENCES auth.users(id),
    hash_integridade TEXT NOT NULL,
    
    -- Constraints
    CHECK (valor_procedimento >= 0),
    CHECK (valor_produtos >= 0),
    CHECK (valor_desconto >= 0),
    CHECK (valor_total >= 0),
    CHECK (duracao_prevista_minutos > 0),
    CHECK (duracao_real_minutos >= 0)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_sessoes_prontuario_id ON public.sessoes_atendimento(prontuario_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_agendamento_id ON public.sessoes_atendimento(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_profissional_id ON public.sessoes_atendimento(profissional_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_template_id ON public.sessoes_atendimento(template_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_data_atendimento ON public.sessoes_atendimento(data_atendimento);
CREATE INDEX IF NOT EXISTS idx_sessoes_tipo_procedimento ON public.sessoes_atendimento(tipo_procedimento);
CREATE INDEX IF NOT EXISTS idx_sessoes_status ON public.sessoes_atendimento(status);
CREATE INDEX IF NOT EXISTS idx_sessoes_criado_em ON public.sessoes_atendimento(criado_em);

-- Índice composto para consultas por clínica (via prontuário)
CREATE INDEX IF NOT EXISTS idx_sessoes_clinica_data ON public.sessoes_atendimento(prontuario_id, data_atendimento);

-- Função para calcular hash de integridade da sessão
CREATE OR REPLACE FUNCTION public.calcular_hash_sessao(
    p_prontuario_id UUID,
    p_tipo_procedimento tipo_procedimento,
    p_data_atendimento TIMESTAMPTZ,
    p_profissional_id UUID,
    p_procedimento_detalhes JSONB DEFAULT '{}',
    p_observacoes_pre TEXT DEFAULT NULL,
    p_observacoes_pos TEXT DEFAULT NULL,
    p_valor_total DECIMAL DEFAULT 0
)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        digest(
            p_prontuario_id::TEXT || '|' ||
            p_tipo_procedimento::TEXT || '|' ||
            p_data_atendimento::TEXT || '|' ||
            p_profissional_id::TEXT || '|' ||
            COALESCE(p_procedimento_detalhes::TEXT, '{}') || '|' ||
            COALESCE(p_observacoes_pre, '') || '|' ||
            COALESCE(p_observacoes_pos, '') || '|' ||
            COALESCE(p_valor_total::TEXT, '0') || '|' ||
            EXTRACT(EPOCH FROM now())::TEXT,
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para aplicar dados do template na sessão
CREATE OR REPLACE FUNCTION public.aplicar_template_sessao(
    p_sessao_id UUID,
    p_template_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    template_data RECORD;
    sessao_data RECORD;
BEGIN
    -- Buscar dados do template
    SELECT 
        duracao_padrao_minutos,
        valor_base,
        campos_obrigatorios,
        campos_opcionais,
        instrucoes_pre_procedimento,
        instrucoes_pos_procedimento,
        materiais_necessarios
    INTO template_data
    FROM public.templates_procedimentos
    WHERE id = p_template_id AND ativo = true;
    
    -- Se template não encontrado, retornar false
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Buscar dados da sessão
    SELECT * INTO sessao_data
    FROM public.sessoes_atendimento
    WHERE id = p_sessao_id;
    
    -- Se sessão não encontrada, retornar false
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Aplicar dados do template na sessão
    UPDATE public.sessoes_atendimento SET
        duracao_prevista_minutos = COALESCE(duracao_prevista_minutos, template_data.duracao_padrao_minutos),
        valor_procedimento = COALESCE(valor_procedimento, template_data.valor_base),
        procedimento_detalhes = procedimento_detalhes || 
            jsonb_build_object(
                'campos_obrigatorios', template_data.campos_obrigatorios,
                'campos_opcionais', template_data.campos_opcionais,
                'materiais_necessarios', template_data.materiais_necessarios
            ),
        observacoes_pre = COALESCE(observacoes_pre, template_data.instrucoes_pre_procedimento),
        orientacoes_paciente = COALESCE(orientacoes_paciente, template_data.instrucoes_pos_procedimento),
        atualizado_em = now(),
        atualizado_por = auth.uid()
    WHERE id = p_sessao_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular valor total da sessão
CREATE OR REPLACE FUNCTION public.calcular_valor_total_sessao(
    p_valor_procedimento DECIMAL,
    p_valor_produtos DECIMAL,
    p_valor_desconto DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
    RETURN GREATEST(
        (COALESCE(p_valor_procedimento, 0) + COALESCE(p_valor_produtos, 0)) - COALESCE(p_valor_desconto, 0),
        0
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger para atualizar dados da sessão
CREATE OR REPLACE FUNCTION public.trigger_atualizar_sessao()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar timestamp
    NEW.atualizado_em = now();
    
    -- Calcular valor total
    NEW.valor_total = public.calcular_valor_total_sessao(
        NEW.valor_procedimento,
        NEW.valor_produtos,
        NEW.valor_desconto
    );
    
    -- Aplicar template se especificado e for inserção
    IF TG_OP = 'INSERT' AND NEW.template_id IS NOT NULL THEN
        PERFORM public.aplicar_template_sessao(NEW.id, NEW.template_id);
    END IF;
    
    -- Recalcular hash de integridade
    NEW.hash_integridade = public.calcular_hash_sessao(
        NEW.prontuario_id,
        NEW.tipo_procedimento,
        NEW.data_atendimento,
        NEW.profissional_id,
        NEW.procedimento_detalhes,
        NEW.observacoes_pre,
        NEW.observacoes_pos,
        NEW.valor_total
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_sessoes_atendimento_update ON public.sessoes_atendimento;
CREATE TRIGGER trigger_sessoes_atendimento_update
    BEFORE INSERT OR UPDATE ON public.sessoes_atendimento
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_atualizar_sessao();

-- Trigger para atualizar estoque quando produtos são utilizados
CREATE OR REPLACE FUNCTION public.trigger_atualizar_estoque_sessao()
RETURNS TRIGGER AS $$
DECLARE
    produto_item JSONB;
    produto_id UUID;
    quantidade_usada INTEGER;
BEGIN
    -- Processar apenas quando sessão é concluída
    IF NEW.status = 'concluida' AND (OLD.status IS NULL OR OLD.status != 'concluida') THEN
        -- Iterar sobre produtos utilizados
        FOR produto_item IN SELECT * FROM jsonb_array_elements(NEW.produtos_utilizados)
        LOOP
            produto_id := (produto_item->>'produto_id')::UUID;
            quantidade_usada := (produto_item->>'quantidade')::INTEGER;
            
            -- Inserir movimentação de estoque
            INSERT INTO public.movimentacoes_estoque (
                produto_id,
                tipo_movimentacao,
                quantidade,
                quantidade_anterior,
                quantidade_atual,
                motivo,
                responsavel_id,
                sessao_atendimento_id
            )
            SELECT 
                produto_id,
                'saida'::tipo_movimentacao,
                quantidade_usada,
                p.quantidade,
                p.quantidade - quantidade_usada,
                'Utilizado em procedimento',
                NEW.profissional_id,
                NEW.id
            FROM public.produtos p
            WHERE p.id = produto_id;
            
            -- Atualizar quantidade do produto
            UPDATE public.produtos 
            SET quantidade = quantidade - quantidade_usada,
                atualizado_em = now()
            WHERE id = produto_id;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para estoque
DROP TRIGGER IF EXISTS trigger_sessoes_estoque_update ON public.sessoes_atendimento;
CREATE TRIGGER trigger_sessoes_estoque_update
    AFTER UPDATE ON public.sessoes_atendimento
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_atualizar_estoque_sessao();

-- Comentários para documentação
COMMENT ON TABLE public.sessoes_atendimento IS 'Registros de sessões de atendimento/procedimentos realizados';
COMMENT ON COLUMN public.sessoes_atendimento.procedimento_detalhes IS 'Detalhes específicos do procedimento em formato JSON';
COMMENT ON COLUMN public.sessoes_atendimento.produtos_utilizados IS 'Array JSON com produtos utilizados e quantidades';
COMMENT ON COLUMN public.sessoes_atendimento.parametros_tecnicos IS 'Parâmetros técnicos do equipamento/procedimento';
COMMENT ON COLUMN public.sessoes_atendimento.hash_integridade IS 'Hash SHA-256 para verificação de integridade dos dados';
COMMENT ON FUNCTION public.aplicar_template_sessao(UUID, UUID) IS 'Aplica dados do template de procedimento na sessão';
COMMENT ON FUNCTION public.calcular_valor_total_sessao(DECIMAL, DECIMAL, DECIMAL) IS 'Calcula valor total da sessão considerando descontos';