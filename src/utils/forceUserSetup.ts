import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

/**
 * Force user setup - creates profile and role if missing
 */
export async function forceUserSetup(user: User): Promise<{
  success: boolean;
  profileCreated: boolean;
  roleCreated: boolean;
  error?: string;
}> {

  try {
    let profileCreated = false;
    let roleCreated = false;

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    // Create profile if missing
    if (!existingProfile) {

      // Check if this is a completely new user or an existing user with missing profile
      // If user has metadata from signup, it's likely a new user
      const isNewUser = !user.user_metadata?.nome_completo && !user.user_metadata?.completed_onboarding;
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          nome_completo: user.user_metadata?.nome_completo || user.email?.split('@')[0] || 'Usuário',
          email: user.email || '',
          primeiro_acesso: isNewUser, // Only new users need onboarding
          ativo: true
        });

      if (profileError) {

        return {
          success: false,
          profileCreated: false,
          roleCreated: false,
          error: `Failed to create profile: ${profileError.message}`
        };
      }
      
      profileCreated = true;

    } else {

    }

    // Check if role exists
    const { data: existingRoles } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('ativo', true);

    // Create role if missing
    if (!existingRoles || existingRoles.length === 0) {

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'proprietaria',
          ativo: true,
          criado_por: user.id
        });

      if (roleError) {

        return {
          success: false,
          profileCreated,
          roleCreated: false,
          error: `Failed to create role: ${roleError.message}`
        };
      }
      
      roleCreated = true;

    } else {

    }

    return {
      success: true,
      profileCreated,
      roleCreated
    };

  } catch (error: any) {

    return {
      success: false,
      profileCreated: false,
      roleCreated: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Check if user needs setup (missing profile or roles)
 */
export async function checkUserNeedsSetup(userId: string): Promise<boolean> {
  try {
    // Check profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    // Check roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('ativo', true);

    return !profile || !roles || roles.length === 0;
  } catch (error) {

    return true; // Assume needs setup if we can't check
  }
}
