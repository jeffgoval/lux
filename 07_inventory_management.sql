-- =====================================================
-- INVENTORY AND SUPPLIER MANAGEMENT SYSTEM
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- =====================================================
-- SUPPLIERS TABLE (FORNECEDORES)
-- =====================================================

-- Table for managing product suppliers and vendors
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic information
  nome TEXT NOT NULL,
  razao_social TEXT,
  nome_fantasia TEXT,
  cnpj TEXT,
  
  -- Contact information
  contato_principal TEXT,
  telefone TEXT,
  email TEXT,
  website TEXT,
  
  -- Address information
  endereco JSONB,
  
  -- Business information
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  atividade_principal TEXT,
  
  -- Supplier performance
  prazo_entrega_dias INTEGER DEFAULT 7,
  prazo_pagamento_dias INTEGER DEFAULT 30,
  avaliacao INTEGER CHECK (avaliacao >= 1 AND avaliacao <= 5),
  
  -- Financial terms
  desconto_padrao DECIMAL(5,2) DEFAULT 0,
  valor_minimo_pedido DECIMAL(10,2),
  frete_gratis_acima DECIMAL(10,2),
  
  -- Categories and specialties
  categorias_produtos categoria_produto[],
  especialidades TEXT[],
  marcas_representadas TEXT[],
  
  -- Documentation and compliance
  documentos JSONB DEFAULT '{}'::jsonb, -- Store document references
  certificacoes TEXT[],
  licencas TEXT[],
  
  -- Performance metrics
  total_pedidos INTEGER DEFAULT 0,
  valor_total_compras DECIMAL(12,2) DEFAULT 0,
  ultima_compra TIMESTAMP WITH TIME ZONE,
  
  -- Notes and observations
  observacoes TEXT,
  condicoes_especiais TEXT,
  
  -- Status and relationship
  ativo BOOLEAN NOT NULL DEFAULT true,
  preferencial BOOLEAN DEFAULT false,
  bloqueado BOOLEAN DEFAULT false,
  motivo_bloqueio TEXT,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- =====================================================
-- PRODUCTS TABLE (PRODUTOS)
-- =====================================================

-- Main table for product catalog and inventory management
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Product identification
  nome TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  codigo_interno TEXT,
  codigo_barras TEXT,
  codigo_fabricante TEXT,
  
  -- Classification
  categoria categoria_produto NOT NULL,
  subcategoria TEXT,
  tipo_produto TEXT, -- 'consumivel', 'permanente', 'descartavel'
  
  -- Supplier information
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  fornecedor_secundario_id UUID REFERENCES public.fornecedores(id),
  
  -- Pricing
  preco_custo DECIMAL(10,2),
  preco_venda DECIMAL(10,2),
  margem_lucro DECIMAL(5,2),
  preco_promocional DECIMAL(10,2),
  data_inicio_promocao DATE,
  data_fim_promocao DATE,
  
  -- Inventory control
  quantidade INTEGER NOT NULL DEFAULT 0,
  unidade_medida TEXT NOT NULL DEFAULT 'unidade',
  estoque_minimo INTEGER NOT NULL DEFAULT 1,
  estoque_maximo INTEGER,
  ponto_reposicao INTEGER,
  
  -- Product details
  descricao TEXT,
  composicao TEXT,
  indicacoes TEXT[],
  contraindicacoes TEXT[],
  modo_uso TEXT,
  cuidados_especiais TEXT,
  
  -- Regulatory information
  registro_anvisa TEXT,
  numero_lote TEXT,
  data_fabricacao DATE,
  data_vencimento DATE,
  
  -- Physical characteristics
  peso_gramas DECIMAL(8,2),
  dimensoes JSONB, -- {length, width, height}
  volume_ml DECIMAL(8,2),
  cor TEXT,
  
  -- Storage requirements
  temperatura_armazenamento TEXT,
  umidade_maxima INTEGER,
  proteger_luz BOOLEAN DEFAULT false,
  armazenamento_especial TEXT,
  
  -- Location and organization
  localizacao TEXT, -- Shelf, room, etc.
  setor TEXT,
  corredor TEXT,
  prateleira TEXT,
  
  -- Usage tracking
  consumo_medio_mensal DECIMAL(8,2),
  ultima_utilizacao TIMESTAMP WITH TIME ZONE,
  vezes_utilizado INTEGER DEFAULT 0,
  
  -- Quality control
  status status_produto NOT NULL DEFAULT 'disponivel',
  motivo_indisponibilidade TEXT,
  data_ultima_verificacao DATE,
  proximo_controle_qualidade DATE,
  
  -- Images and documentation
  imagem_url TEXT,
  ficha_tecnica_url TEXT,
  bula_url TEXT,
  certificado_qualidade_url TEXT,
  
  -- Multi-tenant support
  organizacao_id UUID REFERENCES public.organizacoes(id),
  clinica_id UUID REFERENCES public.clinicas(id),
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT produtos_preco_custo_positivo CHECK (preco_custo IS NULL OR preco_custo >= 0),
  CONSTRAINT produtos_preco_venda_positivo CHECK (preco_venda IS NULL OR preco_venda >= 0),
  CONSTRAINT produtos_quantidade_positiva CHECK (quantidade >= 0),
  CONSTRAINT produtos_estoque_minimo_positivo CHECK (estoque_minimo >= 0),
  CONSTRAINT produtos_estoque_maximo_valido CHECK (estoque_maximo IS NULL OR estoque_maximo >= estoque_minimo),
  CONSTRAINT produtos_data_vencimento_valida CHECK (data_vencimento IS NULL OR data_vencimento > data_fabricacao),
  CONSTRAINT produtos_promocao_valida CHECK (
    (data_inicio_promocao IS NULL AND data_fim_promocao IS NULL) OR
    (data_inicio_promocao IS NOT NULL AND data_fim_promocao IS NOT NULL AND data_fim_promocao > data_inicio_promocao)
  )
);

-- =====================================================
-- STOCK MOVEMENTS TABLE (MOVIMENTAÇÃO DE ESTOQUE)
-- =====================================================

-- Table for tracking all inventory movements
CREATE TABLE public.movimentacao_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Movement identification
  numero_movimento TEXT NOT NULL UNIQUE DEFAULT ('MOV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('movimento_sequence')::TEXT, 6, '0')),
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  
  -- Movement details
  tipo tipo_movimentacao NOT NULL,
  quantidade INTEGER NOT NULL,
  quantidade_anterior INTEGER NOT NULL,
  quantidade_nova INTEGER NOT NULL,
  
  -- Financial information
  valor_unitario DECIMAL(10,2),
  valor_total DECIMAL(10,2),
  
  -- Movement context
  motivo TEXT NOT NULL,
  observacoes TEXT,
  documento_referencia TEXT, -- Invoice, order number, etc.
  
  -- Related entities
  responsavel_id UUID NOT NULL REFERENCES auth.users(id),
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  cliente_id UUID, -- For sales/usage
  sessao_id UUID REFERENCES public.sessoes_atendimento(id),
  
  -- Product batch information
  lote TEXT,
  data_vencimento_lote DATE,
  
  -- Location information
  localizacao_origem TEXT,
  localizacao_destino TEXT,
  
  -- Approval workflow
  aprovado BOOLEAN DEFAULT true,
  aprovado_por UUID REFERENCES auth.users(id),
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  data_movimentacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT movimentacao_quantidade_positiva CHECK (quantidade > 0),
  CONSTRAINT movimentacao_valor_positivo CHECK (valor_unitario IS NULL OR valor_unitario >= 0)
);

-- =====================================================
-- PURCHASE ORDERS TABLE (PEDIDOS DE COMPRA)
-- =====================================================

-- Table for managing purchase orders to suppliers
CREATE TABLE public.pedidos_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Order identification
  numero_pedido TEXT NOT NULL UNIQUE DEFAULT ('PC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('pedido_sequence')::TEXT, 6, '0')),
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id),
  
  -- Order details
  data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
  data_entrega_prevista DATE,
  data_entrega_real DATE,
  
  -- Financial information
  valor_produtos DECIMAL(12,2) NOT NULL DEFAULT 0,
  valor_frete DECIMAL(10,2) DEFAULT 0,
  valor_desconto DECIMAL(10,2) DEFAULT 0,
  valor_impostos DECIMAL(10,2) DEFAULT 0,
  valor_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Payment terms
  forma_pagamento TEXT,
  condicoes_pagamento TEXT,
  prazo_pagamento_dias INTEGER,
  
  -- Status and workflow
  status TEXT NOT NULL DEFAULT 'rascunho', -- 'rascunho', 'enviado', 'confirmado', 'entregue', 'cancelado'
  prioridade TEXT DEFAULT 'normal', -- 'baixa', 'normal', 'alta', 'urgente'
  
  -- Delivery information
  endereco_entrega JSONB,
  transportadora TEXT,
  codigo_rastreamento TEXT,
  
  -- Notes and observations
  observacoes TEXT,
  condicoes_especiais TEXT,
  
  -- Approval workflow
  aprovado BOOLEAN DEFAULT false,
  aprovado_por UUID REFERENCES auth.users(id),
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  
  -- Multi-tenant support
  organizacao_id UUID REFERENCES public.organizacoes(id),
  clinica_id UUID REFERENCES public.clinicas(id),
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT pedidos_data_entrega_valida CHECK (data_entrega_prevista IS NULL OR data_entrega_prevista >= data_pedido),
  CONSTRAINT pedidos_valor_positivo CHECK (valor_total >= 0),
  CONSTRAINT pedidos_prazo_positivo CHECK (prazo_pagamento_dias IS NULL OR prazo_pagamento_dias > 0)
);

-- =====================================================
-- PURCHASE ORDER ITEMS TABLE (ITENS DO PEDIDO)
-- =====================================================

-- Table for purchase order line items
CREATE TABLE public.itens_pedido_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos_compra(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  
  -- Item details
  quantidade INTEGER NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  desconto_percentual DECIMAL(5,2) DEFAULT 0,
  desconto_valor DECIMAL(10,2) DEFAULT 0,
  valor_total DECIMAL(10,2) NOT NULL,
  
  -- Product specifications
  especificacoes TEXT,
  observacoes_item TEXT,
  
  -- Delivery tracking
  quantidade_entregue INTEGER DEFAULT 0,
  quantidade_pendente INTEGER,
  
  -- Status
  status TEXT DEFAULT 'pendente', -- 'pendente', 'entregue', 'cancelado'
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT itens_quantidade_positiva CHECK (quantidade > 0),
  CONSTRAINT itens_preco_positivo CHECK (preco_unitario >= 0),
  CONSTRAINT itens_desconto_valido CHECK (desconto_percentual >= 0 AND desconto_percentual <= 100),
  CONSTRAINT itens_quantidade_entregue_valida CHECK (quantidade_entregue >= 0 AND quantidade_entregue <= quantidade)
);

-- =====================================================
-- INVENTORY ALERTS TABLE (ALERTAS DE ESTOQUE)
-- =====================================================

-- Table for inventory alerts and notifications
CREATE TABLE public.alertas_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  
  -- Alert details
  tipo_alerta TEXT NOT NULL, -- 'estoque_baixo', 'vencimento_proximo', 'produto_vencido', 'estoque_zerado'
  nivel_prioridade TEXT NOT NULL DEFAULT 'medio', -- 'baixo', 'medio', 'alto', 'critico'
  
  -- Alert content
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  dados_contexto JSONB,
  
  -- Status and resolution
  ativo BOOLEAN NOT NULL DEFAULT true,
  resolvido BOOLEAN DEFAULT false,
  data_resolucao TIMESTAMP WITH TIME ZONE,
  resolvido_por UUID REFERENCES auth.users(id),
  acao_tomada TEXT,
  
  -- Notification settings
  notificar_email BOOLEAN DEFAULT true,
  notificar_sistema BOOLEAN DEFAULT true,
  usuarios_notificados UUID[],
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SEQUENCES FOR NUMBERING
-- =====================================================

CREATE SEQUENCE IF NOT EXISTS movimento_sequence START 1;
CREATE SEQUENCE IF NOT EXISTS pedido_sequence START 1;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for fornecedores table
CREATE INDEX idx_fornecedores_cnpj ON public.fornecedores(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX idx_fornecedores_ativo ON public.fornecedores(ativo);
CREATE INDEX idx_fornecedores_avaliacao ON public.fornecedores(avaliacao) WHERE avaliacao IS NOT NULL;
CREATE INDEX idx_fornecedores_categorias ON public.fornecedores USING GIN(categorias_produtos);

-- Indexes for produtos table
CREATE INDEX idx_produtos_categoria ON public.produtos(categoria);
CREATE INDEX idx_produtos_fornecedor ON public.produtos(fornecedor_id) WHERE fornecedor_id IS NOT NULL;
CREATE INDEX idx_produtos_codigo_barras ON public.produtos(codigo_barras) WHERE codigo_barras IS NOT NULL;
CREATE INDEX idx_produtos_status ON public.produtos(status);
CREATE INDEX idx_produtos_estoque_baixo ON public.produtos(quantidade, estoque_minimo) WHERE quantidade <= estoque_minimo;
CREATE INDEX idx_produtos_vencimento ON public.produtos(data_vencimento) WHERE data_vencimento IS NOT NULL;
CREATE INDEX idx_produtos_organizacao ON public.produtos(organizacao_id) WHERE organizacao_id IS NOT NULL;
CREATE INDEX idx_produtos_clinica ON public.produtos(clinica_id) WHERE clinica_id IS NOT NULL;
CREATE INDEX idx_produtos_ativo ON public.produtos(ativo);

-- Indexes for movimentacao_estoque table
CREATE INDEX idx_movimentacao_produto ON public.movimentacao_estoque(produto_id);
CREATE INDEX idx_movimentacao_tipo ON public.movimentacao_estoque(tipo);
CREATE INDEX idx_movimentacao_data ON public.movimentacao_estoque(data_movimentacao);
CREATE INDEX idx_movimentacao_responsavel ON public.movimentacao_estoque(responsavel_id);
CREATE INDEX idx_movimentacao_fornecedor ON public.movimentacao_estoque(fornecedor_id) WHERE fornecedor_id IS NOT NULL;
CREATE INDEX idx_movimentacao_sessao ON public.movimentacao_estoque(sessao_id) WHERE sessao_id IS NOT NULL;

-- Indexes for pedidos_compra table
CREATE INDEX idx_pedidos_fornecedor ON public.pedidos_compra(fornecedor_id);
CREATE INDEX idx_pedidos_status ON public.pedidos_compra(status);
CREATE INDEX idx_pedidos_data ON public.pedidos_compra(data_pedido);
CREATE INDEX idx_pedidos_entrega ON public.pedidos_compra(data_entrega_prevista) WHERE data_entrega_prevista IS NOT NULL;
CREATE INDEX idx_pedidos_organizacao ON public.pedidos_compra(organizacao_id) WHERE organizacao_id IS NOT NULL;
CREATE INDEX idx_pedidos_clinica ON public.pedidos_compra(clinica_id) WHERE clinica_id IS NOT NULL;

-- Indexes for itens_pedido_compra table
CREATE INDEX idx_itens_pedido ON public.itens_pedido_compra(pedido_id);
CREATE INDEX idx_itens_produto ON public.itens_pedido_compra(produto_id);
CREATE INDEX idx_itens_status ON public.itens_pedido_compra(status);

-- Indexes for alertas_estoque table
CREATE INDEX idx_alertas_produto ON public.alertas_estoque(produto_id);
CREATE INDEX idx_alertas_tipo ON public.alertas_estoque(tipo_alerta);
CREATE INDEX idx_alertas_ativo ON public.alertas_estoque(ativo);
CREATE INDEX idx_alertas_prioridade ON public.alertas_estoque(nivel_prioridade);
CREATE INDEX idx_alertas_resolvido ON public.alertas_estoque(resolvido);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Triggers for updating timestamps
CREATE TRIGGER update_fornecedores_updated_at
  BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at
  BEFORE UPDATE ON public.pedidos_compra
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alertas_updated_at
  BEFORE UPDATE ON public.alertas_estoque
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update product stock on movements
CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS TRIGGER AS $
BEGIN
  -- Update product quantity based on movement type
  CASE NEW.tipo
    WHEN 'entrada' THEN
      UPDATE public.produtos 
      SET quantidade = quantidade + NEW.quantidade,
          ultima_utilizacao = CASE WHEN NEW.tipo = 'saida' THEN NEW.data_movimentacao ELSE ultima_utilizacao END
      WHERE id = NEW.produto_id;
    
    WHEN 'saida' THEN
      UPDATE public.produtos 
      SET quantidade = quantidade - NEW.quantidade,
          ultima_utilizacao = NEW.data_movimentacao,
          vezes_utilizado = vezes_utilizado + 1
      WHERE id = NEW.produto_id;
    
    WHEN 'ajuste' THEN
      UPDATE public.produtos 
      SET quantidade = NEW.quantidade_nova
      WHERE id = NEW.produto_id;
  END CASE;
  
  -- Update movement record with previous and new quantities
  NEW.quantidade_anterior := (SELECT quantidade FROM public.produtos WHERE id = NEW.produto_id);
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER update_stock_on_movement
  BEFORE INSERT ON public.movimentacao_estoque
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_stock();

-- Trigger to check for low stock alerts
CREATE OR REPLACE FUNCTION public.check_stock_alerts()
RETURNS TRIGGER AS $
DECLARE
  produto_record RECORD;
BEGIN
  -- Get product details
  SELECT * INTO produto_record
  FROM public.produtos
  WHERE id = NEW.produto_id;
  
  -- Check for low stock
  IF produto_record.quantidade <= produto_record.estoque_minimo THEN
    INSERT INTO public.alertas_estoque (
      produto_id,
      tipo_alerta,
      nivel_prioridade,
      titulo,
      mensagem,
      dados_contexto
    ) VALUES (
      NEW.produto_id,
      CASE WHEN produto_record.quantidade = 0 THEN 'estoque_zerado' ELSE 'estoque_baixo' END,
      CASE WHEN produto_record.quantidade = 0 THEN 'critico' ELSE 'alto' END,
      CASE WHEN produto_record.quantidade = 0 THEN 'Produto sem estoque' ELSE 'Estoque baixo' END,
      format('Produto %s está com estoque %s (mínimo: %s)', 
             produto_record.nome, 
             produto_record.quantidade, 
             produto_record.estoque_minimo),
      jsonb_build_object(
        'quantidade_atual', produto_record.quantidade,
        'estoque_minimo', produto_record.estoque_minimo,
        'movimento_id', NEW.id
      )
    ) ON CONFLICT DO NOTHING; -- Avoid duplicate alerts
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER check_alerts_after_movement
  AFTER INSERT ON public.movimentacao_estoque
  FOR EACH ROW
  EXECUTE FUNCTION public.check_stock_alerts();

-- Trigger to update purchase order totals
CREATE OR REPLACE FUNCTION public.update_purchase_order_totals()
RETURNS TRIGGER AS $
DECLARE
  order_total DECIMAL(12,2);
BEGIN
  -- Calculate total from all items
  SELECT COALESCE(SUM(valor_total), 0) INTO order_total
  FROM public.itens_pedido_compra
  WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id);
  
  -- Update purchase order
  UPDATE public.pedidos_compra
  SET valor_produtos = order_total,
      valor_total = order_total + COALESCE(valor_frete, 0) + COALESCE(valor_impostos, 0) - COALESCE(valor_desconto, 0)
  WHERE id = COALESCE(NEW.pedido_id, OLD.pedido_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.itens_pedido_compra
  FOR EACH ROW
  EXECUTE FUNCTION public.update_purchase_order_totals();

-- =====================================================
-- INVENTORY MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to register stock movement
CREATE OR REPLACE FUNCTION public.register_stock_movement(
  p_produto_id UUID,
  p_tipo tipo_movimentacao,
  p_quantidade INTEGER,
  p_motivo TEXT,
  p_valor_unitario DECIMAL DEFAULT NULL,
  p_fornecedor_id UUID DEFAULT NULL,
  p_sessao_id UUID DEFAULT NULL,
  p_lote TEXT DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  new_movement_id UUID;
  current_stock INTEGER;
BEGIN
  -- Get current stock
  SELECT quantidade INTO current_stock
  FROM public.produtos
  WHERE id = p_produto_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  
  -- Validate stock for outbound movements
  IF p_tipo = 'saida' AND current_stock < p_quantidade THEN
    RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', current_stock, p_quantidade;
  END IF;
  
  -- Insert movement record
  INSERT INTO public.movimentacao_estoque (
    produto_id,
    tipo,
    quantidade,
    quantidade_anterior,
    quantidade_nova,
    motivo,
    valor_unitario,
    valor_total,
    fornecedor_id,
    sessao_id,
    lote,
    observacoes,
    responsavel_id
  ) VALUES (
    p_produto_id,
    p_tipo,
    p_quantidade,
    current_stock,
    CASE 
      WHEN p_tipo = 'entrada' THEN current_stock + p_quantidade
      WHEN p_tipo = 'saida' THEN current_stock - p_quantidade
      ELSE p_quantidade -- For adjustments, p_quantidade is the new total
    END,
    p_motivo,
    p_valor_unitario,
    p_valor_unitario * p_quantidade,
    p_fornecedor_id,
    p_sessao_id,
    p_lote,
    p_observacoes,
    auth.uid()
  ) RETURNING id INTO new_movement_id;
  
  RETURN new_movement_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create purchase order
CREATE OR REPLACE FUNCTION public.create_purchase_order(
  p_fornecedor_id UUID,
  p_data_entrega_prevista DATE DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL,
  p_organizacao_id UUID DEFAULT NULL,
  p_clinica_id UUID DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  new_order_id UUID;
BEGIN
  -- Insert purchase order
  INSERT INTO public.pedidos_compra (
    fornecedor_id,
    data_entrega_prevista,
    observacoes,
    organizacao_id,
    clinica_id,
    criado_por
  ) VALUES (
    p_fornecedor_id,
    p_data_entrega_prevista,
    p_observacoes,
    p_organizacao_id,
    p_clinica_id,
    auth.uid()
  ) RETURNING id INTO new_order_id;
  
  RETURN new_order_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to add item to purchase order
CREATE OR REPLACE FUNCTION public.add_purchase_order_item(
  p_pedido_id UUID,
  p_produto_id UUID,
  p_quantidade INTEGER,
  p_preco_unitario DECIMAL,
  p_desconto_percentual DECIMAL DEFAULT 0,
  p_especificacoes TEXT DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  new_item_id UUID;
  item_total DECIMAL(10,2);
BEGIN
  -- Calculate item total
  item_total := p_quantidade * p_preco_unitario * (1 - p_desconto_percentual / 100);
  
  -- Insert order item
  INSERT INTO public.itens_pedido_compra (
    pedido_id,
    produto_id,
    quantidade,
    preco_unitario,
    desconto_percentual,
    valor_total,
    quantidade_pendente,
    especificacoes
  ) VALUES (
    p_pedido_id,
    p_produto_id,
    p_quantidade,
    p_preco_unitario,
    p_desconto_percentual,
    item_total,
    p_quantidade,
    p_especificacoes
  ) RETURNING id INTO new_item_id;
  
  RETURN new_item_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get low stock products
CREATE OR REPLACE FUNCTION public.get_low_stock_products(p_clinica_id UUID DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  nome TEXT,
  categoria categoria_produto,
  quantidade INTEGER,
  estoque_minimo INTEGER,
  fornecedor_nome TEXT,
  dias_sem_estoque INTEGER
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.nome,
    p.categoria,
    p.quantidade,
    p.estoque_minimo,
    f.nome as fornecedor_nome,
    CASE 
      WHEN p.quantidade = 0 AND p.consumo_medio_mensal > 0 
      THEN 0
      WHEN p.consumo_medio_mensal > 0 
      THEN FLOOR((p.quantidade - p.estoque_minimo) / (p.consumo_medio_mensal / 30))::INTEGER
      ELSE NULL
    END as dias_sem_estoque
  FROM public.produtos p
  LEFT JOIN public.fornecedores f ON f.id = p.fornecedor_id
  WHERE p.ativo = true
    AND p.quantidade <= p.estoque_minimo
    AND (p_clinica_id IS NULL OR p.clinica_id = p_clinica_id)
  ORDER BY 
    CASE WHEN p.quantidade = 0 THEN 0 ELSE 1 END,
    (p.quantidade::DECIMAL / NULLIF(p.estoque_minimo, 0)) ASC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get inventory valuation
CREATE OR REPLACE FUNCTION public.get_inventory_valuation(p_clinica_id UUID DEFAULT NULL)
RETURNS JSONB AS $
DECLARE
  valuation JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_produtos', COUNT(*),
    'valor_total_custo', SUM(quantidade * COALESCE(preco_custo, 0)),
    'valor_total_venda', SUM(quantidade * COALESCE(preco_venda, 0)),
    'produtos_sem_estoque', COUNT(*) FILTER (WHERE quantidade = 0),
    'produtos_estoque_baixo', COUNT(*) FILTER (WHERE quantidade <= estoque_minimo AND quantidade > 0),
    'produtos_vencendo', COUNT(*) FILTER (WHERE data_vencimento <= CURRENT_DATE + INTERVAL '30 days'),
    'por_categoria', (
      SELECT jsonb_object_agg(
        categoria,
        jsonb_build_object(
          'quantidade_produtos', COUNT(*),
          'valor_estoque', SUM(quantidade * COALESCE(preco_custo, 0))
        )
      )
      FROM public.produtos
      WHERE ativo = true
        AND (p_clinica_id IS NULL OR clinica_id = p_clinica_id)
      GROUP BY categoria
    )
  ) INTO valuation
  FROM public.produtos
  WHERE ativo = true
    AND (p_clinica_id IS NULL OR clinica_id = p_clinica_id);
  
  RETURN valuation;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacao_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedido_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_estoque ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Policies for fornecedores
CREATE POLICY "Profissionais podem visualizar fornecedores"
ON public.fornecedores FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Gerentes podem gerenciar fornecedores"
ON public.fornecedores FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('proprietaria', 'gerente')
      AND ur.ativo = true
  )
) WITH CHECK (criado_por IS NULL OR auth.uid() = criado_por);

-- Policies for produtos
CREATE POLICY "Profissionais podem visualizar produtos de suas clínicas"
ON public.produtos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.organizacao_id = public.produtos.organizacao_id OR ur.clinica_id = public.produtos.clinica_id)
      AND ur.ativo = true
  )
);

CREATE POLICY "Profissionais podem gerenciar produtos"
ON public.produtos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.organizacao_id = public.produtos.organizacao_id OR ur.clinica_id = public.produtos.clinica_id)
      AND ur.ativo = true
  )
) WITH CHECK (criado_por IS NULL OR auth.uid() = criado_por);

-- Policies for movimentacao_estoque
CREATE POLICY "Profissionais podem visualizar movimentações de suas clínicas"
ON public.movimentacao_estoque FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.produtos p
    JOIN public.user_roles ur ON (ur.organizacao_id = p.organizacao_id OR ur.clinica_id = p.clinica_id)
    WHERE p.id = public.movimentacao_estoque.produto_id
      AND ur.user_id = auth.uid()
      AND ur.ativo = true
  )
);

CREATE POLICY "Profissionais podem registrar movimentações"
ON public.movimentacao_estoque FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.produtos p
    JOIN public.user_roles ur ON (ur.organizacao_id = p.organizacao_id OR ur.clinica_id = p.clinica_id)
    WHERE p.id = NEW.produto_id
      AND ur.user_id = auth.uid()
      AND ur.ativo = true
  ) AND responsavel_id = auth.uid()
);

-- Policies for pedidos_compra
CREATE POLICY "Profissionais podem visualizar pedidos de suas clínicas"
ON public.pedidos_compra FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.organizacao_id = public.pedidos_compra.organizacao_id OR ur.clinica_id = public.pedidos_compra.clinica_id)
      AND ur.ativo = true
  )
);

CREATE POLICY "Gerentes podem gerenciar pedidos"
ON public.pedidos_compra FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.organizacao_id = public.pedidos_compra.organizacao_id OR ur.clinica_id = public.pedidos_compra.clinica_id)
      AND ur.role IN ('proprietaria', 'gerente')
      AND ur.ativo = true
  )
) WITH CHECK (criado_por = auth.uid());

-- Policies for itens_pedido_compra
CREATE POLICY "Profissionais podem visualizar itens de pedidos de suas clínicas"
ON public.itens_pedido_compra FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.pedidos_compra pc
    JOIN public.user_roles ur ON (ur.organizacao_id = pc.organizacao_id OR ur.clinica_id = pc.clinica_id)
    WHERE pc.id = public.itens_pedido_compra.pedido_id
      AND ur.user_id = auth.uid()
      AND ur.ativo = true
  )
);

-- Policies for alertas_estoque
CREATE POLICY "Profissionais podem visualizar alertas de suas clínicas"
ON public.alertas_estoque FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.produtos p
    JOIN public.user_roles ur ON (ur.organizacao_id = p.organizacao_id OR ur.clinica_id = p.clinica_id)
    WHERE p.id = public.alertas_estoque.produto_id
      AND ur.user_id = auth.uid()
      AND ur.ativo = true
  )
);

-- =====================================================
-- COMPLETION VERIFICATION
-- =====================================================

-- Verify all tables were created successfully
DO $
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('fornecedores', 'produtos', 'movimentacao_estoque', 'pedidos_compra', 'itens_pedido_compra', 'alertas_estoque');
  
  IF table_count = 6 THEN
    RAISE NOTICE 'Inventory management system created successfully: % tables', table_count;
  ELSE
    RAISE EXCEPTION 'Inventory management system incomplete - only % tables created', table_count;
  END IF;
END $;

-- Add comments to track completion
COMMENT ON TABLE public.fornecedores IS 'Suppliers management table - created ' || now();
COMMENT ON TABLE public.produtos IS 'Products catalog and inventory table - created ' || now();
COMMENT ON TABLE public.movimentacao_estoque IS 'Stock movements tracking table - created ' || now();
COMMENT ON TABLE public.pedidos_compra IS 'Purchase orders management table - created ' || now();
COMMENT ON TABLE public.itens_pedido_compra IS 'Purchase order items table - created ' || now();
COMMENT ON TABLE public.alertas_estoque IS 'Inventory alerts and notifications table - created ' || now();