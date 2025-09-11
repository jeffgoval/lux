-- Fix handle_new_user trigger to be more robust and handle edge cases
-- This migration improves the automatic user profile and role creation

-- Drop existing trigger and function to recreate with improvements
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function with better error handling and logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $function$
DECLARE
  profile_exists boolean := false;
  role_exists boolean := false;
  user_email text;
  user_name text;
BEGIN
  -- Get user data safely
  user_email := COALESCE(NEW.email, '');
  user_name := COALESCE(NEW.raw_user_meta_data ->> 'nome_completo', NEW.email, 'Usuário');
  
  -- Log the user creation attempt
  RAISE LOG 'Creating profile and role for user: % (ID: %)', user_email, NEW.id;
  
  -- Check if profile already exists
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE user_id = NEW.id
  ) INTO profile_exists;
  
  -- Check if role already exists
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.id
  ) INTO role_exists;
  
  -- Create or update profile
  IF NOT profile_exists THEN
    BEGIN
      INSERT INTO public.profiles (
        user_id, 
        nome_completo, 
        email, 
        primeiro_acesso,
        ativo,
        criado_em,
        atualizado_em
      ) VALUES (
        NEW.id, 
        user_name,
        user_email,
        true,
        true,
        now(),
        now()
      );
      
      RAISE LOG 'Profile created successfully for user: %', user_email;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Error creating profile for user %: % %', user_email, SQLSTATE, SQLERRM;
      -- Try to update existing profile instead
      UPDATE public.profiles 
      SET 
        email = user_email,
        atualizado_em = now()
      WHERE user_id = NEW.id;
    END;
  ELSE
    RAISE LOG 'Profile already exists for user: %', user_email;
  END IF;
  
  -- Create role if it doesn't exist
  IF NOT role_exists THEN
    BEGIN
      INSERT INTO public.user_roles (
        user_id,
        role,
        ativo,
        criado_por,
        criado_em
      ) VALUES (
        NEW.id,
        'proprietaria'::user_role_type,
        true,
        NEW.id,
        now()
      );
      
      RAISE LOG 'Role proprietaria created successfully for user: %', user_email;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Error creating role for user %: % %', user_email, SQLSTATE, SQLERRM;
      -- Continue execution even if role creation fails
    END;
  ELSE
    RAISE LOG 'Role already exists for user: %', user_email;
  END IF;
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the user creation
  RAISE LOG 'Critical error in handle_new_user for user %: % %', user_email, SQLSTATE, SQLERRM;
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Create a function to manually fix users that might have missing data
CREATE OR REPLACE FUNCTION public.fix_missing_user_data(user_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  result json;
  user_record record;
  profile_created boolean := false;
  role_created boolean := false;
BEGIN
  -- Get user data from auth.users
  SELECT * INTO user_record FROM auth.users WHERE id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'User not found');
  END IF;
  
  -- Check and create profile if missing
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = user_uuid) THEN
    INSERT INTO public.profiles (
      user_id, 
      nome_completo, 
      email, 
      primeiro_acesso,
      ativo
    ) VALUES (
      user_uuid, 
      COALESCE(user_record.raw_user_meta_data ->> 'nome_completo', user_record.email, 'Usuário'),
      COALESCE(user_record.email, ''),
      true,
      true
    );
    profile_created := true;
  END IF;
  
  -- Check and create role if missing
  IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = user_uuid) THEN
    INSERT INTO public.user_roles (
      user_id,
      role,
      ativo,
      criado_por
    ) VALUES (
      user_uuid,
      'proprietaria'::user_role_type,
      true,
      user_uuid
    );
    role_created := true;
  END IF;
  
  RETURN json_build_object(
    'user_id', user_uuid,
    'profile_created', profile_created,
    'role_created', role_created,
    'success', true
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'error', SQLERRM,
    'sqlstate', SQLSTATE,
    'success', false
  );
END;
$function$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.fix_missing_user_data(uuid) TO authenticated;