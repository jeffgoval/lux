import { supabase } from '@/integrations/supabase/client';
import { generateAuthDebugReport, logAuthDebugReport } from './authDebugger';
import { checkUserDataStatus, comprehensiveUserDataRecovery } from './userDataRecovery';

export interface SignupTestResult {
  success: boolean;
  step: string;
  error?: string;
  details?: any;
  debugReport?: any;
}

/**
 * Test the complete signup flow
 */
export async function testSignupFlow(email: string, password: string): Promise<SignupTestResult[]> {
  const results: SignupTestResult[] = [];
  
  try {
    // Step 1: Sign up
    results.push({ success: true, step: 'Starting signup test', details: { email } });
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`
      }
    });
    
    if (signupError) {
      results.push({
        success: false,
        step: 'Signup',
        error: signupError.message,
        details: signupError
      });
      return results;
    }
    
    results.push({
      success: true,
      step: 'Signup',
      details: {
        userId: signupData.user?.id,
        needsConfirmation: !signupData.session
      }
    });
    
    // If email confirmation is required, we can't continue the test
    if (!signupData.session) {
      results.push({
        success: true,
        step: 'Email confirmation required',
        details: 'Test stopped - email confirmation needed'
      });
      return results;
    }
    
    const user = signupData.user;
    if (!user) {
      results.push({
        success: false,
        step: 'User creation',
        error: 'No user returned from signup'
      });
      return results;
    }
    
    // Step 2: Wait for trigger to complete
    results.push({ success: true, step: 'Waiting for trigger completion' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Check if profile was created
    const userDataStatus = await checkUserDataStatus(user.id);
    results.push({
      success: userDataStatus.hasProfile,
      step: 'Profile creation check',
      details: userDataStatus,
      error: userDataStatus.hasProfile ? undefined : 'Profile not created by trigger'
    });
    
    // Step 4: Check if role was created
    results.push({
      success: userDataStatus.hasRole,
      step: 'Role creation check',
      details: userDataStatus.roleData,
      error: userDataStatus.hasRole ? undefined : 'Role not created by trigger'
    });
    
    // Step 5: If data is missing, try recovery
    if (!userDataStatus.isComplete) {
      results.push({ success: true, step: 'Attempting data recovery' });
      
      const recoveryResult = await comprehensiveUserDataRecovery(user);
      results.push({
        success: recoveryResult.success,
        step: 'Data recovery',
        details: recoveryResult,
        error: recoveryResult.success ? undefined : recoveryResult.error
      });
    }
    
    // Step 6: Generate debug report
    const debugReport = await generateAuthDebugReport(user);
    results.push({
      success: debugReport.summary.overallStatus !== 'error',
      step: 'Final status check',
      details: debugReport.summary,
      debugReport
    });
    
    // Step 7: Test basic operations
    await testBasicOperations(user.id, results);
    
    return results;
    
  } catch (error: any) {
    results.push({
      success: false,
      step: 'Test execution',
      error: error.message,
      details: error
    });
    return results;
  }
}

async function testBasicOperations(userId: string, results: SignupTestResult[]) {
  // Test profile read
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    results.push({
      success: !error && !!data,
      step: 'Profile read test',
      error: error?.message,
      details: { hasData: !!data }
    });
  } catch (error: any) {
    results.push({
      success: false,
      step: 'Profile read test',
      error: error.message
    });
  }
  
  // Test role read
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);
    
    results.push({
      success: !error,
      step: 'Role read test',
      error: error?.message,
      details: { roleCount: data?.length || 0 }
    });
  } catch (error: any) {
    results.push({
      success: false,
      step: 'Role read test',
      error: error.message
    });
  }
  
  // Test clinic creation (basic check)
  try {
    const { data, error } = await supabase
      .from('clinicas')
      .select('count(*)')
      .limit(1);
    
    results.push({
      success: !error,
      step: 'Clinic access test',
      error: error?.message,
      details: 'Can query clinics table'
    });
  } catch (error: any) {
    results.push({
      success: false,
      step: 'Clinic access test',
      error: error.message
    });
  }
}

/**
 * Clean up test user (for development only)
 */
export async function cleanupTestUser(userId: string): Promise<boolean> {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Cleanup only available in development mode');
    return false;
  }
  
  try {
    // Note: This would require admin privileges to delete auth.users
    // For now, just clean up the related data
    
    await supabase.from('user_roles').delete().eq('user_id', userId);
    await supabase.from('profiles').delete().eq('user_id', userId);
    
    console.log('Test user data cleaned up');
    return true;
  } catch (error) {
    console.error('Error cleaning up test user:', error);
    return false;
  }
}

/**
 * Run a comprehensive signup test and log results
 */
export async function runSignupTest(email?: string): Promise<void> {
  const testEmail = email || `test-${Date.now()}@example.com`;
  const testPassword = 'test123456';
  
  console.group('🧪 Signup Flow Test');
  console.log('Testing with:', testEmail);
  
  const results = await testSignupFlow(testEmail, testPassword);
  
  console.log('📊 Test Results:');
  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${index + 1}. ${result.step}`, result.error || result.details);
  });
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\n📈 Summary: ${successCount}/${totalCount} steps passed`);
  
  // Log debug report if available
  const finalResult = results[results.length - 1];
  if (finalResult?.debugReport) {
    logAuthDebugReport(finalResult.debugReport);
  }
  
  console.groupEnd();
}

// Development helper
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).signupTester = {
    runTest: runSignupTest,
    testFlow: testSignupFlow,
    cleanup: cleanupTestUser
  };
}