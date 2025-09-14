import { useEffect, useState } from 'react';
import { useSecureAuth } from '@/contexts/SecureAuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useForceProfile() {
  const [creating] = useState(false);

  // DESABILITADO: Este hook causava loops infinitos de reload
  // O profile deve ser criado pelo trigger do banco, não por este hook

  return { creating };
}
