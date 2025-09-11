-- Primeiro criar o enum user_role_type se não existir
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM (
        'super_admin', 
        'proprietaria', 
        'gerente', 
        'profissionais', 
        'recepcionistas', 
        'visitante', 
        'cliente'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar tabela de roles disponíveis no sistema
CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name user_role_type NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}',
  hierarchy_level integer NOT NULL,
  color_class text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Política para visualização - todos usuários autenticados podem ver
CREATE POLICY "Todos podem visualizar roles ativas"
ON public.roles
FOR SELECT
USING (auth.uid() IS NOT NULL AND ativo = true);

-- Política para modificação - apenas usuários autenticados (será refinada depois)
CREATE POLICY "Usuários autenticados podem gerenciar roles"
ON public.roles
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Inserir todas as roles do sistema
INSERT INTO public.roles (role_name, display_name, description, permissions, hierarchy_level, color_class) VALUES
(
  'super_admin'::user_role_type,
  'Super Administrador',
  'Acesso total ao sistema, pode gerenciar tudo',
  '{
    "canManageUsers": true,
    "canManageClinics": true,
    "canAccessAllData": true,
    "canManageSystem": true,
    "canManageRoles": true,
    "canViewReports": true,
    "canManageSettings": true
  }'::jsonb,
  1,
  'bg-purple-100 text-purple-800'
),
(
  'proprietaria'::user_role_type,
  'Proprietária',
  'Proprietária da clínica, pode gerenciar sua organização',
  '{
    "canManageUsers": true,
    "canManageClinics": true,
    "canAccessAllData": true,
    "canManageSystem": false,
    "canManageRoles": true,
    "canViewReports": true,
    "canManageSettings": true
  }'::jsonb,
  2,
  'bg-red-100 text-red-800'
),
(
  'gerente'::user_role_type,
  'Gerente',
  'Gerente da clínica, pode gerenciar equipe e operações',
  '{
    "canManageUsers": true,
    "canManageClinics": false,
    "canAccessAllData": true,
    "canManageSystem": false,
    "canManageRoles": false,
    "canViewReports": true,
    "canManageSettings": false
  }'::jsonb,
  3,
  'bg-blue-100 text-blue-800'
),
(
  'profissionais'::user_role_type,
  'Profissional',
  'Profissional de saúde, pode atender pacientes e acessar prontuários',
  '{
    "canManageUsers": false,
    "canManageClinics": false,
    "canAccessAllData": false,
    "canManageSystem": false,
    "canManageRoles": false,
    "canViewReports": false,
    "canManageSettings": false,
    "canAccessPatients": true,
    "canCreateProntuarios": true
  }'::jsonb,
  4,
  'bg-green-100 text-green-800'
),
(
  'recepcionistas'::user_role_type,
  'Recepcionista',
  'Recepcionista, pode gerenciar agendamentos e atendimento',
  '{
    "canManageUsers": false,
    "canManageClinics": false,
    "canAccessAllData": false,
    "canManageSystem": false,
    "canManageRoles": false,
    "canViewReports": false,
    "canManageSettings": false,
    "canManageSchedule": true,
    "canViewPatients": true
  }'::jsonb,
  5,
  'bg-yellow-100 text-yellow-800'
),
(
  'visitante'::user_role_type,
  'Visitante',
  'Visitante do sistema, acesso limitado para exploração',
  '{
    "canManageUsers": false,
    "canManageClinics": false,
    "canAccessAllData": false,
    "canManageSystem": false,
    "canManageRoles": false,
    "canViewReports": false,
    "canManageSettings": false,
    "canViewDashboard": true
  }'::jsonb,
  6,
  'bg-gray-100 text-gray-800'
),
(
  'cliente'::user_role_type,
  'Cliente',
  'Cliente da clínica, pode acessar seus próprios dados',
  '{
    "canManageUsers": false,
    "canManageClinics": false,
    "canAccessAllData": false,
    "canManageSystem": false,
    "canManageRoles": false,
    "canViewReports": false,
    "canManageSettings": false,
    "canViewOwnData": true,
    "canViewOwnAppointments": true
  }'::jsonb,
  7,
  'bg-orange-100 text-orange-800'
);