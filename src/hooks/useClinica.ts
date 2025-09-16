import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { Database } from '@/integrations/supabase/types';

type Clinica = Database['public']['Tables']['clinicas']['Row'];

export function useClinica() {
  const [clinica, setClinica] = useState<Clinica | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile, user } = useUnifiedAuth();

  useEffect(() => {
    const fetchClinica = async () => {
      // Use user.id as fallback if profile is not loaded yet
      const userId = profile?.id || user?.id;
      
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get clinica_id from user_roles (simplified: 1 proprietária = 1 clínica)
        const { data: userRole, error: roleError } = await supabase
          .from('user_roles')
          .select('clinica_id')
          .eq('user_id', userId)
          .eq('ativo', true)
          .maybeSingle();

        if (roleError) {

        }

        // If user has a clinic assigned, fetch it
        if (userRole?.clinica_id) {
          const { data: clinicaData, error: clinicaError } = await supabase
            .from('clinicas')
            .select('*')
            .eq('id', userRole.clinica_id)
            .maybeSingle();

          if (clinicaError) {

            setError('Erro ao carregar dados da clínica');
          } else if (clinicaData) {
            setClinica(clinicaData);
            setLoading(false);
            return;
          }
        }

        // Fallback: User is registered as a professional
        const { data: profissional, error: profError } = await supabase
          .from('profissionais')
          .select('clinica_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!profError && profissional?.clinica_id) {
          const { data: clinicaData, error: clinicaError } = await supabase
            .from('clinicas')
            .select('*')
            .eq('id', profissional.clinica_id)
            .maybeSingle();

          if (!clinicaError && clinicaData) {
            setClinica(clinicaData);
            setLoading(false);
            return;
          }
        }

        // No clinic found - this is expected for new users who haven't completed onboarding
        setError(null);
        setClinica(null);
      } catch (err) {
        setError('Erro ao carregar dados da clínica');
      } finally {
        setLoading(false);
      }
    };

    fetchClinica();
  }, [profile?.id, user?.id]); // CORRIGIDO: usar profile.id em vez de profile.user_id

  return {
    clinica,
    loading,
    error
  };
}
