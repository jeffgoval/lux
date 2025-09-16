/**
 * Client API Service
 * Handles all client-related API operations
 */

import { apiClient, type ApiResponse } from './api-client';
import { Cliente } from '@/types/cliente';
import { ClienteFormData, ClienteUpdateData } from '@/schemas/cliente.schema';

// Extended client interface for API operations
export interface ClienteAPI extends Omit<Cliente, 'id' | 'dataRegistro' | 'historico'> {
  id?: string;
  dataRegistro?: string;
}

// Client creation data
export interface ClienteCreateData extends Omit<ClienteFormData, 'consentimento' | 'marketing'> {
  consentimento: boolean;
  marketing?: boolean;
}

// Client service class
class ClienteService {
  private baseEndpoint = '/clientes';

  /**
   * Get all clients with optional filters
   */
  async getClientes(filters?: {
    categoria?: string[];
    busca?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ clientes: Cliente[]; total: number }>> {
    return apiClient.getClientes(filters);
  }

  /**
   * Get a single client by ID
   */
  async getCliente(id: string): Promise<ApiResponse<Cliente>> {
    return apiClient.getCliente(id);
  }

  /**
   * Create a new client
   */
  async createCliente(data: ClienteCreateData): Promise<ApiResponse<Cliente>> {
    // Transform form data to API format
    const clienteData: Partial<ClienteAPI> = {
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      cpf: data.cpf || undefined,
      dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : undefined,
      endereco: data.endereco ? {
        cep: data.cep || '',
        rua: data.endereco,
        numero: '',
        bairro: '',
        cidade: data.cidade || '',
        estado: data.estado || ''
      } : undefined,
      categoria: (data.categoria as any) || 'regular',
      // Additional fields that might be needed
      preferenciasContato: ['whatsapp', 'email'],
      comoNosConheceu: 'Sistema',
      tipoPele: 'mista',
      alergias: [],
      condicoesMedicas: [],
      medicamentos: [],
      cirurgiasPrevia: [],
      objetivosEsteticos: [],
      contraindicacoes: [],
      perfilConsumo: 'moderado',
      sensibilidadePreco: 'media',
      frequenciaIdeal: 30,
      sazonalidade: [],
      preferencasHorario: ['manha'],
      profissionaisPreferidos: [],
      tags: [],
      ltv: 0,
      frequencia: 0,
    };

    return apiClient.createCliente(clienteData);
  }

  /**
   * Update an existing client
   */
  async updateCliente(id: string, data: Partial<ClienteUpdateData>): Promise<ApiResponse<Cliente>> {
    // Transform form data to API format
    const updateData: Partial<ClienteAPI> = {
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      cpf: data.cpf || undefined,
      dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : undefined,
      categoria: (data.categoria as any),
    };

    // Only include fields that have values
    const cleanedData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    return apiClient.updateCliente(id, cleanedData);
  }

  /**
   * Delete a client
   */
  async deleteCliente(id: string): Promise<ApiResponse<void>> {
    return apiClient.deleteCliente(id);
  }

  /**
   * Upload client avatar
   */
  async uploadAvatar(clienteId: string, file: File): Promise<ApiResponse<{ url: string }>> {
    return apiClient.uploadClienteAvatar(clienteId, file);
  }

  /**
   * Upload client documents
   */
  async uploadDocument(clienteId: string, file: File, type: string): Promise<ApiResponse<{ url: string; type: string }>> {
    return apiClient.uploadClienteDocument(clienteId, file, type);
  }

  /**
   * Check if email is already in use
   */
  async checkEmailExists(email: string, excludeId?: string): Promise<ApiResponse<{ exists: boolean }>> {
    return apiClient.checkClienteEmailExists(email, excludeId);
  }
}

// Export singleton instance
export const clienteService = new ClienteService();

// Export types
export type { ClienteCreateData, ClienteAPI };