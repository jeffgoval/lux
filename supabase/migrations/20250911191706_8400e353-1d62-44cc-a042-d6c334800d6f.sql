-- Fix the missing INSERT policy for independent clinics
-- This is the core issue: users with 'proprietaria' role need to be able to create their first clinic
CREATE POLICY "Proprietárias podem criar clínicas independentes"
ON public.clinicas
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'proprietaria'::user_role_type
      AND ur.ativo = true
  )
);