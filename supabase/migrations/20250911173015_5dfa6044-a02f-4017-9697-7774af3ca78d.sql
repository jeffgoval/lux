-- Make atualizar_timestamp_modificacao trigger function safe for tables without 'versao' column
CREATE OR REPLACE FUNCTION public.atualizar_timestamp_modificacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update 'atualizado_em' if column exists
  IF (to_jsonb(NEW) ? 'atualizado_em') THEN
    NEW.atualizado_em = now();
  END IF;

  -- Increment 'versao' if column exists
  IF (to_jsonb(NEW) ? 'versao') THEN
    NEW.versao = COALESCE(OLD.versao, 0) + 1;
  END IF;

  RETURN NEW;
END;
$$;