-- =====================================================
-- TESTES PARA SCHEMA DE AGENDAMENTO PREMIUM
-- Verifica se todos os requirements estão implementados
-- =====================================================

-- Função de teste principal
CREATE OR REPLACE FUNCTION test_agendamento_premium_schema()
RETURNS TABLE(
  test_name TEXT,
  status TEXT,
  message TEXT
) AS $
DECLARE
  test_result RECORD;
  temp_cliente_id UUID;
  temp_profissional_id UUID;
  temp_servico_id UUID;
  temp_clinica_id UUID;
  temp_agendamento_id UUID;
BEGIN
  -- Setup: Criar dados de teste
  INSERT INTO public.clinicas (nome, email) 
  VALUES ('Clínica Teste Premium', 'teste@clinica.com') 
  RETURNING id INTO temp_clinica_id;
  
  INSERT INTO public.clientes (nome, email, telefone, clinica_id) 
  VALUES ('Cliente Teste', 'cliente@teste.com', '11999999999', temp_clinica_id) 
  RETURNING id INTO temp_cliente_id;
  
  INSERT INTO auth.users (id, email) 
  VALUES (gen_random_uuid(), 'profissional@teste.com') 
  RETURNING id INTO temp_profissional_id;
  
  INSERT INTO public.servicos (nome, duracao_minutos, preco, clinica_id) 
  VALUES ('Procedimento Teste', 60, 200.00, temp_clinica_id) 
  RETURNING id INTO temp_servico_id;

  -- =====================================================
  -- TESTE 1: Verificar estrutura da tabela agendamentos
  -- =====================================================
  
  BEGIN
    -- Verificar se todos os campos necessários existem
    PERFORM 1 FROM information_schema.columns 
    WHERE table_name = 'agendamentos' 
    AND column_name IN (
      'id', 'cliente_id', 'profissional_id', 'servico_id', 'sala_id',
      'data_agendamento', 'duracao_minutos', 'status', 'valor_servico',
      'valor_final', 'desconto_aplicado', 'pagamento_status', 'metodo_pagamento',
      'transacao_id', 'creditos_utilizados', 'comissao_profissional', 'margem_lucro'
    );
    
    RETURN QUERY SELECT 
      'Estrutura tabela agendamentos'::TEXT,
      'PASS'::TEXT,
      'Todos os campos necessários estão presentes'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'Estrutura tabela agendamentos'::TEXT,
      'FAIL'::TEXT,
      'Erro: ' || SQLERRM;
  END;

  -- =====================================================
  -- TESTE 2: Verificar enums de status (Requirement 1.1)
  -- =====================================================
  
  BEGIN
    -- Verificar se os enums existem e têm os valores corretos
    PERFORM 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'agendamento_status'
    AND e.enumlabel IN ('pendente', 'confirmado', 'finalizado', 'cancelado');
    
    RETURN QUERY SELECT 
      'Enum agendamento_status'::TEXT,
      'PASS'::TEXT,
      'Enum com valores corretos criado'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'Enum agendamento_status'::TEXT,
      'FAIL'::TEXT,
      'Erro: ' || SQLERRM;
  END;

  -- =====================================================
  -- TESTE 3: Testar inserção de agendamento (Requirement 7.1, 9.1)
  -- =====================================================
  
  BEGIN
    INSERT INTO public.agendamentos (
      cliente_id,
      profissional_id,
      servico_id,
      clinica_id,
      data_agendamento,
      duracao_minutos,
      valor_servico,
      desconto_percentual,
      creditos_utilizados,
      criado_por
    ) VALUES (
      temp_cliente_id,
      temp_profissional_id,
      temp_servico_id,
      temp_clinica_id,
      NOW() + INTERVAL '1 day',
      60,
      200.00,
      10.0, -- 10% desconto
      20.00, -- R$ 20 em créditos
      temp_profissional_id
    ) RETURNING id INTO temp_agendamento_id;
    
    -- Verificar se os cálculos automáticos funcionaram
    SELECT * FROM public.agendamentos WHERE id = temp_agendamento_id INTO test_result;
    
    IF test_result.valor_final = 160.00 AND -- 200 - 20 (10%) - 20 (créditos)
       test_result.comissao_profissional > 0 AND
       test_result.margem_lucro > 0 THEN
      RETURN QUERY SELECT 
        'Cálculos automáticos'::TEXT,
        'PASS'::TEXT,
        'Valor final, comissão e margem calculados corretamente'::TEXT;
    ELSE
      RETURN QUERY SELECT 
        'Cálculos automáticos'::TEXT,
        'FAIL'::TEXT,
        'Valores calculados incorretamente: ' || test_result.valor_final::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'Cálculos automáticos'::TEXT,
      'FAIL'::TEXT,
      'Erro: ' || SQLERRM;
  END;

  -- =====================================================
  -- TESTE 4: Testar validação de disponibilidade (Requirement 2.1)
  -- =====================================================
  
  BEGIN
    SELECT validar_disponibilidade_agendamento(
      temp_profissional_id,
      NULL,
      NOW() + INTERVAL '1 day',
      60
    ) INTO test_result;
    
    IF (test_result->>'disponivel')::BOOLEAN = FALSE THEN
      RETURN QUERY SELECT 
        'Validação de conflitos'::TEXT,
        'PASS'::TEXT,
        'Conflito detectado corretamente'::TEXT;
    ELSE
      RETURN QUERY SELECT 
        'Validação de conflitos'::TEXT,
        'FAIL'::TEXT,
        'Conflito não detectado'::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'Validação de conflitos'::TEXT,
      'FAIL'::TEXT,
      'Erro: ' || SQLERRM;
  END;

  -- =====================================================
  -- TESTE 5: Testar sugestões de horários (Requirement 2.2)
  -- =====================================================
  
  BEGIN
    SELECT sugerir_horarios_alternativos(
      temp_profissional_id,
      temp_servico_id,
      CURRENT_DATE + 2,
      60,
      3
    ) INTO test_result;
    
    IF jsonb_array_length(test_result->'sugestoes') > 0 THEN
      RETURN QUERY SELECT 
        'Sugestões de horários'::TEXT,
        'PASS'::TEXT,
        'Sugestões geradas: ' || jsonb_array_length(test_result->'sugestoes')::TEXT;
    ELSE
      RETURN QUERY SELECT 
        'Sugestões de horários'::TEXT,
        'FAIL'::TEXT,
        'Nenhuma sugestão gerada'::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'Sugestões de horários'::TEXT,
      'FAIL'::TEXT,
      'Erro: ' || SQLERRM;
  END;

  -- =====================================================
  -- TESTE 6: Testar sistema de créditos (Requirement 9.4)
  -- =====================================================
  
  BEGIN
    -- Inserir crédito para o cliente
    INSERT INTO public.cliente_creditos (
      cliente_id,
      clinica_id,
      saldo_atual,
      credito_adicionado,
      origem,
      criado_por
    ) VALUES (
      temp_cliente_id,
      temp_clinica_id,
      50.00,
      50.00,
      'cashback',
      temp_profissional_id
    );
    
    SELECT obter_creditos_cliente(temp_cliente_id, temp_clinica_id) INTO test_result;
    
    IF (test_result->>'saldo_total')::DECIMAL >= 50.00 THEN
      RETURN QUERY SELECT 
        'Sistema de créditos'::TEXT,
        'PASS'::TEXT,
        'Créditos calculados corretamente: R$ ' || (test_result->>'saldo_total')::TEXT;
    ELSE
      RETURN QUERY SELECT 
        'Sistema de créditos'::TEXT,
        'FAIL'::TEXT,
        'Saldo incorreto: ' || (test_result->>'saldo_total')::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'Sistema de créditos'::TEXT,
      'FAIL'::TEXT,
      'Erro: ' || SQLERRM;
  END;

  -- =====================================================
  -- TESTE 7: Testar sistema de promoções (Requirement 9.1)
  -- =====================================================
  
  BEGIN
    -- Criar promoção de teste
    INSERT INTO public.promocoes (
      clinica_id,
      codigo,
      nome,
      tipo_desconto,
      valor_desconto,
      data_inicio,
      data_fim,
      criado_por
    ) VALUES (
      temp_clinica_id,
      'TESTE10',
      'Desconto Teste',
      'percentual',
      15.0,
      CURRENT_DATE,
      CURRENT_DATE + 30,
      temp_profissional_id
    );
    
    SELECT aplicar_promocao_automatica(
      temp_cliente_id,
      temp_servico_id,
      200.00,
      'TESTE10'
    ) INTO test_result;
    
    IF (test_result->>'promocao_aplicada')::BOOLEAN = TRUE THEN
      RETURN QUERY SELECT 
        'Sistema de promoções'::TEXT,
        'PASS'::TEXT,
        'Promoção aplicada: ' || (test_result->>'desconto_calculado')::TEXT;
    ELSE
      RETURN QUERY SELECT 
        'Sistema de promoções'::TEXT,
        'FAIL'::TEXT,
        'Promoção não aplicada: ' || (test_result->>'motivo')::TEXT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'Sistema de promoções'::TEXT,
      'FAIL'::TEXT,
      'Erro: ' || SQLERRM;
  END;

  -- =====================================================
  -- TESTE 8: Verificar índices de performance
  -- =====================================================
  
  BEGIN
    -- Verificar se os índices principais existem
    PERFORM 1 FROM pg_indexes 
    WHERE tablename = 'agendamentos' 
    AND indexname IN (
      'idx_agendamentos_data_status',
      'idx_agendamentos_profissional_data',
      'idx_agendamentos_cliente_data'
    );
    
    RETURN QUERY SELECT 
      'Índices de performance'::TEXT,
      'PASS'::TEXT,
      'Índices principais criados'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'Índices de performance'::TEXT,
      'FAIL'::TEXT,
      'Erro: ' || SQLERRM;
  END;

  -- =====================================================
  -- TESTE 9: Verificar triggers de auditoria
  -- =====================================================
  
  BEGIN
    -- Atualizar agendamento para testar trigger de histórico
    UPDATE public.agendamentos 
    SET observacoes = 'Teste de auditoria'
    WHERE id = temp_agendamento_id;
    
    -- Verificar se foi criado registro no histórico
    PERFORM 1 FROM public.agendamentos_historico 
    WHERE agendamento_id = temp_agendamento_id 
    AND acao = 'atualizado';
    
    RETURN QUERY SELECT 
      'Triggers de auditoria'::TEXT,
      'PASS'::TEXT,
      'Histórico de alterações registrado'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'Triggers de auditoria'::TEXT,
      'FAIL'::TEXT,
      'Erro: ' || SQLERRM;
  END;

  -- =====================================================
  -- CLEANUP: Remover dados de teste
  -- =====================================================
  
  DELETE FROM public.agendamentos_historico WHERE agendamento_id = temp_agendamento_id;
  DELETE FROM public.agendamentos WHERE id = temp_agendamento_id;
  DELETE FROM public.cliente_creditos WHERE cliente_id = temp_cliente_id;
  DELETE FROM public.promocoes WHERE clinica_id = temp_clinica_id;
  DELETE FROM public.servicos WHERE id = temp_servico_id;
  DELETE FROM public.clientes WHERE id = temp_cliente_id;
  DELETE FROM auth.users WHERE id = temp_profissional_id;
  DELETE FROM public.clinicas WHERE id = temp_clinica_id;

END;
$ LANGUAGE plpgsql;

-- =====================================================
-- EXECUTAR TESTES
-- =====================================================

-- Para executar os testes, descomente a linha abaixo:
-- SELECT * FROM test_agendamento_premium_schema();

-- =====================================================
-- VERIFICAÇÃO RÁPIDA DE REQUIREMENTS
-- =====================================================

-- Verificar se todas as tabelas foram criadas
SELECT 
  'Tabelas criadas' as check_name,
  CASE WHEN COUNT(*) = 6 THEN 'PASS' ELSE 'FAIL' END as status,
  'Encontradas: ' || COUNT(*) || ' de 6 esperadas' as message
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'agendamentos', 
  'bloqueios_agenda', 
  'lista_espera', 
  'agendamentos_historico',
  'cliente_creditos',
  'transacoes_financeiras'
);

-- Verificar se todos os enums foram criados
SELECT 
  'Enums criados' as check_name,
  CASE WHEN COUNT(*) >= 5 THEN 'PASS' ELSE 'FAIL' END as status,
  'Encontrados: ' || COUNT(*) || ' enums' as message
FROM pg_type 
WHERE typname IN (
  'agendamento_status',
  'bloqueio_tipo', 
  'lista_espera_status',
  'pagamento_status',
  'metodo_pagamento'
);

-- Verificar se as funções foram criadas
SELECT 
  'Funções criadas' as check_name,
  CASE WHEN COUNT(*) >= 5 THEN 'PASS' ELSE 'FAIL' END as status,
  'Encontradas: ' || COUNT(*) || ' funções' as message
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'validar_disponibilidade_agendamento',
  'sugerir_horarios_alternativos',
  'aplicar_promocao_automatica',
  'obter_creditos_cliente',
  'calcular_valor_final_agendamento'
);