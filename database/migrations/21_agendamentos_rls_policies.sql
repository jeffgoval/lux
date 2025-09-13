-- =====================================================
-- RLS POLICIES PARA SISTEMA DE AGENDAMENTO PREMIUM
-- Políticas granulares de segurança multi-tenant
-- =====================================================

-- =====================================================
-- HABILITAR RLS NAS TABELAS
-- =====================================================

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloqueios_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista_espera ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos_metricas ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS PARA TABELA AGENDAMENTOS
-- =====================================================

-- Política para visualização de agendamentos
CREATE POLICY "agendamentos_select_policy" ON public.agendamentos
  FOR SELECT
  USING (
    -- Usuários podem ver agendamentos da sua clínica
    clinica_id IN (
      SELECT uc.clinica_id 
      FROM public.user_clinicas uc 
      WHERE uc.user_id = auth.uid()
    )
    OR
    -- Profissionais podem ver seus próprios agendamentos
    profissional_id = auth.uid()
    OR
    -- Clientes podem ver seus próprios agendamentos
    cliente_id IN (
      SELECT c.id 
      FROM public.clientes c 
      WHERE c.user_id = auth.uid()
    )
  );

-- Política para inserção de agendamentos
CREATE POLICY "agendamentos_insert_policy" ON public.agendamentos
  FOR INSERT
  WITH CHECK (
    -- Apenas usuários da clínica podem criar agendamentos
    clinica_id IN (
      SELECT uc.clinica_id 
      FROM public.user_clinicas uc 
      WHERE uc.user_id = auth.uid()
      AND uc.ativo = true
    )
    AND
    -- Verificar se o usuário tem permissão para criar agendamentos
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.nome IN ('admin', 'gerente', 'recepcionista', 'profissional')
      AND ur.ativo = true
    )
  );

-- Política para atualização de agendamentos
CREATE POLICY "agendamentos_update_policy" ON public.agendamentos
  FOR UPDATE
  USING (
    -- Usuários da clínica podem atualizar
    clinica_id IN (
      SELECT uc.clinica_id 
      FROM public.user_clinicas uc 
      WHERE uc.user_id = auth.uid()
      AND uc.ativo = true
    )
    OR
    -- Profissionais podem atualizar seus agendamentos
    profissional_id = auth.uid()
  )
  WITH CHECK (
    -- Manter as mesmas regras de inserção
    clinica_id IN (
      SELECT uc.clinica_id 
      FROM public.user_clinicas uc 
      WHERE uc.user_id = auth.uid()
      AND uc.ativo = true
    )
  );

-- Política para exclusão de agendamentos (apenas admins e gerentes)
CREATE POLICY "agendamentos_delete_policy" ON public.agendamentos
  FOR DELETE
  USING (
    clinica_id IN (
      SELECT uc.clinica_id 
      FROM public.user_clinicas uc 
      WHERE uc.user_id = auth.uid()
      AND uc.ativo = true
    )
    AND
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.nome IN ('admin', 'gerente')
      AND ur.ativo = true
    )
  );

-- =====================================================
-- POLÍTICAS PARA TABELA BLOQUEIOS_AGENDA
-- =====================================================

-- Política para visualização de bloqueios
CREATE POLICY "bloqueios_select_policy" ON public.bloqueios_agenda
  FOR SELECT
  USING (
    -- Usuários da clínica podem ver bloqueios
    clinica_id IN (
      SELECT uc.clinica_id 
      FROM public.user_clinicas uc 
      WHERE uc.user_id = auth.uid()
    )
    OR
    -- Profissionais podem ver seus próprios bloqueios
    profissional_id = auth.uid()
  );

-- Política para inserção de bloqueios
CREATE POLICY "bloqueios_insert_policy" ON public.bloqueios_agenda
  FOR INSERT
  WITH CHECK (
    -- Usuários da clínica podem criar bloqueios
    clinica_id IN (
      SELECT uc.clinica_id 
      FROM public.user_clinicas uc 
      WHERE uc.user_id = auth.uid()
      AND uc.ativo = true
    )
    AND
    (
      -- Admins e gerentes podem criar qualquer bloqueio
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.nome IN ('admin', 'gerente')
        AND ur.ativo = true
      )
      OR
      -- Profissionais podem criar bloqueios para si mesmos
      (profissional_id = auth.uid() AND sala_id IS NULL)
      OR
      -- Recepcionistas podem criar bloqueios de sala
      (profissional_id IS NULL AND sala_id IS NOT NULL AND
       EXISTS (
         SELECT 1 FROM public.user_roles ur
         JOIN public.roles r ON ur.role_id = r.id
         WHERE ur.user_id = auth.uid()
         AND r.nome IN ('admin', 'gerente', 'recepcionista')
         AND ur.ativo = true
       ))
    )
  );

-- Política para atualização de bloqueios
CREATE POLICY "bloqueios_update_policy" ON public.bloqueios_agenda
  FOR UPDATE
  USING (
    clinica_id IN (
      SELECT uc.clinica_id 
      FROM public.user_clinicas uc 
      WHERE uc.user_id = auth.uid()
      AND uc.ativo = true
    )
    AND
    (
      -- Criador pode editar
      criado_por = auth.uid()
      OR
      -- Admins e gerentes podem editar qualquer bloqueio
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.nome IN ('admin', 'gerente')
        AND ur.ativo = true
      )
      OR
      -- Profissionais podem editar seus próprios bloqueios
      profissional_id = auth.uid()
    )
  );

-- Política para exclusão de bloqueios
CREATE POLICY "bloqueios_delete_policy" ON public.bloqueios_agenda
  FOR DELETE
  USING (
    clinica_id IN (
      SELECT uc.clinica_id 
      FROM public.user_clinicas uc 
      WHERE uc.user_id = auth.uid()
      AND uc.ativo = true
    )
    AND
    (
      criado_por = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.nome IN ('admin', 'gerente')
        AND ur.ativo = true
      )
    )
  );

-- =====================================================
-- POLÍTICAS PARA TABELA LISTA_ESPERA
-- =====================================================

-- Política para visualização da lista de espera
CREATE POLICY "lista_espera_select_policy" ON public.lista_espera
  FOR SELECT
  USING (
    -- Usuários da clínica podem ver lista de espera
    clinica_id IN (
      SELECT uc.clinica_id 
      FROM public.user_clinicas uc 
      WHERE uc.user_id = auth.uid()
    )
    OR
    -- Clientes podem ver suas próprias entradas
    cliente_id IN (
      SELECT c.id 
      FROM public.clientes c 
      WHERE c.user_id = auth.uid()
    )
  );

-- Política para inserção na lista de espera
CREATE POLICY "lista_espera_insert_policy" ON public.lista_espera
  FOR INSERT
  WITH CHECK (
    -- Usuários da clínica podem adicionar à lista
    clinica_id IN (
      SELECT uc.clinica_id 
      FROM public.user_clinicas uc 
      WHERE uc.user_id = auth.uid()
      AND uc.ativo = true
    )
    AND
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.nome IN ('admin', 'gerente', 'recepcionista')
      AND ur.ativo = true
    )
  );

-- Política para atualização da lista de espera
CREATE POLICY "lista_espera_update_policy" ON public.lista_espera
  FOR UPDATE
  USING (
    clinica_id IN (
      SELECT uc.clinica_id 
      FROM public.user_clinicas uc 
      WHERE uc.user_id = auth.uid()
      AND uc.ativo = true
    )
    AND
    (
      criado_por = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.nome IN ('admin', 'gerente', 'recepcionista')
        AND ur.ativo = true
      )
    )
  );

-- Política para exclusão da lista de espera
CREATE POLICY "lista_espera_delete_policy" ON public.lista_espera
  FOR DELETE
  USING (
    clinica_id IN (
      SELECT uc.clinica_id 
      FROM public.user_clinicas uc 
      WHERE uc.user_id = auth.uid()
      AND uc.ativo = true
    )
    AND
    (
      criado_por = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.nome IN ('admin', 'gerente')
        AND ur.ativo = true
      )
    )
  );

-- =====================================================
-- POLÍTICAS PARA TABELA AGENDAMENTOS_HISTORICO
-- =====================================================

-- Política para visualização do histórico (apenas leitura)
CREATE POLICY "agendamentos_historico_select_policy" ON public.agendamentos_historico
  FOR SELECT
  USING (
    -- Apenas usuários com permissão de auditoria
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.nome IN ('admin', 'gerente')
      AND ur.ativo = true
    )
    AND
    -- Da mesma clínica do agendamento
    agendamento_id IN (
      SELECT a.id FROM public.agendamentos a
      WHERE a.clinica_id IN (
        SELECT uc.clinica_id 
        FROM public.user_clinicas uc 
        WHERE uc.user_id = auth.uid()
      )
    )
  );

-- Política para inserção no histórico (automática via triggers)
CREATE POLICY "agendamentos_historico_insert_policy" ON public.agendamentos_historico
  FOR INSERT
  WITH CHECK (
    -- Apenas o sistema pode inserir no histórico
    criado_por = auth.uid()
  );

-- Não permitir UPDATE ou DELETE no histórico (auditoria)
CREATE POLICY "agendamentos_historico_no_update" ON public.agendamentos_historico
  FOR UPDATE
  USING (false);

CREATE POLICY "agendamentos_historico_no_delete" ON public.agendamentos_historico
  FOR DELETE
  USING (false);

-- =====================================================
-- POLÍTICAS PARA TABELA AGENDAMENTOS_METRICAS
-- =====================================================

-- Política para visualização de métricas
CREATE POLICY "agendamentos_metricas_select_policy" ON public.agendamentos_metricas
  FOR SELECT
  USING (
    -- Usuários da clínica podem ver métricas
    clinica_id IN (
      SELECT uc.clinica_id 
      FROM public.user_clinicas uc 
      WHERE uc.user_id = auth.uid()
    )
    AND
    (
      -- Admins e gerentes veem todas as métricas
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.nome IN ('admin', 'gerente')
        AND ur.ativo = true
      )
      OR
      -- Profissionais veem apenas suas métricas
      (profissional_id = auth.uid() OR profissional_id IS NULL)
    )
  );

-- Política para inserção de métricas (sistema automático)
CREATE POLICY "agendamentos_metricas_insert_policy" ON public.agendamentos_metricas
  FOR INSERT
  WITH CHECK (
    -- Apenas usuários com permissão de sistema
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.nome IN ('admin', 'sistema')
      AND ur.ativo = true
    )
  );

-- Política para atualização de métricas (sistema automático)
CREATE POLICY "agendamentos_metricas_update_policy" ON public.agendamentos_metricas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.nome IN ('admin', 'sistema')
      AND ur.ativo = true
    )
  );

-- Não permitir DELETE de métricas (dados históricos)
CREATE POLICY "agendamentos_metricas_no_delete" ON public.agendamentos_metricas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.nome = 'admin'
      AND ur.ativo = true
    )
  );

-- =====================================================
-- FUNÇÕES AUXILIARES PARA RLS
-- =====================================================

-- Função para verificar se usuário tem acesso à clínica
CREATE OR REPLACE FUNCTION public.user_has_clinic_access(clinic_id UUID)
RETURNS BOOLEAN AS $
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_clinicas uc
    WHERE uc.user_id = auth.uid()
    AND uc.clinica_id = clinic_id
    AND uc.ativo = true
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar role do usuário
CREATE OR REPLACE FUNCTION public.user_has_role(role_names TEXT[])
RETURNS BOOLEAN AS $
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.nome = ANY(role_names)
    AND ur.ativo = true
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário é proprietário do cliente
CREATE OR REPLACE FUNCTION public.user_owns_client(client_id UUID)
RETURNS BOOLEAN AS $
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = client_id
    AND c.user_id = auth.uid()
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS OTIMIZADAS USANDO FUNÇÕES AUXILIARES
-- =====================================================

-- Recriar algumas políticas usando as funções auxiliares para melhor performance
DROP POLICY IF EXISTS "agendamentos_select_policy" ON public.agendamentos;
CREATE POLICY "agendamentos_select_optimized" ON public.agendamentos
  FOR SELECT
  USING (
    public.user_has_clinic_access(clinica_id)
    OR profissional_id = auth.uid()
    OR public.user_owns_client(cliente_id)
  );

-- =====================================================
-- GRANTS PARA FUNÇÕES RLS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.user_has_clinic_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_client TO authenticated;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON POLICY "agendamentos_select_optimized" ON public.agendamentos IS 
'Permite visualização de agendamentos para usuários da clínica, profissionais responsáveis ou clientes proprietários';

COMMENT ON POLICY "agendamentos_insert_policy" ON public.agendamentos IS 
'Permite inserção de agendamentos apenas para usuários autorizados da clínica';

COMMENT ON POLICY "bloqueios_select_policy" ON public.bloqueios_agenda IS 
'Permite visualização de bloqueios para usuários da clínica ou profissionais responsáveis';

COMMENT ON POLICY "lista_espera_select_policy" ON public.lista_espera IS 
'Permite visualização da lista de espera para usuários da clínica ou clientes proprietários';

COMMENT ON FUNCTION public.user_has_clinic_access IS 
'Função auxiliar para verificar se usuário tem acesso à clínica específica';

COMMENT ON FUNCTION public.user_has_role IS 
'Função auxiliar para verificar se usuário possui uma das roles especificadas';

COMMENT ON FUNCTION public.user_owns_client IS 
'Função auxiliar para verificar se usuário é proprietário do registro de cliente';