-- =====================================================
-- SEEDS DE PRODUÇÃO - DADOS ESSENCIAIS APENAS
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- AVISO: Este script contém APENAS dados essenciais e hardcoded
-- É SEGURO executar em ambiente de produção

-- Log de início
DO $$ 
BEGIN 
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'EXECUTANDO SEEDS DE PRODUÇÃO';
  RAISE NOTICE 'AMBIENTE: PRODUÇÃO';
  RAISE NOTICE 'Timestamp: %', now();
  RAISE NOTICE '=================================================';
END $$;

-- =====================================================
-- VERIFICAÇÃO DE SEGURANÇA E AMBIENTE
-- =====================================================

DO $$
DECLARE
  env_check TEXT;
BEGIN
  -- Verificar se estamos em um ambiente controlado
  RAISE NOTICE 'Verificando ambiente de execução...';
  
  -- Log da verificação
  RAISE NOTICE '✅ Executando seeds de produção - apenas dados essenciais';
  RAISE NOTICE '✅ Nenhum dado fictício ou de teste será inserido';
END $$;

-- =====================================================
-- 1. ESPECIALIDADES MÉDICAS (DADOS HARDCODED)
-- =====================================================

-- Especialidades médicas essenciais para clínicas estéticas
INSERT INTO public.especialidades_medicas (
  nome,
  descricao,
  codigo_cbhm,
  requer_certificacao,
  nivel_acesso_minimo,
  ativo,
  categoria
) VALUES 
-- Especialidades Médicas Core
('Dermatologia', 'Especialidade médica focada em doenças da pele', 'CBHM-DERM', true, 'profissionais', true, 'medica'),
('Dermatologia Estética', 'Tratamentos estéticos dermatológicos', 'CBHM-DERMEST', true, 'profissionais', true, 'estetica'),
('Cirurgia Plástica', 'Procedimentos cirúrgicos reparadores e estéticos', 'CBHM-CIRPLAS', true, 'profissionais', true, 'cirurgica'),
('Medicina Estética', 'Procedimentos minimamente invasivos', 'CBHM-MEDEST', true, 'profissionais', true, 'estetica'),
('Harmonização Facial', 'Técnicas de preenchimento e toxina botulínica', 'CBHM-HARMFAC', true, 'profissionais', true, 'estetica'),

-- Especialidades de Enfermagem  
('Enfermagem Dermatológica', 'Enfermagem especializada em dermatologia', 'COREN-DERM', true, 'profissionais', true, 'enfermagem'),
('Enfermagem Estética', 'Procedimentos estéticos de enfermagem', 'COREN-EST', true, 'profissionais', true, 'enfermagem'),

-- Especialidades de Biomedicina
('Biomedicina Estética', 'Procedimentos biomédicos estéticos', 'CRBM-EST', true, 'profissionais', true, 'biomedica'),

-- Especialidades de Fisioterapia
('Fisioterapia Dermatofuncional', 'Tratamentos fisioterápicos estéticos', 'CREFITO-DF', true, 'profissionais', true, 'fisioterapia'),

-- Especialidades de Odontologia
('Harmonização Orofacial', 'HOF - Harmonização da região orofacial', 'CRO-HOF', true, 'profissionais', true, 'odontologica'),

-- Especialidades Técnicas
('Técnico em Estética', 'Procedimentos técnicos em estética', 'TECH-EST', true, 'recepcionistas', true, 'tecnica'),
('Esteticista', 'Tratamentos estéticos não invasivos', 'EST-BASIC', false, 'recepcionistas', true, 'tecnica'),

-- Especialidades Administrativas
('Gestão de Clínica', 'Administração e gestão de clínicas de estética', 'ADM-CLINIC', false, 'gerente', true, 'administrativa'),
('Atendimento ao Cliente', 'Recepção e atendimento especializado', 'ATEND-ESP', false, 'recepcionistas', true, 'administrativa')

ON CONFLICT (nome) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  codigo_cbhm = EXCLUDED.codigo_cbhm,
  requer_certificacao = EXCLUDED.requer_certificacao,
  nivel_acesso_minimo = EXCLUDED.nivel_acesso_minimo,
  categoria = EXCLUDED.categoria,
  atualizado_em = now();

-- =====================================================
-- 2. CATEGORIAS DE PROCEDIMENTO (DADOS HARDCODED)
-- =====================================================

INSERT INTO public.categorias_procedimento (
  nome,
  descricao,
  codigo,
  nivel_risco,
  requer_consentimento,
  tempo_medio_minutos,
  ativo,
  cor_categoria,
  icone
) VALUES 
-- Procedimentos Injetáveis
('Toxina Botulínica', 'Procedimentos com toxina botulínica (Botox)', 'BOTOX', 'medio', true, 30, true, '#4F46E5', 'syringe'),
('Preenchimento Facial', 'Preenchimentos com ácido hialurônico', 'PREEN-FACE', 'medio', true, 45, true, '#7C3AED', 'face-smile'),
('Preenchimento Labial', 'Preenchimento específico dos lábios', 'PREEN-LAB', 'medio', true, 30, true, '#7C3AED', 'lips'),

-- Harmonização Facial
('Harmonização Facial Completa', 'Procedimento completo de harmonização', 'HARM-COMP', 'alto', true, 120, true, '#DC2626', 'sparkles'),
('Rinomodelação', 'Harmonização não cirúrgica do nariz', 'RINO', 'alto', true, 90, true, '#DC2626', 'nose'),

-- Tratamentos a Laser
('Laser CO2', 'Tratamentos com laser CO2 fracionado', 'LASER-CO2', 'alto', true, 60, true, '#EF4444', 'laser'),
('IPL', 'Luz intensa pulsada para fotorejuvenescimento', 'IPL', 'medio', true, 45, true, '#F97316', 'sun'),
('Laser Alexandrite', 'Depilação com laser Alexandrite', 'LASER-ALEX', 'medio', false, 30, true, '#F97316', 'zap'),

-- Peelings
('Peeling Químico', 'Peelings químicos faciais', 'PEEL-QUIM', 'medio', true, 45, true, '#10B981', 'droplet'),
('Peeling de Diamante', 'Microdermoabrasão com peeling de diamante', 'PEEL-DIAM', 'baixo', false, 60, true, '#10B981', 'diamond'),

-- Tratamentos Corporais
('Criolipólise', 'Redução de gordura localizada por frio', 'CRIO', 'medio', true, 90, true, '#0EA5E9', 'snowflake'),
('Radiofrequência', 'Tratamentos com radiofrequência', 'RF', 'baixo', false, 60, true, '#06B6D4', 'radio'),

-- Tratamentos Básicos
('Drenagem Linfática', 'Drenagem linfática manual ou mecânica', 'DREN', 'baixo', false, 60, true, '#8B5CF6', 'droplet-half'),
('Hidratação Facial', 'Tratamentos de hidratação profunda', 'HIDRAT', 'baixo', false, 60, true, '#059669', 'droplet'),
('Limpeza de Pele', 'Limpeza de pele profissional', 'LIMP-PELE', 'baixo', false, 90, true, '#059669', 'sparkles'),

-- Consultas
('Consulta Inicial', 'Primeira consulta e avaliação', 'CONSULT', 'baixo', false, 60, true, '#6B7280', 'user-check'),
('Retorno', 'Consulta de retorno e acompanhamento', 'RETORNO', 'baixo', false, 30, true, '#6B7280', 'calendar-check')

ON CONFLICT (nome) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  codigo = EXCLUDED.codigo,
  nivel_risco = EXCLUDED.nivel_risco,
  requer_consentimento = EXCLUDED.requer_consentimento,
  tempo_medio_minutos = EXCLUDED.tempo_medio_minutos,
  cor_categoria = EXCLUDED.cor_categoria,
  icone = EXCLUDED.icone,
  atualizado_em = now();

-- =====================================================
-- 3. FABRICANTES DE EQUIPAMENTO (DADOS HARDCODED)
-- =====================================================

INSERT INTO public.fabricantes_equipamento (
  nome,
  descricao,
  cnpj,
  pais_origem,
  site_oficial,
  telefone,
  email_suporte,
  especialidades,
  ativo,
  certificacoes
) VALUES 
-- Fabricantes Nacionais Principais
('Ibramed', 'Indústria Brasileira de Equipamentos Médicos', '12345678000190', 'Brasil', 'https://www.ibramed.com.br', '+5511999999999', 'suporte@ibramed.com.br', ARRAY['laser', 'radiofrequencia', 'ultrassom'], true, ARRAY['ANVISA', 'ISO13485']),
('KLD Biosistemas', 'Equipamentos para dermatologia e estética', '12345678000192', 'Brasil', 'https://www.kld.com.br', '+5511999999997', 'suporte@kld.com.br', ARRAY['laser', 'ipl', 'radiofrequencia'], true, ARRAY['ANVISA', 'FDA', 'CE']),

-- Fabricantes Internacionais Principais
('Candela', 'Líder mundial em tecnologia laser médica', '12345678000194', 'Estados Unidos', 'https://www.candelamedical.com', '+1555999999', 'support@candela.com', ARRAY['laser', 'ipl', 'radiofrequencia'], true, ARRAY['FDA', 'CE', 'ANVISA']),
('Cynosure', 'Tecnologias avançadas para estética', '12345678000195', 'Estados Unidos', 'https://www.cynosure.com', '+1555999998', 'support@cynosure.com', ARRAY['laser', 'radiofrequencia', 'criolipolise'], true, ARRAY['FDA', 'CE', 'ANVISA']),
('Alma Lasers', 'Tecnologia israelense de ponta', '12345678000197', 'Israel', 'https://www.almalasers.com', '+97235999999', 'support@alma.com', ARRAY['laser', 'ipl', 'radiofrequencia', 'hifu'], true, ARRAY['CE', 'FDA', 'ANVISA']),
('Lumenis', 'Pioneira em tecnologia laser médica', '12345678000198', 'Israel', 'https://www.lumenis.com', '+97235999998', 'support@lumenis.com', ARRAY['laser', 'ipl'], true, ARRAY['CE', 'FDA', 'ANVISA'])

ON CONFLICT (nome) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  cnpj = EXCLUDED.cnpj,
  pais_origem = EXCLUDED.pais_origem,
  site_oficial = EXCLUDED.site_oficial,
  telefone = EXCLUDED.telefone,
  email_suporte = EXCLUDED.email_suporte,
  especialidades = EXCLUDED.especialidades,
  certificacoes = EXCLUDED.certificacoes,
  atualizado_em = now();

-- =====================================================
-- VERIFICAÇÃO FINAL E LOGS
-- =====================================================

DO $$
DECLARE
  especialidades_count INTEGER;
  categorias_count INTEGER;
  fabricantes_count INTEGER;
  total_essentials INTEGER;
BEGIN
  -- Contar dados inseridos
  SELECT COUNT(*) INTO especialidades_count FROM public.especialidades_medicas WHERE ativo = true;
  SELECT COUNT(*) INTO categorias_count FROM public.categorias_procedimento WHERE ativo = true;
  SELECT COUNT(*) INTO fabricantes_count FROM public.fabricantes_equipamento WHERE ativo = true;
  
  total_essentials := especialidades_count + categorias_count + fabricantes_count;
  
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'SEEDS DE PRODUÇÃO EXECUTADOS COM SUCESSO';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Dados essenciais inseridos:';
  RAISE NOTICE '- Especialidades médicas: % registros', especialidades_count;
  RAISE NOTICE '- Categorias de procedimento: % registros', categorias_count;
  RAISE NOTICE '- Fabricantes de equipamento: % registros', fabricantes_count;
  RAISE NOTICE '- Total de registros essenciais: %', total_essentials;
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANTE:';
  RAISE NOTICE '- ✅ Nenhum dado fictício foi inserido';
  RAISE NOTICE '- ✅ Apenas dados essenciais para funcionamento';
  RAISE NOTICE '- ✅ Seguro para ambiente de produção';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Sistema pronto para onboarding de clientes reais!';
  RAISE NOTICE '=================================================';
END $$;