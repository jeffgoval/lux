/**
 * Simplified Appwrite Clientes Service for testing
 * This version simulates database operations for testing purposes
 */

import { ClienteFormData } from '@/schemas/cliente.schema';
import { Cliente } from '@/types/cliente';

export interface AppwriteResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class AppwriteClientesSimpleService {
  private mockDatabase: Cliente[] = [];

  /**
   * Transform form data to Cliente format
   */
  private transformFormToCliente(data: ClienteFormData): Cliente {
    const now = new Date();
    
    return {
      id: `cliente_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nome: data.nome,
      cpf: data.cpf || '',
      rg: '',
      dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : now,
      foto: '',
      telefone: data.telefone,
      whatsapp: data.telefone,
      email: data.email,
      endereco: {
        cep: data.cep || '',
        rua: data.endereco || '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: data.cidade || '',
        estado: data.estado || ''
      },
      redesSociais: {},
      preferenciasContato: ['whatsapp', 'email'],
      comoNosConheceu: 'Sistema',
      dataRegistro: now,
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
      categoria: (data.categoria as any) || 'regular',
      tags: [],
      ltv: 0,
      frequencia: 0,
      ultimoAtendimento: undefined,
      proximoAgendamento: undefined,
      nps: undefined,
      historico: []
    };
  }

  /**
   * Create a new client/patient
   */
  async createCliente(data: ClienteFormData): Promise<AppwriteResponse<Cliente>> {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const cliente = this.transformFormToCliente(data);
      
      // Add to mock database
      this.mockDatabase.push(cliente);

      console.log('✅ Cliente criado com sucesso (simulado):', {
        id: cliente.id,
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone,
        categoria: cliente.categoria
      });

      return {
        success: true,
        data: cliente
      };
    } catch (error) {
      console.error('❌ Erro ao criar cliente:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar cliente'
      };
    }
  }

  /**
   * Update an existing client/patient
   */
  async updateCliente(id: string, data: Partial<ClienteFormData>): Promise<AppwriteResponse<Cliente>> {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const clienteIndex = this.mockDatabase.findIndex(c => c.id === id);
      if (clienteIndex === -1) {
        throw new Error('Cliente não encontrado');
      }

      const cliente = this.mockDatabase[clienteIndex];
      
      // Update fields
      if (data.nome) cliente.nome = data.nome;
      if (data.email) cliente.email = data.email;
      if (data.telefone) {
        cliente.telefone = data.telefone;
        cliente.whatsapp = data.telefone;
      }
      if (data.cpf) cliente.cpf = data.cpf;
      if (data.categoria) cliente.categoria = data.categoria as any;
      
      // Update address
      if (data.endereco || data.cidade || data.estado || data.cep) {
        cliente.endereco = {
          ...cliente.endereco,
          rua: data.endereco || cliente.endereco.rua,
          cidade: data.cidade || cliente.endereco.cidade,
          estado: data.estado || cliente.endereco.estado,
          cep: data.cep || cliente.endereco.cep
        };
      }

      console.log('✅ Cliente atualizado com sucesso (simulado):', {
        id: cliente.id,
        nome: cliente.nome
      });

      return {
        success: true,
        data: cliente
      };
    } catch (error) {
      console.error('❌ Erro ao atualizar cliente:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar cliente'
      };
    }
  }

  /**
   * Get a client by ID
   */
  async getCliente(id: string): Promise<AppwriteResponse<Cliente>> {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));

      const cliente = this.mockDatabase.find(c => c.id === id);
      if (!cliente) {
        throw new Error('Cliente não encontrado');
      }

      return {
        success: true,
        data: cliente
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar cliente'
      };
    }
  }

  /**
   * List clients with filters
   */
  async getClientes(filters?: {
    categoria?: string[];
    busca?: string;
    page?: number;
    limit?: number;
  }): Promise<AppwriteResponse<{ clientes: Cliente[]; total: number }>> {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      let filteredClientes = [...this.mockDatabase];

      // Apply category filter
      if (filters?.categoria && filters.categoria.length > 0) {
        filteredClientes = filteredClientes.filter(c => 
          filters.categoria!.includes(c.categoria)
        );
      }

      // Apply search filter
      if (filters?.busca) {
        const searchTerm = filters.busca.toLowerCase();
        filteredClientes = filteredClientes.filter(c =>
          c.nome.toLowerCase().includes(searchTerm) ||
          c.email.toLowerCase().includes(searchTerm) ||
          c.telefone.includes(searchTerm)
        );
      }

      // Apply pagination
      const page = filters?.page || 1;
      const limit = filters?.limit || 10;
      const startIndex = (page - 1) * limit;
      const paginatedClientes = filteredClientes.slice(startIndex, startIndex + limit);

      return {
        success: true,
        data: {
          clientes: paginatedClientes,
          total: filteredClientes.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao listar clientes'
      };
    }
  }

  /**
   * Delete a client
   */
  async deleteCliente(id: string): Promise<AppwriteResponse<void>> {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const clienteIndex = this.mockDatabase.findIndex(c => c.id === id);
      if (clienteIndex === -1) {
        throw new Error('Cliente não encontrado');
      }

      this.mockDatabase.splice(clienteIndex, 1);

      console.log('✅ Cliente deletado com sucesso (simulado):', id);

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao deletar cliente'
      };
    }
  }

  /**
   * Check if email exists
   */
  async checkEmailExists(email: string, excludeId?: string): Promise<AppwriteResponse<{ exists: boolean }>> {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 200));

      const exists = this.mockDatabase.some(c => 
        c.email.toLowerCase() === email.toLowerCase() && c.id !== excludeId
      );

      return {
        success: true,
        data: { exists }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao verificar email'
      };
    }
  }

  /**
   * Get current database state (for debugging)
   */
  getMockDatabase(): Cliente[] {
    return [...this.mockDatabase];
  }

  /**
   * Clear mock database (for testing)
   */
  clearMockDatabase(): void {
    this.mockDatabase = [];
    console.log('🗑️ Mock database cleared');
  }
}

// Export singleton instance
export const appwriteClientesSimpleService = new AppwriteClientesSimpleService();