-- Corrigir problemas de segurança - definir search_path para todas as funções

-- Corrigir função gerar_numero_prontuario
CREATE OR REPLACE FUNCTION public.gerar_numero_prontuario()
RETURNS TEXT AS $$
BEGIN
  RETURN 'PRONT-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
         LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(numero_prontuario FROM 11 FOR 6) AS INTEGER)), 0) + 1 
               FROM public.prontuarios 
               WHERE numero_prontuario LIKE 'PRONT-' || TO_CHAR(NOW(), 'YYYY') || '-%')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Corrigir função log_auditoria
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