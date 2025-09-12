-- =====================================================
-- SAMPLE OPERATIONAL DATA
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- This script inserts sample operational data according to task 8.3:
-- - Create sample products and suppliers
-- - Create sample equipment with maintenance records
-- - Create sample medical records and sessions

-- =====================================================
-- SAMPLE SUPPLIERS
-- =====================================================

-- Function to safely insert sample suppliers
CREATE OR REPLACE FUNCTION public.insert_sample_supplier(
  p_nome TEXT,
  p_razao_social TEXT,
  p_cnpj TEXT,
  p_endereco JSONB,
  p_especialidades TEXT[],
  p_produtos_principais TEXT[]
)
RETURNS UUID AS $
DECLARE
  supplier_id UUID;
BEGIN
  INSERT INTO public.fornecedores (
    nome,
    razao_social,
    cnpj,
    endereco,
    telefone_principal,
    email_contato,
    website,
    especialidades,
    produtos_principais,
    condicoes_pagamento,
    prazo_entrega_dias,
    avaliacao,
    ativo
  ) VALUES (
    p_nome,
    p_razao_social,
    p_cnpj,
    p_endereco,
    (p_endereco->>'telefone')::TEXT,
    (p_endereco->>'email')::TEXT,
    (p_endereco->>'website')::TEXT,
    p_especialidades,
    p_produtos_principais,
    '30/60 dias',
    7,
    4,
    true
  ) 
  ON CONFLICT (cnpj) DO UPDATE SET
    nome = EXCLUDED.nome,
    endereco = EXCLUDED.endereco,
    especialidades = EXCLUDED.especialidades,
    produtos_principais = EXCLUDED.produtos_principais
  RETURNING id INTO supplier_id;
  
  RETURN supplier_id;
END;
$ LANGUAGE plpgsql;

-- Insert sample suppliers
DO $
DECLARE
  supplier_allergan_id UUID;
  supplier_galderma_id UUID;
  supplier_merz_id UUID;
  supplier_cosmeticos_id UUID;
  supplier_equipamentos_id UUID;
BEGIN
  -- Allergan (Botox, Juvederm)
  SELECT public.insert_sample_supplier(
    'Allergan Brasil',
    'Allergan Produtos Farmacêuticos Ltda',
    '11.222.333/0001-44',
    '{
      "endereco": "Av. Marginal Pinheiros, 7000",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "05465-100",
      "telefone": "(11) 3456-1000",
      "email": "vendas@allergan.com.br",
      "website": "https://www.allergan.com.br"
    }',
    ARRAY['Toxina botulínica', 'Preenchimentos', 'Bioestimuladores'],
    ARRAY['Botox', 'Juvederm Ultra', 'Juvederm Voluma', 'Juvederm Volift']
  ) INTO supplier_allergan_id;
  
  -- Galderma (Restylane, Sculptra)
  SELECT public.insert_sample_supplier(
    'Galderma Brasil',
    'Galderma Brasil Ltda',
    '22.333.444/0001-55',
    '{
      "endereco": "Rua Alexandre Dumas, 1900",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "04717-004",
      "telefone": "(11) 3456-2000",
      "email": "vendas@galderma.com.br",
      "website": "https://www.galderma.com.br"
    }',
    ARRAY['Preenchimentos', 'Bioestimuladores', 'Skincare'],
    ARRAY['Restylane', 'Sculptra', 'Belotero', 'Cetaphil']
  ) INTO supplier_galderma_id;
  
  -- Merz (Radiesse, Ultherapy)
  SELECT public.insert_sample_supplier(
    'Merz Aesthetics',
    'Merz Pharma Brasil Ltda',
    '33.444.555/0001-66',
    '{
      "endereco": "Av. das Nações Unidas, 14401",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "04794-000",
      "telefone": "(11) 3456-3000",
      "email": "vendas@merz.com.br",
      "website": "https://www.merz.com.br"
    }',
    ARRAY['Bioestimuladores', 'Preenchimentos', 'Tecnologias'],
    ARRAY['Radiesse', 'Belotero Balance', 'Ultherapy']
  ) INTO supplier_merz_id;
  
  -- Cosméticos e Produtos
  SELECT public.insert_sample_supplier(
    'Adcos Cosméticos',
    'Adcos Cosméticos Ltda',
    '44.555.666/0001-77',
    '{
      "endereco": "Rua Vergueiro, 3185",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "04101-300",
      "telefone": "(11) 3456-4000",
      "email": "vendas@adcos.com.br",
      "website": "https://www.adcos.com.br"
    }',
    ARRAY['Cosméticos', 'Peelings', 'Skincare'],
    ARRAY['Ácido Glicólico', 'Ácido Salicílico', 'Vitamina C', 'Protetor Solar']
  ) INTO supplier_cosmeticos_id;
  
  -- Equipamentos e Materiais
  SELECT public.insert_sample_supplier(
    'MedSupply Brasil',
    'MedSupply Equipamentos Médicos Ltda',
    '55.666.777/0001-88',
    '{
      "endereco": "Av. Paulista, 2500",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "01311-300",
      "telefone": "(11) 3456-5000",
      "email": "vendas@medsupply.com.br",
      "website": "https://www.medsupply.com.br"
    }',
    ARRAY['Materiais médicos', 'Descartáveis', 'Equipamentos'],
    ARRAY['Seringas', 'Agulhas', 'Cânulas', 'Luvas', 'Máscaras']
  ) INTO supplier_equipamentos_id;
  
  RAISE NOTICE 'Sample suppliers created successfully';
END $;

-- =====================================================
-- SAMPLE PRODUCTS
-- =====================================================

-- Function to safely insert sample products
CREATE OR REPLACE FUNCTION public.insert_sample_product(
  p_nome TEXT,
  p_categoria TEXT,
  p_subcategoria TEXT,
  p_fornecedor_id UUID,
  p_codigo_barras TEXT,
  p_preco_custo DECIMAL,
  p_preco_venda DECIMAL,
  p_estoque_minimo INTEGER,
  p_estoque_atual INTEGER,
  p_unidade_medida TEXT,
  p_especificacoes JSONB DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  product_id UUID;
BEGIN
  INSERT INTO public.produtos (
    nome,
    categoria,
    subcategoria,
    fornecedor_id,
    codigo_barras,
    preco_custo,
    preco_venda,
    margem_lucro,
    estoque_minimo,
    estoque_atual,
    unidade_medida,
    especificacoes,
    ativo,
    controlado
  ) VALUES (
    p_nome,
    p_categoria,
    p_subcategoria,
    p_fornecedor_id,
    p_codigo_barras,
    p_preco_custo,
    p_preco_venda,
    ROUND(((p_preco_venda - p_preco_custo) / p_preco_custo * 100)::NUMERIC, 2),
    p_estoque_minimo,
    p_estoque_atual,
    p_unidade_medida,
    p_especificacoes,
    true,
    p_categoria = 'medicamento'
  ) 
  ON CONFLICT (codigo_barras) DO UPDATE SET
    nome = EXCLUDED.nome,
    preco_custo = EXCLUDED.preco_custo,
    preco_venda = EXCLUDED.preco_venda,
    estoque_atual = EXCLUDED.estoque_atual
  RETURNING id INTO product_id;
  
  RETURN product_id;
END;
$ LANGUAGE plpgsql;

-- Insert sample products
DO $
DECLARE
  supplier_allergan_id UUID;
  supplier_galderma_id UUID;
  supplier_merz_id UUID;
  supplier_cosmeticos_id UUID;
  supplier_equipamentos_id UUID;
  product_id UUID;
BEGIN
  -- Get supplier IDs
  SELECT id INTO supplier_allergan_id FROM public.fornecedores WHERE cnpj = '11.222.333/0001-44';
  SELECT id INTO supplier_galderma_id FROM public.fornecedores WHERE cnpj = '22.333.444/0001-55';
  SELECT id INTO supplier_merz_id FROM public.fornecedores WHERE cnpj = '33.444.555/0001-66';
  SELECT id INTO supplier_cosmeticos_id FROM public.fornecedores WHERE cnpj = '44.555.666/0001-77';
  SELECT id INTO supplier_equipamentos_id FROM public.fornecedores WHERE cnpj = '55.666.777/0001-88';
  
  -- Allergan Products
  SELECT public.insert_sample_product(
    'Botox 100U',
    'medicamento',
    'toxina_botulinica',
    supplier_allergan_id,
    '7891234567890',
    850.00,
    1200.00,
    5,
    15,
    'frasco',
    '{"concentracao": "100U", "diluicao_recomendada": "2.5ml", "validade_meses": 36}'
  ) INTO product_id;
  
  SELECT public.insert_sample_product(
    'Juvederm Ultra Plus 1ml',
    'medicamento',
    'preenchimento',
    supplier_allergan_id,
    '7891234567891',
    450.00,
    650.00,
    3,
    12,
    'seringa',
    '{"volume": "1ml", "concentracao_ha": "24mg/ml", "lidocaina": true}'
  ) INTO product_id;
  
  SELECT public.insert_sample_product(
    'Juvederm Voluma 1ml',
    'medicamento',
    'preenchimento',
    supplier_allergan_id,
    '7891234567892',
    520.00,
    750.00,
    2,
    8,
    'seringa',
    '{"volume": "1ml", "concentracao_ha": "20mg/ml", "lidocaina": true, "indicacao": "volume_facial"}'
  ) INTO product_id;
  
  -- Galderma Products
  SELECT public.insert_sample_product(
    'Restylane 1ml',
    'medicamento',
    'preenchimento',
    supplier_galderma_id,
    '7891234567893',
    420.00,
    600.00,
    3,
    10,
    'seringa',
    '{"volume": "1ml", "concentracao_ha": "20mg/ml", "lidocaina": false}'
  ) INTO product_id;
  
  SELECT public.insert_sample_product(
    'Sculptra 5ml',
    'medicamento',
    'bioestimulador',
    supplier_galderma_id,
    '7891234567894',
    1200.00,
    1800.00,
    2,
    6,
    'frasco',
    '{"volume": "5ml", "principio_ativo": "acido_polilactico", "reconstituicao": "necessaria"}'
  ) INTO product_id;
  
  -- Merz Products
  SELECT public.insert_sample_product(
    'Radiesse 1.5ml',
    'medicamento',
    'bioestimulador',
    supplier_merz_id,
    '7891234567895',
    680.00,
    950.00,
    2,
    8,
    'seringa',
    '{"volume": "1.5ml", "principio_ativo": "hidroxiapatita_calcio", "lidocaina": true}'
  ) INTO product_id;
  
  -- Cosmetics Products
  SELECT public.insert_sample_product(
    'Ácido Glicólico 70%',
    'cosmetico',
    'peeling',
    supplier_cosmeticos_id,
    '7891234567896',
    45.00,
    80.00,
    10,
    25,
    'frasco',
    '{"concentracao": "70%", "ph": "0.5", "volume": "30ml"}'
  ) INTO product_id;
  
  SELECT public.insert_sample_product(
    'Vitamina C 20%',
    'cosmetico',
    'antioxidante',
    supplier_cosmeticos_id,
    '7891234567897',
    35.00,
    65.00,
    15,
    30,
    'frasco',
    '{"concentracao": "20%", "forma": "acido_ascorbico", "volume": "30ml"}'
  ) INTO product_id;
  
  -- Medical Supplies
  SELECT public.insert_sample_product(
    'Seringa 1ml',
    'material_medico',
    'descartavel',
    supplier_equipamentos_id,
    '7891234567898',
    2.50,
    4.00,
    100,
    500,
    'unidade',
    '{"volume": "1ml", "agulha_inclusa": false, "esteril": true}'
  ) INTO product_id;
  
  SELECT public.insert_sample_product(
    'Agulha 30G',
    'material_medico',
    'descartavel',
    supplier_equipamentos_id,
    '7891234567899',
    0.80,
    1.50,
    200,
    800,
    'unidade',
    '{"calibre": "30G", "comprimento": "13mm", "esteril": true}'
  ) INTO product_id;
  
  SELECT public.insert_sample_product(
    'Cânula 25G',
    'material_medico',
    'descartavel',
    supplier_equipamentos_id,
    '7891234567800',
    8.50,
    15.00,
    50,
    150,
    'unidade',
    '{"calibre": "25G", "comprimento": "50mm", "ponta_romba": true}'
  ) INTO product_id;
  
  RAISE NOTICE 'Sample products created successfully';
END $;

-- =====================================================
-- SAMPLE EQUIPMENT
-- =====================================================

-- Function to safely insert sample equipment
CREATE OR REPLACE FUNCTION public.insert_sample_equipment(
  p_nome TEXT,
  p_modelo TEXT,
  p_numero_serie TEXT,
  p_tipo tipo_equipamento,
  p_fabricante_id UUID,
  p_clinica_id UUID,
  p_valor_compra DECIMAL,
  p_data_compra DATE,
  p_especificacoes JSONB DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  equipment_id UUID;
  maintenance_id UUID;
BEGIN
  INSERT INTO public.equipamentos (
    nome,
    modelo,
    numero_serie,
    tipo,
    fabricante_id,
    clinica_id,
    valor_compra,
    valor_atual,
    data_compra,
    voltagem,
    potencia,
    status,
    proxima_manutencao,
    intervalo_manutencao_dias,
    horas_uso,
    ciclos_uso,
    ativo
  ) VALUES (
    p_nome,
    p_modelo,
    p_numero_serie,
    p_tipo,
    p_fabricante_id,
    p_clinica_id,
    p_valor_compra,
    p_valor_compra * 0.8, -- Depreciação de 20%
    p_data_compra,
    '220V',
    (p_especificacoes->>'potencia')::TEXT,
    'ativo',
    p_data_compra + INTERVAL '90 days',
    90,
    FLOOR(RANDOM() * 500)::INTEGER, -- Horas de uso aleatórias
    FLOOR(RANDOM() * 1000)::INTEGER, -- Ciclos aleatórios
    true
  ) 
  ON CONFLICT (numero_serie) DO UPDATE SET
    nome = EXCLUDED.nome,
    modelo = EXCLUDED.modelo,
    valor_atual = EXCLUDED.valor_atual
  RETURNING id INTO equipment_id;
  
  -- Create sample maintenance record
  INSERT INTO public.manutencoes_equipamento (
    equipamento_id,
    tipo,
    data_agendada,
    data_realizada,
    descricao,
    procedimentos_realizados,
    custo,
    resultado_manutencao,
    status,
    criado_por
  ) VALUES (
    equipment_id,
    'preventiva',
    p_data_compra + INTERVAL '30 days',
    p_data_compra + INTERVAL '32 days',
    'Manutenção preventiva inicial pós-instalação',
    ARRAY['Calibração inicial', 'Teste de funcionamento', 'Limpeza interna'],
    350.00,
    'sucesso',
    'realizada',
    (SELECT id FROM public.profiles LIMIT 1) -- Use first available user
  ) RETURNING id INTO maintenance_id;
  
  RETURN equipment_id;
END;
$ LANGUAGE plpgsql;

-- Insert sample equipment
DO $
DECLARE
  fabricante_alma_id UUID;
  fabricante_inmode_id UUID;
  fabricante_ibramed_id UUID;
  clinic_bp_jardins_id UUID;
  clinic_bp_moema_id UUID;
  clinic_cu_itaim_id UUID;
  equipment_id UUID;
BEGIN
  -- Get manufacturer and clinic IDs
  SELECT id INTO fabricante_alma_id FROM public.fabricantes_equipamento WHERE nome = 'Alma Lasers';
  SELECT id INTO fabricante_inmode_id FROM public.fabricantes_equipamento WHERE nome = 'InMode';
  SELECT id INTO fabricante_ibramed_id FROM public.fabricantes_equipamento WHERE nome = 'Ibramed';
  
  SELECT id INTO clinic_bp_jardins_id FROM public.clinicas WHERE cnpj = '12.345.678/0002-71';
  SELECT id INTO clinic_bp_moema_id FROM public.clinicas WHERE cnpj = '12.345.678/0003-52';
  SELECT id INTO clinic_cu_itaim_id FROM public.clinicas WHERE cnpj = '34.567.890/0002-93';
  
  -- Beleza Premium Jardins Equipment
  SELECT public.insert_sample_equipment(
    'Laser CO2 Fracionado',
    'Pixel CO2',
    'ALMA2023001',
    'laser_fracionado',
    fabricante_alma_id,
    clinic_bp_jardins_id,
    180000.00,
    '2023-01-15',
    '{"potencia": "30W", "comprimento_onda": "10600nm", "modo": "fracionado"}'
  ) INTO equipment_id;
  
  SELECT public.insert_sample_equipment(
    'Laser Diodo Depilação',
    'Soprano ICE',
    'ALMA2023002',
    'laser_diodo',
    fabricante_alma_id,
    clinic_bp_jardins_id,
    120000.00,
    '2023-02-20',
    '{"potencia": "2000W", "comprimento_onda": "755nm/808nm/1064nm", "cooling": "contato"}'
  ) INTO equipment_id;
  
  -- Beleza Premium Moema Equipment
  SELECT public.insert_sample_equipment(
    'Radiofrequência Morpheus8',
    'Morpheus8',
    'INMODE2023001',
    'radiofrequencia',
    fabricante_inmode_id,
    clinic_bp_moema_id,
    95000.00,
    '2023-03-10',
    '{"frequencia": "1MHz", "profundidade": "4mm", "microagulhas": true}'
  ) INTO equipment_id;
  
  SELECT public.insert_sample_equipment(
    'Criolipólise CoolSculpting',
    'CoolSculpting Elite',
    'INMODE2023002',
    'criolipolise',
    fabricante_inmode_id,
    clinic_bp_moema_id,
    150000.00,
    '2023-04-05',
    '{"temperatura": "-11C", "aplicadores": "multiplos", "tempo_sessao": "35min"}'
  ) INTO equipment_id;
  
  -- Clínicas Unidas Itaim Equipment
  SELECT public.insert_sample_equipment(
    'Ultrassom Microfocado',
    'Ultraformer III',
    'IBRAMED2023001',
    'ultrassom_microfocado',
    fabricante_ibramed_id,
    clinic_cu_itaim_id,
    85000.00,
    '2023-05-15',
    '{"frequencia": "4MHz", "profundidade": "1.5-4.5mm", "cartuchos": "multiplos"}'
  ) INTO equipment_id;
  
  SELECT public.insert_sample_equipment(
    'Laser Nd:YAG Vascular',
    'Harmony XL Pro',
    'ALMA2023003',
    'laser_nd_yag',
    fabricante_alma_id,
    clinic_cu_itaim_id,
    110000.00,
    '2023-06-20',
    '{"comprimento_onda": "1064nm", "spot_size": "2-10mm", "cooling": "criogen"}'
  ) INTO equipment_id;
  
  RAISE NOTICE 'Sample equipment created successfully';
END $;

-- =====================================================
-- SAMPLE MEDICAL RECORDS AND SESSIONS
-- =====================================================

-- Function to create sample medical records
CREATE OR REPLACE FUNCTION public.create_sample_medical_record(
  p_clinica_id UUID,
  p_profissional_id UUID,
  p_nome_paciente TEXT,
  p_data_nascimento DATE,
  p_telefone TEXT,
  p_email TEXT,
  p_queixa_principal TEXT,
  p_historico_medico TEXT[]
)
RETURNS UUID AS $
DECLARE
  prontuario_id UUID;
  numero_prontuario TEXT;
  session_id UUID;
  image_id UUID;
BEGIN
  -- Generate medical record number
  SELECT public.gerar_numero_prontuario(p_clinica_id) INTO numero_prontuario;
  
  -- Create medical record
  INSERT INTO public.prontuarios (
    numero_prontuario,
    clinica_id,
    nome_paciente,
    data_nascimento,
    telefone,
    email,
    queixa_principal,
    historico_medico,
    alergias,
    medicamentos_uso,
    observacoes_gerais,
    ativo
  ) VALUES (
    numero_prontuario,
    p_clinica_id,
    p_nome_paciente,
    p_data_nascimento,
    p_telefone,
    p_email,
    p_queixa_principal,
    p_historico_medico,
    ARRAY['Nenhuma alergia conhecida'],
    ARRAY['Vitamina D3', 'Ômega 3'],
    'Paciente colaborativo, sem contraindicações aparentes.',
    true
  ) RETURNING id INTO prontuario_id;
  
  -- Create initial consultation session
  INSERT INTO public.sessoes_atendimento (
    prontuario_id,
    profissional_id,
    tipo_sessao,
    data_sessao,
    duracao_minutos,
    observacoes,
    plano_tratamento,
    proxima_sessao,
    status_sessao
  ) VALUES (
    prontuario_id,
    p_profissional_id,
    'consulta',
    CURRENT_DATE - INTERVAL '30 days',
    60,
    'Consulta inicial realizada. Paciente apresenta ' || p_queixa_principal || '. Plano de tratamento definido.',
    'Tratamento em 3 sessões com intervalo de 30 dias entre cada aplicação.',
    CURRENT_DATE,
    'concluida'
  ) RETURNING id INTO session_id;
  
  -- Create treatment session
  INSERT INTO public.sessoes_atendimento (
    prontuario_id,
    profissional_id,
    tipo_sessao,
    data_sessao,
    duracao_minutos,
    observacoes,
    plano_tratamento,
    proxima_sessao,
    status_sessao
  ) VALUES (
    prontuario_id,
    p_profissional_id,
    'procedimento',
    CURRENT_DATE,
    45,
    'Primeira sessão de tratamento realizada conforme planejado. Paciente tolerou bem o procedimento.',
    'Continuar conforme protocolo estabelecido.',
    CURRENT_DATE + INTERVAL '30 days',
    'concluida'
  ) RETURNING id INTO session_id;
  
  -- Create sample medical images
  INSERT INTO public.imagens_medicas (
    prontuario_id,
    sessao_id,
    tipo_imagem,
    descricao,
    caminho_storage,
    tamanho_bytes,
    hash_arquivo,
    data_captura
  ) VALUES (
    prontuario_id,
    session_id,
    'antes',
    'Foto antes do tratamento - vista frontal',
    'medical-images/' || prontuario_id::text || '/before_front_' || EXTRACT(EPOCH FROM NOW())::bigint || '.jpg',
    2048576, -- 2MB
    md5(random()::text),
    CURRENT_DATE
  ) RETURNING id INTO image_id;
  
  INSERT INTO public.imagens_medicas (
    prontuario_id,
    sessao_id,
    tipo_imagem,
    descricao,
    caminho_storage,
    tamanho_bytes,
    hash_arquivo,
    data_captura
  ) VALUES (
    prontuario_id,
    session_id,
    'depois',
    'Foto após o tratamento - vista frontal',
    'medical-images/' || prontuario_id::text || '/after_front_' || EXTRACT(EPOCH FROM NOW())::bigint || '.jpg',
    2156789, -- 2.1MB
    md5(random()::text),
    CURRENT_DATE
  ) RETURNING id INTO image_id;
  
  RETURN prontuario_id;
END;
$ LANGUAGE plpgsql;

-- Create sample medical records
DO $
DECLARE
  clinic_bp_jardins_id UUID;
  clinic_bp_moema_id UUID;
  clinic_eb_pinheiros_id UUID;
  clinic_cu_itaim_id UUID;
  clinic_independent_id UUID;
  prof_patricia_id UUID;
  prof_fernanda_id UUID;
  prof_lucia_id UUID;
  prof_ricardo_id UUID;
  prof_ana_id UUID;
  prontuario_id UUID;
BEGIN
  -- Get clinic IDs
  SELECT id INTO clinic_bp_jardins_id FROM public.clinicas WHERE cnpj = '12.345.678/0002-71';
  SELECT id INTO clinic_bp_moema_id FROM public.clinicas WHERE cnpj = '12.345.678/0003-52';
  SELECT id INTO clinic_eb_pinheiros_id FROM public.clinicas WHERE cnpj = '56.789.012/0001-34';
  SELECT id INTO clinic_cu_itaim_id FROM public.clinicas WHERE cnpj = '34.567.890/0002-93';
  SELECT id INTO clinic_independent_id FROM public.clinicas WHERE cnpj = '67.890.123/0001-45';
  
  -- Get professional IDs (using email to identify)
  SELECT pr.id INTO prof_patricia_id 
  FROM public.profiles pr 
  WHERE pr.email = 'dra.patricia@belezapremium.com.br';
  
  SELECT pr.id INTO prof_fernanda_id 
  FROM public.profiles pr 
  WHERE pr.email = 'dra.fernanda@belezapremium.com.br';
  
  SELECT pr.id INTO prof_lucia_id 
  FROM public.profiles pr 
  WHERE pr.email = 'dra.lucia@esteticabrasil.com.br';
  
  SELECT pr.id INTO prof_ricardo_id 
  FROM public.profiles pr 
  WHERE pr.email = 'dr.ricardo@clinicasunidas.com.br';
  
  SELECT pr.id INTO prof_ana_id 
  FROM public.profiles pr 
  WHERE pr.email = 'dra.ana@draanasilva.com.br';
  
  -- Beleza Premium Jardins - Medical Records
  SELECT public.create_sample_medical_record(
    clinic_bp_jardins_id,
    prof_patricia_id,
    'Maria Silva Santos',
    '1985-03-15',
    '(11) 99999-1001',
    'maria.santos@email.com',
    'Rugas de expressão na testa e ao redor dos olhos',
    ARRAY['Sem histórico de cirurgias', 'Não faz uso de medicamentos contínuos']
  ) INTO prontuario_id;
  
  SELECT public.create_sample_medical_record(
    clinic_bp_jardins_id,
    prof_patricia_id,
    'Ana Carolina Oliveira',
    '1978-07-22',
    '(11) 99999-1002',
    'ana.oliveira@email.com',
    'Perda de volume facial e sulcos nasogenianos',
    ARRAY['Histórico de rinoplastia há 10 anos', 'Faz uso de anticoncepcional']
  ) INTO prontuario_id;
  
  -- Beleza Premium Moema - Medical Records
  SELECT public.create_sample_medical_record(
    clinic_bp_moema_id,
    prof_fernanda_id,
    'Juliana Costa Lima',
    '1990-11-08',
    '(11) 99999-1003',
    'juliana.lima@email.com',
    'Pelos indesejados em axilas e virilha',
    ARRAY['Sem histórico médico relevante', 'Pele fotótipo III']
  ) INTO prontuario_id;
  
  SELECT public.create_sample_medical_record(
    clinic_bp_moema_id,
    prof_fernanda_id,
    'Carla Rodrigues Mendes',
    '1982-05-30',
    '(11) 99999-1004',
    'carla.mendes@email.com',
    'Flacidez corporal e gordura localizada',
    ARRAY['Duas gestações', 'Pratica exercícios regularmente']
  ) INTO prontuario_id;
  
  -- Estética Brasil Pinheiros - Medical Records
  SELECT public.create_sample_medical_record(
    clinic_eb_pinheiros_id,
    prof_lucia_id,
    'Fernanda Alves Pereira',
    '1987-09-12',
    '(11) 99999-1005',
    'fernanda.pereira@email.com',
    'Melasma facial e manchas solares',
    ARRAY['Histórico de melasma na gravidez', 'Faz uso de protetor solar diário']
  ) INTO prontuario_id;
  
  -- Clínicas Unidas Itaim - Medical Records
  SELECT public.create_sample_medical_record(
    clinic_cu_itaim_id,
    prof_ricardo_id,
    'Patricia Souza Martins',
    '1975-12-03',
    '(11) 99999-1006',
    'patricia.martins@email.com',
    'Harmonização facial completa',
    ARRAY['Sem cirurgias prévias', 'Deseja resultado natural']
  ) INTO prontuario_id;
  
  SELECT public.create_sample_medical_record(
    clinic_cu_itaim_id,
    prof_ricardo_id,
    'Roberta Lima Santos',
    '1983-04-18',
    '(11) 99999-1007',
    'roberta.santos@email.com',
    'Rejuvenescimento facial com laser',
    ARRAY['Pele fotoenvelhecida', 'Exposição solar ocupacional']
  ) INTO prontuario_id;
  
  -- Independent Clinic - Medical Records
  SELECT public.create_sample_medical_record(
    clinic_independent_id,
    prof_ana_id,
    'Camila Ferreira Costa',
    '1992-01-25',
    '(11) 99999-1008',
    'camila.costa@email.com',
    'Aumento labial e definição de contorno',
    ARRAY['Primeira vez em procedimento estético', 'Expectativas realistas']
  ) INTO prontuario_id;
  
  RAISE NOTICE 'Sample medical records created successfully';
END $;

-- =====================================================
-- SAMPLE INVENTORY MOVEMENTS
-- =====================================================

-- Create sample inventory movements
DO $
DECLARE
  product_botox_id UUID;
  product_juvederm_id UUID;
  clinic_bp_jardins_id UUID;
  prof_patricia_id UUID;
BEGIN
  -- Get product and clinic IDs
  SELECT id INTO product_botox_id FROM public.produtos WHERE codigo_barras = '7891234567890';
  SELECT id INTO product_juvederm_id FROM public.produtos WHERE codigo_barras = '7891234567891';
  SELECT id INTO clinic_bp_jardins_id FROM public.clinicas WHERE cnpj = '12.345.678/0002-71';
  SELECT pr.id INTO prof_patricia_id FROM public.profiles pr WHERE pr.email = 'dra.patricia@belezapremium.com.br';
  
  -- Stock entry movement
  INSERT INTO public.movimentacao_estoque (
    produto_id,
    clinica_id,
    tipo_movimentacao,
    quantidade,
    valor_unitario,
    motivo,
    observacoes,
    usuario_id
  ) VALUES (
    product_botox_id,
    clinic_bp_jardins_id,
    'entrada',
    10,
    850.00,
    'Compra mensal',
    'Lote recebido conforme pedido #12345',
    prof_patricia_id
  );
  
  -- Stock usage movement
  INSERT INTO public.movimentacao_estoque (
    produto_id,
    clinica_id,
    tipo_movimentacao,
    quantidade,
    valor_unitario,
    motivo,
    observacoes,
    usuario_id
  ) VALUES (
    product_botox_id,
    clinic_bp_jardins_id,
    'saida',
    1,
    850.00,
    'Uso em procedimento',
    'Utilizado em paciente Maria Silva Santos',
    prof_patricia_id
  );
  
  RAISE NOTICE 'Sample inventory movements created successfully';
END $;

-- =====================================================
-- VERIFICATION AND CLEANUP
-- =====================================================

-- Function to verify sample operational data
CREATE OR REPLACE FUNCTION public.verify_sample_operational_data()
RETURNS JSONB AS $
DECLARE
  verification_result JSONB;
  suppliers_count INTEGER;
  products_count INTEGER;
  equipment_count INTEGER;
  medical_records_count INTEGER;
  sessions_count INTEGER;
  images_count INTEGER;
  inventory_movements_count INTEGER;
BEGIN
  -- Count inserted data
  SELECT COUNT(*) INTO suppliers_count FROM public.fornecedores WHERE ativo = true;
  SELECT COUNT(*) INTO products_count FROM public.produtos WHERE ativo = true;
  SELECT COUNT(*) INTO equipment_count FROM public.equipamentos WHERE ativo = true;
  SELECT COUNT(*) INTO medical_records_count FROM public.prontuarios WHERE ativo = true;
  SELECT COUNT(*) INTO sessions_count FROM public.sessoes_atendimento;
  SELECT COUNT(*) INTO images_count FROM public.imagens_medicas;
  SELECT COUNT(*) INTO inventory_movements_count FROM public.movimentacao_estoque;
  
  -- Compile verification results
  verification_result := jsonb_build_object(
    'verification_timestamp', now(),
    'data_counts', jsonb_build_object(
      'suppliers', suppliers_count,
      'products', products_count,
      'equipment', equipment_count,
      'medical_records', medical_records_count,
      'treatment_sessions', sessions_count,
      'medical_images', images_count,
      'inventory_movements', inventory_movements_count
    ),
    'expected_minimums', jsonb_build_object(
      'suppliers', 5,
      'products', 10,
      'equipment', 6,
      'medical_records', 8,
      'treatment_sessions', 16,
      'medical_images', 16,
      'inventory_movements', 2
    ),
    'verification_status', CASE 
      WHEN suppliers_count >= 5 AND 
           products_count >= 10 AND 
           equipment_count >= 6 AND 
           medical_records_count >= 8 AND
           sessions_count >= 16 AND
           images_count >= 16 AND
           inventory_movements_count >= 2
      THEN 'PASS' 
      ELSE 'FAIL' 
    END,
    'sample_data', jsonb_build_object(
      'sample_suppliers', (
        SELECT array_agg(nome) FROM (
          SELECT nome FROM public.fornecedores WHERE ativo = true LIMIT 3
        ) s
      ),
      'sample_products', (
        SELECT array_agg(nome) FROM (
          SELECT nome FROM public.produtos WHERE ativo = true LIMIT 5
        ) p
      ),
      'sample_equipment', (
        SELECT array_agg(nome) FROM (
          SELECT nome FROM public.equipamentos WHERE ativo = true LIMIT 3
        ) e
      )
    )
  );
  
  -- Log verification results
  PERFORM public.log_evento_sistema(
    'sample_operational_data_verification',
    'sistema',
    CASE WHEN (verification_result->>'verification_status') = 'PASS' THEN 'info' ELSE 'warning' END,
    'Sample operational data verification completed',
    format('Sample operational data verification completed with status: %s', verification_result->>'verification_status'),
    verification_result
  );
  
  RETURN verification_result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Execute verification
SELECT public.verify_sample_operational_data() AS operational_data_verification_results;

-- Clean up temporary functions
DROP FUNCTION IF EXISTS public.insert_sample_supplier(TEXT, TEXT, TEXT, JSONB, TEXT[], TEXT[]);
DROP FUNCTION IF EXISTS public.insert_sample_product(TEXT, TEXT, TEXT, UUID, TEXT, DECIMAL, DECIMAL, INTEGER, INTEGER, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.insert_sample_equipment(TEXT, TEXT, TEXT, tipo_equipamento, UUID, UUID, DECIMAL, DATE, JSONB);
DROP FUNCTION IF EXISTS public.create_sample_medical_record(UUID, UUID, TEXT, DATE, TEXT, TEXT, TEXT, TEXT[]);

-- =====================================================
-- COMPLETION VERIFICATION
-- =====================================================

-- Final verification
DO $
DECLARE
  suppliers_count INTEGER;
  products_count INTEGER;
  equipment_count INTEGER;
  medical_records_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO suppliers_count FROM public.fornecedores WHERE ativo = true;
  SELECT COUNT(*) INTO products_count FROM public.produtos WHERE ativo = true;
  SELECT COUNT(*) INTO equipment_count FROM public.equipamentos WHERE ativo = true;
  SELECT COUNT(*) INTO medical_records_count FROM public.prontuarios WHERE ativo = true;
  
  IF suppliers_count >= 5 AND products_count >= 10 AND equipment_count >= 6 AND medical_records_count >= 8 THEN
    RAISE NOTICE 'Sample operational data insertion completed successfully:';
    RAISE NOTICE '- Suppliers: % records', suppliers_count;
    RAISE NOTICE '- Products: % records', products_count;
    RAISE NOTICE '- Equipment: % records', equipment_count;
    RAISE NOTICE '- Medical records: % records', medical_records_count;
    RAISE NOTICE 'Task 8.3 implementation completed successfully';
  ELSE
    RAISE EXCEPTION 'Sample operational data insertion incomplete';
  END IF;
END $;

-- Add comment to track completion
COMMENT ON SCHEMA public IS 'Task 8.3 Sample operational data insertion completed - ' || now();