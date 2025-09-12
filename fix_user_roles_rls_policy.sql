-- Fix RLS policy for user_roles to allow proprietaria role creation during onboarding
-- This replaces the restrictive policy that only allowed 'visitante' roles

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can create their initial role" ON public.user_roles;

-- Create a new policy that allows users to create their initial role as either 'visitante' or 'proprietaria'
CREATE POLICY "Users can create their initial role" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND role IN ('visitante', 'proprietaria')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid()
  )
);

-- Also ensure we have a policy for updating roles (in case it's needed)
CREATE POLICY IF NOT EXISTS "Users can update their own roles" 
ON public.user_roles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);