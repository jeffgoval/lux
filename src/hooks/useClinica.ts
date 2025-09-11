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
      // Use user.id if profile is not yet hydrated
      const userId = profile?.user_id || user?.id;
      
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // First, try to get clinic through user_roles (most direct approach)
        const { data: userRole, error: roleError } = await supabase
          .from('user_roles')
          .select('clinica_id, organizacao_id')
          .eq('user_id', userId)
          .eq('ativo', true)
          .maybeSingle();

        if (!roleError && userRole?.clinica_id) {
          // Get clinic data directly
          const { data: clinicaData, error: clinicaError } = await supabase
            .from('clinicas')
            .select('*')
            .eq('id', userRole.clinica_id)
            .maybeSingle();

          if (!clinicaError && clinicaData) {
            setClinica(clinicaData);
            setLoading(false);
            return;
          }
        }
        
        // Fallback: get the organization owned by the user
        const { data: organizacao, error: orgError } = await supabase
          .from('organizacoes')
          .select('id')
          .eq('proprietaria_id', userId)
          .maybeSingle();

        if (orgError) {
          setError('Erro ao carregar organização');
          setLoading(false);
          return;
        }

        if (organizacao) {
          // Get clinic from the organization
          const { data: clinicaData, error: clinicaError } = await supabase
            .from('clinicas')
            .select('*')
            .eq('organizacao_id', organizacao.id)
            .maybeSingle();

          if (clinicaError) {
            setError('Erro ao carregar dados da clínica');
          } else if (clinicaData) {
            setClinica(clinicaData);
          } else {
            setError('Nenhuma clínica encontrada');
          }
        } else {
          // If user doesn't own an organization, try to find clinic through profissionais table
          const { data: profissional, error: profError } = await supabase
            .from('profissionais')
            .select('clinica_id')
            .eq('user_id', userId)
            .maybeSingle();

          if (profError) {
            setError('Erro ao carregar dados do profissional');
            setLoading(false);
            return;
          }

          if (profissional?.clinica_id) {
            // Get clinic data separately to avoid join issues
            const { data: clinicaData, error: clinicaError } = await supabase
              .from('clinicas')
              .select('*')
              .eq('id', profissional.clinica_id)
              .maybeSingle();

            if (clinicaError) {
              setError('Erro ao carregar dados da clínica');
            } else if (clinicaData) {
              setClinica(clinicaData);
            } else {
              setError('Clínica não encontrada');
            }
          } else {
            // No clinic found through any method - this is expected for new users
            setError(null);
          }
        }
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