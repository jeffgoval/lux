/**
 * 🧪 TESTES UNITÁRIOS - OPERAÇÕES ATÔMICAS DO ONBOARDING
 * 
 * Testes para transações atômicas, rollback, validação de integridade
 * e operações de vinculação profissional
 */

import { OnboardingTransaction } from '@/services/onboarding-transaction.service';
import { supabase } from '@/lib/supabase';
import { UserRole, TipoProcedimento } from '@/types/auth.types';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('@/lib/supabase');
jest.mock('@/utils/logger');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Mock data
const mockUserData = {
  id: 'user-123',
  email: 'test@example.com',
  nome_completo: 'Test User',
  telefone: '11999999999'
};

const mockClinicData = {
  nome: 'Test Clinic',
  endereco: 'Test Address',
  telefone: '11888888888',
  email: 'clinic@test.com'
};

const mockProfessionalData = {
  especialidades: ['Estética Facial'],
  registro_profissional: 'CRO-123456'
};

// ============================================================================
// TESTES DE OPERAÇÕES ATÔMICAS
// ============================================================================

describe('OnboardingTransaction - Atomic Operations', () => {
  let transaction: OnboardingTransaction;

  beforeEach(() => {
    transaction = new OnboardingTransaction('user-123');
    jest.clearAllMocks();

    // Setup default mocks
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn()
    } as any);

    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
  });

  describe('Profile Creation', () => {
    it('should create profile successfully', async () => {
      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...mockUserData, primeiro_acesso: true },
              error: null
            })
          })
        })
      } as any);

      const result = await transaction.createProfile(mockUserData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining(mockUserData));
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    });

    it('should handle profile creation failure', async () => {
      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile creation failed' }
            })
          })
        })
      } as any);

      const result = await transaction.createProfile(mockUserData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Profile creation failed');
    });

    it('should validate required profile fields', async () => {
      const invalidData = { ...mockUserData, nome_completo: '' };

      const result = await transaction.createProfile(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('nome_completo is required');
    });
  });

  describe('Role Creation', () => {
    it('should create proprietaria role successfully', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'role-123',
                user_id: 'user-123',
                role: UserRole.PROPRIETARIA,
                ativo: true
              },
              error: null
            })
          })
        })
      } as any);

      const result = await transaction.createRole();

      expect(result.success).toBe(true);
      expect(result.data.role).toBe(UserRole.PROPRIETARIA);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');
    });

    it('should handle duplicate role creation', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'duplicate key value' }
            })
          })
        })
      } as any);

      // Mock existing role check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'existing-role',
                  user_id: 'user-123',
                  role: UserRole.PROPRIETARIA
                },
                error: null
              })
            })
          })
        })
      } as any);

      const result = await transaction.createRole();

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('existing-role');
    });
  });

  describe('Clinic Creation', () => {
    it('should create clinic and return clinicId', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'clinic-123',
                ...mockClinicData,
                proprietario_id: 'user-123'
              },
              error: null
            })
          })
        })
      } as any);

      const result = await transaction.createClinic(mockClinicData);

      expect(result.success).toBe(true);
      expect(result.clinicId).toBe('clinic-123');
      expect(result.data).toEqual(expect.objectContaining(mockClinicData));
    });

    it('should validate required clinic fields', async () => {
      const invalidData = { ...mockClinicData, nome: '' };

      const result = await transaction.createClinic(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('nome is required');
    });

    it('should handle clinic creation failure', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Clinic creation failed' }
            })
          })
        })
      } as any);

      const result = await transaction.createClinic(mockClinicData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Clinic creation failed');
    });
  });

  describe('Role Update with Clinic', () => {
    it('should update role with clinic ID', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'role-123',
                    user_id: 'user-123',
                    role: UserRole.PROPRIETARIA,
                    clinica_id: 'clinic-123'
                  },
                  error: null
                })
              })
            })
          })
        })
      } as any);

      const result = await transaction.updateRoleWithClinic('clinic-123');

      expect(result.success).toBe(true);
      expect(result.data.clinica_id).toBe('clinic-123');
    });

    it('should handle role update failure', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Role update failed' }
                })
              })
            })
          })
        })
      } as any);

      const result = await transaction.updateRoleWithClinic('clinic-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Role update failed');
    });
  });

  describe('Professional Creation', () => {
    it('should create professional record', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'prof-123',
                user_id: 'user-123',
                ...mockProfessionalData
              },
              error: null
            })
          })
        })
      } as any);

      const result = await transaction.createProfessional(mockProfessionalData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining(mockProfessionalData));
      expect(mockSupabase.from).toHaveBeenCalledWith('profissionais');
    });

    it('should handle duplicate professional creation', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'duplicate key value' }
            })
          })
        })
      } as any);

      // Mock existing professional check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'existing-prof',
                user_id: 'user-123',
                ...mockProfessionalData
              },
              error: null
            })
          })
        })
      } as any);

      const result = await transaction.createProfessional(mockProfessionalData);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('existing-prof');
    });
  });

  describe('Professional-Clinic Linking', () => {
    it('should link professional to clinic', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'link-123',
                clinica_id: 'clinic-123',
                user_id: 'user-123',
                cargo: 'Proprietário'
              },
              error: null
            })
          })
        })
      } as any);

      const result = await transaction.linkProfessionalToClinic('clinic-123');

      expect(result.success).toBe(true);
      expect(result.data.clinica_id).toBe('clinic-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('clinica_profissionais');
    });

    it('should handle duplicate linking', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'duplicate key value' }
            })
          })
        })
      } as any);

      // Mock existing link check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'existing-link',
                  clinica_id: 'clinic-123',
                  user_id: 'user-123'
                },
                error: null
              })
            })
          })
        })
      } as any);

      const result = await transaction.linkProfessionalToClinic('clinic-123');

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('existing-link');
    });
  });

  describe('Template Creation', () => {
    it('should create basic procedure templates', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'template-1',
                tipo_procedimento: TipoProcedimento.LIMPEZA_PELE,
                nome_template: 'Limpeza de Pele Básica'
              },
              {
                id: 'template-2',
                tipo_procedimento: TipoProcedimento.PEELING,
                nome_template: 'Peeling Químico'
              }
            ],
            error: null
          })
        })
      } as any);

      const result = await transaction.createTemplates();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockSupabase.from).toHaveBeenCalledWith('templates_procedimentos');
    });

    it('should handle template creation failure', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Template creation failed' }
          })
        })
      } as any);

      const result = await transaction.createTemplates();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Template creation failed');
    });
  });

  describe('Onboarding Completion', () => {
    it('should mark onboarding as complete', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'user-123',
                  primeiro_acesso: false,
                  onboarding_completed_at: new Date()
                },
                error: null
              })
            })
          })
        })
      } as any);

      const result = await transaction.markOnboardingComplete();

      expect(result.success).toBe(true);
      expect(result.data.primeiro_acesso).toBe(false);
      expect(result.data.onboarding_completed_at).toBeTruthy();
    });
  });
});

// ============================================================================
// TESTES DE TRANSAÇÃO COMPLETA
// ============================================================================

describe('OnboardingTransaction - Complete Flow', () => {
  let transaction: OnboardingTransaction;

  beforeEach(() => {
    transaction = new OnboardingTransaction('user-123');
    jest.clearAllMocks();
  });

  it('should execute complete onboarding transaction', async () => {
    // Mock all operations to succeed
    const mockOperations = {
      createProfile: jest.fn().mockResolvedValue({ success: true, data: mockUserData }),
      createRole: jest.fn().mockResolvedValue({ success: true, data: { id: 'role-123' } }),
      createClinic: jest.fn().mockResolvedValue({ success: true, clinicId: 'clinic-123' }),
      updateRoleWithClinic: jest.fn().mockResolvedValue({ success: true }),
      createProfessional: jest.fn().mockResolvedValue({ success: true }),
      linkProfessionalToClinic: jest.fn().mockResolvedValue({ success: true }),
      createTemplates: jest.fn().mockResolvedValue({ success: true }),
      markOnboardingComplete: jest.fn().mockResolvedValue({ success: true })
    };

    Object.assign(transaction, mockOperations);

    const result = await transaction.executeComplete({
      profile: mockUserData,
      clinic: mockClinicData,
      professional: mockProfessionalData
    });

    expect(result.success).toBe(true);
    expect(result.clinicId).toBe('clinic-123');
    expect(mockOperations.createProfile).toHaveBeenCalledWith(mockUserData);
    expect(mockOperations.createRole).toHaveBeenCalled();
    expect(mockOperations.createClinic).toHaveBeenCalledWith(mockClinicData);
    expect(mockOperations.updateRoleWithClinic).toHaveBeenCalledWith('clinic-123');
    expect(mockOperations.createProfessional).toHaveBeenCalledWith(mockProfessionalData);
    expect(mockOperations.linkProfessionalToClinic).toHaveBeenCalledWith('clinic-123');
    expect(mockOperations.createTemplates).toHaveBeenCalled();
    expect(mockOperations.markOnboardingComplete).toHaveBeenCalled();
  });

  it('should rollback on failure', async () => {
    const mockOperations = {
      createProfile: jest.fn().mockResolvedValue({ success: true, data: mockUserData }),
      createRole: jest.fn().mockResolvedValue({ success: true, data: { id: 'role-123' } }),
      createClinic: jest.fn().mockResolvedValue({ success: false, error: 'Clinic creation failed' }),
      rollback: jest.fn().mockResolvedValue({ success: true })
    };

    Object.assign(transaction, mockOperations);

    const result = await transaction.executeComplete({
      profile: mockUserData,
      clinic: mockClinicData,
      professional: mockProfessionalData
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Clinic creation failed');
    expect(mockOperations.rollback).toHaveBeenCalled();
  });

  it('should validate data integrity before execution', async () => {
    const invalidData = {
      profile: { ...mockUserData, email: '' }, // Invalid email
      clinic: mockClinicData,
      professional: mockProfessionalData
    };

    const result = await transaction.executeComplete(invalidData);

    expect(result.success).toBe(false);
    expect(result.error).toContain('email is required');
  });

  it('should provide detailed progress tracking', async () => {
    const progressCallback = jest.fn();

    const mockOperations = {
      createProfile: jest.fn().mockResolvedValue({ success: true, data: mockUserData }),
      createRole: jest.fn().mockResolvedValue({ success: true, data: { id: 'role-123' } }),
      createClinic: jest.fn().mockResolvedValue({ success: true, clinicId: 'clinic-123' }),
      updateRoleWithClinic: jest.fn().mockResolvedValue({ success: true }),
      createProfessional: jest.fn().mockResolvedValue({ success: true }),
      linkProfessionalToClinic: jest.fn().mockResolvedValue({ success: true }),
      createTemplates: jest.fn().mockResolvedValue({ success: true }),
      markOnboardingComplete: jest.fn().mockResolvedValue({ success: true })
    };

    Object.assign(transaction, mockOperations);

    await transaction.executeComplete({
      profile: mockUserData,
      clinic: mockClinicData,
      professional: mockProfessionalData
    }, progressCallback);

    expect(progressCallback).toHaveBeenCalledTimes(8);
    expect(progressCallback).toHaveBeenCalledWith({
      step: 'createProfile',
      progress: 12.5,
      message: 'Creating user profile...'
    });
    expect(progressCallback).toHaveBeenCalledWith({
      step: 'markOnboardingComplete',
      progress: 100,
      message: 'Finalizing onboarding...'
    });
  });
});

// ============================================================================
// TESTES DE VALIDAÇÃO DE INTEGRIDADE
// ============================================================================

describe('OnboardingTransaction - Data Integrity', () => {
  let transaction: OnboardingTransaction;

  beforeEach(() => {
    transaction = new OnboardingTransaction('user-123');
    jest.clearAllMocks();
  });

  it('should verify all required relationships exist', async () => {
    // Mock successful verification
    mockSupabase.from.mockImplementation((table) => {
      const mockData = {
        profiles: { id: 'user-123', primeiro_acesso: false },
        user_roles: { id: 'role-123', clinica_id: 'clinic-123' },
        clinicas: { id: 'clinic-123', proprietario_id: 'user-123' },
        profissionais: { id: 'prof-123', user_id: 'user-123' },
        clinica_profissionais: { clinica_id: 'clinic-123', user_id: 'user-123' },
        templates_procedimentos: [{ id: 'template-1' }, { id: 'template-2' }]
      };

      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: Array.isArray(mockData[table]) ? mockData[table][0] : mockData[table],
              error: null
            })
          })
        })
      };
    } as any);

    const result = await transaction.verifyIntegrity('clinic-123');

    expect(result.success).toBe(true);
    expect(result.checks).toEqual({
      profile: true,
      role: true,
      clinic: true,
      professional: true,
      clinicLink: true,
      templates: true,
      onboardingComplete: true
    });
  });

  it('should detect missing relationships', async () => {
    // Mock missing professional record
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profissionais') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'No rows found' }
              })
            })
          })
        };
      }

      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'test' },
              error: null
            })
          })
        })
      };
    } as any);

    const result = await transaction.verifyIntegrity('clinic-123');

    expect(result.success).toBe(false);
    expect(result.checks.professional).toBe(false);
    expect(result.missingRelationships).toContain('professional');
  });

  it('should provide repair suggestions for missing data', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'templates_procedimentos') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [], // No templates
              error: null
            })
          })
        };
      }

      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'test' },
              error: null
            })
          })
        })
      };
    } as any);

    const result = await transaction.verifyIntegrity('clinic-123');

    expect(result.success).toBe(false);
    expect(result.repairSuggestions).toContain('Create basic procedure templates');
  });

  it('should generate comprehensive integrity report', async () => {
    const result = await transaction.generateIntegrityReport('clinic-123');

    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('userId', 'user-123');
    expect(result).toHaveProperty('clinicId', 'clinic-123');
    expect(result).toHaveProperty('checks');
    expect(result).toHaveProperty('summary');
    expect(result.summary).toHaveProperty('totalChecks');
    expect(result.summary).toHaveProperty('passedChecks');
    expect(result.summary).toHaveProperty('failedChecks');
    expect(result.summary).toHaveProperty('overallStatus');
  });
});