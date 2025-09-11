-- Atualizar a política RLS para aceitar 'visitante' em vez de 'cliente'
DROP POLICY IF EXISTS "Users can create initial role" ON public.user_roles;

CREATE POLICY "Users can create initial role" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) AND 
  (role = 'visitante'::user_role_type)
);