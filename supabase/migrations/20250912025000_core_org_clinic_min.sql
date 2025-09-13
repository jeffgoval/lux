-- Minimal core for clinicas to satisfy older ALTER migrations

CREATE TABLE IF NOT EXISTS public.clinicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Basic index
CREATE INDEX IF NOT EXISTS idx_clinicas_ativo ON public.clinicas(ativo);