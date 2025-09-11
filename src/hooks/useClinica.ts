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
          .single();

        if (orgError || !organizacao) {
          // If user doesn't own an organization, try to find clinic through profissionais table
          const { data: profissional, error: profError } = await supabase
            .from('profissionais')
            .select('clinica_id, clinicas(*)')
            .eq('user_id', profile.user_id)
            .single();

          if (profError || !profissional?.clinicas) {
            setError('Nenhuma clínica encontrada');
            setLoading(false);
            return;
          }

          setClinica(profissional.clinicas as Clinica);
        } else {
          // Get clinic from the organization
          const { data: clinicaData, error: clinicaError } = await supabase
            .from('clinicas')
            .select('*')
            .eq('organizacao_id', organizacao.id)
            .single();

          if (clinicaError) {
            setError('Erro ao carregar dados da clínica');
          } else {
            setClinica(clinicaData);
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