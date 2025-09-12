-- Add missing email column to clinicas table
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS email TEXT;

-- Add index for email column for better performance
CREATE INDEX IF NOT EXISTS idx_clinicas_email ON public.clinicas(email);