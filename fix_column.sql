ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS proprietaria_id UUID REFERENCES auth.users(id);
ALTER TABLE public.clinicas ALTER COLUMN organizacao_id DROP NOT NULL;
COMMENT ON TABLE public.clinicas IS 'Clinicas table updated with proprietaria_id column';