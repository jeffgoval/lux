-- Fix RLS policies to resolve infinite recursion and permission issues

-- Drop existing problematic policies for organizacoes
DROP POLICY IF EXISTS "Proprietárias podem gerenciar suas organizações" ON public.organizacoes;
DROP POLICY IF EXISTS "Usuários podem ver organizações de suas clínicas" ON public.organizacoes;

-- Create new, simpler policies for organizacoes to avoid infinite recursion
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

-- Fix profiles policies - only recreate if they don't work properly
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create more permissive policies for profiles
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);