-- Fix RLS policies to resolve infinite recursion and permission issues

-- Drop existing problematic policies for organizacoes that cause infinite recursion
DROP POLICY IF EXISTS "Proprietárias podem gerenciar suas organizações" ON public.organizacoes;
DROP POLICY IF EXISTS "Usuários podem ver organizações de suas clínicas" ON public.organizacoes;

-- Create new, simpler policies for organizacoes without circular references
CREATE POLICY "Users can create their own organizations" 
ON public.organizacoes 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = proprietaria_id);

CREATE POLICY "Users can manage their own organizations" 
ON public.organizacoes 
FOR ALL 
TO authenticated
USING (auth.uid() = proprietaria_id);