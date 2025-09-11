-- Idempotent policy setup for clinicas
-- Drop conflicting policies if they exist
DROP POLICY IF EXISTS "Proprietárias podem ver suas clínicas" ON public.clinicas;
DROP POLICY IF EXISTS "Proprietárias podem atualizar suas clínicas" ON public.clinicas;
DROP POLICY IF EXISTS "Proprietárias podem excluir suas clínicas" ON public.clinicas;
DROP POLICY IF EXISTS "Proprietárias podem criar clínicas da organização" ON public.clinicas;

-- Ensure the previous restrictive ALL policy is removed
DROP POLICY IF EXISTS "Proprietárias podem gerenciar suas clínicas" ON public.clinicas;

-- Recreate command-specific permissive policies
CREATE POLICY "Proprietárias podem ver suas clínicas"
ON public.clinicas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.clinica_id = clinicas.id
      AND ur.role = 'proprietaria'::user_role_type
      AND ur.ativo = true
  )
  OR (
    organizacao_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organizacoes o
      WHERE o.id = clinicas.organizacao_id
        AND o.proprietaria_id = auth.uid()
    )
  )
);

CREATE POLICY "Proprietárias podem atualizar suas clínicas"
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
  OR (
    organizacao_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organizacoes o
      WHERE o.id = clinicas.organizacao_id
        AND o.proprietaria_id = auth.uid()
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.clinica_id = clinicas.id
      AND ur.role = 'proprietaria'::user_role_type
      AND ur.ativo = true
  )
  OR (
    organizacao_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organizacoes o
      WHERE o.id = clinicas.organizacao_id
        AND o.proprietaria_id = auth.uid()
    )
  )
);

CREATE POLICY "Proprietárias podem excluir suas clínicas"
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
  OR (
    organizacao_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organizacoes o
      WHERE o.id = clinicas.organizacao_id
        AND o.proprietaria_id = auth.uid()
    )
  )
);

-- INSERT policy that allows creating clinics linked to an owned organization
CREATE POLICY "Proprietárias podem criar clínicas da organização"
ON public.clinicas
FOR INSERT
TO authenticated
WITH CHECK (
  organizacao_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organizacoes o
    WHERE o.id = clinicas.organizacao_id
      AND o.proprietaria_id = auth.uid()
  )
);

-- NOTE: We already have policy "Proprietárias podem criar clínicas independentes" (FOR INSERT)
-- which allows creating single clinics when user has role 'proprietaria'.
