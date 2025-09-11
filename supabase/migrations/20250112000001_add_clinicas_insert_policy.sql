-- Add INSERT policy for clinicas table to allow onboarding
-- This fixes the RLS error when creating clinics during onboarding

-- Add INSERT policy for proprietarias to create clinics
CREATE POLICY "Proprietárias podem criar clínicas"
ON public.clinicas
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if user has proprietaria role
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'proprietaria'::user_role_type
      AND ur.ativo = true
  )
);

-- Force schema cache refresh
COMMENT ON TABLE public.clinicas IS 'Clinicas table with INSERT policy for onboarding - ' || now();
