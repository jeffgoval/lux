-- Fix proprietaria_id column issue - ensure it exists and is properly configured
-- This migration addresses the PGRST204 error: "Could not find the 'proprietaria_id' column"

-- First, ensure the column exists
DO $$ 
BEGIN
  -- Add proprietaria_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clinicas' 
    AND column_name = 'proprietaria_id'
  ) THEN
    ALTER TABLE public.clinicas ADD COLUMN proprietaria_id UUID REFERENCES auth.users(id);
    RAISE NOTICE 'Added proprietaria_id column to clinicas table';
  ELSE
    RAISE NOTICE 'proprietaria_id column already exists in clinicas table';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error adding proprietaria_id column: %', SQLERRM;
END $$;

-- Ensure organizacao_id can be null (for independent clinics)
DO $$ 
BEGIN
  ALTER TABLE public.clinicas ALTER COLUMN organizacao_id DROP NOT NULL;
  RAISE NOTICE 'Made organizacao_id nullable in clinicas table';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'organizacao_id might already be nullable: %', SQLERRM;
END $$;

-- Force schema cache refresh by updating table comment
COMMENT ON TABLE public.clinicas IS 'Clinicas table with proprietaria_id support for independent clinics - updated ' || now();

-- Verify the column exists and show structure
DO $$
DECLARE
  col_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clinicas' 
    AND column_name = 'proprietaria_id'
  ) INTO col_exists;
  
  IF col_exists THEN
    RAISE NOTICE 'SUCCESS: proprietaria_id column exists in clinicas table';
  ELSE
    RAISE NOTICE 'ERROR: proprietaria_id column still missing from clinicas table';
  END IF;
END $$;