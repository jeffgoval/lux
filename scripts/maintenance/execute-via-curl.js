import { execSync } from 'child_process';

const supabaseUrl = "https://dvnyfwpphuuujhodqkko.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk";

const sql = `
-- Criar tabela clinica_profissionais (ESSENCIAL para vincular profissional à clínica)
CREATE TABLE IF NOT EXISTS public.clinica_profissionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cargo TEXT NOT NULL DEFAULT 'Profissional',
  especialidades TEXT[],
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clinica_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.clinica_profissionais ENABLE ROW LEVEL SECURITY;

-- Criar política permissiva
CREATE POLICY IF NOT EXISTS "Allow users to manage their clinic relationships"
ON public.clinica_profissionais
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
`;

try {
  // Usar curl para executar SQL diretamente
  const curlCommand = `curl -X POST "${supabaseUrl}/rest/v1/rpc/exec_sql" ` +
    `-H "Content-Type: application/json" ` +
    `-H "Authorization: Bearer ${supabaseServiceKey}" ` +
    `-H "apikey: ${supabaseServiceKey}" ` +
    `-d "{\\"sql\\": \\"${sql.replace(/"/g, '\\"').replace(/\n/g, '\\n')}\\"}"`;

  const result = execSync(curlCommand, { encoding: 'utf8' });

} catch (error) {

  // Fallback: mostrar instruções manuais

}

