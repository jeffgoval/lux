-- FASE 1: Criação de Enums e Tipos Básicos

-- Enum para especialidades médicas
CREATE TYPE especialidade_medica AS ENUM (
  'medico_dermatologista',
  'medico_cirurgiao_plastico', 
  'biomedico_esteta',
  'enfermeiro_esteta',
  'fisioterapeuta_dermato_funcional',
  'nutricionista',
  'esteticista_cosmetologo',
  'tricologista',
  'dentista_harmonizacao',
  'farmaceutico_esteta',
  'terapeuta_capilar',
  'massoterapeuta',
  'maquiador_profissional'
);

-- Enum para categorias de produtos
CREATE TYPE categoria_produto AS ENUM (
  'toxina_botulinica',
  'preenchedores_dermicos',
  'bioestimuladores_colageno',
  'peelings_quimicos',
  'cosmeceuticos',
  'produtos_limpeza',
  'filtros_solares',
  'mascaras_faciais',
  'terapia_capilar',
  'intradermoterapia',
  'anestesicos_topicos'
);

-- Enum para tipos de equipamentos
CREATE TYPE tipo_equipamento AS ENUM (
  'ultrassom_microfocado',
  'laser_fracionado',
  'radiofrequencia',
  'luz_intensa_pulsada',
  'criolipolise',
  'microagulhamento',
  'exossomos',
  'pdrn',
  'eletroterapia',
  'peeling_cristal',
  'ultrassom_estetico'
);

-- Enum para status de produtos
CREATE TYPE status_produto AS ENUM (
  'disponivel',
  'baixo_estoque',
  'vencido',
  'descontinuado'
);

-- Enum para status de equipamentos
CREATE TYPE status_equipamento AS ENUM (
  'ativo',
  'manutencao',
  'inativo',
  'calibracao'
);

-- Enum para tipo de movimentação de estoque
CREATE TYPE tipo_movimentacao AS ENUM (
  'entrada',
  'saida',
  'ajuste',
  'vencimento'
);

-- Enum para tipo de manutenção
CREATE TYPE tipo_manutencao AS ENUM (
  'preventiva',
  'corretiva',
  'calibracao',
  'limpeza'
);

-- Enum para status de manutenção
CREATE TYPE status_manutencao AS ENUM (
  'agendada',
  'realizada',
  'cancelada',
  'pendente'
);

-- Enum para tipo de prestador
CREATE TYPE tipo_prestador AS ENUM (
  'secretaria',
  'limpeza',
  'seguranca',
  'ti',
  'contabilidade',
  'juridico',
  'marketing',
  'outro'
);

-- FASE 2: Tabelas de Especialidades e Profissionais

-- Tabela de especialidades médicas (dados de referência)
CREATE TABLE public.especialidades_medicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo especialidade_medica NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  requisitos TEXT,
  conselho_regulamentador TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- FASE 3: Sistema de Produtos e Estoque

-- Tabela de fornecedores
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  contato TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  prazo_entrega_dias INTEGER DEFAULT 7,
  avaliacao INTEGER CHECK (avaliacao >= 1 AND avaliacao <= 5),
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id)
);

-- Tabela de produtos
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  marca TEXT,
  categoria categoria_produto NOT NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  preco_custo DECIMAL(10,2),
  preco_venda DECIMAL(10,2),
  quantidade INTEGER NOT NULL DEFAULT 0,
  unidade_medida TEXT NOT NULL DEFAULT 'unidade',
  estoque_minimo INTEGER NOT NULL DEFAULT 1,
  estoque_maximo INTEGER,
  data_vencimento DATE,
  lote TEXT,
  codigo_barras TEXT,
  localizacao TEXT,
  status status_produto NOT NULL DEFAULT 'disponivel',
  descricao TEXT,
  indicacoes TEXT[],
  contraindicacoes TEXT[],
  modo_uso TEXT,
  composicao TEXT,
  registro_anvisa TEXT,
  imagem_url TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  organizacao_id UUID REFERENCES public.organizacoes(id),
  clinica_id UUID REFERENCES public.clinicas(id)
);

-- Tabela de movimentação de estoque
CREATE TABLE public.movimentacao_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  tipo tipo_movimentacao NOT NULL,
  quantidade INTEGER NOT NULL,
  valor DECIMAL(10,2),
  motivo TEXT,
  responsavel_id UUID NOT NULL REFERENCES auth.users(id),
  data_movimentacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cliente_id UUID,
  servico_id UUID,
  lote TEXT,
  observacoes TEXT
);

-- FASE 4: Sistema de Equipamentos

-- Tabela de fabricantes de equipamentos
CREATE TABLE public.fabricantes_equipamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  contato TEXT,
  telefone TEXT,
  email TEXT,
  suporte_tecnico TEXT,
  garantia_meses INTEGER DEFAULT 12,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de equipamentos
CREATE TABLE public.equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  modelo TEXT,
  numero_serie TEXT UNIQUE,
  tipo tipo_equipamento NOT NULL,
  fabricante_id UUID REFERENCES public.fabricantes_equipamento(id),
  data_compra DATE,
  valor_compra DECIMAL(12,2),
  valor_atual DECIMAL(12,2),
  localizacao TEXT,
  status status_equipamento NOT NULL DEFAULT 'ativo',
  voltagem TEXT,
  potencia TEXT,
  frequencia TEXT,
  indicacoes TEXT[],
  contraindicacoes TEXT[],
  protocolos TEXT[],
  certificacoes TEXT[],
  manuais TEXT[],
  imagem_url TEXT,
  horas_uso INTEGER NOT NULL DEFAULT 0,
  proxima_manutencao DATE,
  ultima_calibracao DATE,
  observacoes TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  organizacao_id UUID REFERENCES public.organizacoes(id),
  clinica_id UUID REFERENCES public.clinicas(id)
);

-- Tabela de manutenções de equipamentos
CREATE TABLE public.manutencoes_equipamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id),
  tipo tipo_manutencao NOT NULL,
  descricao TEXT NOT NULL,
  tecnico_responsavel TEXT,
  data_agendada DATE NOT NULL,
  data_realizada DATE,
  custo DECIMAL(10,2),
  observacoes TEXT,
  proxima_manutencao DATE,
  status status_manutencao NOT NULL DEFAULT 'agendada',
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id)
);

-- Tabela de uso de equipamentos
CREATE TABLE public.uso_equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id),
  cliente_id UUID,
  servico_id UUID,
  tempo_uso_minutos INTEGER,
  potencia_utilizada TEXT,
  observacoes TEXT,
  data_uso TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responsavel_id UUID NOT NULL REFERENCES auth.users(id)
);

-- FASE 5: Prestadores de Serviços

-- Tabela de prestadores de serviços
CREATE TABLE public.prestadores_servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo tipo_prestador NOT NULL,
  cpf TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  empresa TEXT,
  cnpj_empresa TEXT,
  valor_hora DECIMAL(8,2),
  descricao_servicos TEXT,
  horarios_disponibilidade JSONB,
  documentos TEXT[],
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  organizacao_id UUID REFERENCES public.organizacoes(id),
  clinica_id UUID REFERENCES public.clinicas(id)
);

-- FASE 6: Dados Iniciais (Seed Data)

-- Inserir especialidades médicas
INSERT INTO public.especialidades_medicas (codigo, nome, descricao, conselho_regulamentador) VALUES
('medico_dermatologista', 'Médico Dermatologista', 'Responsável por procedimentos médicos e estéticos da pele', 'CFM'),
('medico_cirurgiao_plastico', 'Médico Cirurgião Plástico', 'Atua em intervenções estéticas mais invasivas', 'CFM'),
('biomedico_esteta', 'Biomédico Esteta', 'Realiza diversos procedimentos estéticos minimamente invasivos', 'CFBM'),
('enfermeiro_esteta', 'Enfermeiro Esteta', 'Habilitado para procedimentos estéticos sob regulamentação', 'COFEN'),
('fisioterapeuta_dermato_funcional', 'Fisioterapeuta Dermato-funcional', 'Trabalha com estética corporal e reabilitação da pele', 'COFFITO'),
('nutricionista', 'Nutricionista', 'Acompanha planos alimentares voltados para estética e bem-estar', 'CFN'),
('esteticista_cosmetologo', 'Esteticista/Cosmetólogo', 'Atua em tratamentos faciais, corporais e cuidados de pele', 'Não aplicável'),
('tricologista', 'Tricologista', 'Especializado em cuidados estéticos e terapêuticos do couro cabeludo', 'Não aplicável'),
('dentista_harmonizacao', 'Dentista (Harmonização Orofacial)', 'Procedimentos faciais e dentários estéticos', 'CFO'),
('farmaceutico_esteta', 'Farmacêutico Esteta', 'Pode aplicar técnicas de estética injetável e outros recursos', 'CFF'),
('terapeuta_capilar', 'Terapeuta Capilar', 'Atua em estética e saúde dos cabelos', 'Não aplicável'),
('massoterapeuta', 'Massoterapeuta', 'Massagens estéticas e terapêuticas', 'Não aplicável'),
('maquiador_profissional', 'Maquiador Profissional', 'Serviços de embelezamento imediato em clínicas', 'Não aplicável');

-- Inserir alguns fabricantes de equipamentos
INSERT INTO public.fabricantes_equipamento (nome, contato, telefone, email, suporte_tecnico, garantia_meses) VALUES
('Alma Lasers', 'Suporte Alma', '(11) 3456-7890', 'suporte@alma.com', '24h', 24),
('Solta Medical', 'Suporte Solta', '(11) 3456-7891', 'suporte@solta.com', 'Comercial', 12),
('Inmode', 'Suporte Inmode', '(11) 3456-7892', 'suporte@inmode.com', '24h', 18),
('BTL', 'Suporte BTL', '(11) 3456-7893', 'suporte@btl.com', 'Comercial', 24),
('Lavieen', 'Suporte Lavieen', '(11) 3456-7894', 'suporte@lavieen.com', '24h', 12);

-- Inserir alguns fornecedores
INSERT INTO public.fornecedores (nome, contato, telefone, email, prazo_entrega_dias, avaliacao, criado_por) VALUES
('Allergan Aesthetics', 'João Silva', '(11) 9999-0001', 'joao@allergan.com', 3, 5, '00000000-0000-0000-0000-000000000000'),
('Galderma', 'Maria Santos', '(11) 9999-0002', 'maria@galderma.com', 5, 4, '00000000-0000-0000-0000-000000000000'),
('Merz Aesthetics', 'Pedro Costa', '(11) 9999-0003', 'pedro@merz.com', 7, 4, '00000000-0000-0000-0000-000000000000'),
('Sinclair Pharma', 'Ana Oliveira', '(11) 9999-0004', 'ana@sinclair.com', 10, 3, '00000000-0000-0000-0000-000000000000'),
('Adcos', 'Carlos Lima', '(11) 9999-0005', 'carlos@adcos.com', 2, 5, '00000000-0000-0000-0000-000000000000');

-- FASE 7: Triggers para atualização automática

-- Trigger para atualizar updated_at em fornecedores
CREATE TRIGGER update_fornecedores_updated_at
  BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em produtos
CREATE TRIGGER update_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em equipamentos
CREATE TRIGGER update_equipamentos_updated_at
  BEFORE UPDATE ON public.equipamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em prestadores_servicos
CREATE TRIGGER update_prestadores_servicos_updated_at
  BEFORE UPDATE ON public.prestadores_servicos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- FASE 8: Políticas RLS

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.especialidades_medicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacao_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabricantes_equipamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencoes_equipamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uso_equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestadores_servicos ENABLE ROW LEVEL SECURITY;

-- Políticas para especialidades_medicas (somente leitura para todos)
CREATE POLICY "Todos podem visualizar especialidades"
  ON public.especialidades_medicas FOR SELECT
  USING (true);

-- Políticas para fornecedores
CREATE POLICY "Profissionais podem visualizar fornecedores"
  ON public.fornecedores FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Gerentes podem gerenciar fornecedores"
  ON public.fornecedores FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() = criado_por);

-- Políticas para produtos
CREATE POLICY "Profissionais podem visualizar produtos"
  ON public.produtos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem gerenciar produtos"
  ON public.produtos FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() = criado_por);

-- Políticas para movimentacao_estoque
CREATE POLICY "Profissionais podem visualizar movimentações"
  ON public.movimentacao_estoque FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem registrar movimentações"
  ON public.movimentacao_estoque FOR INSERT
  WITH CHECK (auth.uid() = responsavel_id);

-- Políticas para fabricantes_equipamento (somente leitura para todos)
CREATE POLICY "Todos podem visualizar fabricantes"
  ON public.fabricantes_equipamento FOR SELECT
  USING (true);

-- Políticas para equipamentos
CREATE POLICY "Profissionais podem visualizar equipamentos"
  ON public.equipamentos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem gerenciar equipamentos"
  ON public.equipamentos FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() = criado_por);

-- Políticas para manutencoes_equipamento
CREATE POLICY "Profissionais podem visualizar manutenções"
  ON public.manutencoes_equipamento FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem gerenciar manutenções"
  ON public.manutencoes_equipamento FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() = criado_por);

-- Políticas para uso_equipamentos
CREATE POLICY "Profissionais podem visualizar usos"
  ON public.uso_equipamentos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profissionais podem registrar usos"
  ON public.uso_equipamentos FOR INSERT
  WITH CHECK (auth.uid() = responsavel_id);

-- Políticas para prestadores_servicos
CREATE POLICY "Profissionais podem visualizar prestadores"
  ON public.prestadores_servicos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Gerentes podem gerenciar prestadores"
  ON public.prestadores_servicos FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() = criado_por);