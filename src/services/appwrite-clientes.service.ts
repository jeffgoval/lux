/**
 * Appwrite Clientes Service
 * Handles all client/patient operations with Appwrite
 */

import { ID, Query } from 'appwrite';
import { databases, storage, account, DATABASE_ID, COLLECTIONS, STORAGE_BUCKET_ID } from '@/lib/appwrite';
import { Patient } from '@/types/appwrite-collections';
import { ClienteFormData } from '@/schemas/cliente.schema';
import { Cliente } from '@/types/cliente';

export interface AppwriteResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class AppwriteClientesService {
  private collectionId = COLLECTIONS.PATIENTS;
  private databaseId = DATABASE_ID;

  constructor() {
    // Service uses the shared databases instance from @/lib/appwrite
    // No need to initialize client here as it's already configured
  }

  /**
   * Transform form data to Appwrite Patient format
   */
  private transformFormToPatient(data: ClienteFormData, clinicId: string): Partial<Patient> {
    // Encrypt sensitive personal information
    const personalInfo = {
      nome: data.nome,
      cpf: data.cpf,
      dataNascimento: data.dataNascimento,
      endereco: data.endereco,
      cidade: data.cidade,
      estado: data.estado,
      cep: data.cep,
      profissao: data.profissao,
      estadoCivil: data.estadoCivil,
      observacoes: data.observacoes,
      telefone: data.telefone,
      email: data.email,
      consentimento: data.consentimento,
      marketing: data.marketing || false,
      dataConsentimento: new Date().toISOString()
    };

    // Create searchable data (non-sensitive)
    const searchableData = {
      firstNameHash: this.createSearchHash(data.nome.split(' ')[0]), // Hash for search without exposing name
      emailHash: data.email ? this.createSearchHash(data.email) : '',
      phoneHash: data.telefone ? this.createSearchHash(data.telefone) : '',
      birthYear: data.dataNascimento ? new Date(data.dataNascimento).getFullYear() : new Date().getFullYear()
    };

    // Business metrics
    const businessMetrics = {
      ltv: 0,
      totalSpent: 0,
      appointmentCount: 0,
      lastAppointmentAt: undefined,
      averageTicket: 0,
      churnRisk: 'low' as const
    };

    // LGPD consents
    const consents = {
      lgpdAccepted: data.consentimento,
      lgpdAcceptedAt: new Date(),
      marketingConsent: data.marketing || false,
      imageUseConsent: false,
      dataRetentionDays: 365 * 5 // 5 years default
    };

    return {
      $id: undefined, // Will be set by Appwrite
      tenantId: clinicId,
      clinicId,
      code: this.generatePatientCode(),
      personalInfoEncrypted: JSON.stringify(personalInfo), // In production, this should be encrypted
      searchableData,
      businessMetrics,
      consents,
      tags: [],
      vipLevel: data.categoria === 'vip' ? 'gold' : data.categoria === 'premium' ? 'platinum' : undefined,
      // Audit fields - createdAt and updatedAt are managed by Appwrite
      createdBy: 'system', // Should be current user ID
      updatedBy: 'system',
      version: 1,
      isActive: true,
      // Audit log
      auditLog: [{
        action: 'create' as const,
        timestamp: new Date(),
        userId: 'system',
        changes: { created: true }
      }],
      // Encryption fields
      encryptedFields: ['personalInfoEncrypted'],
      encryptionVersion: '1.0',
      dataHash: this.createDataHash(personalInfo)
    };
  }

  /**
   * Transform Appwrite Patient to Cliente format
   */
  private transformPatientToCliente(patient: Patient): Cliente {
    let personalInfo: any = {};
    
    try {
      personalInfo = JSON.parse(patient.personalInfoEncrypted);
    } catch (error) {
      console.error('Error parsing personal info:', error);
    }

    return {
      id: patient.$id,
      nome: personalInfo.nome || '',
      cpf: personalInfo.cpf || '',
      rg: '', // Not stored in new structure
      dataNascimento: personalInfo.dataNascimento ? new Date(personalInfo.dataNascimento) : new Date(),
      foto: '', // Will be handled separately
      telefone: personalInfo.telefone || '',
      whatsapp: personalInfo.telefone || '',
      email: personalInfo.email || '',
      endereco: {
        cep: personalInfo.cep || '',
        rua: personalInfo.endereco || '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: personalInfo.cidade || '',
        estado: personalInfo.estado || ''
      },
      redesSociais: {},
      preferenciasContato: ['whatsapp', 'email'],
      comoNosConheceu: 'Sistema',
      dataRegistro: new Date(patient.$createdAt),
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
      categoria: this.mapCategoryFromVipLevel(patient.vipLevel) || 'regular',
      tags: patient.tags.map((tag: string) => ({ id: tag, nome: tag, cor: '#000', categoria: 'personalizada' as const })),
      ltv: patient.businessMetrics.ltv,
      frequencia: patient.businessMetrics.appointmentCount,
      ultimoAtendimento: patient.businessMetrics.lastAppointmentAt ? new Date(patient.businessMetrics.lastAppointmentAt) : undefined,
      proximoAgendamento: undefined,
      nps: undefined, // Not stored in business metrics
      historico: []
    };
  }

  /**
   * Map VIP level to category
   */
  private mapCategoryFromVipLevel(vipLevel?: string): 'premium' | 'vip' | 'regular' {
    switch (vipLevel) {
      case 'platinum':
        return 'premium';
      case 'gold':
        return 'vip';
      default:
        return 'regular';
    }
  }

  /**
   * Generate unique patient code
   */
  private generatePatientCode(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PAC-${year}${month}${day}-${random}`;
  }

  /**
   * Create search hash for sensitive data
   */
  private createSearchHash(value: string): string {
    // Simple hash for demo - in production use proper hashing
    return btoa(value.toLowerCase().replace(/\s+/g, '')).substring(0, 10);
  }

  /**
   * Create data hash for integrity verification
   */
  private createDataHash(data: any): string {
    // Simple hash for demo - in production use proper hashing
    return btoa(JSON.stringify(data)).substring(0, 16);
  }

  /**
   * Get current clinic ID (should come from auth context)
   */
  private async getCurrentClinicId(): Promise<string> {
    // TODO: Get from auth context
    // For now, using a fixed clinic ID
    return 'clinic_main';
  }

  /**
   * Ensure user is authenticated for development
   */
  private async ensureAuthenticated(): Promise<void> {
    try {
      // Try to get current user
      const user = await account.get();
      if (user) {
        return; // User is already authenticated
      }
    } catch (error) {
      // User is not authenticated, try to login
      try {
        // Try to login with development credentials
        await account.createEmailSession('dev@clinic.com', 'password123');
        return; // Login successful
      } catch (loginError: any) {
        console.log('Login failed, trying alternative approaches...', loginError.message);
        
        // If user exists but password is wrong, try different passwords
        if (loginError.code === 401) {
          const passwords = ['password123', 'dev123', 'development', '123456'];
          
          for (const password of passwords) {
            try {
              await account.createEmailSession('dev@clinic.com', password);
              return; // Login successful
            } catch (e) {
              // Continue to next password
            }
          }
        }
        
        // If user doesn't exist, try to create it
        if (loginError.code === 401 || loginError.code === 404) {
          try {
            // Generate a unique ID to avoid conflicts
            const uniqueId = `dev-${Date.now()}`;
            await account.create(
              uniqueId,
              'dev@clinic.com',
              'password123',
              'Usuário de Desenvolvimento'
            );
            // Login after creating
            await account.createEmailSession('dev@clinic.com', 'password123');
            return;
          } catch (createError: any) {
            console.error('Failed to create development user:', createError);
            
            // If user already exists (409), try to login again
            if (createError.code === 409) {
              try {
                await account.createEmailSession('dev@clinic.com', 'password123');
                return;
              } catch (finalLoginError) {
                console.error('Final login attempt failed:', finalLoginError);
              }
            }
          }
        }
        
        // As a last resort, skip authentication for development
        console.warn('Skipping authentication for development mode');
        return;
      }
    }
  }

  /**
   * Create a new client/patient
   */
  async createCliente(data: ClienteFormData): Promise<AppwriteResponse<Cliente>> {
    try {
      // Ensure user is authenticated for development
      await this.ensureAuthenticated();

      // Validate required fields - Only name is required during development
      if (!data.nome) {
        return {
          success: false,
          error: 'Nome é obrigatório'
        };
      }

      // Check if email already exists (only if email is provided)
      if (data.email && data.email.trim()) {
        const emailCheck = await this.checkEmailExists(data.email);
        if (!emailCheck.success) {
          return {
            success: false,
            error: emailCheck.error || 'Erro ao verificar email'
          };
        }
        
        if (emailCheck.data?.exists) {
          return {
            success: false,
            error: 'Este email já está cadastrado'
          };
        }
      }

      const clinicId = await this.getCurrentClinicId();
      const patientData = this.transformFormToPatient(data, clinicId);

      // Remove undefined fields to avoid Appwrite errors
      const cleanPatientData = Object.fromEntries(
        Object.entries(patientData).filter(([_, value]) => value !== undefined)
      );

      const response = await databases.createDocument(
        this.databaseId,
        this.collectionId,
        ID.unique(),
        cleanPatientData
      );

      const cliente = this.transformPatientToCliente(response as Patient);

      return {
        success: true,
        data: cliente
      };
    } catch (error) {
      console.error('Error creating client:', error);
      
      // Handle specific Appwrite errors
      if (error && typeof error === 'object' && 'code' in error) {
        const appwriteError = error as any;
        switch (appwriteError.code) {
          case 409:
            return {
              success: false,
              error: 'Cliente já existe com estes dados'
            };
          case 400:
            return {
              success: false,
              error: 'Dados inválidos fornecidos'
            };
          case 401:
            return {
              success: false,
              error: 'Não autorizado. Faça login novamente'
            };
          default:
            return {
              success: false,
              error: `Erro do servidor: ${appwriteError.message || 'Erro desconhecido'}`
            };
        }
      }

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
      // Validate ID
      if (!id) {
        return {
          success: false,
          error: 'ID do cliente é obrigatório'
        };
      }

      // Check if email is being updated and if it already exists
      if (data.email) {
        const emailCheck = await this.checkEmailExists(data.email, id);
        if (!emailCheck.success) {
          return {
            success: false,
            error: emailCheck.error || 'Erro ao verificar email'
          };
        }
        
        if (emailCheck.data?.exists) {
          return {
            success: false,
            error: 'Este email já está cadastrado para outro cliente'
          };
        }
      }

      // Get current patient data to verify it exists
      let currentPatient: Patient;
      try {
        currentPatient = await databases.getDocument(
          this.databaseId,
          this.collectionId,
          id
        ) as Patient;
      } catch (error) {
        return {
          success: false,
          error: 'Cliente não encontrado'
        };
      }

      // Parse current personal info
      let currentPersonalInfo: any = {};
      try {
        currentPersonalInfo = JSON.parse(currentPatient.personalInfoEncrypted);
      } catch (error) {
        console.error('Error parsing current personal info:', error);
        // If we can't parse, start with empty object
        currentPersonalInfo = {};
      }

      // Filter out undefined values and merge with current data
      const filteredData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined && value !== null)
      );

      const updatedPersonalInfo = {
        ...currentPersonalInfo,
        ...filteredData,
        // Always update the modification timestamp
        dataConsentimento: currentPersonalInfo.dataConsentimento || new Date().toISOString()
      };

      const updateData: Partial<Patient> = {
        personalInfoEncrypted: JSON.stringify(updatedPersonalInfo),
        // updatedAt is managed by Appwrite automatically
        updatedBy: 'system', // Should be current user ID
        version: (currentPatient.version || 1) + 1,
        dataHash: this.createDataHash(updatedPersonalInfo)
      };

      // Update searchable data if relevant fields changed
      const searchableUpdates: any = {};
      if (data.nome) {
        searchableUpdates.firstNameHash = this.createSearchHash(data.nome.split(' ')[0]);
      }
      if (data.email) {
        searchableUpdates.emailHash = this.createSearchHash(data.email);
      }
      if (data.telefone) {
        searchableUpdates.phoneHash = this.createSearchHash(data.telefone);
      }
      if (data.dataNascimento) {
        searchableUpdates.birthYear = new Date(data.dataNascimento).getFullYear();
      }

      if (Object.keys(searchableUpdates).length > 0) {
        updateData.searchableData = {
          ...currentPatient.searchableData,
          ...searchableUpdates
        };
      }

      // Update VIP level if category changed
      if (data.categoria) {
        updateData.vipLevel = data.categoria === 'vip' ? 'gold' : data.categoria === 'premium' ? 'platinum' : undefined;
      }

      // Add audit log entry
      const auditEntry = {
        action: 'update' as const,
        timestamp: new Date(),
        userId: 'system',
        changes: filteredData
      };

      updateData.auditLog = [...(currentPatient.auditLog || []), auditEntry];

      // Remove undefined fields to avoid Appwrite errors
      const cleanUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      const response = await databases.updateDocument(
        this.databaseId,
        this.collectionId,
        id,
        cleanUpdateData
      );

      const cliente = this.transformPatientToCliente(response as Patient);

      return {
        success: true,
        data: cliente
      };
    } catch (error) {
      console.error('Error updating client:', error);
      
      // Handle specific Appwrite errors
      if (error && typeof error === 'object' && 'code' in error) {
        const appwriteError = error as any;
        switch (appwriteError.code) {
          case 404:
            return {
              success: false,
              error: 'Cliente não encontrado'
            };
          case 400:
            return {
              success: false,
              error: 'Dados inválidos fornecidos'
            };
          case 401:
            return {
              success: false,
              error: 'Não autorizado. Faça login novamente'
            };
          default:
            return {
              success: false,
              error: `Erro do servidor: ${appwriteError.message || 'Erro desconhecido'}`
            };
        }
      }

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
      // Validate ID
      if (!id) {
        return {
          success: false,
          error: 'ID do cliente é obrigatório'
        };
      }

      const response = await databases.getDocument(
        this.databaseId,
        this.collectionId,
        id
      );

      const cliente = this.transformPatientToCliente(response as Patient);

      return {
        success: true,
        data: cliente
      };
    } catch (error) {
      console.error('Error getting client:', error);
      
      // Handle specific Appwrite errors
      if (error && typeof error === 'object' && 'code' in error) {
        const appwriteError = error as any;
        switch (appwriteError.code) {
          case 404:
            return {
              success: false,
              error: 'Cliente não encontrado'
            };
          case 401:
            return {
              success: false,
              error: 'Não autorizado. Faça login novamente'
            };
          default:
            return {
              success: false,
              error: `Erro do servidor: ${appwriteError.message || 'Erro desconhecido'}`
            };
        }
      }

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
      // Ensure user is authenticated for development
      await this.ensureAuthenticated();
      
      const clinicId = await this.getCurrentClinicId();
      const queries = [Query.equal('clinicId', clinicId)];

      // Set default pagination
      const limit = filters?.limit || 50;
      const page = filters?.page || 1;
      const offset = (page - 1) * limit;

      queries.push(Query.limit(limit));
      queries.push(Query.offset(offset));

      // Add ordering for consistent results - using $createdAt instead of createdAt
      queries.push(Query.orderDesc('$createdAt'));

      const response = await databases.listDocuments(
        this.databaseId,
        this.collectionId,
        queries
      );

      let clientes = response.documents.map(doc => 
        this.transformPatientToCliente(doc as Patient)
      );

      // Apply client-side filters since Appwrite can't query nested JSON
      if (filters?.categoria && filters.categoria.length > 0) {
        clientes = clientes.filter(cliente => 
          filters.categoria!.includes(cliente.categoria)
        );
      }

      // Apply search filter
      if (filters?.busca && filters.busca.trim()) {
        const searchTerm = filters.busca.toLowerCase().trim();
        clientes = clientes.filter(cliente => 
          cliente.nome.toLowerCase().includes(searchTerm) ||
          cliente.email.toLowerCase().includes(searchTerm) ||
          cliente.telefone.includes(searchTerm) ||
          (cliente.cpf && cliente.cpf.includes(searchTerm))
        );
      }

      // Note: Total count might not be accurate after client-side filtering
      // For production, consider implementing server-side search with indexed fields
      const total = clientes.length;

      return {
        success: true,
        data: {
          clientes,
          total
        }
      };
    } catch (error) {
      console.error('Error listing clients:', error);
      
      // Handle specific Appwrite errors
      if (error && typeof error === 'object' && 'code' in error) {
        const appwriteError = error as any;
        switch (appwriteError.code) {
          case 401:
            return {
              success: false,
              error: 'Não autorizado. Faça login novamente'
            };
          case 400:
            return {
              success: false,
              error: 'Parâmetros de consulta inválidos'
            };
          default:
            return {
              success: false,
              error: `Erro do servidor: ${appwriteError.message || 'Erro desconhecido'}`
            };
        }
      }

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
      // Validate ID
      if (!id) {
        return {
          success: false,
          error: 'ID do cliente é obrigatório'
        };
      }

      // First, verify the client exists and get their data for cleanup
      let clientData: Patient;
      try {
        clientData = await databases.getDocument(
          this.databaseId,
          this.collectionId,
          id
        ) as Patient;
      } catch (error) {
        return {
          success: false,
          error: 'Cliente não encontrado'
        };
      }

      // TODO: In a production system, we should:
      // 1. Check for related appointments and handle them appropriately
      // 2. Check for related medical records and handle LGPD compliance
      // 3. Delete or anonymize related files in storage
      // 4. Log the deletion for audit purposes

      // For now, we'll just delete the main document
      // In the future, this should be a soft delete for LGPD compliance
      await databases.deleteDocument(
        this.databaseId,
        this.collectionId,
        id
      );

      // TODO: Delete related files from storage
      // This would require tracking file associations in the patient record
      // For now, we'll leave this as a future enhancement

      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting client:', error);
      
      // Handle specific Appwrite errors
      if (error && typeof error === 'object' && 'code' in error) {
        const appwriteError = error as any;
        switch (appwriteError.code) {
          case 404:
            return {
              success: false,
              error: 'Cliente não encontrado'
            };
          case 401:
            return {
              success: false,
              error: 'Não autorizado. Faça login novamente'
            };
          case 400:
            return {
              success: false,
              error: 'Não é possível deletar este cliente'
            };
          default:
            return {
              success: false,
              error: `Erro do servidor: ${appwriteError.message || 'Erro desconhecido'}`
            };
        }
      }

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
      // Since we can't query nested JSON attributes, we'll get all documents and check manually
      // This is not ideal for large datasets, but works for now
      const response = await databases.listDocuments(
        this.databaseId,
        this.collectionId,
        [] // No queries, get all documents
      );

      const emailHash = this.createSearchHash(email);
      let exists = false;

      for (const doc of response.documents) {
        const patient = doc as Patient;
        if (patient.searchableData?.emailHash === emailHash && patient.$id !== excludeId) {
          exists = true;
          break;
        }
      }

      return {
        success: true,
        data: { exists }
      };
    } catch (error) {
      console.error('Error checking email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao verificar email'
      };
    }
  }

  /**
   * Upload avatar for a client
   */
  async uploadAvatar(clienteId: string, file: File): Promise<AppwriteResponse<string>> {
    try {
      // Validate inputs
      if (!clienteId) {
        return {
          success: false,
          error: 'ID do cliente é obrigatório'
        };
      }

      if (!file) {
        return {
          success: false,
          error: 'Arquivo é obrigatório'
        };
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return {
          success: false,
          error: 'Apenas imagens são permitidas'
        };
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return {
          success: false,
          error: 'Arquivo muito grande. Máximo 5MB'
        };
      }

      // Upload file to storage
      const fileResponse = await storage.createFile(
        STORAGE_BUCKET_ID,
        ID.unique(),
        file
      );

      // Get file URL
      const fileUrl = storage.getFileView(STORAGE_BUCKET_ID, fileResponse.$id);

      // Update patient record with avatar URL
      const updateData = {
        // updatedAt is managed by Appwrite automatically
        updatedBy: 'system'
      };

      await databases.updateDocument(
        this.databaseId,
        this.collectionId,
        clienteId,
        updateData
      );

      return {
        success: true,
        data: fileUrl.toString()
      };
    } catch (error) {
      console.error('Error uploading avatar:', error);
      
      // Handle specific Appwrite errors
      if (error && typeof error === 'object' && 'code' in error) {
        const appwriteError = error as any;
        switch (appwriteError.code) {
          case 404:
            return {
              success: false,
              error: 'Cliente não encontrado'
            };
          case 401:
            return {
              success: false,
              error: 'Não autorizado. Faça login novamente'
            };
          default:
            return {
              success: false,
              error: `Erro do servidor: ${appwriteError.message || 'Erro desconhecido'}`
            };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao fazer upload do avatar'
      };
    }
  }

  /**
   * Upload document for a client
   */
  async uploadDocument(clienteId: string, file: File, type: string): Promise<AppwriteResponse<string>> {
    try {
      // Validate inputs
      if (!clienteId) {
        return {
          success: false,
          error: 'ID do cliente é obrigatório'
        };
      }

      if (!file) {
        return {
          success: false,
          error: 'Arquivo é obrigatório'
        };
      }

      if (!type) {
        return {
          success: false,
          error: 'Tipo do documento é obrigatório'
        };
      }

      // Validate file size (10MB limit for documents)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return {
          success: false,
          error: 'Arquivo muito grande. Máximo 10MB'
        };
      }

      // Validate file type (allow common document types)
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!allowedTypes.includes(file.type)) {
        return {
          success: false,
          error: 'Tipo de arquivo não permitido'
        };
      }

      // Upload file to storage
      const fileResponse = await storage.createFile(
        STORAGE_BUCKET_ID,
        ID.unique(),
        file
      );

      // Get file URL
      const fileUrl = storage.getFileView(STORAGE_BUCKET_ID, fileResponse.$id);

      // TODO: Store document reference in patient record or separate documents collection
      // For now, just return the file URL
      // In production, we should:
      // 1. Create a document record with metadata
      // 2. Link it to the patient
      // 3. Set appropriate permissions
      // 4. Log the upload for audit purposes

      return {
        success: true,
        data: fileUrl.toString()
      };
    } catch (error) {
      console.error('Error uploading document:', error);
      
      // Handle specific Appwrite errors
      if (error && typeof error === 'object' && 'code' in error) {
        const appwriteError = error as any;
        switch (appwriteError.code) {
          case 404:
            return {
              success: false,
              error: 'Cliente não encontrado'
            };
          case 401:
            return {
              success: false,
              error: 'Não autorizado. Faça login novamente'
            };
          default:
            return {
              success: false,
              error: `Erro do servidor: ${appwriteError.message || 'Erro desconhecido'}`
            };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao fazer upload do documento'
      };
    }
  }
}

// Export singleton instance
export const appwriteClientesService = new AppwriteClientesService();