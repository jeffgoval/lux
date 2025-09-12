-- Criar tabela clinica_profissionais (ESSENCIAL para vincular profissional à clínica)
CREATE TABLE IF NOT EXISTS public.clinica_profissionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cargo TEXT NOT NULL DEFAULT 'Profissional',
  especialidades TEXT[],
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clinica_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.clinica_profissionais ENABLE ROW LEVEL SECURITY;

-- Criar política permissiva
DROP POLICY IF EXISTS "Allow users to manage their clinic relationships" ON public.clinica_profissionais;
CREATE POLICY "Allow users to manage their clinic relationships"
ON public.clinica_profissionais
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);