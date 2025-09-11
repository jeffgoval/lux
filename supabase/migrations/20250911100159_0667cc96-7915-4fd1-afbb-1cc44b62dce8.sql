-- Inserir templates padrão para procedimentos (agora que a tabela existe)
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
),
('harmonizacao_facial', 'Harmonização Facial Completa',
 '{"areas_tratamento": {"type": "array", "required": true}, "plano_tratamento": {"type": "text", "required": true}, "procedimentos_realizados": {"type": "array", "required": true}, "profissional_responsavel": {"type": "string", "required": true}}',
 '{"faseamento": {"type": "text"}, "cronograma": {"type": "text"}, "custo_total": {"type": "number"}}',
 '00000000-0000-0000-0000-000000000000'
),
('laser_ipl', 'Tratamento a Laser/IPL',
 '{"tipo_equipamento": {"type": "string", "required": true}, "parametros_laser": {"type": "object", "required": true}, "area_tratada": {"type": "string", "required": true}, "numero_disparos": {"type": "number", "required": true}}',
 '{"fluencia": {"type": "string"}, "spot_size": {"type": "string"}, "cooling": {"type": "string"}}',
 '00000000-0000-0000-0000-000000000000'
),
('peeling', 'Peeling Químico',
 '{"tipo_acido": {"type": "string", "required": true}, "concentracao": {"type": "string", "required": true}, "tempo_aplicacao": {"type": "string", "required": true}, "camadas_aplicadas": {"type": "number", "required": true}}',
 '{"neutralizacao": {"type": "string"}, "tempo_neutralizacao": {"type": "string"}, "cuidados_pos": {"type": "text"}}',
 '00000000-0000-0000-0000-000000000000'
),
('tratamento_corporal', 'Tratamento Corporal',
 '{"procedimento_realizado": {"type": "string", "required": true}, "areas_tratadas": {"type": "array", "required": true}, "medidas_iniciais": {"type": "object", "required": true}, "protocolo_aplicado": {"type": "string", "required": true}}',
 '{"numero_sessoes_previstas": {"type": "number"}, "intervalo_sessoes": {"type": "string"}, "medidas_finais": {"type": "object"}}',
 '00000000-0000-0000-0000-000000000000'
);

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