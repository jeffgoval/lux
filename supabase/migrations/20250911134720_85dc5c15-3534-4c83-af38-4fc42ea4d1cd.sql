-- Popular user_roles com as roles básicas do sistema
-- Como a tabela user_roles requer user_id real, vamos apenas documentar as roles disponíveis

-- Adicionar comentário explicativo sobre as roles disponíveis no sistema
COMMENT ON TYPE public.user_role_type IS 'Roles disponíveis no sistema: super_admin (acesso total), proprietaria (dona da clínica), gerente (gerencia equipe), profissionais (presta serviços), recepcionistas (atendimento), visitante (acesso limitado), cliente (paciente)';

-- Verificar se existem dados na tabela user_roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) THEN
        RAISE NOTICE 'Tabela user_roles está vazia - roles serão atribuídas quando usuários se registrarem';
    ELSE
        RAISE NOTICE 'Tabela user_roles já contém dados';
    END IF;
END $$;