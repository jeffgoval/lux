import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';

type Clinica = Database['public']['Tables']['clinicas']['Row'];

export function useClinica() {
  const [clinica, setClinica] = useState<Clinica | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile, user } = useAuth();

  useEffect(() => {
    const fetchClinica = async () => {
      // Use user.id as fallback if profile is not loaded yet
      const userId = profile?.user_id || user?.id;
      
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // First, try to get clinica_id from user_roles (most direct approach)
        const { data: userRole, error: roleError } = await supabase
          .from('user_roles')
          .select('clinica_id, organizacao_id')
          .eq('user_id', userId)
          .eq('ativo', true)
          .maybeSingle();

        if (roleError) {
          console.warn('Error fetching user roles:', roleError);
        }

        // Priority 1: Direct clinica_id from user_roles (most common case)
        if (userRole?.clinica_id) {
          const { data: clinicaData, error: clinicaError } = await supabase
            .from('clinicas')
            .select('*')
            .eq('id', userRole.clinica_id)
            .maybeSingle();

          if (clinicaError) {
            console.error('Error fetching clinic by ID:', clinicaError);
            setError('Erro ao carregar dados da clínica');
          } else if (clinicaData) {
            setClinica(clinicaData);
            setLoading(false);
            return;
          }
        }

        // Priority 2: Organization-based lookup (for multiple clinics)
        if (userRole?.organizacao_id) {
          const { data: clinicaData, error: clinicaError } = await supabase
            .from('clinicas')
            .select('*')
            .eq('organizacao_id', userRole.organizacao_id)
            .maybeSingle();

          if (clinicaError) {
            console.error('Error fetching clinic by organization:', clinicaError);
          } else if (clinicaData) {
            setClinica(clinicaData);
            setLoading(false);
            return;
          }
        }

        // Priority 3: Fallback - user owns an organization directly
        const { data: organizacao, error: orgError } = await supabase
          .from('organizacoes')
          .select('id')
          .eq('proprietaria_id', userId)
          .maybeSingle();

        if (!orgError && organizacao) {
          const { data: clinicaData, error: clinicaError } = await supabase
            .from('clinicas')
            .select('*')
            .eq('organizacao_id', organizacao.id)
            .maybeSingle();

          if (!clinicaError && clinicaData) {
            setClinica(clinicaData);
            setLoading(false);
            return;
          }
        }

        // Priority 4: User is registered as a professional
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
  }, [profile?.user_id, user?.id]);

  return {
    clinica,
    loading,
    error
  };
}