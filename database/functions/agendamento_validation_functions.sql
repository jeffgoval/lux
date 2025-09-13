-- =====================================================
-- FUNÇÕES DE VALIDAÇÃO PARA AGENDAMENTOS PREMIUM
-- Implementa validações inteligentes conforme requirements
-- =====================================================

-- Função para validar disponibilidade completa (Requirement 2.1)
CREATE OR REPLACE FUNCTION validar_disponibilidade_agendamento(
  p_profissional_id UUID,
  p_sala_id UUID,
  p_data_inicio TIMESTAMPTZ,
  p_duracao_minutos INTEGER,
  p_equipamentos UUID[] DEFAULT ARRAY[]::UUID[],
  p_agendamento_id UUID DEFAULT NULL -- Para edições
) RETURNS JSONB AS $
DECLARE
  data_fim TIMESTAMPTZ;
  conflitos JSONB := '[]'::jsonb;
  conflito RECORD;
  equipamento_id UUID;
BEGIN
  data_fim := p_data_inicio + (p_duracao_minutos || ' minutes')::INTERVAL;
  
  -- Validar conflitos com outros agendamentos do profissional
  FOR conflito IN
    SELECT a.id, a.data_agendamento, a.duracao_minutos, c.nome as cliente_nome
    FROM public.agendamentos a
    JOIN public.clientes c ON c.id = a.cliente_id
    WHERE a.profissional_id = p_profissional_id
      AND a.status IN ('confirmado', 'em_andamento', 'pendente')
      AND (p_agendamento_id IS NULL OR a.id != p_agendamento_id)
      AND (
        (a.data_agendamento, a.data_agendamento + (a.duracao_minutos || ' minutes')::INTERVAL) 
        OVERLAPS 
        (p_data_inicio, data_fim)
      )
  LOOP
    conflitos := conflitos || jsonb_build_object(
      'tipo', 'profissional_ocupado',
      'agendamento_id', conflito.id,
      'cliente', conflito.cliente_nome,
      'horario', conflito.data_agendamento,
      'duracao', conflito.duracao_minutos
    );
  END LOOP;
  
  -- Validar conflitos com bloqueios do profissional
  FOR conflito IN
    SELECT b.id, b.titulo, b.data_inicio, b.data_fim, b.tipo
    FROM public.bloqueios_agenda b
    WHERE b.profissional_id = p_profissional_id
      AND b.ativo = TRUE
      AND (b.data_inicio, b.data_fim) OVERLAPS (p_data_inicio, data_fim)
  LOOP
    conflitos := conflitos || jsonb_build_object(
      'tipo', 'bloqueio_profissional',
      'bloqueio_id', conflito.id,
      'titulo', conflito.titulo,
      'tipo_bloqueio', conflito.tipo,
      'periodo', jsonb_build_object(
        'inicio', conflito.data_inicio,
        'fim', conflito.data_fim
      )
    );
  END LOOP;
  
  -- Validar conflitos com sala (se especificada)
  IF p_sala_id IS NOT NULL THEN
    FOR conflito IN
      SELECT a.id, a.data_agendamento, a.duracao_minutos, c.nome as cliente_nome
      FROM public.agendamentos a
      JOIN public.clientes c ON c.id = a.cliente_id
      WHERE a.sala_id = p_sala_id
        AND a.status IN ('confirmado', 'em_andamento', 'pendente')
        AND (p_agendamento_id IS NULL OR a.id != p_agendamento_id)
        AND (
          (a.data_agendamento, a.data_agendamento + (a.duracao_minutos || ' minutes')::INTERVAL) 
          OVERLAPS 
          (p_data_inicio, data_fim)
        )
    LOOP
      conflitos := conflitos || jsonb_build_object(
        'tipo', 'sala_ocupada',
        'agendamento_id', conflito.id,
        'cliente', conflito.cliente_nome,
        'horario', conflito.data_agendamento
      );
    END LOOP;
    
    -- Validar bloqueios da sala
    FOR conflito IN
      SELECT b.id, b.titulo, b.data_inicio, b.data_fim, b.tipo
      FROM public.bloqueios_agenda b
      WHERE b.sala_id = p_sala_id
        AND b.ativo = TRUE
        AND (b.data_inicio, b.data_fim) OVERLAPS (p_data_inicio, data_fim)
    LOOP
      conflitos := conflitos || jsonb_build_object(
        'tipo', 'bloqueio_sala',
        'bloqueio_id', conflito.id,
        'titulo', conflito.titulo,
        'tipo_bloqueio', conflito.tipo
      );
    END LOOP;
  END IF;
  
  -- Validar disponibilidade de equipamentos
  IF array_length(p_equipamentos, 1) > 0 THEN
    FOREACH equipamento_id IN ARRAY p_equipamentos
    LOOP
      FOR conflito IN
        SELECT a.id, a.data_agendamento, a.duracao_minutos, c.nome as cliente_nome
        FROM public.agendamentos a
        JOIN public.clientes c ON c.id = a.cliente_id
        WHERE equipamento_id = ANY(a.equipamentos_reservados)
          AND a.status IN ('confirmado', 'em_andamento', 'pendente')
          AND (p_agendamento_id IS NULL OR a.id != p_agendamento_id)
          AND (
            (a.data_agendamento, a.data_agendamento + (a.duracao_minutos || ' minutes')::INTERVAL) 
            OVERLAPS 
            (p_data_inicio, data_fim)
          )
      LOOP
        conflitos := conflitos || jsonb_build_object(
          'tipo', 'equipamento_ocupado',
          'equipamento_id', equipamento_id,
          'agendamento_id', conflito.id,
          'cliente', conflito.cliente_nome
        );
      END LOOP;
    END LOOP;
  END IF;
  
  RETURN jsonb_build_object(
    'disponivel', jsonb_array_length(conflitos) = 0,
    'conflitos', conflitos,
    'validado_em', NOW()
  );
END;
$ LANGUAGE plpgsql STABLE;

-- Função para sugerir horários alternativos (Requirement 2.2)
CREATE OR REPLACE FUNCTION sugerir_horarios_alternativos(
  p_profissional_id UUID,
  p_servico_id UUID,
  p_data_preferida DATE,
  p_duracao_minutos INTEGER,
  p_limite_sugestoes INTEGER DEFAULT 5
) RETURNS JSONB AS $
DECLARE
  sugestoes JSONB := '[]'::jsonb;
  horario_teste TIMESTAMPTZ;
  disponibilidade JSONB;
  contador INTEGER := 0;
  horario_inicio TIME;
  horario_fim TIME;
  intervalo_minutos INTEGER := 30; -- Intervalo entre tentativas
BEGIN
  -- Buscar horário de funcionamento (assumindo 8h às 18h por padrão)
  horario_inicio := '08:00'::TIME;
  horario_fim := '18:00'::TIME;
  
  -- Testar horários no dia preferido
  horario_teste := p_data_preferida + horario_inicio;
  
  WHILE horario_teste::TIME <= horario_fim AND contador < p_limite_sugestoes LOOP
    -- Verificar se o horário não ultrapassa o fim do expediente
    IF (horario_teste + (p_duracao_minutos || ' minutes')::INTERVAL)::TIME <= horario_fim THEN
      disponibilidade := validar_disponibilidade_agendamento(
        p_profissional_id,
        NULL, -- Sala será definida depois
        horario_teste,
        p_duracao_minutos
      );
      
      IF (disponibilidade->>'disponivel')::BOOLEAN THEN
        sugestoes := sugestoes || jsonb_build_object(
          'data_hora', horario_teste,
          'data', horario_teste::DATE,
          'hora', horario_teste::TIME,
          'disponivel', true,
          'score', 100 -- Score pode ser melhorado com ML
        );
        contador := contador + 1;
      END IF;
    END IF;
    
    horario_teste := horario_teste + (intervalo_minutos || ' minutes')::INTERVAL;
  END LOOP;
  
  -- Se não encontrou suficientes no dia preferido, testar próximos dias
  IF contador < p_limite_sugestoes THEN
    FOR i IN 1..7 LOOP -- Próximos 7 dias
      horario_teste := (p_data_preferida + i) + horario_inicio;
      
      WHILE horario_teste::TIME <= horario_fim AND contador < p_limite_sugestoes LOOP
        IF (horario_teste + (p_duracao_minutos || ' minutes')::INTERVAL)::TIME <= horario_fim THEN
          disponibilidade := validar_disponibilidade_agendamento(
            p_profissional_id,
            NULL,
            horario_teste,
            p_duracao_minutos
          );
          
          IF (disponibilidade->>'disponivel')::BOOLEAN THEN
            sugestoes := sugestoes || jsonb_build_object(
              'data_hora', horario_teste,
              'data', horario_teste::DATE,
              'hora', horario_teste::TIME,
              'disponivel', true,
              'score', 100 - (i * 10) -- Penalizar dias mais distantes
            );
            contador := contador + 1;
          END IF;
        END IF;
        
        horario_teste := horario_teste + (intervalo_minutos || ' minutes')::INTERVAL;
      END LOOP;
    END LOOP;
  END IF;
  
  RETURN jsonb_build_object(
    'sugestoes', sugestoes,
    'total_encontradas', contador,
    'gerado_em', NOW()
  );
END;
$ LANGUAGE plpgsql STABLE;

-- Função para validar intervalos mínimos entre procedimentos (Requirement 2.4)
CREATE OR REPLACE FUNCTION validar_intervalo_minimo_procedimento(
  p_cliente_id UUID,
  p_servico_id UUID,
  p_data_agendamento TIMESTAMPTZ
) RETURNS JSONB AS $
DECLARE
  ultimo_agendamento RECORD;
  intervalo_minimo INTEGER := 7; -- 7 dias por padrão
  intervalo_real INTEGER;
  protocolo JSONB;
BEGIN
  -- Buscar último agendamento do mesmo serviço
  SELECT a.data_agendamento, a.protocolo_medico, s.nome as servico_nome
  INTO ultimo_agendamento
  FROM public.agendamentos a
  JOIN public.servicos s ON s.id = a.servico_id
  WHERE a.cliente_id = p_cliente_id
    AND a.servico_id = p_servico_id
    AND a.status = 'finalizado'
    AND a.data_agendamento < p_data_agendamento
  ORDER BY a.data_agendamento DESC
  LIMIT 1;
  
  IF ultimo_agendamento IS NULL THEN
    RETURN jsonb_build_object(
      'valido', true,
      'primeira_sessao', true,
      'mensagem', 'Primeira sessão do procedimento'
    );
  END IF;
  
  -- Calcular intervalo em dias
  intervalo_real := EXTRACT(DAYS FROM (p_data_agendamento - ultimo_agendamento.data_agendamento));
  
  -- Verificar protocolo específico no último agendamento
  protocolo := ultimo_agendamento.protocolo_medico;
  IF protocolo ? 'intervalo_minimo_dias' THEN
    intervalo_minimo := (protocolo->>'intervalo_minimo_dias')::INTEGER;
  END IF;
  
  RETURN jsonb_build_object(
    'valido', intervalo_real >= intervalo_minimo,
    'intervalo_minimo_dias', intervalo_minimo,
    'intervalo_real_dias', intervalo_real,
    'ultimo_agendamento', ultimo_agendamento.data_agendamento,
    'servico_nome', ultimo_agendamento.servico_nome,
    'mensagem', CASE 
      WHEN intervalo_real >= intervalo_minimo THEN 'Intervalo adequado respeitado'
      ELSE 'Intervalo mínimo de ' || intervalo_minimo || ' dias não respeitado'
    END
  );
END;
$ LANGUAGE plpgsql STABLE;

-- Função para aplicar promoção automaticamente (Requirement 9.1)
CREATE OR REPLACE FUNCTION aplicar_promocao_automatica(
  p_cliente_id UUID,
  p_servico_id UUID,
  p_valor_servico DECIMAL(10,2),
  p_codigo_promocao VARCHAR(50) DEFAULT NULL
) RETURNS JSONB AS $
DECLARE
  promocao RECORD;
  desconto_calculado DECIMAL(10,2) := 0;
  promocao_aplicada JSONB;
  primeira_compra BOOLEAN;
BEGIN
  -- Verificar se é primeira compra
  SELECT NOT EXISTS(
    SELECT 1 FROM public.agendamentos 
    WHERE cliente_id = p_cliente_id 
    AND status = 'finalizado'
  ) INTO primeira_compra;
  
  -- Buscar promoção aplicável
  IF p_codigo_promocao IS NOT NULL THEN
    -- Promoção específica por código
    SELECT p.* INTO promocao
    FROM public.promocoes p
    WHERE p.codigo = p_codigo_promocao
      AND p.ativo = TRUE
      AND CURRENT_DATE BETWEEN p.data_inicio AND p.data_fim
      AND (p.valor_minimo_compra <= p_valor_servico OR p.valor_minimo_compra IS NULL)
      AND (array_length(p.servicos_aplicaveis, 1) = 0 OR p_servico_id = ANY(p.servicos_aplicaveis))
      AND (array_length(p.clientes_aplicaveis, 1) = 0 OR p_cliente_id = ANY(p.clientes_aplicaveis))
      AND (NOT p.primeira_compra_apenas OR primeira_compra)
      AND (p.limite_uso_total IS NULL OR p.usos_realizados < p.limite_uso_total);
  ELSE
    -- Buscar melhor promoção automática
    SELECT p.* INTO promocao
    FROM public.promocoes p
    WHERE p.ativo = TRUE
      AND CURRENT_DATE BETWEEN p.data_inicio AND p.data_fim
      AND (p.valor_minimo_compra <= p_valor_servico OR p.valor_minimo_compra IS NULL)
      AND (array_length(p.servicos_aplicaveis, 1) = 0 OR p_servico_id = ANY(p.servicos_aplicaveis))
      AND (array_length(p.clientes_aplicaveis, 1) = 0 OR p_cliente_id = ANY(p.clientes_aplicaveis))
      AND (NOT p.primeira_compra_apenas OR primeira_compra)
      AND (p.limite_uso_total IS NULL OR p.usos_realizados < p.limite_uso_total)
      AND p.codigo IS NULL -- Apenas promoções automáticas
    ORDER BY 
      CASE p.tipo_desconto
        WHEN 'percentual' THEN p_valor_servico * (p.valor_desconto / 100)
        ELSE p.valor_desconto
      END DESC
    LIMIT 1;
  END IF;
  
  IF promocao IS NULL THEN
    RETURN jsonb_build_object(
      'promocao_aplicada', false,
      'motivo', 'Nenhuma promoção aplicável encontrada'
    );
  END IF;
  
  -- Calcular desconto
  IF promocao.tipo_desconto = 'percentual' THEN
    desconto_calculado := p_valor_servico * (promocao.valor_desconto / 100);
    IF promocao.desconto_maximo IS NOT NULL THEN
      desconto_calculado := LEAST(desconto_calculado, promocao.desconto_maximo);
    END IF;
  ELSE
    desconto_calculado := promocao.valor_desconto;
  END IF;
  
  -- Garantir que desconto não seja maior que o valor
  desconto_calculado := LEAST(desconto_calculado, p_valor_servico);
  
  RETURN jsonb_build_object(
    'promocao_aplicada', true,
    'promocao_id', promocao.id,
    'promocao_nome', promocao.nome,
    'codigo', promocao.codigo,
    'tipo_desconto', promocao.tipo_desconto,
    'valor_desconto_original', promocao.valor_desconto,
    'desconto_calculado', desconto_calculado,
    'valor_original', p_valor_servico,
    'valor_final', p_valor_servico - desconto_calculado,
    'primeira_compra', primeira_compra
  );
END;
$ LANGUAGE plpgsql STABLE;

-- Função para calcular créditos disponíveis do cliente (Requirement 9.4)
CREATE OR REPLACE FUNCTION obter_creditos_cliente(
  p_cliente_id UUID,
  p_clinica_id UUID
) RETURNS JSONB AS $
DECLARE
  saldo_total DECIMAL(10,2) := 0;
  creditos_detalhes JSONB := '[]'::jsonb;
  credito RECORD;
BEGIN
  -- Buscar todos os créditos ativos e não expirados
  FOR credito IN
    SELECT 
      cc.id,
      cc.saldo_atual,
      cc.origem,
      cc.descricao,
      cc.data_expiracao,
      cc.criado_em
    FROM public.cliente_creditos cc
    WHERE cc.cliente_id = p_cliente_id
      AND cc.clinica_id = p_clinica_id
      AND cc.ativo = TRUE
      AND cc.saldo_atual > 0
      AND (cc.data_expiracao IS NULL OR cc.data_expiracao >= CURRENT_DATE)
    ORDER BY 
      CASE WHEN cc.data_expiracao IS NULL THEN 1 ELSE 0 END, -- Sem expiração por último
      cc.data_expiracao ASC, -- Próximos ao vencimento primeiro
      cc.criado_em ASC -- Mais antigos primeiro
  LOOP
    saldo_total := saldo_total + credito.saldo_atual;
    
    creditos_detalhes := creditos_detalhes || jsonb_build_object(
      'id', credito.id,
      'saldo', credito.saldo_atual,
      'origem', credito.origem,
      'descricao', credito.descricao,
      'expira_em', credito.data_expiracao,
      'criado_em', credito.criado_em
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'saldo_total', saldo_total,
    'tem_creditos', saldo_total > 0,
    'creditos_detalhes', creditos_detalhes,
    'consultado_em', NOW()
  );
END;
$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION validar_disponibilidade_agendamento IS 'Valida disponibilidade completa considerando profissional, sala, equipamentos e bloqueios';
COMMENT ON FUNCTION sugerir_horarios_alternativos IS 'Sugere horários alternativos quando há conflitos de agendamento';
COMMENT ON FUNCTION validar_intervalo_minimo_procedimento IS 'Valida intervalos mínimos entre procedimentos baseado no protocolo médico';
COMMENT ON FUNCTION aplicar_promocao_automatica IS 'Aplica automaticamente a melhor promoção disponível para o cliente';
COMMENT ON FUNCTION obter_creditos_cliente IS 'Retorna saldo e detalhes dos créditos disponíveis do cliente';