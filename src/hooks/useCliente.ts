/**
 * Custom hook for client operations
 * Provides state management and Appwrite integration for client data
 */

import { useState, useCallback, useEffect } from 'react';
import { appwriteClientesService } from '../services/appwrite-clientes.service';
import { Cliente } from '../types/cliente';
import { useNotificationSystem } from './useNotificationSystem';
import { ClienteFormData, ClienteUpdateData } from '../schemas/cliente.schema';

interface UseClienteOptions {
  onSuccess?: (cliente: Cliente) => void;
  onError?: (error: string) => void;
  autoRefresh?: boolean;
}

interface UseClienteState {
  clientes: Cliente[];
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  uploadingAvatar: boolean;
  uploadingDocument: boolean;
  error: string | null;
}

export const useCliente = (options: UseClienteOptions = {}) => {
  // State management
  const [state, setState] = useState<UseClienteState>({
    clientes: [],
    loading: false,
    creating: false,
    updating: false,
    deleting: false,
    uploadingAvatar: false,
    uploadingDocument: false,
    error: null,
  });

  const { success, error, loading: showLoading, dismiss } = useNotificationSystem();

  /**
   * Create a new client
   */
  const createCliente = useCallback(async (data: ClienteFormData): Promise<Cliente | null> => {
    setState(prev => ({ ...prev, creating: true, error: null }));
    const loadingToastId = showLoading('Criando cliente...');

    try {
      const response = await appwriteClientesService.createCliente(data);
      
      if (response.success && response.data) {
        dismiss(loadingToastId);
        success('Cliente criado com sucesso!');
        
        // Optimistic update - add to local state
        setState(prev => ({
          ...prev,
          clientes: [response.data!, ...prev.clientes],
          creating: false
        }));
        
        options.onSuccess?.(response.data);
        return response.data;
      } else {
        throw new Error(response.error || 'Erro ao criar cliente');
      }
    } catch (err) {
      dismiss(loadingToastId);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar cliente';
      error(errorMessage);
      setState(prev => ({ ...prev, creating: false, error: errorMessage }));
      options.onError?.(errorMessage);
      return null;
    }
  }, [success, error, showLoading, dismiss, options]);

  /**
   * Update an existing client
   */
  const updateCliente = useCallback(async (id: string, data: Partial<ClienteUpdateData>): Promise<Cliente | null> => {
    setState(prev => ({ ...prev, updating: true, error: null }));
    const loadingToastId = showLoading('Atualizando cliente...');

    try {
      const response = await appwriteClientesService.updateCliente(id, data);
      
      if (response.success && response.data) {
        dismiss(loadingToastId);
        success('Cliente atualizado com sucesso!');
        
        // Optimistic update - update in local state
        setState(prev => ({
          ...prev,
          clientes: prev.clientes.map(cliente => 
            cliente.id === id ? response.data! : cliente
          ),
          updating: false
        }));
        
        options.onSuccess?.(response.data);
        return response.data;
      } else {
        throw new Error(response.error || 'Erro ao atualizar cliente');
      }
    } catch (err) {
      dismiss(loadingToastId);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar cliente';
      error(errorMessage);
      setState(prev => ({ ...prev, updating: false, error: errorMessage }));
      options.onError?.(errorMessage);
      return null;
    }
  }, [success, error, showLoading, dismiss, options]);

  /**
   * Get all clients
   */
  const getClientes = useCallback(async (filters?: {
    categoria?: string[];
    busca?: string;
    page?: number;
    limit?: number;
  }): Promise<Cliente[]> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await appwriteClientesService.getClientes(filters);
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          clientes: response.data!.clientes,
          loading: false
        }));
        return response.data.clientes;
      } else {
        throw new Error(response.error || 'Erro ao carregar clientes');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar clientes';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      error(errorMessage);
      return [];
    }
  }, [error]);

  /**
   * Get a single client by ID
   */
  const getCliente = useCallback(async (id: string): Promise<Cliente | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await appwriteClientesService.getCliente(id);
      
      if (response.success && response.data) {
        setState(prev => ({ ...prev, loading: false }));
        return response.data;
      } else {
        throw new Error(response.error || 'Erro ao carregar cliente');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar cliente';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      error(errorMessage);
      return null;
    }
  }, [error]);

  /**
   * Delete a client
   */
  const deleteCliente = useCallback(async (id: string): Promise<boolean> => {
    setState(prev => ({ ...prev, deleting: true, error: null }));
    const loadingToastId = showLoading('Excluindo cliente...');

    try {
      const response = await appwriteClientesService.deleteCliente(id);
      
      if (response.success) {
        dismiss(loadingToastId);
        success('Cliente excluído com sucesso!');
        
        // Optimistic update - remove from local state
        setState(prev => ({
          ...prev,
          clientes: prev.clientes.filter(cliente => cliente.id !== id),
          deleting: false
        }));
        
        return true;
      } else {
        throw new Error(response.error || 'Erro ao excluir cliente');
      }
    } catch (err) {
      dismiss(loadingToastId);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir cliente';
      error(errorMessage);
      setState(prev => ({ ...prev, deleting: false, error: errorMessage }));
      return false;
    }
  }, [success, error, showLoading, dismiss]);

  /**
   * Upload client avatar
   */
  const uploadAvatar = useCallback(async (clienteId: string, file: File): Promise<string | null> => {
    setState(prev => ({ ...prev, uploadingAvatar: true, error: null }));
    const loadingToastId = showLoading('Enviando avatar...');

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Apenas arquivos de imagem são permitidos');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Arquivo deve ter no máximo 5MB');
      }

      const response = await appwriteClientesService.uploadAvatar(clienteId, file);
      
      if (response.success && response.data) {
        dismiss(loadingToastId);
        success('Avatar enviado com sucesso!');
        setState(prev => ({ ...prev, uploadingAvatar: false }));
        return response.data;
      } else {
        throw new Error(response.error || 'Erro ao enviar avatar');
      }
    } catch (err) {
      dismiss(loadingToastId);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar avatar';
      error(errorMessage);
      setState(prev => ({ ...prev, uploadingAvatar: false, error: errorMessage }));
      return null;
    }
  }, [success, error, showLoading, dismiss]);

  /**
   * Upload client document
   */
  const uploadDocument = useCallback(async (clienteId: string, file: File, type: string): Promise<string | null> => {
    setState(prev => ({ ...prev, uploadingDocument: true, error: null }));
    const loadingToastId = showLoading('Enviando documento...');

    try {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Arquivo deve ter no máximo 10MB');
      }

      const response = await appwriteClientesService.uploadDocument(clienteId, file, type);
      
      if (response.success && response.data) {
        dismiss(loadingToastId);
        success('Documento enviado com sucesso!');
        setState(prev => ({ ...prev, uploadingDocument: false }));
        return response.data;
      } else {
        throw new Error(response.error || 'Erro ao enviar documento');
      }
    } catch (err) {
      dismiss(loadingToastId);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar documento';
      error(errorMessage);
      setState(prev => ({ ...prev, uploadingDocument: false, error: errorMessage }));
      return null;
    }
  }, [success, error, showLoading, dismiss]);

  /**
   * Check if email exists
   */
  const checkEmailExists = useCallback(async (email: string, excludeId?: string): Promise<boolean> => {
    try {
      const response = await appwriteClientesService.checkEmailExists(email, excludeId);
      return response.success ? response.data?.exists || false : false;
    } catch (err) {
      return false;
    }
  }, []);

  /**
   * Refresh clients list
   */
  const refreshClientes = useCallback(async () => {
    await getClientes();
  }, [getClientes]);

  // Auto-refresh on mount if enabled
  useEffect(() => {
    if (options.autoRefresh !== false) {
      getClientes();
    }
  }, [getClientes, options.autoRefresh]);

  return {
    // State
    ...state,
    
    // Actions
    createCliente,
    updateCliente,
    deleteCliente,
    getClientes,
    getCliente,
    uploadAvatar,
    uploadDocument,
    checkEmailExists,
    refreshClientes,
  };
};