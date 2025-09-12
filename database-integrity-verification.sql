-- =====================================================
-- DATABASE INTEGRITY VERIFICATION FUNCTIONS
-- Comprehensive validation of database structure and policies
-- =====================================================

-- =====================================================
-- 1. TABLE EXISTENCE VERIFICATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.verify_tables_exist()
RETURNS JSONB AS $
DECLARE
  result JSONB;
  expected_tables TEXT[] := ARRAY[
    'profiles',
    'user_roles', 
    'clinicas',
    'profissionais',
    'clinica_profissionais',
    'templates_procedimentos',
    'especialidades_medicas'
  ];
  existing_tables TEXT[];
  missing_tables TEXT[];
  table_details JSONB[];
  table_name TEXT;
  table_info JSONB;
BEGIN
  -- Get existing tables
  SELECT array_agg(tablename) INTO existing_tables
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND tablename = ANY(expected_tables);
  
  -- Find missing tables
  SELECT array_agg(expected_table) INTO missing_tables
  FROM unnest(expected_tables) AS expected_table
  WHERE expected_table != ALL(COALESCE(existing_tables, ARRAY[]::TEXT[]));
  
  -- Get detailed info for each existing table
  table_details := ARRAY[]::JSONB[];
  
  FOREACH table_name IN ARRAY COALESCE(existing_tables, ARRAY[]::TEXT[])
  LOOP
    SELECT jsonb_build_object(
      'table_name', table_name,
      'row_count', (
        SELECT count(*) 
        FROM information_schema.tables t
        WHERE t.table_schema = 'public' 
          AND t.table_name = table_name
      ),
      'has_indexes', (
        SELECT count(*) > 0
        FROM pg_indexes 
        WHERE schemaname = 'public' 
          AND tablename = table_name
      ),
      'has_triggers', (
        SELECT count(*) > 0
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
          AND event_object_table = table_name
      ),
      'rls_enabled', (
        SELECT rowsecurity
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename = table_name
      )
    ) INTO table_info;
    
    table_details := array_append(table_details, table_info);
  END LOOP;
  
  -- Compile result
  result := jsonb_build_object(
    'verification_timestamp', now(),
    'expected_tables', to_jsonb(expected_tables),
    'existing_tables', to_jsonb(COALESCE(existing_tables, ARRAY[]::TEXT[])),
    'missing_tables', to_jsonb(COALESCE(missing_tables, ARRAY[]::TEXT[])),
    'table_details', to_jsonb(table_details),
    'tables_complete', missing_tables IS NULL OR array_length(missing_tables, 1) = 0,
    'summary', jsonb_build_object(
      'expected_count', array_length(expected_tables, 1),
      'existing_count', COALESCE(array_length(existing_tables, 1), 0),
      'missing_count', COALESCE(array_length(missing_tables, 1), 0)
    )
  );
  
  RETURN result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. RLS POLICIES VERIFICATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.verify_rls_policies()
RETURNS JSONB AS $
DECLARE
  result JSONB;
  expected_tables TEXT[] := ARRAY[
    'profiles',
    'user_roles', 
    'clinicas',
    'profissionais',
    'clinica_profissionais',
    'templates_procedimentos',
    'especialidades_medicas'
  ];
  policy_details JSONB[];
  table_name TEXT;
  table_policies JSONB;
BEGIN
  -- Get policy details for each table
  policy_details := ARRAY[]::JSONB[];
  
  FOREACH table_name IN ARRAY expected_tables
  LOOP
    SELECT jsonb_build_object(
      'table_name', table_name,
      'rls_enabled', (
        SELECT rowsecurity
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename = table_name
      ),
      'policy_count', (
        SELECT count(*)
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = table_name
      ),
      'policies', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'policy_name', policyname,
            'permissive', permissive,
            'command', cmd,
            'roles', roles
          )
        )
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = table_name
      )
    ) INTO table_policies;
    
    policy_details := array_append(policy_details, table_policies);
  END LOOP;
  
  -- Compile result
  result := jsonb_build_object(
    'verification_timestamp', now(),
    'policy_details', to_jsonb(policy_details),
    'summary', jsonb_build_object(
      'total_tables_checked', array_length(expected_tables, 1),
      'tables_with_rls', (
        SELECT count(*)
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename = ANY(expected_tables)
          AND rowsecurity = true
      ),
      'total_policies', (
        SELECT count(*)
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = ANY(expected_tables)
      )
    )
  );
  
  RETURN result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. CONSTRAINTS AND RELATIONSHIPS VERIFICATION
-- =====================================================

CREATE OR REPLACE FUNCTION public.verify_constraints()
RETURNS JSONB AS $
DECLARE
  result JSONB;
  constraint_details JSONB;
  foreign_key_details JSONB;
  index_details JSONB;
BEGIN
  -- Get constraint details
  SELECT jsonb_agg(
    jsonb_build_object(
      'table_name', table_name,
      'constraint_name', constraint_name,
      'constraint_type', constraint_type,
      'is_deferrable', is_deferrable,
      'initially_deferred', initially_deferred
    )
  ) INTO constraint_details
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
    AND table_name IN (
      'profiles', 'user_roles', 'clinicas', 'profissionais',
      'clinica_profissionais', 'templates_procedimentos', 'especialidades_medicas'
    );
  
  -- Get foreign key details
  SELECT jsonb_agg(
    jsonb_build_object(
      'table_name', tc.table_name,
      'constraint_name', tc.constraint_name,
      'column_name', kcu.column_name,
      'foreign_table', ccu.table_name,
      'foreign_column', ccu.column_name
    )
  ) INTO foreign_key_details
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN (
      'profiles', 'user_roles', 'clinicas', 'profissionais',
      'clinica_profissionais', 'templates_procedimentos', 'especialidades_medicas'
    );
  
  -- Get index details
  SELECT jsonb_agg(
    jsonb_build_object(
      'table_name', tablename,
      'index_name', indexname,
      'index_definition', indexdef
    )
  ) INTO index_details
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN (
      'profiles', 'user_roles', 'clinicas', 'profissionais',
      'clinica_profissionais', 'templates_procedimentos', 'especialidades_medicas'
    );
  
  -- Compile result
  result := jsonb_build_object(
    'verification_timestamp', now(),
    'constraints', constraint_details,
    'foreign_keys', foreign_key_details,
    'indexes', index_details,
    'summary', jsonb_build_object(
      'total_constraints', jsonb_array_length(COALESCE(constraint_details, '[]'::jsonb)),
      'foreign_key_count', jsonb_array_length(COALESCE(foreign_key_details, '[]'::jsonb)),
      'index_count', jsonb_array_length(COALESCE(index_details, '[]'::jsonb))
    )
  );
  
  RETURN result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. DATA INTEGRITY VERIFICATION
-- =====================================================

CREATE OR REPLACE FUNCTION public.verify_data_integrity()
RETURNS JSONB AS $
DECLARE
  result JSONB;
  data_counts JSONB;
  integrity_checks JSONB[];
  check_result JSONB;
BEGIN
  -- Get row counts for all tables
  SELECT jsonb_build_object(
    'profiles', (SELECT count(*) FROM public.profiles),
    'user_roles', (SELECT count(*) FROM public.user_roles),
    'clinicas', (SELECT count(*) FROM public.clinicas),
    'profissionais', (SELECT count(*) FROM public.profissionais),
    'clinica_profissionais', (SELECT count(*) FROM public.clinica_profissionais),
    'templates_procedimentos', (SELECT count(*) FROM public.templates_procedimentos),
    'especialidades_medicas', (SELECT count(*) FROM public.especialidades_medicas)
  ) INTO data_counts;
  
  -- Perform integrity checks
  integrity_checks := ARRAY[]::JSONB[];
  
  -- Check 1: All user_roles have valid user_id
  SELECT jsonb_build_object(
    'check_name', 'user_roles_valid_users',
    'description', 'All user roles reference valid users',
    'passed', NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      LEFT JOIN auth.users u ON ur.user_id = u.id
      WHERE u.id IS NULL
    ),
    'details', (
      SELECT count(*) FROM public.user_roles ur
      LEFT JOIN auth.users u ON ur.user_id = u.id
      WHERE u.id IS NULL
    )
  ) INTO check_result;
  integrity_checks := array_append(integrity_checks, check_result);
  
  -- Check 2: All profissionais have valid user_id
  SELECT jsonb_build_object(
    'check_name', 'profissionais_valid_users',
    'description', 'All professionals reference valid users',
    'passed', NOT EXISTS (
      SELECT 1 FROM public.profissionais p
      LEFT JOIN auth.users u ON p.user_id = u.id
      WHERE u.id IS NULL
    ),
    'details', (
      SELECT count(*) FROM public.profissionais p
      LEFT JOIN auth.users u ON p.user_id = u.id
      WHERE u.id IS NULL
    )
  ) INTO check_result;
  integrity_checks := array_append(integrity_checks, check_result);
  
  -- Check 3: All clinica_profissionais have valid references
  SELECT jsonb_build_object(
    'check_name', 'clinica_profissionais_valid_refs',
    'description', 'All clinic-professional relationships have valid references',
    'passed', NOT EXISTS (
      SELECT 1 FROM public.clinica_profissionais cp
      LEFT JOIN public.clinicas c ON cp.clinica_id = c.id
      LEFT JOIN auth.users u ON cp.user_id = u.id
      WHERE c.id IS NULL OR u.id IS NULL
    ),
    'details', (
      SELECT count(*) FROM public.clinica_profissionais cp
      LEFT JOIN public.clinicas c ON cp.clinica_id = c.id
      LEFT JOIN auth.users u ON cp.user_id = u.id
      WHERE c.id IS NULL OR u.id IS NULL
    )
  ) INTO check_result;
  integrity_checks := array_append(integrity_checks, check_result);
  
  -- Check 4: No duplicate professional registrations
  SELECT jsonb_build_object(
    'check_name', 'unique_professional_registrations',
    'description', 'All professional registrations are unique',
    'passed', NOT EXISTS (
      SELECT registro_profissional 
      FROM public.profissionais 
      WHERE ativo = true
      GROUP BY registro_profissional 
      HAVING count(*) > 1
    ),
    'details', (
      SELECT count(*) FROM (
        SELECT registro_profissional 
        FROM public.profissionais 
        WHERE ativo = true
        GROUP BY registro_profissional 
        HAVING count(*) > 1
      ) duplicates
    )
  ) INTO check_result;
  integrity_checks := array_append(integrity_checks, check_result);
  
  -- Compile result
  result := jsonb_build_object(
    'verification_timestamp', now(),
    'data_counts', data_counts,
    'integrity_checks', to_jsonb(integrity_checks),
    'summary', jsonb_build_object(
      'total_checks', array_length(integrity_checks, 1),
      'passed_checks', (
        SELECT count(*) FROM unnest(integrity_checks) AS check
        WHERE (check->>'passed')::boolean = true
      ),
      'failed_checks', (
        SELECT count(*) FROM unnest(integrity_checks) AS check
        WHERE (check->>'passed')::boolean = false
      )
    )
  );
  
  RETURN result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. COMPREHENSIVE VERIFICATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.verify_database_complete()
RETURNS JSONB AS $
DECLARE
  result JSONB;
  tables_result JSONB;
  policies_result JSONB;
  constraints_result JSONB;
  data_result JSONB;
  overall_status TEXT;
BEGIN
  -- Run all verification functions
  SELECT public.verify_tables_exist() INTO tables_result;
  SELECT public.verify_rls_policies() INTO policies_result;
  SELECT public.verify_constraints() INTO constraints_result;
  SELECT public.verify_data_integrity() INTO data_result;
  
  -- Determine overall status
  SELECT CASE 
    WHEN (tables_result->>'tables_complete')::boolean = true
      AND (policies_result->'summary'->>'total_policies')::integer > 0
      AND (constraints_result->'summary'->>'foreign_key_count')::integer > 0
      AND (data_result->'summary'->>'failed_checks')::integer = 0
    THEN 'PASS'
    ELSE 'FAIL'
  END INTO overall_status;
  
  -- Compile comprehensive result
  result := jsonb_build_object(
    'verification_timestamp', now(),
    'overall_status', overall_status,
    'tables_verification', tables_result,
    'policies_verification', policies_result,
    'constraints_verification', constraints_result,
    'data_integrity_verification', data_result,
    'recommendations', CASE 
      WHEN overall_status = 'PASS' THEN 
        jsonb_build_array(
          'Database structure is complete and valid',
          'All RLS policies are properly configured',
          'Data integrity checks passed',
          'System is ready for production use'
        )
      ELSE 
        jsonb_build_array(
          'Review failed verification checks',
          'Fix missing tables or constraints',
          'Verify RLS policies are properly configured',
          'Check data integrity issues'
        )
    END
  );
  
  RETURN result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. QUICK HEALTH CHECK FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.quick_health_check()
RETURNS JSONB AS $
DECLARE
  result JSONB;
  essential_tables_exist BOOLEAN;
  rls_enabled BOOLEAN;
  basic_data_present BOOLEAN;
BEGIN
  -- Check if essential tables exist
  SELECT count(*) = 7 INTO essential_tables_exist
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND tablename IN (
      'profiles', 'user_roles', 'clinicas', 'profissionais',
      'clinica_profissionais', 'templates_procedimentos', 'especialidades_medicas'
    );
  
  -- Check if RLS is enabled on key tables
  SELECT count(*) >= 5 INTO rls_enabled
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'user_roles', 'clinicas', 'profissionais', 'clinica_profissionais')
    AND rowsecurity = true;
  
  -- Check if basic reference data exists
  SELECT count(*) > 0 INTO basic_data_present
  FROM public.especialidades_medicas 
  WHERE ativo = true;
  
  -- Compile quick result
  result := jsonb_build_object(
    'timestamp', now(),
    'status', CASE 
      WHEN essential_tables_exist AND rls_enabled AND basic_data_present 
      THEN 'HEALTHY'
      ELSE 'NEEDS_ATTENTION'
    END,
    'checks', jsonb_build_object(
      'essential_tables_exist', essential_tables_exist,
      'rls_enabled', rls_enabled,
      'basic_data_present', basic_data_present
    ),
    'next_action', CASE 
      WHEN NOT essential_tables_exist THEN 'Run database schema creation script'
      WHEN NOT rls_enabled THEN 'Configure RLS policies'
      WHEN NOT basic_data_present THEN 'Insert reference data'
      ELSE 'System is ready'
    END
  );
  
  RETURN result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. GRANT PERMISSIONS AND CREATE COMMENTS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.verify_tables_exist() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_rls_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_constraints() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_data_integrity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_database_complete() TO authenticated;
GRANT EXECUTE ON FUNCTION public.quick_health_check() TO authenticated;

-- Add function comments
COMMENT ON FUNCTION public.verify_tables_exist() IS 'Verifies that all required tables exist with proper structure';
COMMENT ON FUNCTION public.verify_rls_policies() IS 'Verifies that RLS policies are properly configured';
COMMENT ON FUNCTION public.verify_constraints() IS 'Verifies database constraints and relationships';
COMMENT ON FUNCTION public.verify_data_integrity() IS 'Performs data integrity checks';
COMMENT ON FUNCTION public.verify_database_complete() IS 'Comprehensive database verification';
COMMENT ON FUNCTION public.quick_health_check() IS 'Quick health check for essential database components';

-- =====================================================
-- 8. VERIFICATION EXAMPLES AND SUCCESS MESSAGE
-- =====================================================

-- Example usage queries (commented out for production)
/*
-- Quick health check
SELECT public.quick_health_check();

-- Full verification
SELECT public.verify_database_complete();

-- Individual checks
SELECT public.verify_tables_exist();
SELECT public.verify_rls_policies();
SELECT public.verify_constraints();
SELECT public.verify_data_integrity();
*/

-- Success message
DO $
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'DATABASE VERIFICATION FUNCTIONS CREATED';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Available functions:';
  RAISE NOTICE '- quick_health_check(): Quick system status';
  RAISE NOTICE '- verify_database_complete(): Full verification';
  RAISE NOTICE '- verify_tables_exist(): Table structure check';
  RAISE NOTICE '- verify_rls_policies(): RLS policies check';
  RAISE NOTICE '- verify_constraints(): Constraints check';
  RAISE NOTICE '- verify_data_integrity(): Data integrity check';
  RAISE NOTICE '=================================================';
END $;