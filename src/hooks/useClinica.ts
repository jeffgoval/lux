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
      const userId = user?.id || profile?.user_id;
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Priority 1: Check user_roles for direct clinica_id
        const { data: userRole, error: roleError } = await supabase
          .from('user_roles')
          .select('clinica_id, organizacao_id')
          .eq('user_id', userId)
          .eq('ativo', true)
          .maybeSingle();

        if (roleError) {
          console.error('Error fetching user roles:', roleError);
        }

        if (userRole?.clinica_id) {
          // Get clinic data directly from user role
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

        // Priority 2: Check organization owned by user
        const { data: organizacao, error: orgError } = await supabase
          .from('organizacoes')
          .select('id')
          .eq('proprietaria_id', userId)
          .maybeSingle();

        if (orgError) {
          console.error('Error fetching organization:', orgError);
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
            setLoading(false);
            return;
          }
        }

        // Priority 3: Check through profissionais table
        const { data: profissional, error: profError } = await supabase
          .from('profissionais')
          .select('clinica_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (profError) {
          console.error('Error fetching professional:', profError);
        }

        if (profissional?.clinica_id) {
          // Get clinic data
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
      } catch (err) {
        console.error('Erro inesperado ao carregar clínica:', err);
        setError('Erro ao carregar dados da clínica');
      } finally {
        setLoading(false);
      }
    };

    fetchClinica();
  }, [user?.id, profile?.user_id]);

  return {
    clinica,
    loading,
    error
  };
}