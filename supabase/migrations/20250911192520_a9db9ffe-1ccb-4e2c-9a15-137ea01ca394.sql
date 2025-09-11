-- Simplify system: Remove all organization complexity
-- 1 proprietária = 1 clínica model

-- Drop foreign key constraints first
ALTER TABLE public.clinicas DROP CONSTRAINT IF EXISTS clinicas_organizacao_id_fkey;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_organizacao_id_fkey;

-- Remove organizacao_id columns
ALTER TABLE public.clinicas DROP COLUMN IF EXISTS organizacao_id;
ALTER TABLE public.user_roles DROP COLUMN IF EXISTS organizacao_id;

-- Drop the entire organizacoes table
DROP TABLE IF EXISTS public.organizacoes;

-- Remove all existing RLS policies for clinicas
DROP POLICY IF EXISTS "Proprietárias podem criar clínicas da organização" ON public.clinicas;
DROP POLICY IF EXISTS "Proprietárias podem criar clínicas independentes" ON public.clinicas;
DROP POLICY IF EXISTS "Proprietárias podem atualizar suas clínicas" ON public.clinicas;
DROP POLICY IF EXISTS "Proprietárias podem excluir suas clínicas" ON public.clinicas;
DROP POLICY IF EXISTS "Proprietárias podem ver suas clínicas" ON public.clinicas;
DROP POLICY IF EXISTS "Usuários podem ver clínicas através de user_roles" ON public.clinicas;

-- Create simplified RLS policies for clinicas (1 proprietária = 1 clínica)
CREATE POLICY "Proprietárias podem criar sua clínica"
ON public.clinicas
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be proprietária and not have a clinic yet
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'proprietaria'::user_role_type
      AND ur.ativo = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = auth.uid()
      AND ur2.clinica_id IS NOT NULL
      AND ur2.ativo = true
  )
);

CREATE POLICY "Proprietárias podem ver sua clínica"
ON public.clinicas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.clinica_id = clinicas.id
      AND ur.ativo = true
  )
);

CREATE POLICY "Proprietárias podem atualizar sua clínica"
ON public.clinicas
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.clinica_id = clinicas.id
      AND ur.role = 'proprietaria'::user_role_type
      AND ur.ativo = true
  )
);

CREATE POLICY "Proprietárias podem excluir sua clínica"
ON public.clinicas
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.clinica_id = clinicas.id
      AND ur.role = 'proprietaria'::user_role_type
      AND ur.ativo = true
  )
);