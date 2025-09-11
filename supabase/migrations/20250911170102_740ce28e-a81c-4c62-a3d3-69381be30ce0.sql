-- Corrigir função de atualização de perfil
CREATE OR REPLACE FUNCTION public.update_user_profile(p_user_id uuid, p_nome_completo text, p_telefone text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.profiles 
  SET 
    nome_completo = p_nome_completo,
    telefone = p_telefone,
    primeiro_acesso = false,
    atualizado_em = now()
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado para o usuário %', p_user_id;
  END IF;
END;
$function$;