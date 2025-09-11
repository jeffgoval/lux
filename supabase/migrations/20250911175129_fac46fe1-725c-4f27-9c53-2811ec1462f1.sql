-- Drop all existing policies on clinicas and profissionais to start fresh
DROP POLICY IF EXISTS "Proprietárias podem gerenciar clínicas de suas organizações" ON public.clinicas;
DROP POLICY IF EXISTS "Profissionais podem ver suas clínicas" ON public.clinicas;
DROP POLICY IF EXISTS "Usuários podem ver clínicas através de user_roles" ON public.clinicas;
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar profissionais de suas cl" ON public.profissionais;
DROP POLICY IF EXISTS "Usuários podem gerenciar profissionais através de user_roles" ON public.profissionais;

-- Create new policies without cross-references to avoid infinite recursion

-- Clinicas policies - based on organizacoes ownership and user_roles
CREATE POLICY "Proprietárias podem gerenciar clínicas de suas organizações" 
ON public.clinicas 
FOR ALL 
USING (
  EXISTS (
    SELECT 1
    FROM organizacoes o
    WHERE o.id = clinicas.organizacao_id 
    AND o.proprietaria_id = auth.uid()
  )
);

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

-- Profissionais policies - avoid referencing clinicas table
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