-- =====================================================
-- SAMPLE ORGANIZATIONS AND CLINICS DATA
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- This script inserts sample data according to task 8.2:
-- - Create sample organizations with different configurations
-- - Create sample clinics (both independent and organization-based)
-- - Create sample professional profiles

-- =====================================================
-- SAMPLE ORGANIZATIONS
-- =====================================================

-- Function to safely insert sample organizations
CREATE OR REPLACE FUNCTION public.insert_sample_organization(
  p_nome TEXT,
  p_razao_social TEXT,
  p_cnpj TEXT,
  p_tipo_organizacao TEXT,
  p_endereco JSONB,
  p_configuracoes JSONB DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  org_id UUID;
BEGIN
  INSERT INTO public.organizacoes (
    nome,
    razao_social,
    cnpj,
    tipo_organizacao,
    endereco,
    telefone_principal,
    email_contato,
    website,
    ativo
  ) VALUES (
    p_nome,
    p_razao_social,
    p_cnpj,
    p_tipo_organizacao,
    p_endereco,
    (p_endereco->>'telefone')::TEXT,
    (p_endereco->>'email')::TEXT,
    (p_endereco->>'website')::TEXT,
    true
  ) 
  ON CONFLICT (cnpj) DO UPDATE SET
    nome = EXCLUDED.nome,
    razao_social = EXCLUDED.razao_social,
    endereco = EXCLUDED.endereco,
    telefone_principal = EXCLUDED.telefone_principal,
    email_contato = EXCLUDED.email_contato,
    website = EXCLUDED.website
  RETURNING id INTO org_id;
  
  -- Insert organization configurations if provided
  IF p_configuracoes IS NOT NULL THEN
    INSERT INTO public.organizacao_configuracoes (
      organizacao_id,
      configuracoes,
      ativo
    ) VALUES (
      org_id,
      p_configuracoes,
      true
    ) ON CONFLICT (organizacao_id) DO UPDATE SET
      configuracoes = EXCLUDED.configuracoes;
  END IF;
  
  RETURN org_id;
END;
$ LANGUAGE plpgsql;

-- Insert sample organizations
DO $
DECLARE
  org_beleza_premium_id UUID;
  org_estetica_brasil_id UUID;
  org_clinicas_unidas_id UUID;
BEGIN
  -- Organization 1: Beleza Premium (Luxury chain)
  SELECT public.insert_sample_organization(
    'Beleza Premium',
    'Beleza Premium Clínicas Estéticas Ltda',
    '12.345.678/0001-90',
    'rede_clinicas',
    '{
      "endereco": "Av. Paulista, 1500 - Conjunto 1201",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "01310-100",
      "telefone": "(11) 3456-7890",
      "email": "contato@belezapremium.com.br",
      "website": "https://www.belezapremium.com.br"
    }',
    '{
      "padrao_numeracao_prontuario": "BP{YYYYMM}{NNNNNN}",
      "intervalo_consultas_minutos": 30,
      "permite_agendamento_online": true,
      "requer_aprovacao_procedimentos": true,
      "backup_automatico": true,
      "integracao_whatsapp": true,
      "sistema_fidelidade": {
        "ativo": true,
        "pontos_por_real": 1,
        "desconto_maximo_percent": 15
      },
      "politicas_cancelamento": {
        "prazo_minimo_horas": 24,
        "taxa_cancelamento_percent": 50
      }
    }'
  ) INTO org_beleza_premium_id;
  
  -- Organization 2: Estética Brasil (Mid-market chain)
  SELECT public.insert_sample_organization(
    'Estética Brasil',
    'Estética Brasil Franquias S.A.',
    '23.456.789/0001-01',
    'franquia',
    '{
      "endereco": "Rua Augusta, 2500 - Sala 801",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "01412-100",
      "telefone": "(11) 2345-6789",
      "email": "franquias@esteticabrasil.com.br",
      "website": "https://www.esteticabrasil.com.br"
    }',
    '{
      "padrao_numeracao_prontuario": "EB{YY}{MM}{NNNNN}",
      "intervalo_consultas_minutos": 45,
      "permite_agendamento_online": true,
      "requer_aprovacao_procedimentos": false,
      "backup_automatico": true,
      "integracao_whatsapp": false,
      "sistema_fidelidade": {
        "ativo": true,
        "pontos_por_real": 0.5,
        "desconto_maximo_percent": 10
      },
      "politicas_cancelamento": {
        "prazo_minimo_horas": 12,
        "taxa_cancelamento_percent": 30
      }
    }'
  ) INTO org_estetica_brasil_id;
  
  -- Organization 3: Clínicas Unidas (Medical group)
  SELECT public.insert_sample_organization(
    'Clínicas Unidas',
    'Clínicas Unidas Medicina Estética Ltda',
    '34.567.890/0001-12',
    'grupo_medico',
    '{
      "endereco": "Av. Brigadeiro Faria Lima, 3000 - 15º andar",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "01451-000",
      "telefone": "(11) 3456-7891",
      "email": "contato@clinicasunidas.com.br",
      "website": "https://www.clinicasunidas.com.br"
    }',
    '{
      "padrao_numeracao_prontuario": "CU{YYYY}{NNNNNNN}",
      "intervalo_consultas_minutos": 60,
      "permite_agendamento_online": true,
      "requer_aprovacao_procedimentos": true,
      "backup_automatico": true,
      "integracao_whatsapp": true,
      "sistema_fidelidade": {
        "ativo": false
      },
      "politicas_cancelamento": {
        "prazo_minimo_horas": 48,
        "taxa_cancelamento_percent": 100
      },
      "protocolos_medicos": {
        "requer_anamnese_completa": true,
        "tempo_minimo_consulta": 45,
        "followup_obrigatorio": true
      }
    }'
  ) INTO org_clinicas_unidas_id;
  
  RAISE NOTICE 'Sample organizations created:';
  RAISE NOTICE '- Beleza Premium ID: %', org_beleza_premium_id;
  RAISE NOTICE '- Estética Brasil ID: %', org_estetica_brasil_id;
  RAISE NOTICE '- Clínicas Unidas ID: %', org_clinicas_unidas_id;
END $;

-- =====================================================
-- SAMPLE CLINICS
-- =====================================================

-- Function to safely insert sample clinics
CREATE OR REPLACE FUNCTION public.insert_sample_clinic(
  p_nome TEXT,
  p_razao_social TEXT,
  p_cnpj TEXT,
  p_organizacao_id UUID DEFAULT NULL,
  p_endereco JSONB,
  p_especialidades TEXT[],
  p_configuracoes JSONB DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  clinic_id UUID;
  sala_id UUID;
  i INTEGER;
BEGIN
  INSERT INTO public.clinicas (
    nome,
    razao_social,
    cnpj,
    organizacao_id,
    endereco,
    telefone_principal,
    email_contato,
    website,
    especialidades_oferecidas,
    horario_funcionamento,
    ativo
  ) VALUES (
    p_nome,
    p_razao_social,
    p_cnpj,
    p_organizacao_id,
    p_endereco,
    (p_endereco->>'telefone')::TEXT,
    (p_endereco->>'email')::TEXT,
    (p_endereco->>'website')::TEXT,
    p_especialidades,
    '{
      "segunda": {"abertura": "08:00", "fechamento": "18:00"},
      "terca": {"abertura": "08:00", "fechamento": "18:00"},
      "quarta": {"abertura": "08:00", "fechamento": "18:00"},
      "quinta": {"abertura": "08:00", "fechamento": "18:00"},
      "sexta": {"abertura": "08:00", "fechamento": "18:00"},
      "sabado": {"abertura": "08:00", "fechamento": "14:00"}
    }',
    true
  ) 
  ON CONFLICT (cnpj) DO UPDATE SET
    nome = EXCLUDED.nome,
    razao_social = EXCLUDED.razao_social,
    endereco = EXCLUDED.endereco,
    telefone_principal = EXCLUDED.telefone_principal,
    email_contato = EXCLUDED.email_contato,
    especialidades_oferecidas = EXCLUDED.especialidades_oferecidas
  RETURNING id INTO clinic_id;
  
  -- Create sample rooms for the clinic
  FOR i IN 1..3 LOOP
    INSERT INTO public.salas_clinica (
      clinica_id,
      nome,
      tipo,
      capacidade_pessoas,
      equipamentos_fixos,
      disponivel_agendamento,
      ativo
    ) VALUES (
      clinic_id,
      'Sala ' || i,
      CASE 
        WHEN i = 1 THEN 'consultorio'
        WHEN i = 2 THEN 'procedimento'
        ELSE 'laser'
      END,
      CASE 
        WHEN i = 1 THEN 3
        WHEN i = 2 THEN 2
        ELSE 1
      END,
      CASE 
        WHEN i = 1 THEN ARRAY['Mesa de exame', 'Computador', 'Balança']
        WHEN i = 2 THEN ARRAY['Maca de procedimento', 'Carrinho auxiliar', 'Iluminação LED']
        ELSE ARRAY['Laser CO2', 'Sistema de exaustão', 'Óculos de proteção']
      END,
      true,
      true
    ) ON CONFLICT DO NOTHING;
  END LOOP;
  
  RETURN clinic_id;
END;
$ LANGUAGE plpgsql;

-- Insert sample clinics
DO $
DECLARE
  org_beleza_premium_id UUID;
  org_estetica_brasil_id UUID;
  org_clinicas_unidas_id UUID;
  clinic_bp_jardins_id UUID;
  clinic_bp_moema_id UUID;
  clinic_eb_vila_madalena_id UUID;
  clinic_eb_pinheiros_id UUID;
  clinic_cu_itaim_id UUID;
  clinic_independent_id UUID;
BEGIN
  -- Get organization IDs
  SELECT id INTO org_beleza_premium_id FROM public.organizacoes WHERE cnpj = '12.345.678/0001-90';
  SELECT id INTO org_estetica_brasil_id FROM public.organizacoes WHERE cnpj = '23.456.789/0001-01';
  SELECT id INTO org_clinicas_unidas_id FROM public.organizacoes WHERE cnpj = '34.567.890/0001-12';
  
  -- Beleza Premium - Jardins Unit
  SELECT public.insert_sample_clinic(
    'Beleza Premium Jardins',
    'Beleza Premium Clínicas Estéticas Ltda',
    '12.345.678/0002-71',
    org_beleza_premium_id,
    '{
      "endereco": "Rua Oscar Freire, 1200 - Jardins",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "01426-001",
      "telefone": "(11) 3456-7891",
      "email": "jardins@belezapremium.com.br",
      "website": "https://www.belezapremium.com.br/jardins"
    }',
    ARRAY['harmonizacao_facial', 'laser_fracionado', 'botox_toxina', 'preenchimento'],
    '{
      "area_total_m2": 250,
      "numero_salas": 5,
      "estacionamento": true,
      "acessibilidade": true,
      "ar_condicionado": true,
      "wifi_gratuito": true
    }'
  ) INTO clinic_bp_jardins_id;
  
  -- Beleza Premium - Moema Unit
  SELECT public.insert_sample_clinic(
    'Beleza Premium Moema',
    'Beleza Premium Clínicas Estéticas Ltda',
    '12.345.678/0003-52',
    org_beleza_premium_id,
    '{
      "endereco": "Av. Moema, 500 - Moema",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "04077-020",
      "telefone": "(11) 3456-7892",
      "email": "moema@belezapremium.com.br",
      "website": "https://www.belezapremium.com.br/moema"
    }',
    ARRAY['depilacao_laser', 'peeling_quimico', 'radiofrequencia', 'criolipolise'],
    '{
      "area_total_m2": 180,
      "numero_salas": 4,
      "estacionamento": false,
      "acessibilidade": true,
      "ar_condicionado": true,
      "wifi_gratuito": true
    }'
  ) INTO clinic_bp_moema_id;
  
  -- Estética Brasil - Vila Madalena
  SELECT public.insert_sample_clinic(
    'Estética Brasil Vila Madalena',
    'EB Vila Madalena Franquia Ltda',
    '45.678.901/0001-23',
    org_estetica_brasil_id,
    '{
      "endereco": "Rua Harmonia, 800 - Vila Madalena",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "05435-000",
      "telefone": "(11) 2345-6790",
      "email": "vilamadalena@esteticabrasil.com.br",
      "website": "https://www.esteticabrasil.com.br/vila-madalena"
    }',
    ARRAY['limpeza_pele', 'massagem_modeladora', 'drenagem_linfatica', 'peeling_quimico'],
    '{
      "area_total_m2": 120,
      "numero_salas": 3,
      "estacionamento": false,
      "acessibilidade": false,
      "ar_condicionado": true,
      "wifi_gratuito": true
    }'
  ) INTO clinic_eb_vila_madalena_id;
  
  -- Estética Brasil - Pinheiros
  SELECT public.insert_sample_clinic(
    'Estética Brasil Pinheiros',
    'EB Pinheiros Franquia Ltda',
    '56.789.012/0001-34',
    org_estetica_brasil_id,
    '{
      "endereco": "Rua dos Pinheiros, 1500 - Pinheiros",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "05422-001",
      "telefone": "(11) 2345-6791",
      "email": "pinheiros@esteticabrasil.com.br",
      "website": "https://www.esteticabrasil.com.br/pinheiros"
    }',
    ARRAY['depilacao_laser', 'radiofrequencia', 'ultrassom_microfocado', 'botox_toxina'],
    '{
      "area_total_m2": 150,
      "numero_salas": 4,
      "estacionamento": true,
      "acessibilidade": true,
      "ar_condicionado": true,
      "wifi_gratuito": true
    }'
  ) INTO clinic_eb_pinheiros_id;
  
  -- Clínicas Unidas - Itaim
  SELECT public.insert_sample_clinic(
    'Clínicas Unidas Itaim',
    'Clínicas Unidas Medicina Estética Ltda',
    '34.567.890/0002-93',
    org_clinicas_unidas_id,
    '{
      "endereco": "Av. Juscelino Kubitschek, 2000 - Itaim Bibi",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "04543-000",
      "telefone": "(11) 3456-7893",
      "email": "itaim@clinicasunidas.com.br",
      "website": "https://www.clinicasunidas.com.br/itaim"
    }',
    ARRAY['harmonizacao_facial', 'cirurgia_plastica', 'laser_fracionado', 'preenchimento', 'botox_toxina'],
    '{
      "area_total_m2": 400,
      "numero_salas": 8,
      "estacionamento": true,
      "acessibilidade": true,
      "ar_condicionado": true,
      "wifi_gratuito": true,
      "centro_cirurgico": true,
      "recuperacao_pos_operatorio": true
    }'
  ) INTO clinic_cu_itaim_id;
  
  -- Independent Clinic
  SELECT public.insert_sample_clinic(
    'Dra. Ana Silva Estética',
    'Ana Beatriz Silva ME',
    '67.890.123/0001-45',
    NULL, -- Independent clinic
    '{
      "endereco": "Rua Bela Cintra, 1000 - Consolação",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "01415-000",
      "telefone": "(11) 9876-5432",
      "email": "contato@draanasilva.com.br",
      "website": "https://www.draanasilva.com.br"
    }',
    ARRAY['harmonizacao_facial', 'botox_toxina', 'preenchimento', 'peeling_quimico'],
    '{
      "area_total_m2": 80,
      "numero_salas": 2,
      "estacionamento": false,
      "acessibilidade": false,
      "ar_condicionado": true,
      "wifi_gratuito": true,
      "clinica_individual": true
    }'
  ) INTO clinic_independent_id;
  
  RAISE NOTICE 'Sample clinics created:';
  RAISE NOTICE '- Beleza Premium Jardins ID: %', clinic_bp_jardins_id;
  RAISE NOTICE '- Beleza Premium Moema ID: %', clinic_bp_moema_id;
  RAISE NOTICE '- Estética Brasil Vila Madalena ID: %', clinic_eb_vila_madalena_id;
  RAISE NOTICE '- Estética Brasil Pinheiros ID: %', clinic_eb_pinheiros_id;
  RAISE NOTICE '- Clínicas Unidas Itaim ID: %', clinic_cu_itaim_id;
  RAISE NOTICE '- Dra. Ana Silva Estética ID: %', clinic_independent_id;
END $;

-- =====================================================
-- SAMPLE PROFESSIONAL PROFILES
-- =====================================================

-- Function to create sample user profiles and roles
CREATE OR REPLACE FUNCTION public.create_sample_professional(
  p_email TEXT,
  p_nome_completo TEXT,
  p_especialidade_codigo TEXT,
  p_registro_profissional TEXT,
  p_clinica_id UUID,
  p_organizacao_id UUID DEFAULT NULL,
  p_role user_role_type DEFAULT 'profissionais',
  p_telefone TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  user_id UUID;
  profile_id UUID;
  role_id UUID;
BEGIN
  -- Generate a sample user ID (in real scenario, this would come from auth.users)
  user_id := gen_random_uuid();
  
  -- Create profile
  INSERT INTO public.profiles (
    id,
    email,
    nome_completo,
    telefone,
    data_nascimento,
    genero,
    endereco,
    bio,
    avatar_url,
    onboarding_completo,
    ativo
  ) VALUES (
    user_id,
    p_email,
    p_nome_completo,
    p_telefone,
    CURRENT_DATE - INTERVAL '30 years', -- Sample age
    'nao_informado',
    '{"cidade": "São Paulo", "estado": "SP"}',
    p_bio,
    NULL,
    true,
    true
  ) ON CONFLICT (id) DO UPDATE SET
    nome_completo = EXCLUDED.nome_completo,
    telefone = EXCLUDED.telefone,
    bio = EXCLUDED.bio
  RETURNING id INTO profile_id;
  
  -- Create professional record
  INSERT INTO public.profissionais (
    user_id,
    especialidade_codigo,
    registro_profissional,
    registro_conselho,
    data_formacao,
    instituicao_formacao,
    curriculo_resumido,
    ativo
  ) VALUES (
    user_id,
    p_especialidade_codigo,
    p_registro_profissional,
    CASE 
      WHEN p_especialidade_codigo LIKE 'medico%' THEN 'CRM'
      WHEN p_especialidade_codigo LIKE 'dentista%' THEN 'CRO'
      WHEN p_especialidade_codigo LIKE 'enfermeiro%' THEN 'COREN'
      WHEN p_especialidade_codigo = 'fisioterapeuta_dermatofuncional' THEN 'CREFITO'
      WHEN p_especialidade_codigo = 'biomedico_estetica' THEN 'CRBM'
      WHEN p_especialidade_codigo = 'farmaceutico_estetica' THEN 'CRF'
      WHEN p_especialidade_codigo = 'nutricionista_estetica' THEN 'CRN'
      WHEN p_especialidade_codigo = 'psicologo_estetica' THEN 'CRP'
      ELSE 'Outros'
    END,
    CURRENT_DATE - INTERVAL '5 years', -- Sample graduation date
    'Universidade de São Paulo',
    'Profissional experiente em medicina estética com foco em resultados naturais e segurança do paciente.',
    true
  ) ON CONFLICT (user_id) DO UPDATE SET
    especialidade_codigo = EXCLUDED.especialidade_codigo,
    registro_profissional = EXCLUDED.registro_profissional;
  
  -- Create user role
  INSERT INTO public.user_roles (
    user_id,
    role,
    organizacao_id,
    clinica_id,
    ativo,
    data_inicio
  ) VALUES (
    user_id,
    p_role,
    p_organizacao_id,
    p_clinica_id,
    true,
    CURRENT_DATE
  ) ON CONFLICT (user_id, organizacao_id, clinica_id) DO UPDATE SET
    role = EXCLUDED.role,
    ativo = EXCLUDED.ativo
  RETURNING id INTO role_id;
  
  -- Link professional to clinic
  INSERT INTO public.clinica_profissionais (
    clinica_id,
    profissional_id,
    cargo,
    data_inicio,
    ativo
  ) VALUES (
    p_clinica_id,
    user_id,
    CASE p_role
      WHEN 'proprietaria' THEN 'Proprietária'
      WHEN 'gerente' THEN 'Gerente'
      WHEN 'profissionais' THEN 
        CASE 
          WHEN p_especialidade_codigo LIKE 'medico%' THEN 'Médico'
          WHEN p_especialidade_codigo LIKE 'dentista%' THEN 'Dentista'
          WHEN p_especialidade_codigo LIKE 'enfermeiro%' THEN 'Enfermeiro'
          ELSE 'Profissional'
        END
      ELSE 'Funcionário'
    END,
    CURRENT_DATE,
    true
  ) ON CONFLICT (clinica_id, profissional_id) DO UPDATE SET
    cargo = EXCLUDED.cargo,
    ativo = EXCLUDED.ativo;
  
  RETURN user_id;
END;
$ LANGUAGE plpgsql;

-- Create sample professionals
DO $
DECLARE
  clinic_bp_jardins_id UUID;
  clinic_bp_moema_id UUID;
  clinic_eb_vila_madalena_id UUID;
  clinic_eb_pinheiros_id UUID;
  clinic_cu_itaim_id UUID;
  clinic_independent_id UUID;
  org_beleza_premium_id UUID;
  org_estetica_brasil_id UUID;
  org_clinicas_unidas_id UUID;
  prof_id UUID;
BEGIN
  -- Get clinic and organization IDs
  SELECT id INTO org_beleza_premium_id FROM public.organizacoes WHERE cnpj = '12.345.678/0001-90';
  SELECT id INTO org_estetica_brasil_id FROM public.organizacoes WHERE cnpj = '23.456.789/0001-01';
  SELECT id INTO org_clinicas_unidas_id FROM public.organizacoes WHERE cnpj = '34.567.890/0001-12';
  
  SELECT id INTO clinic_bp_jardins_id FROM public.clinicas WHERE cnpj = '12.345.678/0002-71';
  SELECT id INTO clinic_bp_moema_id FROM public.clinicas WHERE cnpj = '12.345.678/0003-52';
  SELECT id INTO clinic_eb_vila_madalena_id FROM public.clinicas WHERE cnpj = '45.678.901/0001-23';
  SELECT id INTO clinic_eb_pinheiros_id FROM public.clinicas WHERE cnpj = '56.789.012/0001-34';
  SELECT id INTO clinic_cu_itaim_id FROM public.clinicas WHERE cnpj = '34.567.890/0002-93';
  SELECT id INTO clinic_independent_id FROM public.clinicas WHERE cnpj = '67.890.123/0001-45';
  
  -- Beleza Premium Jardins - Team
  SELECT public.create_sample_professional(
    'dra.patricia@belezapremium.com.br',
    'Dra. Patrícia Oliveira',
    'medico_dermatologista',
    'CRM-SP 123456',
    clinic_bp_jardins_id,
    org_beleza_premium_id,
    'proprietaria',
    '(11) 99999-0001',
    'Dermatologista especializada em medicina estética com mais de 15 anos de experiência. Fundadora da rede Beleza Premium.'
  ) INTO prof_id;
  
  SELECT public.create_sample_professional(
    'dr.carlos@belezapremium.com.br',
    'Dr. Carlos Mendes',
    'medico_cirurgiao_plastico',
    'CRM-SP 234567',
    clinic_bp_jardins_id,
    org_beleza_premium_id,
    'profissionais',
    '(11) 99999-0002',
    'Cirurgião plástico especializado em harmonização facial e procedimentos minimamente invasivos.'
  ) INTO prof_id;
  
  SELECT public.create_sample_professional(
    'enf.marina@belezapremium.com.br',
    'Marina Santos',
    'enfermeiro_estetica',
    'COREN-SP 345678',
    clinic_bp_jardins_id,
    org_beleza_premium_id,
    'profissionais',
    '(11) 99999-0003',
    'Enfermeira estética especializada em procedimentos injetáveis e cuidados pós-operatórios.'
  ) INTO prof_id;
  
  -- Beleza Premium Moema - Team
  SELECT public.create_sample_professional(
    'dra.fernanda@belezapremium.com.br',
    'Dra. Fernanda Costa',
    'medico_dermatologista',
    'CRM-SP 456789',
    clinic_bp_moema_id,
    org_beleza_premium_id,
    'gerente',
    '(11) 99999-0004',
    'Dermatologista com especialização em laser e tecnologias estéticas avançadas.'
  ) INTO prof_id;
  
  SELECT public.create_sample_professional(
    'fisio.juliana@belezapremium.com.br',
    'Juliana Rodrigues',
    'fisioterapeuta_dermatofuncional',
    'CREFITO-SP 567890',
    clinic_bp_moema_id,
    org_beleza_premium_id,
    'profissionais',
    '(11) 99999-0005',
    'Fisioterapeuta dermatofuncional especializada em tratamentos corporais e drenagem linfática.'
  ) INTO prof_id;
  
  -- Estética Brasil Vila Madalena - Team
  SELECT public.create_sample_professional(
    'esteticista.ana@esteticabrasil.com.br',
    'Ana Paula Silva',
    'esteticista',
    'EST-SP 678901',
    clinic_eb_vila_madalena_id,
    org_estetica_brasil_id,
    'proprietaria',
    '(11) 99999-0006',
    'Esteticista com mais de 10 anos de experiência em tratamentos faciais e corporais.'
  ) INTO prof_id;
  
  SELECT public.create_sample_professional(
    'cosmetologo.bruno@esteticabrasil.com.br',
    'Bruno Almeida',
    'cosmetologo',
    'COSM-SP 789012',
    clinic_eb_vila_madalena_id,
    org_estetica_brasil_id,
    'profissionais',
    '(11) 99999-0007',
    'Cosmétólogo especializado em peelings químicos e tratamentos de rejuvenescimento.'
  ) INTO prof_id;
  
  -- Estética Brasil Pinheiros - Team
  SELECT public.create_sample_professional(
    'dra.lucia@esteticabrasil.com.br',
    'Dra. Lúcia Ferreira',
    'medico_dermatologista',
    'CRM-SP 890123',
    clinic_eb_pinheiros_id,
    org_estetica_brasil_id,
    'gerente',
    '(11) 99999-0008',
    'Dermatologista com foco em medicina estética e tratamentos a laser.'
  ) INTO prof_id;
  
  SELECT public.create_sample_professional(
    'biomedico.rafael@esteticabrasil.com.br',
    'Rafael Souza',
    'biomedico_estetica',
    'CRBM-SP 901234',
    clinic_eb_pinheiros_id,
    org_estetica_brasil_id,
    'profissionais',
    '(11) 99999-0009',
    'Biomédico estético especializado em procedimentos injetáveis e harmonização facial.'
  ) INTO prof_id;
  
  -- Clínicas Unidas Itaim - Team
  SELECT public.create_sample_professional(
    'dr.ricardo@clinicasunidas.com.br',
    'Dr. Ricardo Barbosa',
    'medico_cirurgiao_plastico',
    'CRM-SP 012345',
    clinic_cu_itaim_id,
    org_clinicas_unidas_id,
    'proprietaria',
    '(11) 99999-0010',
    'Cirurgião plástico com mais de 20 anos de experiência em cirurgias estéticas e reparadoras.'
  ) INTO prof_id;
  
  SELECT public.create_sample_professional(
    'dra.camila@clinicasunidas.com.br',
    'Dra. Camila Nunes',
    'medico_angiologista',
    'CRM-SP 123450',
    clinic_cu_itaim_id,
    org_clinicas_unidas_id,
    'profissionais',
    '(11) 99999-0011',
    'Angiologista especializada em tratamentos vasculares e escleroterapia.'
  ) INTO prof_id;
  
  SELECT public.create_sample_professional(
    'dr.dentista@clinicasunidas.com.br',
    'Dr. Eduardo Lima',
    'dentista_harmonizacao',
    'CRO-SP 234501',
    clinic_cu_itaim_id,
    org_clinicas_unidas_id,
    'profissionais',
    '(11) 99999-0012',
    'Cirurgião-dentista especializado em harmonização orofacial e estética dental.'
  ) INTO prof_id;
  
  -- Independent Clinic - Owner
  SELECT public.create_sample_professional(
    'dra.ana@draanasilva.com.br',
    'Dra. Ana Beatriz Silva',
    'medico_dermatologista',
    'CRM-SP 345012',
    clinic_independent_id,
    NULL,
    'proprietaria',
    '(11) 99999-0013',
    'Dermatologista com clínica própria, especializada em harmonização facial e medicina estética personalizada.'
  ) INTO prof_id;
  
  RAISE NOTICE 'Sample professionals created successfully';
END $;

-- =====================================================
-- VERIFICATION AND CLEANUP
-- =====================================================

-- Function to verify sample data insertion
CREATE OR REPLACE FUNCTION public.verify_sample_organizations_clinics()
RETURNS JSONB AS $
DECLARE
  verification_result JSONB;
  organizations_count INTEGER;
  clinics_count INTEGER;
  professionals_count INTEGER;
  rooms_count INTEGER;
BEGIN
  -- Count inserted data
  SELECT COUNT(*) INTO organizations_count FROM public.organizacoes WHERE ativo = true;
  SELECT COUNT(*) INTO clinics_count FROM public.clinicas WHERE ativo = true;
  SELECT COUNT(*) INTO professionals_count FROM public.profissionais WHERE ativo = true;
  SELECT COUNT(*) INTO rooms_count FROM public.salas_clinica WHERE ativo = true;
  
  -- Compile verification results
  verification_result := jsonb_build_object(
    'verification_timestamp', now(),
    'data_counts', jsonb_build_object(
      'organizations', organizations_count,
      'clinics', clinics_count,
      'professionals', professionals_count,
      'clinic_rooms', rooms_count
    ),
    'expected_minimums', jsonb_build_object(
      'organizations', 3,
      'clinics', 6,
      'professionals', 13,
      'clinic_rooms', 18
    ),
    'verification_status', CASE 
      WHEN organizations_count >= 3 AND 
           clinics_count >= 6 AND 
           professionals_count >= 13 AND 
           rooms_count >= 18
      THEN 'PASS' 
      ELSE 'FAIL' 
    END,
    'sample_data', jsonb_build_object(
      'organizations', (
        SELECT array_agg(nome) FROM (
          SELECT nome FROM public.organizacoes WHERE ativo = true LIMIT 3
        ) o
      ),
      'clinics', (
        SELECT array_agg(nome) FROM (
          SELECT nome FROM public.clinicas WHERE ativo = true LIMIT 6
        ) c
      ),
      'professionals', (
        SELECT array_agg(p.nome_completo) FROM (
          SELECT pr.nome_completo 
          FROM public.profiles pr 
          JOIN public.profissionais prof ON prof.user_id = pr.id 
          WHERE prof.ativo = true 
          LIMIT 5
        ) p
      )
    )
  );
  
  -- Log verification results
  PERFORM public.log_evento_sistema(
    'sample_organizations_clinics_verification',
    'sistema',
    CASE WHEN (verification_result->>'verification_status') = 'PASS' THEN 'info' ELSE 'warning' END,
    'Sample organizations and clinics verification completed',
    format('Sample data verification completed with status: %s', verification_result->>'verification_status'),
    verification_result
  );
  
  RETURN verification_result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Execute verification
SELECT public.verify_sample_organizations_clinics() AS sample_data_verification_results;

-- Clean up temporary functions
DROP FUNCTION IF EXISTS public.insert_sample_organization(TEXT, TEXT, TEXT, TEXT, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.insert_sample_clinic(TEXT, TEXT, TEXT, UUID, JSONB, TEXT[], JSONB);
DROP FUNCTION IF EXISTS public.create_sample_professional(TEXT, TEXT, TEXT, TEXT, UUID, UUID, user_role_type, TEXT, TEXT);

-- =====================================================
-- COMPLETION VERIFICATION
-- =====================================================

-- Final verification
DO $
DECLARE
  organizations_count INTEGER;
  clinics_count INTEGER;
  professionals_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO organizations_count FROM public.organizacoes WHERE ativo = true;
  SELECT COUNT(*) INTO clinics_count FROM public.clinicas WHERE ativo = true;
  SELECT COUNT(*) INTO professionals_count FROM public.profissionais WHERE ativo = true;
  
  IF organizations_count >= 3 AND clinics_count >= 6 AND professionals_count >= 13 THEN
    RAISE NOTICE 'Sample organizations and clinics insertion completed successfully:';
    RAISE NOTICE '- Organizations: % records', organizations_count;
    RAISE NOTICE '- Clinics: % records', clinics_count;
    RAISE NOTICE '- Professionals: % records', professionals_count;
    RAISE NOTICE 'Task 8.2 implementation completed successfully';
  ELSE
    RAISE EXCEPTION 'Sample organizations and clinics insertion incomplete';
  END IF;
END $;

-- Add comment to track completion
COMMENT ON SCHEMA public IS 'Task 8.2 Sample organizations and clinics insertion completed - ' || now();