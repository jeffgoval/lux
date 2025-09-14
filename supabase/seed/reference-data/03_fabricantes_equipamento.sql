-- =====================================================
-- SEED: FABRICANTES DE EQUIPAMENTO
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- Principais fabricantes de equipamentos estéticos
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
-- Fabricantes Nacionais
('Ibramed', 'Indústria Brasileira de Equipamentos Médicos', '12345678000190', 'Brasil', 'https://www.ibramed.com.br', '+5511999999999', 'suporte@ibramed.com.br', ARRAY['laser', 'radiofrequencia', 'ultrassom'], true, ARRAY['ANVISA', 'ISO13485']),
('HTM Eletrônica', 'Equipamentos eletrônicos para estética', '12345678000191', 'Brasil', 'https://www.htm.com.br', '+5511999999998', 'suporte@htm.com.br', ARRAY['eletroterapia', 'laser', 'led'], true, ARRAY['ANVISA', 'CE']),
('KLD Biosistemas', 'Equipamentos para dermatologia e estética', '12345678000192', 'Brasil', 'https://www.kld.com.br', '+5511999999997', 'suporte@kld.com.br', ARRAY['laser', 'ipl', 'radiofrequencia'], true, ARRAY['ANVISA', 'FDA', 'CE']),
('Tonederm', 'Equipamentos dermatológicos nacionais', '12345678000193', 'Brasil', 'https://www.tonederm.com.br', '+5511999999996', 'suporte@tonederm.com.br', ARRAY['laser', 'microagulhamento'], true, ARRAY['ANVISA']),

-- Fabricantes Internacionais - Estados Unidos
('Candela', 'Líder mundial em tecnologia laser médica', '12345678000194', 'Estados Unidos', 'https://www.candelamedical.com', '+1555999999', 'support@candela.com', ARRAY['laser', 'ipl', 'radiofrequencia'], true, ARRAY['FDA', 'CE', 'ANVISA']),
('Cynosure', 'Tecnologias avançadas para estética', '12345678000195', 'Estados Unidos', 'https://www.cynosure.com', '+1555999998', 'support@cynosure.com', ARRAY['laser', 'radiofrequencia', 'criolipolise'], true, ARRAY['FDA', 'CE', 'ANVISA']),
('Zeltiq (CoolSculpting)', 'Especialista em criolipólise', '12345678000196', 'Estados Unidos', 'https://www.coolsculpting.com', '+1555999997', 'support@zeltiq.com', ARRAY['criolipolise'], true, ARRAY['FDA', 'CE', 'ANVISA']),

-- Fabricantes Internacionais - Europa
('Alma Lasers', 'Tecnologia israelense de ponta', '12345678000197', 'Israel', 'https://www.almalasers.com', '+97235999999', 'support@alma.com', ARRAY['laser', 'ipl', 'radiofrequencia', 'hifu'], true, ARRAY['CE', 'FDA', 'ANVISA']),
('Lumenis', 'Pioneira em tecnologia laser médica', '12345678000198', 'Israel', 'https://www.lumenis.com', '+97235999998', 'support@lumenis.com', ARRAY['laser', 'ipl'], true, ARRAY['CE', 'FDA', 'ANVISA']),
('InMode', 'Tecnologia de radiofrequência avançada', '12345678000199', 'Israel', 'https://www.inmodemd.com', '+97235999997', 'support@inmode.com', ARRAY['radiofrequencia', 'microneedling'], true, ARRAY['CE', 'FDA', 'ANVISA']),
('Fotona', 'Lasers médicos eslovenos de alta qualidade', '12345678000200', 'Eslovênia', 'https://www.fotona.com', '+38615999999', 'support@fotona.com', ARRAY['laser'], true, ARRAY['CE', 'FDA', 'ANVISA']),

-- Fabricantes Internacionais - Coreia do Sul
('Jeisys Medical', 'Inovação coreana em equipamentos estéticos', '12345678000201', 'Coreia do Sul', 'https://www.jeisys.com', '+8225999999', 'support@jeisys.com', ARRAY['hifu', 'radiofrequencia', 'laser'], true, ARRAY['KFDA', 'CE', 'ANVISA']),
('Classys', 'Tecnologia HIFU de alta precisão', '12345678000202', 'Coreia do Sul', 'https://www.classys.com', '+8225999998', 'support@classys.com', ARRAY['hifu'], true, ARRAY['KFDA', 'CE', 'FDA']),

-- Fabricantes Internacionais - Alemanha
('Asclepion', 'Laser alemão de precisão médica', '12345678000203', 'Alemanha', 'https://www.asclepion.com', '+4989999999', 'support@asclepion.com', ARRAY['laser'], true, ARRAY['CE', 'FDA']),
('Jena Surgical', 'Equipamentos cirúrgicos alemães', '12345678000204', 'Alemanha', 'https://www.jenasurgical.com', '+4989999998', 'support@jena.com', ARRAY['laser', 'eletrocirurgia'], true, ARRAY['CE', 'FDA']),

-- Fabricantes de Equipamentos de Apoio
('Polaroid Medical', 'Sistemas de documentação fotográfica', '12345678000205', 'Estados Unidos', 'https://www.polaroid-medical.com', '+1555888999', 'support@polaroid.com', ARRAY['fotografia_medica', 'documentacao'], true, ARRAY['FDA', 'CE']),
('Dermatology Systems', 'Equipamentos de apoio dermatológico', '12345678000206', 'Estados Unidos', 'https://www.dermatsystems.com', '+1555888998', 'support@dermatsys.com', ARRAY['dermatoscopia', 'analise_pele'], true, ARRAY['FDA', 'CE']),

-- Fabricantes Nacionais de Mobiliário
('Ferrante', 'Mobiliário médico nacional', '12345678000207', 'Brasil', 'https://www.ferrante.com.br', '+5511888999999', 'vendas@ferrante.com.br', ARRAY['mobiliario', 'macas', 'cadeiras'], true, ARRAY['ANVISA', 'INMETRO']),
('Gnatus', 'Equipamentos odonto-médicos', '12345678000208', 'Brasil', 'https://www.gnatus.com.br', '+5511888999998', 'suporte@gnatus.com.br', ARRAY['cadeiras', 'compressores', 'autoclave'], true, ARRAY['ANVISA', 'INMETRO'])

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

-- Log de inserção
DO $$ 
BEGIN 
  RAISE NOTICE '[SEED] Fabricantes de equipamento inseridos: % registros', (
    SELECT COUNT(*) FROM public.fabricantes_equipamento WHERE ativo = true
  ); 
END $$;