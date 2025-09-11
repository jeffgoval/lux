-- Normalize clinicas RLS: drop conflicting policies and recreate clean set
DROP POLICY IF EXISTS "Proprietárias podem ver suas clínicas" ON public.clinicas;
DROP POLICY IF EXISTS "Proprietárias podem atualizar suas clínicas" ON public.clinicas;
DROP POLICY IF EXISTS "Proprietárias podem excluir suas clínicas" ON public.clinicas;
DROP POLICY IF EXISTS "Proprietárias podem criar clínicas da organização" ON public.clinicas;
-- Keep "Usuários podem ver clínicas através de user_roles" if it exists

-- SELECT policy
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

-- INSERT policy for org-linked clinics
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
