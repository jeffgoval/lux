-- Fix clinicas table schema to support independent clinics
-- This migration ensures the table structure is correct for onboarding

-- First, make organizacao_id nullable if it's not already
DO $$
BEGIN
  ALTER TABLE public.clinicas ALTER COLUMN organizacao_id DROP NOT NULL;
  RAISE NOTICE 'Made organizacao_id nullable in clinicas table';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'organizacao_id might already be nullable: %', SQLERRM;
END $$;

-- Add criado_por column if it doesn't exist
DO $$
BEGIN
  ALTER TABLE public.clinicas ADD COLUMN criado_por UUID REFERENCES auth.users(id);
  RAISE NOTICE 'Added criado_por column to clinicas table';
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'criado_por column already exists';
END $$;

-- Force schema cache refresh
COMMENT ON TABLE public.clinicas IS 'Clinicas table - schema updated for onboarding support - ' || now();
