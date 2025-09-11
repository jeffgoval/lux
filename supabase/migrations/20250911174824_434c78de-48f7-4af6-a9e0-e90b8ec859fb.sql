-- Fix infinite recursion in RLS policies by removing cross-references

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Profissionais podem ver suas clínicas" ON public.clinicas;

-- Create a new policy for clinicas SELECT based on user_roles
CREATE POLICY "Usuários podem ver clínicas através de user_roles" 
ON public.clinicas 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.clinica_id = clinicas.id 
    AND ur.ativo = true
  )
);

-- Update profissionais policy to avoid referencing clinicas table
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar profissionais de suas cl" ON public.profissionais;

CREATE POLICY "Usuários podem gerenciar profissionais através de user_roles" 
ON public.profissionais 
FOR ALL 
USING (
  (user_id = auth.uid()) 
  OR 
  EXISTS (
    SELECT 1 
    FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.clinica_id = profissionais.clinica_id 
    AND ur.ativo = true
  )
);