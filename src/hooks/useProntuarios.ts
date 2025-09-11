import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Prontuario, SessaoAtendimento, ImagemMedica } from '@/types/prontuario';

export const useProntuarios = () => {
  const queryClient = useQueryClient();

  // Query para buscar prontuários
  const { data: prontuarios, isLoading, error } = useQuery({
    queryKey: ['prontuarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prontuarios')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      return data as any;
    },
  });

  // Mutação para criar prontuário
  const createProntuario = useMutation({
    mutationFn: async (prontuario: any) => {
      // Gerar número do prontuário
      const { data: numeroData, error: numeroError } = await supabase
        .rpc('gerar_numero_prontuario');

      if (numeroError) throw numeroError;

      const { data, error } = await supabase
        .from('prontuarios')
        .insert({
          nome_completo: prontuario.nome_completo || '',
          paciente_id: prontuario.paciente_id || '',
          medico_responsavel_id: prontuario.medico_responsavel_id || '',
          numero_prontuario: numeroData,
          criado_por: (await supabase.auth.getUser()).data.user?.id,
          status: prontuario.status || 'ativo',
          anamnese: prontuario.anamnese,
          historico_medico: prontuario.historico_medico,
          medicamentos_atuais: prontuario.medicamentos_atuais,
          alergias: prontuario.alergias,
          contraindicacoes: prontuario.contraindicacoes,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prontuarios'] });
      toast({
        title: "Sucesso",
        description: "Prontuário criado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao criar prontuário: " + error.message,
      });
    },
  });

  // Mutação para atualizar prontuário
  const updateProntuario = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Prontuario> & { id: string }) => {
      const { data, error } = await supabase
        .from('prontuarios')
        .update({
          ...updates,
          atualizado_por: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prontuarios'] });
      toast({
        title: "Sucesso",
        description: "Prontuário atualizado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar prontuário: " + error.message,
      });
    },
  });

  return {
    prontuarios: prontuarios || [],
    isLoading,
    error,
    createProntuario: createProntuario.mutate,
    updateProntuario: updateProntuario.mutate,
    isCreating: createProntuario.isPending,
    isUpdating: updateProntuario.isPending,
  };
};

export const useSessoes = (prontuarioId: string) => {
  const queryClient = useQueryClient();

  // Query para buscar sessões de um prontuário
  const { data: sessoes, isLoading } = useQuery({
    queryKey: ['sessoes', prontuarioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessoes_atendimento')
        .select('*')
        .eq('prontuario_id', prontuarioId)
        .order('data_sessao', { ascending: false });

      if (error) throw error;
      return data as any;
    },
    enabled: !!prontuarioId,
  });

  // Mutação para criar sessão
  const createSessao = useMutation({
    mutationFn: async (sessao: any) => {
      const { data, error } = await supabase
        .from('sessoes_atendimento')
        .insert({
          prontuario_id: sessao.prontuario_id,
          data_sessao: sessao.data_sessao || new Date().toISOString(),
          tipo_procedimento: sessao.tipo_procedimento,
          profissional_id: sessao.profissional_id || '',
          observacoes: sessao.observacoes || '',
          criado_por: (await supabase.auth.getUser()).data.user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessoes', prontuarioId] });
      toast({
        title: "Sucesso",
        description: "Sessão criada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao criar sessão: " + error.message,
      });
    },
  });

  return {
    sessoes: sessoes || [],
    isLoading,
    createSessao: createSessao.mutate,
    isCreating: createSessao.isPending,
  };
};

export const useImagensMedicas = (prontuarioId: string) => {
  const queryClient = useQueryClient();

  // Query para buscar imagens de um prontuário
  const { data: imagens, isLoading } = useQuery({
    queryKey: ['imagens', prontuarioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('imagens_medicas')
        .select('*')
        .eq('prontuario_id', prontuarioId)
        .order('data_captura', { ascending: false });

      if (error) throw error;
      return data as any;
    },
    enabled: !!prontuarioId,
  });

  // Função para upload de imagem
  const uploadImagem = useMutation({
    mutationFn: async ({ 
      file, 
      prontuarioId, 
      tipoImagem, 
      regiaoAnatomica 
    }: { 
      file: File; 
      prontuarioId: string; 
      tipoImagem: string;
      regiaoAnatomica?: string;
    }) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Usuário não autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${prontuarioId}/${Date.now()}.${fileExt}`;

      // Upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from('imagens-medicas')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('imagens-medicas')
        .getPublicUrl(fileName);

      // Registrar na base de dados
      const { data, error } = await supabase
        .from('imagens_medicas')
        .insert({
          prontuario_id: prontuarioId,
          nome_arquivo: file.name,
          tipo_imagem: tipoImagem as any,
          caminho_storage: fileName,
          url_publica: publicUrl,
          tamanho_bytes: file.size,
          regiao_anatomica: regiaoAnatomica,
          criado_por: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imagens', prontuarioId] });
      toast({
        title: "Sucesso",
        description: "Imagem enviada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao enviar imagem: " + error.message,
      });
    },
  });

  return {
    imagens: imagens || [],
    isLoading,
    uploadImagem: uploadImagem.mutate,
    isUploading: uploadImagem.isPending,
  };
};

export const useAuditoria = () => {
  // Query para buscar logs de auditoria
  const { data: auditoria, isLoading } = useQuery({
    queryKey: ['auditoria'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auditoria_medica')
        .select('*')
        .order('timestamp_operacao', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  return {
    auditoria: auditoria || [],
    isLoading,
  };
};