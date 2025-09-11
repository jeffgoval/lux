-- Fix RLS: replace restrictive ALL policy with command-specific permissive policies
DROP POLICY IF EXISTS "Proprietárias podem gerenciar suas clínicas" ON public.clinicas;

-- SELECT policy (view clinics you manage or own via organization)
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

-- UPDATE policy
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

-- DELETE policy
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

-- INSERT policies
-- Already created: "Proprietárias podem criar clínicas independentes"
-- Add another to allow creating clinics linked to an owned organization
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
