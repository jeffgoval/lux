-- Add criado_por column to clinicas table if it doesn't exist
DO $$
BEGIN
  -- Add criado_por column
  ALTER TABLE public.clinicas ADD COLUMN criado_por UUID REFERENCES auth.users(id);
EXCEPTION WHEN duplicate_column THEN
  -- Column already exists
  NULL;
END $$;