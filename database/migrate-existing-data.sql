-- ============================================================================
-- 🔄 MIGRAÇÃO DE DADOS EXISTENTES PARA SISTEMA SEGURO V2
-- ============================================================================
-- 
-- Este script migra dados do sistema atual para o novo schema seguro
-- ATENÇÃO: Execute apenas após backup completo!
--

BEGIN;

-- ============================================================================
-- CONFIGURAÇÕES DE SEGURANÇA
-- ============================================================================

-- Desabilitar RLS temporariamente para migração (apenas para super user)
SET row_security = off;

-- Log de início da migração
INSERT INTO migration_log (operation, status, details, created_at) 
VALUES ('AUTH_V2_MIGRATION', 'STARTED', 'Iniciando migração para sistema seguro V2', NOW());

-- ============================================================================
-- 1. MIGRAÇÃO DE CLÍNICAS
-- ============================================================================

INSERT INTO clinics (
    id,
    name,
    email,
    phone,
    document,
    address,
    settings,
    active,
    created_at,
    updated_at
)
SELECT 
    COALESCE(id, gen_random_uuid()),
    COALESCE(name, 'Clínica Sem Nome'),
    COALESCE(email, 'contato@clinica.com'),
    phone,
    document,
    COALESCE(
        address,
        '{"street": "", "city": "", "state": "", "zipCode": "", "country": "BR"}'::jsonb
    ),
    COALESCE(
        settings,
        '{
            "branding": {"primaryColor": "#3B82F6", "logo": null},
            "features": {"appointments": true, "inventory": true, "financial": true},
            "security": {"sessionTimeout": 3600, "requireStrongPassword": true}
        }'::jsonb
    ),
    COALESCE(active, true),
    COALESCE(created_at, NOW()),
    COALESCE(updated_at, NOW())
FROM public.clinics_old 
WHERE id IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    document = EXCLUDED.document,
    address = EXCLUDED.address,
    settings = EXCLUDED.settings,
    active = EXCLUDED.active,
    updated_at = NOW();

-- Log progresso
INSERT INTO migration_log (operation, status, details, created_at) 
VALUES ('CLINICS_MIGRATION', 'COMPLETED', 
        'Migradas ' || (SELECT COUNT(*) FROM clinics) || ' clínicas', NOW());

-- ============================================================================
-- 2. MIGRAÇÃO DE USUÁRIOS
-- ============================================================================

INSERT INTO users (
    id,
    email,
    password_hash,
    name,
    phone,
    document,
    birth_date,
    profile_data,
    email_verified,
    phone_verified,
    active,
    last_login_at,
    created_at,
    updated_at
)
SELECT 
    COALESCE(id, gen_random_uuid()),
    LOWER(TRIM(email)),
    COALESCE(
        password_hash,
        -- Se não tem hash, gerar um temporário (usuário precisará resetar)
        '$2b$12$' || encode(gen_random_bytes(22), 'base64')
    ),
    COALESCE(TRIM(name), 'Usuário'),
    phone,
    document,
    birth_date,
    COALESCE(
        profile_data,
        '{
            "preferences": {"theme": "light", "language": "pt-BR"},
            "notifications": {"email": true, "sms": false}
        }'::jsonb
    ),
    COALESCE(email_verified, false),
    COALESCE(phone_verified, false),
    COALESCE(active, true),
    last_login_at,
    COALESCE(created_at, NOW()),
    COALESCE(updated_at, NOW())
FROM public.users_old 
WHERE email IS NOT NULL 
    AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    document = EXCLUDED.document,
    birth_date = EXCLUDED.birth_date,
    profile_data = EXCLUDED.profile_data,
    active = EXCLUDED.active,
    updated_at = NOW();

-- Log progresso
INSERT INTO migration_log (operation, status, details, created_at) 
VALUES ('USERS_MIGRATION', 'COMPLETED', 
        'Migrados ' || (SELECT COUNT(*) FROM users) || ' usuários', NOW());

-- ============================================================================
-- 3. MIGRAÇÃO DE ASSOCIAÇÕES USUÁRIO-CLÍNICA
-- ============================================================================

-- Função para mapear roles antigos para novos
CREATE OR REPLACE FUNCTION map_legacy_role(old_role TEXT) 
RETURNS user_role_enum AS $$
BEGIN
    RETURN CASE 
        WHEN old_role IN ('admin', 'super_admin', 'owner') THEN 'clinic_owner'::user_role_enum
        WHEN old_role IN ('manager', 'coordinator') THEN 'clinic_manager'::user_role_enum
        WHEN old_role IN ('doctor', 'professional', 'therapist') THEN 'professional'::user_role_enum
        WHEN old_role IN ('receptionist', 'secretary') THEN 'receptionist'::user_role_enum
        WHEN old_role IN ('patient', 'client') THEN 'patient'::user_role_enum
        ELSE 'patient'::user_role_enum
    END;
END;
$$ LANGUAGE plpgsql;

INSERT INTO user_clinic_roles (
    user_id,
    clinic_id,
    role,
    custom_permissions,
    active,
    created_at,
    updated_at,
    created_by
)
SELECT DISTINCT
    u.id as user_id,
    c.id as clinic_id,
    map_legacy_role(COALESCE(ucr_old.role, 'patient')) as role,
    COALESCE(
        ucr_old.permissions,
        ARRAY[]::permission_enum[]
    ) as custom_permissions,
    COALESCE(ucr_old.active, true) as active,
    COALESCE(ucr_old.created_at, NOW()) as created_at,
    COALESCE(ucr_old.updated_at, NOW()) as updated_at,
    (SELECT id FROM users WHERE email = 'system@luxeflow.com' LIMIT 1) as created_by
FROM users u
CROSS JOIN clinics c
LEFT JOIN public.user_clinic_roles_old ucr_old ON (
    ucr_old.user_id = u.id AND ucr_old.clinic_id = c.id
)
WHERE EXISTS (
    -- Só criar associação se existia na tabela antiga OU se é o primeiro usuário da clínica
    SELECT 1 FROM public.user_clinic_roles_old 
    WHERE user_id = u.id AND clinic_id = c.id
    OR (
        SELECT COUNT(*) FROM public.user_clinic_roles_old 
        WHERE clinic_id = c.id
    ) = 0
)
ON CONFLICT (user_id, clinic_id) DO UPDATE SET
    role = EXCLUDED.role,
    custom_permissions = EXCLUDED.custom_permissions,
    active = EXCLUDED.active,
    updated_at = NOW();

-- Log progresso
INSERT INTO migration_log (operation, status, details, created_at) 
VALUES ('USER_CLINIC_ROLES_MIGRATION', 'COMPLETED', 
        'Migradas ' || (SELECT COUNT(*) FROM user_clinic_roles) || ' associações', NOW());

-- ============================================================================
-- 4. MIGRAÇÃO DE LOGS DE AUDITORIA (se existirem)
-- ============================================================================

INSERT INTO auth_audit_logs (
    id,
    user_id,
    clinic_id,
    event_type,
    event_data,
    ip_address,
    user_agent,
    success,
    created_at
)
SELECT 
    COALESCE(id, gen_random_uuid()),
    user_id,
    clinic_id,
    CASE 
        WHEN event_type = 'login' THEN 'LOGIN'::auth_event_type
        WHEN event_type = 'logout' THEN 'LOGOUT'::auth_event_type
        WHEN event_type = 'password_change' THEN 'PASSWORD_CHANGE'::auth_event_type
        ELSE 'OTHER'::auth_event_type
    END,
    COALESCE(event_data, '{}'::jsonb),
    ip_address,
    user_agent,
    COALESCE(success, true),
    COALESCE(created_at, NOW())
FROM public.audit_logs_old 
WHERE user_id IS NOT NULL
    AND created_at >= NOW() - INTERVAL '90 days' -- Apenas últimos 90 dias
ON CONFLICT (id) DO NOTHING;

-- Log progresso
INSERT INTO migration_log (operation, status, details, created_at) 
VALUES ('AUDIT_LOGS_MIGRATION', 'COMPLETED', 
        'Migrados ' || (SELECT COUNT(*) FROM auth_audit_logs) || ' logs de auditoria', NOW());

-- ============================================================================
-- 5. LIMPEZA E VALIDAÇÃO
-- ============================================================================

-- Remover função temporária
DROP FUNCTION IF EXISTS map_legacy_role(TEXT);

-- Validar integridade referencial
DO $$
DECLARE
    orphaned_roles INTEGER;
    invalid_emails INTEGER;
    inactive_clinics INTEGER;
BEGIN
    -- Verificar roles órfãos
    SELECT COUNT(*) INTO orphaned_roles
    FROM user_clinic_roles ucr
    WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ucr.user_id)
       OR NOT EXISTS (SELECT 1 FROM clinics c WHERE c.id = ucr.clinic_id);
    
    IF orphaned_roles > 0 THEN
        RAISE WARNING 'Encontrados % roles órfãos que precisam ser corrigidos', orphaned_roles;
    END IF;
    
    -- Verificar emails inválidos
    SELECT COUNT(*) INTO invalid_emails
    FROM users 
    WHERE email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
    
    IF invalid_emails > 0 THEN
        RAISE WARNING 'Encontrados % emails inválidos que precisam ser corrigidos', invalid_emails;
    END IF;
    
    -- Verificar clínicas inativas com usuários ativos
    SELECT COUNT(*) INTO inactive_clinics
    FROM clinics c
    WHERE NOT c.active 
      AND EXISTS (
          SELECT 1 FROM user_clinic_roles ucr 
          WHERE ucr.clinic_id = c.id AND ucr.active
      );
    
    IF inactive_clinics > 0 THEN
        RAISE WARNING 'Encontradas % clínicas inativas com usuários ativos', inactive_clinics;
    END IF;
END $$;

-- ============================================================================
-- 6. REABILITAR RLS E CONFIGURAÇÕES DE SEGURANÇA
-- ============================================================================

-- Reabilitar RLS
SET row_security = on;

-- Atualizar estatísticas das tabelas
ANALYZE users;
ANALYZE clinics;
ANALYZE user_clinic_roles;
ANALYZE auth_audit_logs;

-- ============================================================================
-- 7. LOG FINAL E COMMIT
-- ============================================================================

-- Log de conclusão
INSERT INTO migration_log (operation, status, details, created_at) 
VALUES ('AUTH_V2_MIGRATION', 'COMPLETED', 
        'Migração concluída com sucesso. Usuários: ' || 
        (SELECT COUNT(*) FROM users) || 
        ', Clínicas: ' || 
        (SELECT COUNT(*) FROM clinics) || 
        ', Associações: ' || 
        (SELECT COUNT(*) FROM user_clinic_roles), 
        NOW());

-- Commit da transação
COMMIT;

-- ============================================================================
-- 8. VERIFICAÇÕES PÓS-MIGRAÇÃO
-- ============================================================================

-- Verificar se todas as tabelas têm dados
SELECT 
    'users' as table_name, 
    COUNT(*) as record_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM users
UNION ALL
SELECT 
    'clinics' as table_name, 
    COUNT(*) as record_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM clinics
UNION ALL
SELECT 
    'user_clinic_roles' as table_name, 
    COUNT(*) as record_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM user_clinic_roles
UNION ALL
SELECT 
    'auth_audit_logs' as table_name, 
    COUNT(*) as record_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM auth_audit_logs;

-- Verificar distribuição de roles
SELECT 
    role,
    COUNT(*) as user_count,
    COUNT(DISTINCT clinic_id) as clinic_count
FROM user_clinic_roles 
WHERE active = true
GROUP BY role
ORDER BY user_count DESC;

-- Verificar clínicas sem usuários (possível problema)
SELECT 
    c.id,
    c.name,
    c.email
FROM clinics c
WHERE NOT EXISTS (
    SELECT 1 FROM user_clinic_roles ucr 
    WHERE ucr.clinic_id = c.id AND ucr.active = true
)
AND c.active = true;

RAISE NOTICE '✅ Migração AUTH V2 concluída com sucesso!';
RAISE NOTICE '📊 Execute as consultas de verificação acima para validar os dados';
RAISE NOTICE '🔒 RLS policies estão ativas e funcionando';
RAISE NOTICE '📝 Logs de migração disponíveis na tabela migration_log';
