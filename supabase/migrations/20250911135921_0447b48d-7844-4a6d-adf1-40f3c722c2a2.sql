-- Popular banco de dados com dados de exemplo
-- Seguindo estrutura hierárquica: Organizações → Clínicas → Dados Base → Produtos → Dados Operacionais

-- 1. ORGANIZAÇÕES
INSERT INTO public.organizacoes (id, nome, cnpj, plano, criado_por, ativo) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Clínica Estética Premium', '12.345.678/0001-90', 'premium', '550e8400-e29b-41d4-a716-446655440000', true),
('550e8400-e29b-41d4-a716-446655440001', 'Grupo Bella Vista', '98.765.432/0001-10', 'enterprise', '550e8400-e29b-41d4-a716-446655440001', true);

-- 2. CLÍNICAS
INSERT INTO public.clinicas (id, nome, organizacao_id, email, telefone, endereco, criado_por, ativo) VALUES
('660e8400-e29b-41d4-a716-446655440000', 'Premium - Jardins', '550e8400-e29b-41d4-a716-446655440000', 'jardins@premium.com', '(11) 3456-7890', 'Rua Augusta, 123 - Jardins, São Paulo - SP', '550e8400-e29b-41d4-a716-446655440000', true),
('660e8400-e29b-41d4-a716-446655440001', 'Premium - Vila Madalena', '550e8400-e29b-41d4-a716-446655440000', 'vila@premium.com', '(11) 3456-7891', 'Rua Harmonia, 456 - Vila Madalena, São Paulo - SP', '550e8400-e29b-41d4-a716-446655440000', true),
('660e8400-e29b-41d4-a716-446655440002', 'Bella Vista - Matriz', '550e8400-e29b-41d4-a716-446655440001', 'matriz@bellavista.com', '(11) 2345-6789', 'Av. Paulista, 789 - Bela Vista, São Paulo - SP', '550e8400-e29b-41d4-a716-446655440001', true);

-- 3. FABRICANTES DE EQUIPAMENTOS
INSERT INTO public.fabricantes_equipamento (id, nome, email, telefone, contato, suporte_tecnico, garantia_meses, ativo) VALUES
('770e8400-e29b-41d4-a716-446655440000', 'Ibramed', 'contato@ibramed.com.br', '(11) 4567-8901', 'João Silva', 'suporte@ibramed.com.br', 24, true),
('770e8400-e29b-41d4-a716-446655440001', 'HTM Eletrônica', 'vendas@htm.com.br', '(11) 4567-8902', 'Maria Santos', 'tecnico@htm.com.br', 18, true),
('770e8400-e29b-41d4-a716-446655440002', 'KLD Biosistemas', 'info@kld.com.br', '(11) 4567-8903', 'Carlos Oliveira', 'suporte@kld.com.br', 12, true);

-- 4. FORNECEDORES
INSERT INTO public.fornecedores (id, nome, cnpj, email, telefone, contato, endereco, avaliacao, prazo_entrega_dias, observacoes, ativo, criado_por) VALUES
('880e8400-e29b-41d4-a716-446655440000', 'Adcos Cosméticos', '11.222.333/0001-44', 'vendas@adcos.com.br', '(11) 5678-9012', 'Ana Costa', 'Rua das Flores, 100 - SP', 5, 3, 'Fornecedor principal de cosméticos', true, '550e8400-e29b-41d4-a716-446655440000'),
('880e8400-e29b-41d4-a716-446655440001', 'ISDIN Brasil', '22.333.444/0001-55', 'comercial@isdin.com.br', '(11) 5678-9013', 'Pedro Lima', 'Av. Brasil, 200 - SP', 4, 5, 'Produtos dermatológicos', true, '550e8400-e29b-41d4-a716-446655440000'),
('880e8400-e29b-41d4-a716-446655440002', 'Vichy Laboratórios', '33.444.555/0001-66', 'atendimento@vichy.com.br', '(11) 5678-9014', 'Lucia Ferreira', 'Rua da Saúde, 300 - SP', 5, 2, 'Linha profissional', true, '550e8400-e29b-41d4-a716-446655440001');

-- 5. EQUIPAMENTOS
INSERT INTO public.equipamentos (id, nome, modelo, numero_serie, tipo, fabricante_id, data_compra, valor_compra, valor_atual, status, localizacao, voltagem, potencia, frequencia, indicacoes, contraindicacoes, protocolos, horas_uso, proxima_manutencao, organizacao_id, clinica_id, criado_por) VALUES
('990e8400-e29b-41d4-a716-446655440000', 'Laser Alexandrite', 'LightSheer DESIRE', 'LS2023001', 'laser', '770e8400-e29b-41d4-a716-446655440000', '2023-01-15', 85000.00, 75000.00, 'ativo', 'Sala 1 - Jardins', '220V', '800W', '755nm', ARRAY['Depilação a laser', 'Lesões pigmentadas'], ARRAY['Gravidez', 'Pele bronzeada', 'Medicamentos fotossensibilizantes'], ARRAY['Depilação facial', 'Depilação corporal'], 245, '2025-03-15', '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000'),

('990e8400-e29b-41d4-a716-446655440001', 'Radiofrequência', 'Accent Prime', 'AP2023002', 'radiofrequencia', '770e8400-e29b-41d4-a716-446655440001', '2023-03-20', 65000.00, 58000.00, 'ativo', 'Sala 2 - Jardins', '220V', '600W', '40.68MHz', ARRAY['Flacidez facial', 'Flacidez corporal', 'Gordura localizada'], ARRAY['Gravidez', 'Marcapasso', 'Implantes metálicos na área'], ARRAY['Lifting facial', 'Redução de medidas'], 189, '2025-05-20', '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000'),

('990e8400-e29b-41d4-a716-446655440002', 'Microagulhamento', 'Dermapen 4', 'DP4-2023003', 'microagulhamento', '770e8400-e29b-41d4-a716-446655440002', '2023-06-10', 8500.00, 7500.00, 'manutencao', 'Sala 3 - Vila Madalena', '110V', '12W', 'Variável', ARRAY['Cicatrizes de acne', 'Estrias', 'Rejuvenescimento'], ARRAY['Infecções ativas', 'Queloides', 'Uso de isotretinoína'], ARRAY['Tratamento de cicatrizes', 'Rejuvenescimento facial'], 156, '2025-02-10', '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000'),

('990e8400-e29b-41d4-a716-446655440003', 'Criolipólise', 'CoolSculpting', 'CS2022004', 'criolipolise', '770e8400-e29b-41d4-a716-446655440000', '2022-11-25', 120000.00, 95000.00, 'ativo', 'Sala 4 - Bella Vista', '220V', '1200W', 'Resfriamento controlado', ARRAY['Gordura localizada', 'Papada', 'Flancos'], ARRAY['Gravidez', 'Hérnias', 'Crioglobulinemia'], ARRAY['Redução de gordura abdominal', 'Tratamento de papada'], 312, '2025-04-25', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001'),

('990e8400-e29b-41d4-a716-446655440004', 'Ultrassom Microfocado', 'Ulthera', 'ULT2023005', 'ultrassom', '770e8400-e29b-41d4-a716-446655440001', '2023-08-15', 95000.00, 88000.00, 'ativo', 'Sala 1 - Bella Vista', '220V', '1000W', '4MHz', ARRAY['Lifting facial', 'Flacidez cervical', 'Sobrancelhas caídas'], ARRAY['Gravidez', 'Infecções locais', 'Implantes faciais'], ARRAY['Lifting não invasivo', 'Rejuvenescimento'], 98, '2025-06-15', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001'),

('990e8400-e29b-41d4-a716-446655440005', 'Laser CO2 Fracionado', 'SmartXide DOT', 'SX2023006', 'laser', '770e8400-e29b-41d4-a716-446655440002', '2023-10-05', 75000.00, 70000.00, 'ativo', 'Sala 2 - Vila Madalena', '220V', '900W', '10600nm', ARRAY['Cicatrizes', 'Rugas profundas', 'Melasma'], ARRAY['Pele bronzeada', 'Queloides', 'Herpes ativo'], ARRAY['Resurfacing facial', 'Tratamento de cicatrizes'], 67, '2025-08-05', '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000');

-- 6. PRODUTOS
INSERT INTO public.produtos (id, nome, marca, categoria, descricao, fornecedor_id, preco_custo, preco_venda, quantidade, estoque_minimo, estoque_maximo, unidade_medida, lote, data_vencimento, codigo_barras, localizacao, indicacoes, contraindicacoes, modo_uso, composicao, registro_anvisa, status, organizacao_id, clinica_id, criado_por) VALUES
('aa0e8400-e29b-41d4-a716-446655440000', 'Protetor Solar Facial FPS 60', 'ISDIN', 'dermatocosmeticos', 'Protetor solar facial com base aquosa', '880e8400-e29b-41d4-a716-446655440001', 45.90, 89.90, 25, 10, 50, 'unidade', 'LOTE2024001', '2026-12-31', '7891234567890', 'Estoque A1', ARRAY['Proteção solar diária', 'Peles oleosas'], ARRAY['Alergia aos componentes'], 'Aplicar 30 minutos antes da exposição solar', 'Óxido de zinco, Dióxido de titânio', '12345.6789.001', 'disponivel', '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000'),

('aa0e8400-e29b-41d4-a716-446655440001', 'Sérum Vitamina C 20%', 'Adcos', 'cosmeticos', 'Sérum antioxidante com vitamina C', '880e8400-e29b-41d4-a716-446655440000', 65.50, 129.90, 8, 5, 30, 'unidade', 'LOTE2024002', '2025-08-15', '7891234567891', 'Estoque A2', ARRAY['Antioxidante', 'Anti-idade', 'Clareamento'], ARRAY['Peles muito sensíveis'], 'Aplicar pela manhã antes do protetor solar', 'Ácido L-ascórbico 20%', '12345.6789.002', 'disponivel', '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000'),

('aa0e8400-e29b-41d4-a716-446655440002', 'Ácido Hialurônico Gel', 'Vichy', 'injetaveis', 'Gel de ácido hialurônico para preenchimento', '880e8400-e29b-41d4-a716-446655440002', 380.00, 750.00, 12, 3, 20, 'seringa', 'LOTE2024003', '2026-05-20', '7891234567892', 'Geladeira 1', ARRAY['Preenchimento facial', 'Hidratação dérmica'], ARRAY['Infecções locais', 'Alergia ao ácido hialurônico'], 'Aplicação por profissional habilitado', 'Ácido hialurônico 20mg/ml', '12345.6789.003', 'disponivel', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001'),

('aa0e8400-e29b-41d4-a716-446655440003', 'Toxina Botulínica Tipo A', 'Allergan', 'injetaveis', 'Toxina botulínica para tratamento de rugas', '880e8400-e29b-41d4-a716-446655440000', 420.00, 850.00, 6, 2, 15, 'frasco', 'LOTE2024004', '2025-11-30', '7891234567893', 'Geladeira 2', ARRAY['Rugas dinâmicas', 'Hiperidrose', 'Bruxismo'], ARRAY['Gravidez', 'Miastenia gravis'], 'Reconstituir com soro fisiológico', 'Toxina botulínica tipo A 100U', '12345.6789.004', 'disponivel', '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000'),

('aa0e8400-e29b-41d4-a716-446655440004', 'Peeling Químico TCA 35%', 'Adcos', 'peelings', 'Peeling de ácido tricloroacético', '880e8400-e29b-41d4-a716-446655440000', 85.00, 180.00, 3, 2, 12, 'frasco', 'LOTE2024005', '2025-09-10', '7891234567894', 'Estoque B1', ARRAY['Melasma', 'Cicatrizes superficiais', 'Fotoenvelhecimento'], ARRAY['Pele sensível', 'Uso de retinoides'], 'Aplicação por profissional qualificado', 'Ácido tricloroacético 35%', '12345.6789.005', 'disponivel', '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000'),

('aa0e8400-e29b-41d4-a716-446655440005', 'Creme Pós-Procedimento', 'ISDIN', 'pos_procedimento', 'Creme reparador para pós-procedimentos', '880e8400-e29b-41d4-a716-446655440001', 32.90, 69.90, 18, 8, 25, 'unidade', 'LOTE2024006', '2026-03-25', '7891234567895', 'Estoque A3', ARRAY['Cicatrização', 'Hidratação pós-laser'], NULL, 'Aplicar 2x ao dia na área tratada', 'Dexpantenol, Alantoína', '12345.6789.006', 'disponivel', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001'),

('aa0e8400-e29b-41d4-a716-446655440006', 'Máscara Hidrogel', 'Vichy', 'mascaras', 'Máscara facial hidratante', '880e8400-e29b-41d4-a716-446655440002', 28.50, 59.90, 35, 15, 40, 'unidade', 'LOTE2024007', '2025-12-15', '7891234567896', 'Estoque A4', ARRAY['Hidratação intensa', 'Pós-procedimento'], NULL, 'Aplicar por 15-20 minutos', 'Ácido hialurônico, Colágeno', '12345.6789.007', 'disponivel', '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000'),

('aa0e8400-e29b-41d4-a716-446655440007', 'Fios de PDO', 'KLD', 'fios_sustentacao', 'Fios de polidioxanona para lifting', '880e8400-e29b-41d4-a716-446655440000', 45.00, 95.00, 2, 5, 25, 'unidade', 'LOTE2024008', '2027-01-30', '7891234567897', 'Estoque C1', ARRAY['Flacidez facial', 'Lifting não cirúrgico'], ARRAY['Infecções', 'Queloides'], 'Aplicação por médico especialista', 'Polidioxanona 100%', '12345.6789.008', 'indisponivel', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001');

-- 7. PRESTADORES DE SERVIÇOS
INSERT INTO public.prestadores_servicos (id, nome, tipo, cpf, telefone, email, endereco, empresa, cnpj_empresa, descricao_servicos, valor_hora, horarios_disponibilidade, documentos, organizacao_id, clinica_id, ativo, criado_por) VALUES
('bb0e8400-e29b-41d4-a716-446655440000', 'Dr. Roberto Silva', 'medico', '123.456.789-01', '(11) 99999-0001', 'roberto@premium.com', 'Rua das Acácias, 45 - SP', NULL, NULL, 'Dermatologista especialista em procedimentos estéticos', 250.00, '{"segunda": ["08:00-12:00", "14:00-18:00"], "terça": ["08:00-12:00", "14:00-18:00"]}', ARRAY['CRM: 123456', 'RQE: 789012'], '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440000', true, '550e8400-e29b-41d4-a716-446655440000'),

('bb0e8400-e29b-41d4-a716-446655440001', 'Dra. Ana Paula Santos', 'medico', '987.654.321-09', '(11) 99999-0002', 'ana@premium.com', 'Av. Ibirapuera, 123 - SP', NULL, NULL, 'Cirurgiã plástica com foco em harmonização facial', 300.00, '{"quarta": ["09:00-17:00"], "quinta": ["09:00-17:00"], "sexta": ["09:00-15:00"]}', ARRAY['CRM: 654321', 'SBCP: 456789'], '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001', true, '550e8400-e29b-41d4-a716-446655440000'),

('bb0e8400-e29b-41d4-a716-446655440002', 'Mariana Costa', 'fisioterapeuta', '456.789.123-45', '(11) 99999-0003', 'mariana@bellavista.com', 'Rua da Consolação, 789 - SP', NULL, NULL, 'Fisioterapeuta dermato-funcional', 120.00, '{"segunda": ["07:00-13:00"], "terça": ["07:00-13:00"], "quarta": ["07:00-13:00"]}', ARRAY['CREFITO: 123456-F'], '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', true, '550e8400-e29b-41d4-a716-446655440001');

-- 8. TEMPLATES DE PROCEDIMENTOS
INSERT INTO public.templates_procedimentos (id, nome_template, tipo_procedimento, categoria, descricao, campos_obrigatorios, campos_opcionais, validacoes, valores_padrao, ordem_exibicao, ativo, criado_por) VALUES
('cc0e8400-e29b-41d4-a716-446655440000', 'Aplicação de Botox Padrão', 'botox_toxina', 'Injetáveis', 'Template padrão para aplicação de toxina botulínica', 
'{"regioes_aplicacao": {"tipo": "array", "obrigatorio": true}, "unidades_totais": {"tipo": "number", "obrigatorio": true}, "produto_utilizado": {"tipo": "string", "obrigatorio": true}}',
'{"diluicao": {"tipo": "string"}, "tecnica": {"tipo": "string"}, "orientacoes_pos": {"tipo": "text"}}',
'{"unidades_totais": {"min": 1, "max": 200}, "regioes_aplicacao": {"min_items": 1}}',
'{"diluicao": "2,5ml soro fisiológico", "orientacoes_pos": "Não deitar por 4 horas, evitar exercícios"}',
1, true, '550e8400-e29b-41d4-a716-446655440000'),

('cc0e8400-e29b-41d4-a716-446655440001', 'Preenchimento com Ácido Hialurônico', 'preenchimento_facial', 'Injetáveis', 'Template para preenchimentos faciais', 
'{"area_tratada": {"tipo": "string", "obrigatorio": true}, "volume_aplicado": {"tipo": "number", "obrigatorio": true}, "produto": {"tipo": "string", "obrigatorio": true}}',
'{"tecnica_aplicacao": {"tipo": "string"}, "anestesia": {"tipo": "string"}, "massagem_pos": {"tipo": "boolean"}}',
'{"volume_aplicado": {"min": 0.1, "max": 5.0}}',
'{"anestesia": "Tópica com lidocaína", "massagem_pos": false}',
2, true, '550e8400-e29b-41d4-a716-446655440000'),

('cc0e8400-e29b-41d4-a716-446655440002', 'Laser Alexandrite Depilação', 'depilacao_laser', 'Laser', 'Template para sessões de depilação a laser', 
'{"areas_tratadas": {"tipo": "array", "obrigatorio": true}, "fluencia": {"tipo": "number", "obrigatorio": true}, "pulso": {"tipo": "number", "obrigatorio": true}}',
'{"refrigeracao": {"tipo": "string"}, "filtro_utilizado": {"tipo": "string"}, "reacao_imediata": {"tipo": "text"}}',
'{"fluencia": {"min": 10, "max": 40}, "pulso": {"min": 3, "max": 100}}',
'{"refrigeracao": "Ar frio -10°C", "filtro_utilizado": "755nm"}',
3, true, '550e8400-e29b-41d4-a716-446655440000');

-- 9. PRONTUÁRIOS (baseados nos clientes mock)
INSERT INTO public.prontuarios (id, numero_prontuario, paciente_id, medico_responsavel_id, status, nome_completo, cpf_encrypted, rg_encrypted, data_nascimento_encrypted, telefone_encrypted, email_encrypted, endereco_encrypted, anamnese, historico_medico, medicamentos_atuais, alergias, contraindicacoes, nivel_confidencialidade, versao, criado_por) VALUES
('dd0e8400-e29b-41d4-a716-446655440000', 'PRONT-2025-000001', 'dd0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'ativo', 'Maria Silva Santos', '123.456.789-01', '12.345.678-9', '15/03/1985', '(11) 98765-4321', 'maria.silva@email.com', 'Rua das Flores, 123 - Jardins, São Paulo - SP', 'Paciente busca tratamento para rugas de expressão na região da testa e ao redor dos olhos. Relata exposição solar frequente no passado.', 'Sem histórico de cirurgias anteriores. Nunca realizou procedimentos estéticos invasivos.', 'Não utiliza medicamentos contínuos', 'Não apresenta alergias conhecidas', 'Nenhuma contraindicação identificada', 'medico_responsavel', 1, '550e8400-e29b-41d4-a716-446655440000'),

('dd0e8400-e29b-41d4-a716-446655440001', 'PRONT-2025-000002', 'dd0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'ativo', 'Ana Paula Oliveira', '987.654.321-09', '98.765.432-1', '22/07/1990', '(11) 91234-5678', 'ana.oliveira@email.com', 'Av. Paulista, 456 - Bela Vista, São Paulo - SP', 'Paciente deseja harmonização facial com preenchimento de sulco nasogeniano e aumento de volume labial.', 'Rinoplastia aos 25 anos. Histórico familiar de melasma.', 'Anticoncepcional oral', 'Alergia a dipirona', 'Evitar procedimentos durante período menstrual', 'medico_responsavel', 1, '550e8400-e29b-41d4-a716-446655440000'),

('dd0e8400-e29b-41d4-a716-446655440002', 'PRONT-2025-000003', 'dd0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'ativo', 'João Carlos Ferreira', '456.789.123-45', '45.678.912-3', '10/11/1978', '(11) 93456-7890', 'joao.ferreira@email.com', 'Rua Augusta, 789 - Consolação, São Paulo - SP', 'Paciente masculino busca tratamento para calvície e deseja procedimentos para redução de gordura abdominal.', 'Hipertensão controlada com medicamento. Pai com histórico de calvície precoce.', 'Losartana 50mg', 'Não possui alergias', 'Controlar pressão arterial antes dos procedimentos', 'medico_responsavel', 1, '550e8400-e29b-41d4-a716-446655440001'),

('dd0e8400-e29b-41d4-a716-446655440003', 'PRONT-2025-000004', 'dd0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'ativo', 'Carla Mendes Costa', '789.123.456-78', '78.912.345-6', '05/09/1995', '(11) 94567-8901', 'carla.costa@email.com', 'Rua da Consolação, 321 - República, São Paulo - SP', 'Jovem de 28 anos interessada em prevenção do envelhecimento. Pele oleosa com tendência acneica.', 'Tratamento para acne na adolescência com isotretinoína.', 'Nenhum medicamento regular', 'Sensibilidade a produtos com álcool', 'Evitar procedimentos muito agressivos devido à sensibilidade', 'medico_responsavel', 1, '550e8400-e29b-41d4-a716-446655440001'),

('dd0e8400-e29b-41d4-a716-446655440004', 'PRONT-2025-000005', 'dd0e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'ativo', 'Roberto Santos Lima', '321.654.987-12', '32.165.498-7', '18/12/1965', '(11) 95678-9012', 'roberto.lima@email.com', 'Av. Faria Lima, 654 - Itaim Bibi, São Paulo - SP', 'Executivo de 58 anos busca rejuvenescimento facial. Apresenta flacidez e rugas acentuadas.', 'Diabetes tipo 2 controlada. Cirurgia de vesícula há 10 anos.', 'Metformina, Sinvastatina', 'Alergia a iodo', 'Monitorar glicemia antes dos procedimentos', 'medico_responsavel', 1, '550e8400-e29b-41d4-a716-446655440000'),

('dd0e8400-e29b-41d4-a716-446655440005', 'PRONT-2025-000006', 'dd0e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'ativo', 'Fernanda Alves Rodrigues', '654.987.321-45', '65.498.732-1', '30/04/1982', '(11) 96789-0123', 'fernanda.rodrigues@email.com', 'Rua Oscar Freire, 987 - Jardins, São Paulo - SP', 'Paciente deseja tratamento para manchas faciais e melhoria da textura da pele.', 'Duas gestações. Melasma desenvolvido na primeira gravidez.', 'Vitamina D, Ácido fólico', 'Não possui alergias conhecidas', 'Proteger do sol após procedimentos', 'medico_responsavel', 1, '550e8400-e29b-41d4-a716-446655440001');

-- 10. SESSÕES DE ATENDIMENTO
INSERT INTO public.sessoes_atendimento (id, prontuario_id, data_sessao, tipo_procedimento, profissional_id, duracao_minutos, detalhes_procedimento, observacoes, resultados, valor_procedimento, desconto_aplicado, valor_final, proxima_sessao_recomendada, intervalo_recomendado_dias, criado_por) VALUES
('ee0e8400-e29b-41d4-a716-446655440000', 'dd0e8400-e29b-41d4-a716-446655440000', '2024-12-15 14:00:00+00', 'botox_toxina', '550e8400-e29b-41d4-a716-446655440000', 45, '{"regioes_aplicacao": ["Testa", "Glabela"], "unidades_totais": 25, "produto_utilizado": "Botox Allergan", "diluicao": "2,5ml soro"}', 'Aplicação realizada sem intercorrências. Paciente tolerou bem o procedimento.', 'Resultado inicial satisfatório. Retorno em 15 dias para avaliação.', 650.00, 50.00, 600.00, '2025-04-15', 120, '550e8400-e29b-41d4-a716-446655440000'),

('ee0e8400-e29b-41d4-a716-446655440001', 'dd0e8400-e29b-41d4-a716-446655440001', '2024-11-20 15:30:00+00', 'preenchimento_facial', '550e8400-e29b-41d4-a716-446655440000', 60, '{"area_tratada": "Sulco nasogeniano", "volume_aplicado": 1.2, "produto": "Ácido Hialurônico Juvederm", "tecnica": "Cânula"}', 'Preenchimento bilateral do sulco nasogeniano. Aplicada anestesia tópica previamente.', 'Excelente resultado estético. Paciente muito satisfeita.', 1200.00, 0.00, 1200.00, '2025-05-20', 180, '550e8400-e29b-41d4-a716-446655440000'),

('ee0e8400-e29b-41d4-a716-446655440002', 'dd0e8400-e29b-41d4-a716-446655440002', '2024-10-10 10:00:00+00', 'depilacao_laser', '550e8400-e29b-41d4-a716-446655440001', 90, '{"areas_tratadas": ["Face", "Pescoço"], "fluencia": 18, "pulso": 30, "filtro": "755nm"}', 'Primeira sessão de depilação. Paciente apresentou boa tolerância ao procedimento.', 'Redução de aproximadamente 20% dos pelos. Agendar próxima sessão.', 450.00, 0.00, 450.00, '2025-01-10', 90, '550e8400-e29b-41d4-a716-446655440001');

-- 11. IMAGENS MÉDICAS
INSERT INTO public.imagens_medicas (id, prontuario_id, sessao_id, nome_arquivo, tipo_imagem, caminho_storage, url_publica, tamanho_bytes, dimensoes, regiao_anatomica, procedimento_relacionado, data_captura, equipamento_utilizado, hash_arquivo, criptografada, watermark_aplicado, consentimento_uso, criado_por) VALUES
('ff0e8400-e29b-41d4-a716-446655440000', 'dd0e8400-e29b-41d4-a716-446655440000', 'ee0e8400-e29b-41d4-a716-446655440000', 'maria_santos_antes_botox.jpg', 'antes', 'imagens-medicas/2024/12/maria_santos_antes_botox.jpg', NULL, 2048576, '1920x1280', 'Face frontal', 'botox_toxina', '2024-12-15 13:45:00+00', 'Canon EOS R5', 'sha256:abc123def456', false, true, true, '550e8400-e29b-41d4-a716-446655440000'),

('ff0e8400-e29b-41d4-a716-446655440001', 'dd0e8400-e29b-41d4-a716-446655440001', 'ee0e8400-e29b-41d4-a716-446655440001', 'ana_oliveira_antes_preenchimento.jpg', 'antes', 'imagens-medicas/2024/11/ana_oliveira_antes_preenchimento.jpg', NULL, 1875432, '1920x1280', 'Perfil direito', 'preenchimento_facial', '2024-11-20 15:15:00+00', 'Canon EOS R5', 'sha256:def789ghi012', false, true, true, '550e8400-e29b-41d4-a716-446655440000'),

('ff0e8400-e29b-41d4-a716-446655440002', 'dd0e8400-e29b-41d4-a716-446655440002', 'ee0e8400-e29b-41d4-a716-446655440002', 'joao_ferreira_laser_face.jpg', 'durante', 'imagens-medicas/2024/10/joao_ferreira_laser_face.jpg', NULL, 1654321, '1920x1280', 'Face completa', 'depilacao_laser', '2024-10-10 10:30:00+00', 'Canon EOS R5', 'sha256:ghi345jkl678', false, true, true, '550e8400-e29b-41d4-a716-446655440001');

-- 12. CONSENTIMENTOS DIGITAIS
INSERT INTO public.consentimentos_digitais (id, prontuario_id, tipo_consentimento, titulo, conteudo, versao_documento, data_assinatura, assinatura_digital, ip_assinatura, dispositivo_assinatura, consentimento_id, ativo, criado_por) VALUES
('gg0e8400-e29b-41d4-a716-446655440000', 'dd0e8400-e29b-41d4-a716-446655440000', 'procedimento', 'Consentimento para Aplicação de Toxina Botulínica', 'Eu, Maria Silva Santos, declaro estar ciente dos riscos e benefícios do procedimento de aplicação de toxina botulínica...', '1.0', '2024-12-15 13:30:00+00', 'SIGN_HASH_123456789', '192.168.1.100', 'Tablet iPad', NULL, true, '550e8400-e29b-41d4-a716-446655440000'),

('gg0e8400-e29b-41d4-a716-446655440001', 'dd0e8400-e29b-41d4-a716-446655440001', 'procedimento', 'Consentimento para Preenchimento Facial', 'Eu, Ana Paula Oliveira, declaro estar ciente dos riscos e benefícios do procedimento de preenchimento facial com ácido hialurônico...', '1.0', '2024-11-20 15:00:00+00', 'SIGN_HASH_987654321', '192.168.1.101', 'Tablet Samsung', NULL, true, '550e8400-e29b-41d4-a716-446655440000'),

('gg0e8400-e29b-41d4-a716-446655440002', 'dd0e8400-e29b-41d4-a716-446655440000', 'imagem', 'Consentimento para Uso de Imagens', 'Eu, Maria Silva Santos, autorizo o uso das imagens capturadas durante meu tratamento para fins médicos e educacionais...', '1.0', '2024-12-15 13:30:00+00', 'SIGN_HASH_456789123', '192.168.1.100', 'Tablet iPad', NULL, true, '550e8400-e29b-41d4-a716-446655440000');