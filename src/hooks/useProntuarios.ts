import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Prontuario, SessaoAtendimento, ImagemMedica } from '@/types/prontuario';

export const useProntuarios = () => {
  const queryClient = useQueryClient();

  // Temporariamente retornando dados vazios até tipos serem atualizados
  const prontuarios: any[] = [];
  const isLoading = false;
  const error = null;

  const createProntuario = {
    mutate: () => {
      toast({
        title: "Info",
        description: "Funcionalidade temporariamente indisponível - aguardando atualização dos tipos",
      });
    },
    isPending: false
  };

  const updateProntuario = {
    mutate: () => {
      toast({
        title: "Info", 
        description: "Funcionalidade temporariamente indisponível - aguardando atualização dos tipos",
      });
    },
    isPending: false
  };

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
  return {
    sessoes: [],
    isLoading: false,
    createSessao: () => {},
    isCreating: false,
  };
};

export const useImagensMedicas = (prontuarioId: string) => {
  return {
    imagens: [],
    isLoading: false,
    uploadImagem: () => {},
    isUploading: false,
  };
};

export const useAuditoria = () => {
  return {
    auditoria: [],
    isLoading: false,
  };
};