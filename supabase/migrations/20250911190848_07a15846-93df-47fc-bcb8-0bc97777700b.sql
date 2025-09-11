-- Allow proprietarias to create clinics with null organizacao_id (for single clinic setups)
CREATE POLICY "Proprietárias podem criar clínicas independentes" 
ON public.clinicas 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'proprietaria'::user_role_type 
    AND ur.ativo = true
  )
);