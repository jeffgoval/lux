-- =====================================================
-- REFERENCE DATA INSERTION
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- This script inserts all reference data according to task 8.1:
-- - Insert especialidades_medicas reference data
-- - Insert fabricantes_equipamento data
-- - Insert default procedure templates

-- =====================================================
-- MEDICAL SPECIALTIES REFERENCE DATA
-- =====================================================

-- Insert comprehensive medical specialties for aesthetic clinics
INSERT INTO public.especialidades_medicas (codigo, nome, descricao, conselho_regulamentador, ativo) VALUES
-- Medical Doctors
('medico_dermatologista', 'Médico Dermatologista', 'Especialista em dermatologia com foco em procedimentos estéticos da pele', 'CFM', true),
('medico_cirurgiao_plastico', 'Médico Cirurgião Plástico', 'Especialista em cirurgia plástica estética e reparadora', 'CFM', true),
('medico_clinico_geral', 'Médico Clínico Geral', 'Médico generalista habilitado para procedimentos estéticos básicos', 'CFM', true),
('medico_angiologista', 'Médico Angiologista', 'Especialista em tratamentos vasculares e escleroterapia', 'CFM', true),

-- Dentists
('dentista_harmonizacao', 'Dentista - Harmonização Orofacial', 'Cirurgião-dentista especializado em harmonização orofacial', 'CFO', true),
('dentista_implantodontia', 'Dentista - Implantodontia', 'Especialista em implantes dentários e reabilitação oral', 'CFO', true),

-- Nursing Professionals
('enfermeiro_estetica', 'Enfermeiro Estético', 'Enfermeiro especializado em procedimentos estéticos', 'COREN', true),
('tecnico_enfermagem', 'Técnico em Enfermagem', 'Técnico de enfermagem para apoio em procedimentos', 'COREN', true),

-- Aesthetic Professionals
('esteticista', 'Esteticista', 'Profissional especializado em tratamentos estéticos não invasivos', 'Diversos', true),
('cosmetologo', 'Cosmétólogo', 'Especialista em cosmetologia e tratamentos faciais', 'Diversos', true),
('fisioterapeuta_dermatofuncional', 'Fisioterapeuta Dermatofuncional', 'Fisioterapeuta especializado em estética', 'CREFITO', true),
('biomedico_estetica', 'Biomédico Estético', 'Biomédico habilitado para procedimentos estéticos', 'CRBM', true),

-- Support Professionals
('farmaceutico_estetica', 'Farmacêutico Estético', 'Farmacêutico especializado em cosméticos e procedimentos', 'CRF', true),
('nutricionista_estetica', 'Nutricionista Estético', 'Nutricionista com foco em estética e bem-estar', 'CRN', true),
('psicologo_estetica', 'Psicólogo Estético', 'Psicólogo especializado em autoestima e imagem corporal', 'CRP', true),

-- Administrative
('recepcionista', 'Recepcionista', 'Profissional de atendimento e recepção', 'Não se aplica', true),
('assistente_administrativo', 'Assistente Administrativo', 'Suporte administrativo e financeiro', 'Não se aplica', true),
('gerente_clinica', 'Gerente de Clínica', 'Responsável pela gestão operacional da clínica', 'Não se aplica', true)

ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  conselho_regulamentador = EXCLUDED.conselho_regulamentador,
  ativo = EXCLUDED.ativo;

-- =====================================================
-- EQUIPMENT MANUFACTURERS REFERENCE DATA
-- =====================================================

-- Insert comprehensive equipment manufacturers
INSERT INTO public.fabricantes_equipamento (
  nome, 
  razao_social,
  cnpj,
  contato_principal, 
  telefone, 
  email, 
  website,
  suporte_tecnico,
  telefone_suporte,
  email_suporte,
  horario_suporte,
  garantia_meses,
  prazo_entrega_dias,
  endereco,
  especialidades,
  certificacoes,
  paises_atuacao,
  avaliacao,
  tempo_resposta_medio_horas,
  ativo
) VALUES
-- International Laser Manufacturers
(
  'Alma Lasers',
  'Alma Lasers Brasil Ltda',
  '12.345.678/0001-90',
  'Suporte Alma Brasil',
  '(11) 3456-7890',
  'suporte@almalasers.com.br',
  'https://www.almalasers.com',
  'Suporte Técnico 24h',
  '0800-123-4567',
  'tecnico@almalasers.com.br',
  '24 horas',
  24,
  30,
  '{"endereco": "Av. Paulista, 1000", "cidade": "São Paulo", "estado": "SP", "cep": "01310-100"}',
  ARRAY['Laser CO2', 'IPL', 'Radiofrequência', 'Ultrassom'],
  ARRAY['ISO 13485', 'CE Mark', 'FDA', 'ANVISA'],
  ARRAY['Brasil', 'Argentina', 'Chile', 'Colômbia'],
  5,
  2,
  true
),
(
  'Solta Medical',
  'Solta Medical Brasil Ltda',
  '23.456.789/0001-01',
  'Suporte Solta',
  '(11) 3456-7891',
  'suporte@soltamedical.com.br',
  'https://www.soltamedical.com',
  'Suporte Comercial',
  '(11) 3456-7892',
  'tecnico@soltamedical.com.br',
  'Segunda a Sexta, 8h às 18h',
  12,
  45,
  '{"endereco": "Rua Augusta, 500", "cidade": "São Paulo", "estado": "SP", "cep": "01305-000"}',
  ARRAY['Ultherapy', 'Thermage', 'Fraxel'],
  ARRAY['ISO 13485', 'CE Mark', 'FDA'],
  ARRAY['Brasil', 'México', 'Argentina'],
  4,
  4,
  true
),
(
  'InMode',
  'InMode Brasil Equipamentos Médicos Ltda',
  '34.567.890/0001-12',
  'Suporte InMode',
  '(11) 3456-7892',
  'suporte@inmode.com.br',
  'https://www.inmode.com',
  'Suporte Técnico Especializado',
  '0800-234-5678',
  'tecnico@inmode.com.br',
  '24 horas',
  18,
  20,
  '{"endereco": "Av. Faria Lima, 2000", "cidade": "São Paulo", "estado": "SP", "cep": "01451-000"}',
  ARRAY['Radiofrequência', 'Morpheus8', 'BodyTite', 'FaceTite'],
  ARRAY['ISO 13485', 'CE Mark', 'FDA', 'Health Canada'],
  ARRAY['Brasil', 'EUA', 'Canadá', 'Europa'],
  5,
  1,
  true
),
(
  'BTL',
  'BTL Brasil Equipamentos Médicos Ltda',
  '45.678.901/0001-23',
  'Suporte BTL',
  '(11) 3456-7893',
  'suporte@btl.com.br',
  'https://www.btl.com',
  'Suporte Técnico',
  '(11) 3456-7894',
  'tecnico@btl.com.br',
  'Segunda a Sexta, 7h às 19h',
  24,
  30,
  '{"endereco": "Rua Verbo Divino, 1500", "cidade": "São Paulo", "estado": "SP", "cep": "04719-002"}',
  ARRAY['EMSCULPT', 'EMTONE', 'EXILIS', 'Vanquish'],
  ARRAY['ISO 13485', 'CE Mark', 'FDA'],
  ARRAY['Brasil', 'Argentina', 'Chile'],
  4,
  3,
  true
),
(
  'Lavieen',
  'Lavieen Equipamentos Estéticos Ltda',
  '56.789.012/0001-34',
  'Suporte Lavieen',
  '(11) 3456-7894',
  'suporte@lavieen.com.br',
  'https://www.lavieen.com.br',
  'Suporte Nacional',
  '0800-345-6789',
  'tecnico@lavieen.com.br',
  'Segunda a Sexta, 8h às 17h',
  12,
  15,
  '{"endereco": "Av. Rebouças, 3000", "cidade": "São Paulo", "estado": "SP", "cep": "05402-600"}',
  ARRAY['Laser Diodo', 'IPL', 'Radiofrequência', 'Criolipólise'],
  ARRAY['ANVISA', 'INMETRO'],
  ARRAY['Brasil'],
  3,
  6,
  true
),
(
  'Fotona',
  'Fotona Brasil Equipamentos Médicos Ltda',
  '67.890.123/0001-45',
  'Suporte Fotona',
  '(11) 3456-7895',
  'suporte@fotona.com.br',
  'https://www.fotona.com',
  'Suporte Técnico Internacional',
  '(11) 3456-7896',
  'tecnico@fotona.com.br',
  'Segunda a Sexta, 8h às 18h',
  18,
  60,
  '{"endereco": "Rua Funchal, 500", "cidade": "São Paulo", "estado": "SP", "cep": "04551-060"}',
  ARRAY['Laser Er:YAG', 'Laser Nd:YAG', 'Laser Alexandrite'],
  ARRAY['ISO 13485', 'CE Mark', 'FDA'],
  ARRAY['Brasil', 'Argentina', 'Colômbia'],
  4,
  4,
  true
),
(
  'Candela',
  'Candela Brasil Equipamentos Médicos Ltda',
  '78.901.234/0001-56',
  'Suporte Candela',
  '(11) 3456-7896',
  'suporte@candela.com.br',
  'https://www.candela.com',
  'Suporte Técnico Premium',
  '0800-456-7890',
  'tecnico@candela.com.br',
  '24 horas',
  24,
  45,
  '{"endereco": "Av. Brigadeiro Faria Lima, 4000", "cidade": "São Paulo", "estado": "SP", "cep": "04538-132"}',
  ARRAY['GentleMax', 'PicoWay', 'Vbeam', 'Fraxel'],
  ARRAY['ISO 13485', 'CE Mark', 'FDA'],
  ARRAY['Brasil', 'EUA', 'Europa', 'Ásia'],
  5,
  2,
  true
),
(
  'Cynosure',
  'Cynosure Brasil Ltda',
  '89.012.345/0001-67',
  'Suporte Cynosure',
  '(11) 3456-7897',
  'suporte@cynosure.com.br',
  'https://www.cynosure.com',
  'Suporte Comercial',
  '(11) 3456-7898',
  'tecnico@cynosure.com.br',
  'Segunda a Sexta, 8h às 18h',
  12,
  30,
  '{"endereco": "Rua Olimpíadas, 200", "cidade": "São Paulo", "estado": "SP", "cep": "04551-000"}',
  ARRAY['PicoSure', 'SculpSure', 'Icon', 'Elite+'],
  ARRAY['ISO 13485', 'CE Mark', 'FDA'],
  ARRAY['Brasil', 'Argentina', 'México'],
  4,
  3,
  true
),
-- National Manufacturers
(
  'Ibramed',
  'Ibramed Indústria Brasileira de Equipamentos Médicos Ltda',
  '90.123.456/0001-78',
  'Suporte Ibramed',
  '(11) 2345-6789',
  'suporte@ibramed.com.br',
  'https://www.ibramed.com.br',
  'Suporte Nacional',
  '0800-567-8901',
  'tecnico@ibramed.com.br',
  'Segunda a Sexta, 7h às 18h',
  12,
  10,
  '{"endereco": "Rua Taboão, 1000", "cidade": "Amparo", "estado": "SP", "cep": "13900-000"}',
  ARRAY['Ultrassom', 'Radiofrequência', 'Laser Diodo', 'Carboxiterapia'],
  ARRAY['ANVISA', 'INMETRO', 'ISO 13485'],
  ARRAY['Brasil', 'Argentina', 'Paraguai'],
  4,
  4,
  true
),
(
  'HTM Eletrônica',
  'HTM Eletrônica S.A.',
  '01.234.567/0001-89',
  'Suporte HTM',
  '(11) 2345-6790',
  'suporte@htm.com.br',
  'https://www.htm.com.br',
  'Suporte Técnico Nacional',
  '0800-678-9012',
  'tecnico@htm.com.br',
  'Segunda a Sexta, 8h às 17h',
  18,
  7,
  '{"endereco": "Av. das Nações Unidas, 5000", "cidade": "São Paulo", "estado": "SP", "cep": "05425-070"}',
  ARRAY['Eletroterapia', 'Ultrassom', 'Laser Terapêutico'],
  ARRAY['ANVISA', 'INMETRO'],
  ARRAY['Brasil'],
  3,
  8,
  true
)

ON CONFLICT (nome) DO UPDATE SET
  razao_social = EXCLUDED.razao_social,
  contato_principal = EXCLUDED.contato_principal,
  telefone = EXCLUDED.telefone,
  email = EXCLUDED.email,
  website = EXCLUDED.website,
  suporte_tecnico = EXCLUDED.suporte_tecnico,
  garantia_meses = EXCLUDED.garantia_meses,
  ativo = EXCLUDED.ativo;

-- =====================================================
-- PROCEDURE CATEGORIES REFERENCE DATA
-- =====================================================

-- Insert procedure categories if they don't exist
INSERT INTO public.categorias_procedimento (nome, descricao, icone, cor, ordem_exibicao) VALUES
('Injetáveis', 'Procedimentos com aplicação de injetáveis (toxina, preenchimentos)', 'syringe', '#3B82F6', 1),
('Laser', 'Tratamentos com tecnologia laser', 'zap', '#EF4444', 2),
('Peeling', 'Procedimentos de peeling químico e físico', 'droplet', '#DC2626', 3),
('Corporal', 'Tratamentos estéticos corporais', 'user', '#7C2D12', 4),
('Facial', 'Tratamentos faciais não invasivos', 'smile', '#BE185D', 5),
('Capilar', 'Tratamentos capilares e do couro cabeludo', 'scissors', '#059669', 6),
('Radiofrequência', 'Tratamentos com radiofrequência', 'radio', '#7C3AED', 7),
('Crioterapia', 'Tratamentos com frio (criolipólise, criosauna)', 'snowflake', '#0EA5E9', 8),
('Ultrassom', 'Tratamentos com ultrassom focado', 'activity', '#F59E0B', 9),
('Harmonização', 'Procedimentos de harmonização facial completa', 'star', '#EC4899', 10)

ON CONFLICT (nome) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone,
  cor = EXCLUDED.cor,
  ordem_exibicao = EXCLUDED.ordem_exibicao;

-- =====================================================
-- COMPREHENSIVE PROCEDURE TEMPLATES
-- =====================================================

-- Function to safely insert procedure templates
CREATE OR REPLACE FUNCTION public.insert_procedure_template(
  p_nome_template TEXT,
  p_tipo_procedimento tipo_procedimento,
  p_categoria TEXT,
  p_descricao TEXT,
  p_campos_obrigatorios JSONB,
  p_campos_opcionais JSONB,
  p_indicacoes TEXT[],
  p_contraindicacoes TEXT[],
  p_duracao_estimada_minutos INTEGER,
  p_numero_sessoes_tipico INTEGER
)
RETURNS UUID AS $
DECLARE
  template_id UUID;
BEGIN
  INSERT INTO public.templates_procedimentos (
    nome_template,
    tipo_procedimento,
    categoria,
    descricao,
    campos_obrigatorios,
    campos_opcionais,
    indicacoes,
    contraindicacoes,
    duracao_estimada_minutos,
    numero_sessoes_tipico,
    publico,
    aprovado
  ) VALUES (
    p_nome_template,
    p_tipo_procedimento,
    p_categoria,
    p_descricao,
    p_campos_obrigatorios,
    p_campos_opcionais,
    p_indicacoes,
    p_contraindicacoes,
    p_duracao_estimada_minutos,
    p_numero_sessoes_tipico,
    true,
    true
  ) 
  ON CONFLICT (nome_template, tipo_procedimento) DO UPDATE SET
    categoria = EXCLUDED.categoria,
    descricao = EXCLUDED.descricao,
    campos_obrigatorios = EXCLUDED.campos_obrigatorios,
    campos_opcionais = EXCLUDED.campos_opcionais,
    indicacoes = EXCLUDED.indicacoes,
    contraindicacoes = EXCLUDED.contraindicacoes,
    duracao_estimada_minutos = EXCLUDED.duracao_estimada_minutos,
    numero_sessoes_tipico = EXCLUDED.numero_sessoes_tipico
  RETURNING id INTO template_id;
  
  RETURN template_id;
END;
$ LANGUAGE plpgsql;

-- Insert comprehensive procedure templates
SELECT public.insert_procedure_template(
  'Aplicação de Toxina Botulínica - Rugas de Expressão',
  'botox_toxina'::tipo_procedimento,
  'padrao',
  'Template padrão para aplicação de toxina botulínica em rugas de expressão facial',
  '{
    "regioes_aplicacao": {"type": "multiselect", "required": true, "options": ["Glabela", "Testa", "Pés de galinha", "Sorriso gengival", "Platisma"], "label": "Regiões de Aplicação"},
    "unidades_totais": {"type": "number", "required": true, "min": 1, "max": 200, "label": "Unidades Totais"},
    "produto_utilizado": {"type": "select", "required": true, "options": ["Botox", "Dysport", "Xeomin", "Prosigne", "Nabota"], "label": "Produto Utilizado"},
    "tecnica_aplicacao": {"type": "select", "required": true, "options": ["Intramuscular", "Intradérmica"], "label": "Técnica de Aplicação"},
    "diluicao": {"type": "text", "required": true, "label": "Diluição Utilizada (ml)"}
  }',
  '{
    "lote_produto": {"type": "text", "label": "Lote do Produto"},
    "validade_produto": {"type": "date", "label": "Validade do Produto"},
    "tempo_aplicacao": {"type": "number", "label": "Tempo de Aplicação (min)"},
    "anestesia_topica": {"type": "boolean", "label": "Anestesia Tópica Utilizada"},
    "orientacoes_pos": {"type": "textarea", "label": "Orientações Pós-Procedimento"},
    "retorno_recomendado": {"type": "number", "label": "Retorno Recomendado (dias)"},
    "intercorrencias": {"type": "textarea", "label": "Intercorrências"}
  }',
  ARRAY['Rugas dinâmicas', 'Linhas de expressão', 'Hiperidrose axilar', 'Bruxismo', 'Sorriso gengival'],
  ARRAY['Gravidez', 'Lactação', 'Miastenia gravis', 'Infecção local ativa', 'Alergia ao produto', 'Uso de aminoglicosídeos'],
  30,
  1
);

SELECT public.insert_procedure_template(
  'Preenchimento Facial com Ácido Hialurônico',
  'preenchimento'::tipo_procedimento,
  'padrao',
  'Template para preenchimento facial com ácido hialurônico de diferentes densidades',
  '{
    "area_tratada": {"type": "multiselect", "required": true, "options": ["Lábios", "Sulco nasogeniano", "Bigode chinês", "Olheiras", "Malar", "Mandíbula", "Queixo", "Têmporas"], "label": "Área Tratada"},
    "volume_aplicado": {"type": "number", "required": true, "min": 0.1, "max": 5.0, "step": 0.1, "label": "Volume Aplicado (ml)"},
    "produto_utilizado": {"type": "select", "required": true, "options": ["Juvederm Ultra", "Juvederm Voluma", "Restylane", "Belotero", "Radiesse", "Sculptra"], "label": "Produto Utilizado"},
    "tecnica_injecao": {"type": "select", "required": true, "options": ["Linear retrógrada", "Pontos seriados", "Leque", "Cross-hatching", "Bolus"], "label": "Técnica de Injeção"},
    "calibre_agulha": {"type": "select", "required": true, "options": ["25G", "27G", "30G", "Cânula 22G", "Cânula 25G", "Cânula 27G"], "label": "Calibre da Agulha/Cânula"}
  }',
  '{
    "anestesia_utilizada": {"type": "select", "options": ["Tópica", "Bloqueio regional", "Não utilizada"], "label": "Anestesia Utilizada"},
    "tempo_procedimento": {"type": "number", "label": "Tempo de Procedimento (min)"},
    "massagem_pos": {"type": "boolean", "label": "Massagem Pós-Procedimento"},
    "gelo_aplicado": {"type": "boolean", "label": "Gelo Aplicado"},
    "lote_produto": {"type": "text", "label": "Lote do Produto"},
    "validade_produto": {"type": "date", "label": "Validade do Produto"},
    "retorno_recomendado": {"type": "number", "label": "Retorno Recomendado (dias)"}
  }',
  ARRAY['Perda de volume facial', 'Rugas estáticas', 'Assimetrias faciais', 'Aumento labial', 'Definição de contorno'],
  ARRAY['Gravidez', 'Lactação', 'Infecção local ativa', 'Histórico de quelóide', 'Alergia ao ácido hialurônico', 'Uso de anticoagulantes'],
  45,
  1
);

SELECT public.insert_procedure_template(
  'Laser CO2 Fracionado Facial',
  'laser_fracionado'::tipo_procedimento,
  'padrao',
  'Template para tratamento com laser CO2 fracionado para rejuvenescimento facial',
  '{
    "area_tratada": {"type": "multiselect", "required": true, "options": ["Face completa", "Região perioral", "Região periorbital", "Testa", "Bochechas"], "label": "Área Tratada"},
    "energia_utilizada": {"type": "number", "required": true, "min": 5, "max": 100, "label": "Energia (mJ)"},
    "densidade": {"type": "select", "required": true, "options": ["Baixa (5-10%)", "Média (10-15%)", "Alta (15-25%)"], "label": "Densidade de Cobertura"},
    "numero_passadas": {"type": "number", "required": true, "min": 1, "max": 5, "label": "Número de Passadas"},
    "modo_operacao": {"type": "select", "required": true, "options": ["Ablativo", "Não ablativo", "Híbrido"], "label": "Modo de Operação"}
  }',
  '{
    "anestesia_utilizada": {"type": "select", "options": ["Tópica", "Bloqueio", "Sedação"], "label": "Anestesia Utilizada"},
    "tempo_anestesia": {"type": "number", "label": "Tempo de Anestesia (min)"},
    "cooling_utilizado": {"type": "boolean", "label": "Sistema de Resfriamento"},
    "intercorrencias": {"type": "textarea", "label": "Intercorrências"},
    "cuidados_pos": {"type": "textarea", "label": "Cuidados Pós-Procedimento"}
  }',
  ARRAY['Fotoenvelhecimento', 'Rugas finas', 'Cicatrizes de acne', 'Melasma', 'Textura irregular da pele'],
  ARRAY['Gravidez', 'Lactação', 'Pele bronzeada', 'Quelóide', 'Infecção ativa', 'Uso de isotretinoína'],
  90,
  3
);

SELECT public.insert_procedure_template(
  'Depilação a Laser Diodo',
  'depilacao_laser'::tipo_procedimento,
  'padrao',
  'Template para sessões de depilação com laser diodo',
  '{
    "area_tratada": {"type": "multiselect", "required": true, "options": ["Axilas", "Virilha", "Pernas", "Braços", "Buço", "Face", "Costas", "Tórax"], "label": "Área Tratada"},
    "fluencia": {"type": "number", "required": true, "min": 5, "max": 50, "label": "Fluência (J/cm²)"},
    "spot_size": {"type": "select", "required": true, "options": ["9mm", "12mm", "15mm", "18mm"], "label": "Spot Size"},
    "frequencia": {"type": "select", "required": true, "options": ["1Hz", "2Hz", "3Hz", "5Hz"], "label": "Frequência"},
    "numero_disparos": {"type": "number", "required": true, "min": 1, "label": "Número de Disparos"}
  }',
  '{
    "gel_condutor": {"type": "boolean", "label": "Gel Condutor Utilizado"},
    "cooling_temperatura": {"type": "number", "label": "Temperatura do Cooling (°C)"},
    "tempo_sessao": {"type": "number", "label": "Tempo da Sessão (min)"},
    "dor_relatada": {"type": "select", "options": ["Ausente", "Leve", "Moderada", "Intensa"], "label": "Dor Relatada"},
    "reacao_imediata": {"type": "textarea", "label": "Reação Imediata"},
    "proxima_sessao": {"type": "number", "label": "Próxima Sessão (dias)"}
  }',
  ARRAY['Pelos indesejados', 'Foliculite de repetição', 'Pelos encravados'],
  ARRAY['Gravidez', 'Lactação', 'Pele bronzeada', 'Fotossensibilização', 'Quelóide', 'Herpes ativo'],
  60,
  8
);

SELECT public.insert_procedure_template(
  'Peeling Químico Superficial',
  'peeling_quimico'::tipo_procedimento,
  'padrao',
  'Template para peeling químico superficial com diferentes ácidos',
  '{
    "tipo_acido": {"type": "select", "required": true, "options": ["Ácido Glicólico", "Ácido Salicílico", "Ácido Mandélico", "Ácido Lático", "TCA"], "label": "Tipo de Ácido"},
    "concentracao": {"type": "select", "required": true, "options": ["10%", "15%", "20%", "25%", "30%", "35%"], "label": "Concentração"},
    "area_aplicacao": {"type": "multiselect", "required": true, "options": ["Face completa", "Testa", "Bochechas", "Nariz", "Queixo", "Pescoço"], "label": "Área de Aplicação"},
    "tempo_aplicacao": {"type": "number", "required": true, "min": 1, "max": 15, "label": "Tempo de Aplicação (min)"},
    "neutralizacao": {"type": "select", "required": true, "options": ["Água gelada", "Bicarbonato", "Neutralizante específico", "Não neutralizado"], "label": "Método de Neutralização"}
  }',
  '{
    "preparo_pele": {"type": "textarea", "label": "Preparo Prévio da Pele"},
    "numero_camadas": {"type": "number", "label": "Número de Camadas Aplicadas"},
    "sensacao_paciente": {"type": "select", "options": ["Ardência leve", "Ardência moderada", "Ardência intensa"], "label": "Sensação do Paciente"},
    "eritema_pos": {"type": "select", "options": ["Ausente", "Leve", "Moderado", "Intenso"], "label": "Eritema Pós-Procedimento"},
    "cuidados_domiciliares": {"type": "textarea", "label": "Cuidados Domiciliares"}
  }',
  ARRAY['Fotoenvelhecimento leve', 'Melasma superficial', 'Acne comedônica', 'Textura irregular', 'Poros dilatados'],
  ARRAY['Gravidez', 'Lactação', 'Pele sensibilizada', 'Uso de retinóides', 'Exposição solar recente', 'Herpes ativo'],
  45,
  4
);

-- =====================================================
-- COMPLETION VERIFICATION AND LOGGING
-- =====================================================

-- Function to verify reference data insertion
CREATE OR REPLACE FUNCTION public.verify_reference_data_insertion()
RETURNS JSONB AS $
DECLARE
  verification_result JSONB;
  specialties_count INTEGER;
  manufacturers_count INTEGER;
  templates_count INTEGER;
  categories_count INTEGER;
BEGIN
  -- Count inserted data
  SELECT COUNT(*) INTO specialties_count FROM public.especialidades_medicas WHERE ativo = true;
  SELECT COUNT(*) INTO manufacturers_count FROM public.fabricantes_equipamento WHERE ativo = true;
  SELECT COUNT(*) INTO templates_count FROM public.templates_procedimentos WHERE publico = true;
  SELECT COUNT(*) INTO categories_count FROM public.categorias_procedimento;
  
  -- Compile verification results
  verification_result := jsonb_build_object(
    'verification_timestamp', now(),
    'data_counts', jsonb_build_object(
      'medical_specialties', specialties_count,
      'equipment_manufacturers', manufacturers_count,
      'procedure_templates', templates_count,
      'procedure_categories', categories_count
    ),
    'expected_minimums', jsonb_build_object(
      'medical_specialties', 15,
      'equipment_manufacturers', 8,
      'procedure_templates', 5,
      'procedure_categories', 8
    ),
    'verification_status', CASE 
      WHEN specialties_count >= 15 AND 
           manufacturers_count >= 8 AND 
           templates_count >= 5 AND 
           categories_count >= 8 
      THEN 'PASS' 
      ELSE 'FAIL' 
    END,
    'sample_data', jsonb_build_object(
      'sample_specialties', (
        SELECT array_agg(nome) FROM (
          SELECT nome FROM public.especialidades_medicas WHERE ativo = true LIMIT 5
        ) s
      ),
      'sample_manufacturers', (
        SELECT array_agg(nome) FROM (
          SELECT nome FROM public.fabricantes_equipamento WHERE ativo = true LIMIT 5
        ) m
      ),
      'sample_templates', (
        SELECT array_agg(nome_template) FROM (
          SELECT nome_template FROM public.templates_procedimentos WHERE publico = true LIMIT 5
        ) t
      )
    )
  );
  
  -- Log verification results
  PERFORM public.log_evento_sistema(
    'reference_data_verification',
    'sistema',
    CASE WHEN (verification_result->>'verification_status') = 'PASS' THEN 'info' ELSE 'warning' END,
    'Reference data insertion verification completed',
    format('Reference data verification completed with status: %s', verification_result->>'verification_status'),
    verification_result
  );
  
  RETURN verification_result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Execute verification
SELECT public.verify_reference_data_insertion() AS reference_data_verification_results;

-- Clean up temporary function
DROP FUNCTION IF EXISTS public.insert_procedure_template(TEXT, tipo_procedimento, TEXT, TEXT, JSONB, JSONB, TEXT[], TEXT[], INTEGER, INTEGER);

-- =====================================================
-- COMPLETION VERIFICATION
-- =====================================================

-- Final verification
DO $
DECLARE
  specialties_count INTEGER;
  manufacturers_count INTEGER;
  templates_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO specialties_count FROM public.especialidades_medicas WHERE ativo = true;
  SELECT COUNT(*) INTO manufacturers_count FROM public.fabricantes_equipamento WHERE ativo = true;
  SELECT COUNT(*) INTO templates_count FROM public.templates_procedimentos WHERE publico = true;
  
  IF specialties_count >= 15 AND manufacturers_count >= 8 AND templates_count >= 5 THEN
    RAISE NOTICE 'Reference data insertion completed successfully:';
    RAISE NOTICE '- Medical specialties: % records', specialties_count;
    RAISE NOTICE '- Equipment manufacturers: % records', manufacturers_count;
    RAISE NOTICE '- Procedure templates: % records', templates_count;
    RAISE NOTICE 'Task 8.1 implementation completed successfully';
  ELSE
    RAISE EXCEPTION 'Reference data insertion incomplete:';
  END IF;
END $;

-- Add comment to track completion
COMMENT ON SCHEMA public IS 'Task 8.1 Reference data insertion completed - ' || now();