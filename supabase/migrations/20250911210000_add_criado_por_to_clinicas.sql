-- Add criado_por column to clinicas table if it doesn't exist
DO $$
BEGIN
  -- Add criado_por column
  ALTER TABLE public.clinicas ADD COLUMN criado_por UUID REFERENCES auth.users(id);
EXCEPTION WHEN duplicate_column THEN
  -- Column already exists
  NULL;
END $$;

-- Update the column to be NOT NULL with a default for existing records
DO $$
BEGIN
  -- Set a default value for existing records (use the first super_admin or a system user)
  UPDATE public.clinicas 
  SET criado_por = (
    SELECT u.id 
    FROM auth.users u 
    JOIN public.user_roles ur ON ur.user_id = u.id 
    WHERE ur.role = 'super_admin' 
    LIMIT 1
  )
  WHERE criado_por IS NULL;
  
  -- Make the column NOT NULL
  ALTER TABLE public.clinicas ALTER COLUMN criado_por SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  -- If there's any error, just make it nullable for now
  NULL;
END $$;