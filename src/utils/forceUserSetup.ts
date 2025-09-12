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
  console.log('🔧 Forcing user setup for:', user.email);

  try {
    let profileCreated = false;
    let roleCreated = false;

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    // Create profile if missing
    if (!existingProfile) {
      console.log('📝 Creating missing profile...');
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          nome_completo: user.user_metadata?.nome_completo || user.email?.split('@')[0] || 'Usuário',
          email: user.email || '',
          primeiro_acesso: true,
          ativo: true
        });

      if (profileError) {
        console.error('❌ Error creating profile:', profileError);
        return {
          success: false,
          profileCreated: false,
          roleCreated: false,
          error: `Failed to create profile: ${profileError.message}`
        };
      }
      
      profileCreated = true;
      console.log('✅ Profile created successfully');
    } else {
      console.log('✅ Profile already exists');
    }

    // Check if role exists
    const { data: existingRoles } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('ativo', true);

    // Create role if missing
    if (!existingRoles || existingRoles.length === 0) {
      console.log('👑 Creating missing role...');
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'proprietaria',
          ativo: true,
          criado_por: user.id
        });

      if (roleError) {
        console.error('❌ Error creating role:', roleError);
        return {
          success: false,
          profileCreated,
          roleCreated: false,
          error: `Failed to create role: ${roleError.message}`
        };
      }
      
      roleCreated = true;
      console.log('✅ Role created successfully');
    } else {
      console.log('✅ Role already exists');
    }

    return {
      success: true,
      profileCreated,
      roleCreated
    };

  } catch (error: any) {
    console.error('❌ Error in forceUserSetup:', error);
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
      .eq('user_id', userId)
      .maybeSingle();

    // Check roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('ativo', true);

    return !profile || !roles || roles.length === 0;
  } catch (error) {
    console.error('Error checking if user needs setup:', error);
    return true; // Assume needs setup if we can't check
  }
}