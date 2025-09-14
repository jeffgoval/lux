-- =====================================================
-- STORAGE FUNCTIONALITY TESTING
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- =====================================================
-- STORAGE TESTING FUNCTIONS
-- =====================================================

-- Function to test storage bucket configuration
CREATE OR REPLACE FUNCTION public.test_storage_buckets()
RETURNS JSONB AS $
DECLARE
  test_results JSONB;
  bucket_tests JSONB[];
  bucket_name TEXT;
  bucket_config RECORD;
BEGIN
  -- Test each bucket configuration
  FOR bucket_name IN 
    SELECT id FROM storage.buckets 
    WHERE id IN ('imagens-medicas', 'documentos-medicos', 'documentos-equipamentos', 
                 'avatars-usuarios', 'imagens-produtos', 'branding-clinicas', 'backups-exports')
  LOOP
    -- Get bucket configuration
    SELECT * INTO bucket_config FROM storage.buckets WHERE id = bucket_name;
    
    -- Test bucket configuration
    bucket_tests := array_append(bucket_tests, jsonb_build_object(
      'bucket_name', bucket_name,
      'exists', bucket_config IS NOT NULL,
      'public', bucket_config.public,
      'file_size_limit', bucket_config.file_size_limit,
      'allowed_mime_types_count', array_length(bucket_config.allowed_mime_types, 1),
      'configuration_valid', (
        bucket_config.file_size_limit > 0 AND
        bucket_config.allowed_mime_types IS NOT NULL
      )
    ));
  END LOOP;
  
  -- Compile test results
  test_results := jsonb_build_object(
    'test_timestamp', now(),
    'tested_by', auth.uid(),
    'total_buckets_tested', array_length(bucket_tests, 1),
    'bucket_tests', to_jsonb(bucket_tests),
    'overall_status', CASE 
      WHEN array_length(bucket_tests, 1) = 7 THEN 'PASS'
      ELSE 'FAIL'
    END
  );
  
  -- Log test execution
  PERFORM public.log_evento_sistema(
    'storage_bucket_test',
    'sistema',
    CASE WHEN (test_results->>'overall_status') = 'PASS' THEN 'info' ELSE 'error' END,
    'Storage bucket configuration test',
    format('Storage bucket test completed with status: %s', test_results->>'overall_status'),
    test_results
  );
  
  RETURN test_results;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to test storage policies
CREATE OR REPLACE FUNCTION public.test_storage_policies()
RETURNS JSONB AS $
DECLARE
  test_results JSONB;
  policy_tests JSONB[];
  policy_count INTEGER;
  bucket_name TEXT;
BEGIN
  -- Count policies for each bucket
  FOR bucket_name IN 
    SELECT DISTINCT bucket_id 
    FROM (
      VALUES 
        ('imagens-medicas'),
        ('documentos-medicos'),
        ('documentos-equipamentos'),
        ('avatars-usuarios'),
        ('imagens-produtos'),
        ('branding-clinicas'),
        ('backups-exports')
    ) AS buckets(bucket_id)
  LOOP
    -- Count policies for this bucket
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND qual LIKE '%' || bucket_name || '%';
    
    policy_tests := array_append(policy_tests, jsonb_build_object(
      'bucket_name', bucket_name,
      'policy_count', policy_count,
      'has_select_policy', policy_count >= 1,
      'has_insert_policy', policy_count >= 2,
      'policies_adequate', policy_count >= 2
    ));
  END LOOP;
  
  -- Compile test results
  test_results := jsonb_build_object(
    'test_timestamp', now(),
    'tested_by', auth.uid(),
    'total_buckets_tested', array_length(policy_tests, 1),
    'policy_tests', to_jsonb(policy_tests),
    'total_storage_policies', (
      SELECT COUNT(*)
      FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
    ),
    'overall_status', CASE 
      WHEN (
        SELECT bool_and((test->>'policies_adequate')::boolean)
        FROM jsonb_array_elements(to_jsonb(policy_tests)) AS test
      ) THEN 'PASS'
      ELSE 'FAIL'
    END
  );
  
  -- Log test execution
  PERFORM public.log_evento_sistema(
    'storage_policy_test',
    'sistema',
    CASE WHEN (test_results->>'overall_status') = 'PASS' THEN 'info' ELSE 'error' END,
    'Storage policy configuration test',
    format('Storage policy test completed with status: %s', test_results->>'overall_status'),
    test_results
  );
  
  RETURN test_results;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to test file path generation
CREATE OR REPLACE FUNCTION public.test_file_path_generation()
RETURNS JSONB AS $
DECLARE
  test_results JSONB;
  test_prontuario_id UUID;
  test_clinica_id UUID;
  generated_paths JSONB[];
  path_test JSONB;
BEGIN
  -- Use sample UUIDs for testing
  test_prontuario_id := '12345678-1234-1234-1234-123456789012';
  test_clinica_id := '87654321-4321-4321-4321-210987654321';
  
  -- Test medical image path generation
  BEGIN
    path_test := jsonb_build_object(
      'type', 'medical_image',
      'path', public.generate_medical_image_path(test_prontuario_id, 'antes', '.jpg'),
      'valid', true,
      'error', NULL
    );
  EXCEPTION
    WHEN OTHERS THEN
      path_test := jsonb_build_object(
        'type', 'medical_image',
        'path', NULL,
        'valid', false,
        'error', SQLERRM
      );
  END;
  generated_paths := array_append(generated_paths, path_test);
  
  -- Test document path generation
  BEGIN
    path_test := jsonb_build_object(
      'type', 'document',
      'path', public.generate_document_path('consent', test_clinica_id, '.pdf'),
      'valid', true,
      'error', NULL
    );
  EXCEPTION
    WHEN OTHERS THEN
      path_test := jsonb_build_object(
        'type', 'document',
        'path', NULL,
        'valid', false,
        'error', SQLERRM
      );
  END;
  generated_paths := array_append(generated_paths, path_test);
  
  -- Test file validation
  BEGIN
    path_test := jsonb_build_object(
      'type', 'file_validation',
      'result', public.validate_file_upload('imagens-medicas', 1048576, 'image/jpeg'),
      'valid', true,
      'error', NULL
    );
  EXCEPTION
    WHEN OTHERS THEN
      path_test := jsonb_build_object(
        'type', 'file_validation',
        'result', NULL,
        'valid', false,
        'error', SQLERRM
      );
  END;
  generated_paths := array_append(generated_paths, path_test);
  
  -- Compile test results
  test_results := jsonb_build_object(
    'test_timestamp', now(),
    'tested_by', auth.uid(),
    'path_generation_tests', to_jsonb(generated_paths),
    'overall_status', CASE 
      WHEN (
        SELECT bool_and((test->>'valid')::boolean)
        FROM jsonb_array_elements(to_jsonb(generated_paths)) AS test
      ) THEN 'PASS'
      ELSE 'FAIL'
    END
  );
  
  -- Log test execution
  PERFORM public.log_evento_sistema(
    'storage_path_generation_test',
    'sistema',
    CASE WHEN (test_results->>'overall_status') = 'PASS' THEN 'info' ELSE 'error' END,
    'Storage path generation test',
    format('Path generation test completed with status: %s', test_results->>'overall_status'),
    test_results
  );
  
  RETURN test_results;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to run comprehensive storage system tests
CREATE OR REPLACE FUNCTION public.run_storage_system_tests()
RETURNS JSONB AS $
DECLARE
  bucket_test_results JSONB;
  policy_test_results JSONB;
  path_test_results JSONB;
  overall_results JSONB;
  all_tests_passed BOOLEAN;
BEGIN
  -- Check if user has permission to run tests
  IF NOT public.user_has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Apenas super administradores podem executar testes do sistema de storage';
  END IF;
  
  -- Run bucket configuration tests
  SELECT public.test_storage_buckets() INTO bucket_test_results;
  
  -- Run policy tests
  SELECT public.test_storage_policies() INTO policy_test_results;
  
  -- Run path generation tests
  SELECT public.test_file_path_generation() INTO path_test_results;
  
  -- Determine overall test status
  all_tests_passed := (
    (bucket_test_results->>'overall_status') = 'PASS' AND
    (policy_test_results->>'overall_status') = 'PASS' AND
    (path_test_results->>'overall_status') = 'PASS'
  );
  
  -- Compile comprehensive results
  overall_results := jsonb_build_object(
    'test_suite', 'storage_system_comprehensive',
    'test_timestamp', now(),
    'tested_by', auth.uid(),
    'tests_executed', jsonb_build_object(
      'bucket_configuration', bucket_test_results,
      'policy_configuration', policy_test_results,
      'path_generation', path_test_results
    ),
    'summary', jsonb_build_object(
      'total_buckets', 7,
      'buckets_configured', (bucket_test_results->'bucket_tests'->0->>'configuration_valid')::boolean,
      'policies_configured', (policy_test_results->>'total_storage_policies')::integer > 0,
      'functions_working', (path_test_results->>'overall_status') = 'PASS'
    ),
    'overall_status', CASE WHEN all_tests_passed THEN 'PASS' ELSE 'FAIL' END,
    'recommendations', CASE 
      WHEN all_tests_passed THEN ARRAY['Sistema de storage está funcionando corretamente']
      ELSE ARRAY['Revisar configurações que falharam nos testes', 'Verificar permissões de storage', 'Validar políticas RLS']
    END
  );
  
  -- Log comprehensive test results
  PERFORM public.log_evento_sistema(
    'storage_system_test_complete',
    'sistema',
    CASE WHEN all_tests_passed THEN 'info' ELSE 'warning' END,
    'Comprehensive storage system test completed',
    format('Storage system test suite completed with overall status: %s', 
           CASE WHEN all_tests_passed THEN 'PASS' ELSE 'FAIL' END),
    overall_results
  );
  
  RETURN overall_results;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- COMPLETION VERIFICATION
-- =====================================================

-- Verify all storage testing functions were created successfully
DO $
DECLARE
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'generate_medical_image_path',
      'generate_document_path',
      'validate_file_upload',
      'get_storage_usage_stats',
      'cleanup_old_storage_files',
      'test_storage_buckets',
      'test_storage_policies',
      'test_file_path_generation',
      'run_storage_system_tests'
    );
  
  IF function_count >= 9 THEN
    RAISE NOTICE 'Storage testing functions created successfully: % functions', function_count;
  ELSE
    RAISE EXCEPTION 'Storage testing functions incomplete - only % functions created', function_count;
  END IF;
END $;

-- Add comment to track completion
COMMENT ON SCHEMA public IS 'Storage testing functions implemented - ' || now();