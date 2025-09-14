-- =====================================================
-- SEED: CATEGORIAS DE PROCEDIMENTO
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- Categorias principais de procedimentos estéticos
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
-- Toxina Botulínica
('Toxina Botulínica', 'Procedimentos com toxina botulínica (Botox)', 'BOTOX', 'medio', true, 30, true, '#4F46E5', 'syringe'),
('Botox Facial', 'Aplicação de toxina botulínica facial', 'BOTOX-FACE', 'medio', true, 20, true, '#4F46E5', 'face'),
('Botox Corporal', 'Aplicação de toxina botulínica corporal', 'BOTOX-BODY', 'medio', true, 45, true, '#4F46E5', 'body'),

-- Preenchimento
('Preenchimento Facial', 'Preenchimentos com ácido hialurônico', 'PREEN-FACE', 'medio', true, 45, true, '#7C3AED', 'face-smile'),
('Preenchimento Labial', 'Preenchimento específico dos lábios', 'PREEN-LAB', 'medio', true, 30, true, '#7C3AED', 'lips'),
('Preenchimento de Sulco', 'Preenchimento de sulcos e vincos', 'PREEN-SULC', 'medio', true, 35, true, '#7C3AED', 'wrench'),

-- Harmonização Facial
('Harmonização Facial Completa', 'Procedimento completo de harmonização', 'HARM-COMP', 'alto', true, 120, true, '#DC2626', 'sparkles'),
('Mentoplastia', 'Harmonização do mento e queixo', 'MENTO', 'alto', true, 60, true, '#DC2626', 'face-profile'),
('Rinomodelação', 'Harmonização não cirúrgica do nariz', 'RINO', 'alto', true, 90, true, '#DC2626', 'nose'),

-- Laser e IPL
('Laser CO2', 'Tratamentos com laser CO2 fracionado', 'LASER-CO2', 'alto', true, 60, true, '#EF4444', 'laser'),
('IPL', 'Luz intensa pulsada para fotorejuvenescimento', 'IPL', 'medio', true, 45, true, '#F97316', 'sun'),
('Laser Alexandrite', 'Depilação com laser Alexandrite', 'LASER-ALEX', 'medio', false, 30, true, '#F97316', 'zap'),

-- Peeling
('Peeling Químico', 'Peelings químicos faciais', 'PEEL-QUIM', 'medio', true, 45, true, '#10B981', 'droplet'),
('Peeling de Diamante', 'Microdermoabrasão com peeling de diamante', 'PEEL-DIAM', 'baixo', false, 60, true, '#10B981', 'diamond'),
('Peeling Enzimático', 'Peeling com enzimas naturais', 'PEEL-ENZ', 'baixo', false, 40, true, '#10B981', 'leaf'),

-- Tratamentos Corporais
('Criolipólise', 'Redução de gordura localizada por frio', 'CRIO', 'medio', true, 90, true, '#0EA5E9', 'snowflake'),
('Radiofrequência', 'Tratamentos com radiofrequência', 'RF', 'baixo', false, 60, true, '#06B6D4', 'radio'),
('Ultrassom Microfocado', 'HIFU para lifting não cirúrgico', 'HIFU', 'medio', true, 75, true, '#06B6D4', 'waves'),

-- Drenagem e Massagem
('Drenagem Linfática', 'Drenagem linfática manual ou mecânica', 'DREN', 'baixo', false, 60, true, '#8B5CF6', 'droplet-half'),
('Massagem Modeladora', 'Massagem para modelagem corporal', 'MASS-MOD', 'baixo', false, 50, true, '#8B5CF6', 'hand'),
('Endermologia', 'Tratamento com equipamento de endermologia', 'ENDER', 'baixo', false, 45, true, '#8B5CF6', 'activity'),

-- Skincare Avançado
('Hidratação Facial', 'Tratamentos de hidratação profunda', 'HIDRAT', 'baixo', false, 60, true, '#059669', 'droplet'),
('Limpeza de Pele', 'Limpeza de pele profissional', 'LIMP-PELE', 'baixo', false, 90, true, '#059669', 'sparkles'),
('Microagulhamento', 'Estimulação com microagulhas', 'MICRO', 'medio', true, 45, true, '#059669', 'grid'),

-- Procedimentos Especiais
('Fios de PDO', 'Lifting com fios de polidioxanona', 'PDO', 'alto', true, 90, true, '#BE185D', 'thread'),
('Enzimas Injetáveis', 'Aplicação de enzimas para redução de gordura', 'ENZ-INJ', 'alto', true, 30, true, '#BE185D', 'syringe-plus'),
('Bioestimulador', 'Aplicação de bioestimuladores de colágeno', 'BIOEST', 'medio', true, 45, true, '#BE185D', 'dna'),

-- Consultas e Avaliações
('Consulta Inicial', 'Primeira consulta e avaliação', 'CONSULT', 'baixo', false, 60, true, '#6B7280', 'user-check'),
('Retorno', 'Consulta de retorno e acompanhamento', 'RETORNO', 'baixo', false, 30, true, '#6B7280', 'calendar-check'),
('Avaliação Fotográfica', 'Documentação fotográfica dos tratamentos', 'FOTO-AVAL', 'baixo', true, 15, true, '#6B7280', 'camera')

ON CONFLICT (nome) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  codigo = EXCLUDED.codigo,
  nivel_risco = EXCLUDED.nivel_risco,
  requer_consentimento = EXCLUDED.requer_consentimento,
  tempo_medio_minutos = EXCLUDED.tempo_medio_minutos,
  cor_categoria = EXCLUDED.cor_categoria,
  icone = EXCLUDED.icone,
  atualizado_em = now();

-- Log de inserção
DO $$ 
BEGIN 
  RAISE NOTICE '[SEED] Categorias de procedimento inseridas: % registros', (
    SELECT COUNT(*) FROM public.categorias_procedimento WHERE ativo = true
  ); 
END $$;