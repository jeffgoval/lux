-- Execute this SQL in the Supabase Dashboard SQL Editor
-- This will fix the RLS policy issue for clinic creation during onboarding

-- Add INSERT policy for clinicas table
CREATE POLICY "Proprietárias podem criar clínicas"
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

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'clinicas'
ORDER BY policyname;
