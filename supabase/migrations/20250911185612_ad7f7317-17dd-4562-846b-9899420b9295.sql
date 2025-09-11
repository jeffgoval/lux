-- Make organizacao_id nullable in clinicas table to support single clinic setup
ALTER TABLE public.clinicas ALTER COLUMN organizacao_id DROP NOT NULL;

-- Update RLS policies for clinicas to handle nullable organizacao_id
DROP POLICY IF EXISTS "Proprietárias podem gerenciar clínicas de suas organizações" ON public.clinicas;
DROP POLICY IF EXISTS "Usuários podem ver clínicas através de user_roles" ON public.clinicas;

-- Policy for direct clinic access through user_roles
CREATE POLICY "Usuários podem ver clínicas através de user_roles" 
ON public.clinicas 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = auth.uid() 
    AND ur.clinica_id = clinicas.id 
    AND ur.ativo = true
));

-- Policy for proprietarias managing their clinics (both direct and through organization)
CREATE POLICY "Proprietárias podem gerenciar suas clínicas" 
ON public.clinicas 
FOR ALL 
USING (
  -- Direct ownership through user_roles
  (EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
      AND ur.clinica_id = clinicas.id 
      AND ur.role = 'proprietaria'::user_role_type
      AND ur.ativo = true
  ))
  OR 
  -- Ownership through organization
  (organizacao_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM organizacoes o 
    WHERE o.id = clinicas.organizacao_id 
      AND o.proprietaria_id = auth.uid()
  ))
);

-- Update servicos RLS policy to handle nullable organizacao_id
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar serviços de suas clíni" ON public.servicos;

CREATE POLICY "Usuários podem gerenciar serviços de suas clínicas" 
ON public.servicos 
FOR ALL 
USING (
  -- Direct clinic ownership through user_roles
  (EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
      AND ur.clinica_id = servicos.clinica_id 
      AND ur.ativo = true
  ))
  OR
  -- Organization ownership (legacy support)
  (EXISTS (
    SELECT 1 FROM clinicas c 
    JOIN organizacoes o ON o.id = c.organizacao_id 
    WHERE c.id = servicos.clinica_id 
      AND o.proprietaria_id = auth.uid()
  ))
  OR
  -- Professional access
  (EXISTS (
    SELECT 1 FROM profissionais p 
    WHERE p.clinica_id = servicos.clinica_id 
      AND p.user_id = auth.uid()
  ))
);