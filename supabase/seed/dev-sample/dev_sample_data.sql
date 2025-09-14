-- =====================================================
-- DADOS DE EXEMPLO PARA DESENVOLVIMENTO
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- AVISO: Este script contém dados fictícios para desenvolvimento
-- NÃO execute em ambiente de produção!

-- Log de início
DO $$ 
BEGIN 
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'INSERINDO DADOS DE EXEMPLO PARA DESENVOLVIMENTO';
  RAISE NOTICE 'AMBIENTE: DESENVOLVIMENTO APENAS';
  RAISE NOTICE 'Timestamp: %', now();
  RAISE NOTICE '=================================================';
END $$;

-- =====================================================
-- VERIFICAÇÃO DE SEGURANÇA
-- =====================================================

DO $$
BEGIN
  -- Verificar se não estamos em produção
  IF current_setting('server_version_num')::int >= 130000 AND 
     EXISTS (SELECT 1 FROM pg_database WHERE datname = current_database() AND datname ILIKE '%prod%') THEN
    RAISE EXCEPTION 'ERRO: Este script não pode ser executado em ambiente de produção!';
  END IF;
  
  RAISE NOTICE 'Verificação de segurança aprovada. Continuando...';
END $$;

-- =====================================================
-- 1. ORGANIZAÇÕES DE EXEMPLO
-- =====================================================

-- Inserir organizações fictícias
INSERT INTO public.organizacoes (
  id,
  nome,
  descricao,
  cnpj,
  site,
  telefone_principal,
  email_contato,
  endereco_principal,
  configuracoes,
  ativo
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  'Rede Bella Estética',
  'Rede de clínicas especializadas em harmonização facial e tratamentos estéticos',
  '12345678000195',
  'https://www.bellaestetica.com.br',
  '+5511999887766',
  'contato@bellaestetica.com.br',
  '{
    "logradouro": "Rua das Flores, 123",
    "cidade": "São Paulo", 
    "estado": "SP",
    "cep": "01234-567",
    "pais": "Brasil"
  }'::jsonb,
  '{
    "tema_cores": "#4F46E5",
    "logo_url": "/assets/logos/bella-logo.png",
    "timezone": "America/Sao_Paulo"
  }'::jsonb,
  true
),
(
  '22222222-2222-2222-2222-222222222222',
  'Grupo Estética Premium',
  'Clínicas premium com foco em medicina estética e dermatologia',
  '12345678000196',
  'https://www.esteticapremium.com.br',
  '+5511888776655',
  'contato@esteticapremium.com.br',
  '{
    "logradouro": "Av. Paulista, 1000",
    "cidade": "São Paulo",
    "estado": "SP", 
    "cep": "01310-100",
    "pais": "Brasil"
  }'::jsonb,
  '{
    "tema_cores": "#7C3AED",
    "logo_url": "/assets/logos/premium-logo.png",
    "timezone": "America/Sao_Paulo"
  }'::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  atualizado_em = now();

-- =====================================================
-- 2. CLÍNICAS DE EXEMPLO  
-- =====================================================

INSERT INTO public.clinicas (
  id,
  organizacao_id,
  nome,
  descricao,
  cnpj,
  endereco,
  telefone,
  email,
  horario_funcionamento,
  configuracoes_especificas,
  ativo
) VALUES 
-- Clínica 1 - Bella Estética Vila Olímpia
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'Bella Estética Vila Olímpia',
  'Clínica especializada em harmonização facial e procedimentos minimamente invasivos',
  '12345678000197',
  '{
    "logradouro": "Rua Funchal, 500",
    "bairro": "Vila Olímpia",
    "cidade": "São Paulo",
    "estado": "SP",
    "cep": "04551-060",
    "pais": "Brasil",
    "complemento": "Sala 1201"
  }'::jsonb,
  '+5511999887700',
  'vilaolimpia@bellaestetica.com.br',
  '{
    "segunda": {"inicio": "08:00", "fim": "18:00"},
    "terca": {"inicio": "08:00", "fim": "18:00"},
    "quarta": {"inicio": "08:00", "fim": "18:00"},
    "quinta": {"inicio": "08:00", "fim": "18:00"},
    "sexta": {"inicio": "08:00", "fim": "17:00"},
    "sabado": {"inicio": "08:00", "fim": "14:00"}
  }'::jsonb,
  '{
    "especialidades": ["harmonizacao_facial", "botox", "preenchimento"],
    "tem_estacionamento": true,
    "aceita_convenio": false
  }'::jsonb,
  true
),
-- Clínica 2 - Premium Jardins
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  'Estética Premium Jardins',
  'Clínica premium focada em tratamentos dermatológicos e estéticos avançados',
  '12345678000198',
  '{
    "logradouro": "Rua Augusta, 2000",
    "bairro": "Jardins",
    "cidade": "São Paulo",
    "estado": "SP",
    "cep": "01305-100", 
    "pais": "Brasil",
    "complemento": "Andar 3"
  }'::jsonb,
  '+5511888776600',
  'jardins@esteticapremium.com.br',
  '{
    "segunda": {"inicio": "07:00", "fim": "19:00"},
    "terca": {"inicio": "07:00", "fim": "19:00"},
    "quarta": {"inicio": "07:00", "fim": "19:00"},
    "quinta": {"inicio": "07:00", "fim": "19:00"},
    "sexta": {"inicio": "07:00", "fim": "18:00"},
    "sabado": {"inicio": "08:00", "fim": "15:00"}
  }'::jsonb,
  '{
    "especialidades": ["dermatologia", "laser", "peeling", "criolipolise"],
    "tem_estacionamento": true,
    "aceita_convenio": true
  }'::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  atualizado_em = now();

-- =====================================================
-- 3. SALAS DE CLÍNICAS
-- =====================================================

INSERT INTO public.salas_clinica (
  clinica_id,
  nome,
  tipo_sala,
  capacidade_maxima,
  equipamentos_fixos,
  status_atual,
  observacoes,
  ativo
) VALUES 
-- Salas da Clínica Bella Vila Olímpia
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sala 1 - Harmonização', 'procedimento', 2, ARRAY['maca_procedimento', 'luz_led', 'armario_insumos'], 'disponivel', 'Sala principal para procedimentos injetáveis', true),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sala 2 - Consultas', 'consultorio', 3, ARRAY['mesa_medico', 'cadeiras_espera', 'computador'], 'disponivel', 'Sala para consultas e avaliações', true),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sala 3 - Laser', 'laser', 2, ARRAY['equipamento_laser', 'maca_laser', 'exaustor'], 'disponivel', 'Sala equipada para tratamentos a laser', true),

-- Salas da Clínica Premium Jardins  
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Consultório Dr. Silva', 'consultorio', 4, ARRAY['mesa_medico', 'cadeiras_espera', 'dermoscopio'], 'disponivel', 'Consultório dermatológico principal', true),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Sala Procedimentos A', 'procedimento', 2, ARRAY['maca_procedimento', 'carrinho_insumos', 'lampada_led'], 'disponivel', 'Sala para procedimentos estéticos', true);

-- =====================================================
-- 4. USUÁRIOS E PERFIS DE EXEMPLO
-- =====================================================

-- Nota: Em um ambiente real, os usuários seriam criados via Supabase Auth
-- Aqui inserimos apenas os profiles assumindo que os IDs auth.users existem

INSERT INTO public.profiles (
  id,
  user_id,
  nome_completo,
  email,
  telefone,
  cpf,
  data_nascimento,
  endereco,
  ativo,
  primeiro_acesso,
  configuracoes_usuario
) VALUES 
(
  'usr-1111-1111-1111-111111111111',
  'usr-1111-1111-1111-111111111111', -- Super Admin
  'Administrador do Sistema',
  'admin@luxeflow.com.br',
  '+5511999000001',
  '12345678901',
  '1985-06-15',
  '{"logradouro": "Rua Admin, 100", "cidade": "São Paulo", "estado": "SP", "cep": "01000-000"}'::jsonb,
  true,
  false,
  '{"theme": "dark", "notifications": true}'::jsonb
),
(
  'usr-2222-2222-2222-222222222222',
  'usr-2222-2222-2222-222222222222', -- Proprietária Bella
  'Dra. Maria Silva',
  'maria.silva@bellaestetica.com.br',
  '+5511999000002', 
  '12345678902',
  '1982-03-20',
  '{"logradouro": "Rua das Rosas, 200", "cidade": "São Paulo", "estado": "SP", "cep": "04000-000"}'::jsonb,
  true,
  false,
  '{"theme": "light", "notifications": true}'::jsonb
),
(
  'usr-3333-3333-3333-333333333333',
  'usr-3333-3333-3333-333333333333', -- Médica Premium
  'Dra. Ana Santos',
  'ana.santos@esteticapremium.com.br',
  '+5511999000003',
  '12345678903',
  '1988-11-10',
  '{"logradouro": "Av. Principal, 300", "cidade": "São Paulo", "estado": "SP", "cep": "05000-000"}'::jsonb,
  true,
  false,
  '{"theme": "light", "notifications": true}'::jsonb
),
(
  'usr-4444-4444-4444-444444444444',
  'usr-4444-4444-4444-444444444444', -- Recepcionista
  'Julia Oliveira',
  'julia.oliveira@bellaestetica.com.br',
  '+5511999000004',
  '12345678904',
  '1995-07-25',
  '{"logradouro": "Rua Secundária, 400", "cidade": "São Paulo", "estado": "SP", "cep": "06000-000"}'::jsonb,
  true,
  false,
  '{"theme": "light", "notifications": true}'::jsonb
)
ON CONFLICT (user_id) DO UPDATE SET
  nome_completo = EXCLUDED.nome_completo,
  atualizado_em = now();

-- =====================================================
-- 5. ROLES DOS USUÁRIOS
-- =====================================================

INSERT INTO public.user_roles (
  user_id,
  organizacao_id,
  clinica_id,
  role,
  ativo,
  data_inicio,
  criado_por
) VALUES 
-- Super Admin
('usr-1111-1111-1111-111111111111', NULL, NULL, 'super_admin', true, CURRENT_DATE, 'usr-1111-1111-1111-111111111111'),

-- Proprietária da Bella Estética
('usr-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'proprietaria', true, CURRENT_DATE, 'usr-1111-1111-1111-111111111111'),

-- Médica da Premium Jardins
('usr-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'profissionais', true, CURRENT_DATE, 'usr-1111-1111-1111-111111111111'),

-- Recepcionista da Bella
('usr-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'recepcionistas', true, CURRENT_DATE, 'usr-2222-2222-2222-222222222222')
ON CONFLICT (user_id, organizacao_id, clinica_id, role) DO NOTHING;

-- =====================================================
-- 6. PROFISSIONAIS
-- =====================================================

INSERT INTO public.profissionais (
  user_id,
  especialidade_principal,
  numero_registro_profissional,
  orgao_emissor,
  data_validade_registro,
  biografia,
  tempo_experiencia_anos,
  procedimentos_realizados,
  valor_consulta_padrao,
  agenda_ativa,
  ativo
) VALUES 
(
  'usr-2222-2222-2222-222222222222',
  'Dermatologia Estética',
  'CRM123456',
  'CRM-SP',
  '2025-12-31',
  'Dermatologista especializada em harmonização facial com 15 anos de experiência',
  15,
  ARRAY['botox', 'preenchimento', 'harmonizacao_facial', 'peeling'],
  350.00,
  true,
  true
),
(
  'usr-3333-3333-3333-333333333333',
  'Medicina Estética',
  'CRM789012',
  'CRM-SP',
  '2026-06-30',
  'Médica especialista em tratamentos estéticos minimamente invasivos',
  8,
  ARRAY['laser', 'ipl', 'radiofrequencia', 'criolipolise'],
  300.00,
  true,
  true
)
ON CONFLICT (user_id) DO UPDATE SET
  especialidade_principal = EXCLUDED.especialidade_principal,
  atualizado_em = now();

-- =====================================================
-- 7. VINCULAÇÃO PROFISSIONAIS-CLÍNICAS
-- =====================================================

INSERT INTO public.clinica_profissionais (
  clinica_id,
  profissional_id,
  ativo,
  data_inicio,
  dias_atendimento,
  horario_inicio,
  horario_fim,
  observacoes
) VALUES 
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'usr-2222-2222-2222-222222222222',
  true,
  CURRENT_DATE,
  ARRAY['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
  '08:00:00',
  '18:00:00',
  'Proprietária e médica principal'
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'usr-3333-3333-3333-333333333333',
  true,
  CURRENT_DATE,
  ARRAY['terca', 'quinta', 'sabado'],
  '08:00:00',
  '17:00:00',
  'Médica especialista em laser'
)
ON CONFLICT (clinica_id, profissional_id) DO UPDATE SET
  ativo = EXCLUDED.ativo,
  atualizado_em = now();

-- =====================================================
-- 8. EQUIPAMENTOS DE EXEMPLO
-- =====================================================

INSERT INTO public.equipamentos (
  clinica_id,
  fabricante_id,
  nome,
  modelo,
  numero_serie,
  categoria,
  status_atual,
  data_aquisicao,
  valor_aquisicao,
  observacoes,
  ativo
) VALUES 
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  (SELECT id FROM public.fabricantes_equipamento WHERE nome = 'Ibramed' LIMIT 1),
  'Laser CO2 Fracionado',
  'Spectra XT',
  'IBR123456789',
  'laser',
  'funcionando',
  '2023-01-15',
  85000.00,
  'Equipamento principal para tratamentos de rejuvenescimento',
  true
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  (SELECT id FROM public.fabricantes_equipamento WHERE nome = 'Candela' LIMIT 1),
  'GentleMax Pro',
  'GentleMax Pro',
  'CND987654321',
  'laser',
  'funcionando',
  '2023-03-20',
  120000.00,
  'Laser para depilação e tratamentos vasculares',
  true
);

-- =====================================================
-- 9. PRODUTOS DE ESTOQUE
-- =====================================================

INSERT INTO public.produtos (
  clinica_id,
  nome,
  categoria,
  subcategoria,
  codigo_interno,
  codigo_barras,
  descricao,
  unidade_medida,
  estoque_atual,
  estoque_minimo,
  valor_unitario,
  fornecedor_principal,
  requer_receita,
  ativo
) VALUES 
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Toxina Botulínica Botox 100U',
  'medicamento',
  'toxina_botulinica',
  'BOT-100',
  '7891234567890',
  'Toxina botulínica tipo A para procedimentos estéticos',
  'frasco',
  15,
  5,
  850.00,
  'Allergan',
  true,
  true
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Ácido Hialurônico Juvederm 1ml',
  'medicamento',
  'preenchimento',
  'JUV-1ML',
  '7891234567891',
  'Gel de ácido hialurônico para preenchimento facial',
  'seringa',
  8,
  3,
  650.00,
  'Allergan',
  true,
  true
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Creme Anestésico Tópico 30g',
  'consumivel',
  'anestesia',
  'ANES-30',
  '7891234567892',
  'Creme anestésico para procedimentos estéticos',
  'tubo',
  20,
  5,
  45.00,
  'Eurofarma',
  false,
  true
);

-- =====================================================
-- 10. PRONTUÁRIOS DE EXEMPLO
-- =====================================================

-- Gerar alguns prontuários fictícios
DO $$
DECLARE
  clinica_bella_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  clinica_premium_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  medica_bella_id UUID := 'usr-2222-2222-2222-222222222222';
  medica_premium_id UUID := 'usr-3333-3333-3333-333333333333';
BEGIN
  -- Prontuários da Clínica Bella
  INSERT INTO public.prontuarios (
    id,
    clinica_id,
    profissional_id,
    paciente_nome_completo,
    paciente_data_nascimento,
    paciente_cpf,
    paciente_telefone,
    paciente_email,
    anamnese_geral,
    historico_familiar,
    medicamentos_uso,
    alergias_conhecidas,
    status_prontuario,
    ativo
  ) VALUES 
  (
    gen_random_uuid(),
    clinica_bella_id,
    medica_bella_id,
    'Ana Clara Santos',
    '1990-05-15',
    '12345678901',
    '+5511987654321',
    'ana.clara@email.com',
    'Paciente deseja harmonização facial, foco em região dos lábios e malar',
    'Sem histórico familiar relevante para procedimentos estéticos',
    'Anticoncepcional oral',
    'Nenhuma alergia conhecida',
    'ativo',
    true
  ),
  (
    gen_random_uuid(),
    clinica_bella_id,
    medica_bella_id,
    'Roberto Silva Oliveira',
    '1985-08-22',
    '12345678902',
    '+5511987654322',
    'roberto.silva@email.com',
    'Paciente masculino, rugas de expressão na testa e região periorbital',
    'Pai com calvície precoce',
    'Não faz uso de medicamentos regulares',
    'Alergia a dipirona',
    'ativo',
    true
  ),
  (
    gen_random_uuid(),
    clinica_premium_id,
    medica_premium_id,
    'Carla Fernanda Costa',
    '1988-12-03',
    '12345678903',
    '+5511987654323',
    'carla.fernanda@email.com',
    'Melasma facial, deseja tratamento com laser',
    'Mãe com melasma',
    'Vitamina D',
    'Não possui alergias',
    'ativo',
    true
  );
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

DO $$
DECLARE
  org_count INTEGER;
  clinic_count INTEGER;
  user_count INTEGER;
  role_count INTEGER;
  prof_count INTEGER;
  equip_count INTEGER;
  prod_count INTEGER;
  prontuario_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO org_count FROM public.organizacoes WHERE ativo = true;
  SELECT COUNT(*) INTO clinic_count FROM public.clinicas WHERE ativo = true;
  SELECT COUNT(*) INTO user_count FROM public.profiles WHERE ativo = true;
  SELECT COUNT(*) INTO role_count FROM public.user_roles WHERE ativo = true;
  SELECT COUNT(*) INTO prof_count FROM public.profissionais WHERE ativo = true;
  SELECT COUNT(*) INTO equip_count FROM public.equipamentos WHERE ativo = true;
  SELECT COUNT(*) INTO prod_count FROM public.produtos WHERE ativo = true;
  SELECT COUNT(*) INTO prontuario_count FROM public.prontuarios WHERE ativo = true;
  
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'DADOS DE EXEMPLO INSERIDOS COM SUCESSO:';
  RAISE NOTICE '- Organizações: %', org_count;
  RAISE NOTICE '- Clínicas: %', clinic_count;
  RAISE NOTICE '- Usuários/Perfis: %', user_count;
  RAISE NOTICE '- Roles de usuário: %', role_count;
  RAISE NOTICE '- Profissionais: %', prof_count;
  RAISE NOTICE '- Equipamentos: %', equip_count;
  RAISE NOTICE '- Produtos em estoque: %', prod_count;
  RAISE NOTICE '- Prontuários: %', prontuario_count;
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'AMBIENTE DE DESENVOLVIMENTO PRONTO PARA USO!';
  RAISE NOTICE '=================================================';
END $$;