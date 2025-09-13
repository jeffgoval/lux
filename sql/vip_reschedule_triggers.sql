-- =====================================================
-- TRIGGERS E FUNÇÕES PARA REAGENDAMENTO VIP
-- Sistema de reagendamento sem penalidades para clientes VIP
-- =====================================================

-- 1. Criar tabela para histórico de reagendamentos
CREATE TABLE IF NOT EXISTS public.historico_reagendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES auth.users(id),
  agendamento_id UUID NOT NULL,
  data_original TIMESTAMPTZ NOT NULL,
  data_nova TIMESTAMPTZ NOT NULL,
  data_reagendamento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  motivo TEXT,
  penalidade_aplicada BOOLEAN DEFAULT FALSE,
  valor_penalidade DECIMAL(10,2) DEFAULT 0,
  categoria_cliente TEXT NOT NULL DEFAULT 'regular',
  beneficio_utilizado TEXT,
  usuario_responsavel UUID REFERENCES auth.users(id),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Criar tabela para políticas VIP
CREATE TABLE IF NOT EXISTS public.politicas_vip (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL UNIQUE CHECK (categoria IN ('vip', 'premium', 'diamond')),
  reagendamentos_gratuitos INTEGER NOT NULL DEFAULT 0,
  antecedencia_minima_horas DECIMAL(4,2) NOT NULL DEFAULT 24,
  taxa_emergencia DECIMAL(4,3) NOT NULL DEFAULT 0,
  beneficios JSONB DEFAULT '[]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Inserir políticas padrão
INSERT INTO public.politicas_vip (categoria, reagendamentos_gratuitos, antecedencia_minima_horas, taxa_emergencia, beneficios)
VALUES 
  ('vip', 2, 2.0, 0.10, '[
    {"id": "reagendamento_gratuito", "nome": "Reagendamento Gratuito", "descricao": "Até 2 reagendamentos por mês sem taxa"},
    {"id": "prioridade_horario", "nome": "Prioridade de Horário", "descricao": "Acesso prioritário aos melhores horários"}
  ]'::jsonb),
  ('premium', 3, 1.0, 0.05, '[
    {"id": "reagendamento_ilimitado", "nome": "Reagendamento Flexível", "descricao": "3 reagendamentos gratuitos por mês"},
    {"id": "upgrade_automatico", "nome": "Upgrade Automático", "descricao": "Upgrade para horários premium quando disponível"},
    {"id": "concierge_dedicado", "nome": "Concierge Dedicado", "descricao": "Assistência personalizada"}
  ]'::jsonb),
  ('diamond', -1, 0.5, 0.00, '[
    {"id": "sem_restricoes", "nome": "Sem Restrições", "descricao": "Reagende a qualquer momento sem penalidades"},
    {"id": "horarios_exclusivos", "nome": "Horários Exclusivos", "descricao": "Acesso a horários reservados"},
    {"id": "garantia_satisfacao", "nome": "Garantia de Satisfação", "descricao": "Reagendamento garantido se não ficar satisfeito"}
  ]'::jsonb)
ON CONFLICT (categoria) DO NOTHING;

-- 4. Função para contar reagendamentos mensais
CREATE OR REPLACE FUNCTION public.contar_reagendamentos_mensais(
  p_cliente_id UUID,
  p_data_referencia DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_inicio_mes DATE;
  v_fim_mes DATE;
BEGIN
  -- Calcular início e fim do mês
  v_inicio_mes := DATE_TRUNC('month', p_data_referencia)::DATE;
  v_fim_mes := (DATE_TRUNC('month', p_data_referencia) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Contar reagendamentos no período
  SELECT COUNT(*)
  INTO v_count
  FROM public.historico_reagendamentos
  WHERE cliente_id = p_cliente_id
    AND DATE(data_reagendamento) BETWEEN v_inicio_mes AND v_fim_mes;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- 5. Função para calcular penalidade VIP
CREATE OR REPLACE FUNCTION public.calcular_penalidade_vip(
  p_cliente_id UUID,
  p_categoria_cliente TEXT,
  p_data_agendamento TIMESTAMPTZ,
  p_valor_servico DECIMAL(10,2)
)
RETURNS TABLE (
  penalidade_aplicada BOOLEAN,
  valor_penalidade DECIMAL(10,2),
  motivo TEXT,
  beneficio_utilizado TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_politica RECORD;
  v_reagendamentos_mes INTEGER;
  v_horas_antecedencia DECIMAL(10,2);
  v_resultado RECORD;
BEGIN
  -- Buscar política para a categoria
  SELECT *
  INTO v_politica
  FROM public.politicas_vip
  WHERE categoria = p_categoria_cliente
    AND ativo = TRUE;
  
  -- Se categoria Diamond, sem penalidades
  IF p_categoria_cliente = 'diamond' THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      0::DECIMAL(10,2),
      'Cliente Diamond - sem penalidades'::TEXT,
      'status_vip'::TEXT;
    RETURN;
  END IF;
  
  -- Se política não encontrada, aplicar taxa padrão
  IF v_politica IS NULL THEN
    RETURN QUERY SELECT 
      TRUE::BOOLEAN,
      (p_valor_servico * 0.15)::DECIMAL(10,2),
      'Taxa padrão - política não encontrada'::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Calcular horas de antecedência
  v_horas_antecedencia := EXTRACT(EPOCH FROM (p_data_agendamento - NOW())) / 3600.0;
  
  -- Verificar antecedência mínima
  IF v_horas_antecedencia >= v_politica.antecedencia_minima_horas THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      0::DECIMAL(10,2),
      FORMAT('Reagendamento dentro da antecedência mínima (%.1f horas)', v_politica.antecedencia_minima_horas)::TEXT,
      'antecedencia'::TEXT;
    RETURN;
  END IF;
  
  -- Contar reagendamentos do mês
  v_reagendamentos_mes := public.contar_reagendamentos_mensais(p_cliente_id);
  
  -- Verificar cota mensal (se não for ilimitado)
  IF v_politica.reagendamentos_gratuitos = -1 OR v_reagendamentos_mes < v_politica.reagendamentos_gratuitos THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      0::DECIMAL(10,2),
      FORMAT('Reagendamento gratuito (%s/%s)', 
        (v_reagendamentos_mes + 1)::TEXT,
        CASE WHEN v_politica.reagendamentos_gratuitos = -1 THEN 'ilimitado' ELSE v_politica.reagendamentos_gratuitos::TEXT END
      )::TEXT,
      'programa_fidelidade'::TEXT;
    RETURN;
  END IF;
  
  -- Aplicar taxa de emergência
  RETURN QUERY SELECT 
    TRUE::BOOLEAN,
    (p_valor_servico * v_politica.taxa_emergencia)::DECIMAL(10,2),
    FORMAT('Taxa de emergência (%.1f horas de antecedência)', v_horas_antecedencia)::TEXT,
    NULL::TEXT;
END;
$$;

-- 6. Função principal para reagendar agendamento VIP
CREATE OR REPLACE FUNCTION public.reagendar_vip_appointment(
  p_agendamento_id UUID,
  p_nova_data TIMESTAMPTZ,
  p_nova_sala_id UUID DEFAULT NULL,
  p_motivo TEXT DEFAULT NULL,
  p_penalidade_valor DECIMAL(10,2) DEFAULT 0,
  p_penalidade_aplicada BOOLEAN DEFAULT FALSE,
  p_beneficios_utilizados TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  novo_agendamento JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agendamento RECORD;
  v_cliente RECORD;
  v_data_original TIMESTAMPTZ;
  v_resultado JSONB;
BEGIN
  -- Buscar agendamento atual
  SELECT a.*, c.categoria
  INTO v_agendamento
  FROM public.agendamentos a
  JOIN public.clientes c ON c.id = a.cliente_id
  WHERE a.id = p_agendamento_id
    AND a.status IN ('confirmado', 'pendente');
  
  IF v_agendamento IS NULL THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Agendamento não encontrado ou não pode ser reagendado'::TEXT,
      NULL::JSONB;
    RETURN;
  END IF;
  
  -- Salvar data original
  v_data_original := v_agendamento.data_agendamento;
  
  -- Atualizar agendamento
  UPDATE public.agendamentos
  SET 
    data_agendamento = p_nova_data,
    sala_id = COALESCE(p_nova_sala_id, sala_id),
    observacoes = COALESCE(
      CASE 
        WHEN observacoes IS NULL THEN p_motivo
        WHEN p_motivo IS NOT NULL THEN CONCAT(observacoes, ' | Reagendado: ', p_motivo)
        ELSE observacoes
      END,
      observacoes
    ),
    valor_final = CASE 
      WHEN p_penalidade_aplicada THEN valor_final + p_penalidade_valor
      ELSE valor_final
    END,
    updated_at = NOW()
  WHERE id = p_agendamento_id;
  
  -- Registrar no histórico
  INSERT INTO public.historico_reagendamentos (
    cliente_id,
    agendamento_id,
    data_original,
    data_nova,
    motivo,
    penalidade_aplicada,
    valor_penalidade,
    categoria_cliente,
    beneficio_utilizado,
    observacoes
  ) VALUES (
    v_agendamento.cliente_id,
    p_agendamento_id,
    v_data_original,
    p_nova_data,
    p_motivo,
    p_penalidade_aplicada,
    p_penalidade_valor,
    v_agendamento.categoria,
    CASE WHEN array_length(p_beneficios_utilizados, 1) > 0 THEN p_beneficios_utilizados[1] ELSE NULL END,
    'Reagendamento VIP processado automaticamente'
  );
  
  -- Preparar resposta
  SELECT jsonb_build_object(
    'id', v_agendamento.id,
    'data_original', v_data_original,
    'data_nova', p_nova_data,
    'penalidade', p_penalidade_valor,
    'valor_final', v_agendamento.valor_final + CASE WHEN p_penalidade_aplicada THEN p_penalidade_valor ELSE 0 END
  ) INTO v_resultado;
  
  RETURN QUERY SELECT 
    TRUE,
    'Reagendamento realizado com sucesso'::TEXT,
    v_resultado;
END;
$$;

-- 7. Trigger para notificações de reagendamento
CREATE OR REPLACE FUNCTION public.notificar_reagendamento_vip()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cliente_nome TEXT;
  v_profissional_nome TEXT;
BEGIN
  -- Buscar dados para notificação
  SELECT p.nome_completo
  INTO v_cliente_nome
  FROM public.profiles p
  WHERE p.id = NEW.cliente_id;
  
  -- TODO: Implementar envio de notificações
  -- Por enquanto, apenas log
  RAISE NOTICE 'Reagendamento VIP: Cliente %, de % para %', 
    v_cliente_nome, 
    NEW.data_original, 
    NEW.data_nova;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_notificar_reagendamento_vip ON public.historico_reagendamentos;
CREATE TRIGGER trigger_notificar_reagendamento_vip
  AFTER INSERT ON public.historico_reagendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_reagendamento_vip();

-- 8. Índices para performance
CREATE INDEX IF NOT EXISTS idx_historico_reagendamentos_cliente_data 
  ON public.historico_reagendamentos(cliente_id, data_reagendamento);

CREATE INDEX IF NOT EXISTS idx_historico_reagendamentos_agendamento 
  ON public.historico_reagendamentos(agendamento_id);

CREATE INDEX IF NOT EXISTS idx_politicas_vip_categoria 
  ON public.politicas_vip(categoria) WHERE ativo = TRUE;

-- 9. Habilitar RLS
ALTER TABLE public.historico_reagendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.politicas_vip ENABLE ROW LEVEL SECURITY;

-- 10. Políticas RLS
CREATE POLICY "historico_reagendamentos_view_own" ON public.historico_reagendamentos
  FOR SELECT USING (
    cliente_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('proprietaria', 'gerente', 'profissionais')
        AND ur.ativo = TRUE
    )
  );

CREATE POLICY "politicas_vip_read_all" ON public.politicas_vip
  FOR SELECT USING (TRUE);

-- Comentários para documentação
COMMENT ON TABLE public.historico_reagendamentos IS 'Histórico de todos os reagendamentos VIP com políticas aplicadas';
COMMENT ON TABLE public.politicas_vip IS 'Políticas de reagendamento por categoria VIP';
COMMENT ON FUNCTION public.reagendar_vip_appointment IS 'Função principal para processar reagendamentos VIP com validação de políticas';

-- Log de instalação
DO $$
BEGIN
  RAISE NOTICE 'Sistema de Reagendamento VIP instalado com sucesso!';
  RAISE NOTICE 'Tabelas criadas: historico_reagendamentos, politicas_vip';
  RAISE NOTICE 'Funções disponíveis: reagendar_vip_appointment, calcular_penalidade_vip, contar_reagendamentos_mensais';
END $$;