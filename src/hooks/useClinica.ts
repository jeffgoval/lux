import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';

type Clinica = Database['public']['Tables']['clinicas']['Row'];

export function useClinica() {
  const [clinica, setClinica] = useState<Clinica | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    const fetchClinica = async () => {
      if (!profile?.user_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // First, get the organization owned by the user
        const { data: organizacao, error: orgError } = await supabase
          .from('organizacoes')
          .select('id')
          .eq('proprietaria_id', profile.user_id)
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
            .eq('user_id', profile.user_id)
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
            setError('Nenhuma clínica encontrada');
          }
        }
      } catch (err) {
        setError('Erro ao carregar dados da clínica');
      } finally {
        setLoading(false);
      }
    };

    fetchClinica();
  }, [profile?.user_id]);

  return {
    clinica,
    loading,
    error
  };
}