// =====================================================
// COMPREHENSIVE ONBOARDING TESTS
// Tests for database schema, RLS policies, and onboarding flow
// =====================================================

const request = require('supertest');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const OnboardingService = require('../src/services/OnboardingService');

// Test configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Test database pool
const testPool = new Pool({
  connectionString: TEST_DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Mock user data
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  password: 'TestPassword123!'
};

const mockOnboardingData = {
  nome_completo: 'Dr. João Silva',
  telefone: '11999999999',
  cpf: '12345678901',
  data_nascimento: '1980-01-01',
  clinica_nome: 'Clínica Teste',
  clinica_cnpj: '12345678000195',
  clinica_endereco: {
    rua: 'Rua Teste, 123',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01234567'
  },
  clinica_telefone: '1133334444',
  clinica_email: 'contato@clinicateste.com',
  registro_profissional: 'CRM123456SP',
  tipo_registro: 'CRM',
  especialidades: [],
  biografia: 'Médico especialista em estética',
  experiencia_anos: 10,
  formacao: 'Medicina - USP',
  certificacoes: ['Especialização em Dermatologia']
};

// Helper functions
const createTestUser = async () => {
  const client = await testPool.connect();
  try {
    // Create user in auth.users (simulating Supabase auth)
    await client.query(`
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES ($1, $2, 'encrypted_password', now(), now(), now())
      ON CONFLICT (id) DO NOTHING
    `, [mockUser.id, mockUser.email]);
    
    return mockUser;
  } finally {
    client.release();
  }
};

const cleanupTestData = async () => {
  const client = await testPool.connect();
  try {
    // Clean up in reverse order of dependencies
    await client.query('DELETE FROM public.templates_procedimentos WHERE criado_por = $1', [mockUser.id]);
    await client.query('DELETE FROM public.clinica_profissionais WHERE user_id = $1', [mockUser.id]);
    await client.query('DELETE FROM public.profissionais WHERE user_id = $1', [mockUser.id]);
    await client.query('DELETE FROM public.clinicas WHERE criado_por = $1', [mockUser.id]);
    await client.query('DELETE FROM public.user_roles WHERE user_id = $1', [mockUser.id]);
    await client.query('DELETE FROM public.profiles WHERE id = $1', [mockUser.id]);
    await client.query('DELETE FROM auth.users WHERE id = $1', [mockUser.id]);
  } finally {
    client.release();
  }
};

const generateTestToken = (userId = mockUser.id, email = mockUser.email) => {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '1h' });
};

// Test suites
describe('Database Schema Tests', () => {
  beforeAll(async () => {
    await createTestUser();
  });

  afterAll(async () => {
    await cleanupTestData();
    await testPool.end();
  });

  test('should have all required tables', async () => {
    const client = await testPool.connect();
    try {
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN (
            'profiles', 'user_roles', 'clinicas', 'profissionais',
            'clinica_profissionais', 'templates_procedimentos', 'especialidades_medicas'
          )
        ORDER BY table_name
      `);

      const tableNames = result.rows.map(row => row.table_name);
      expect(tableNames).toContain('profiles');
      expect(tableNames).toContain('user_roles');
      expect(tableNames).toContain('clinicas');
      expect(tableNames).toContain('profissionais');
      expect(tableNames).toContain('clinica_profissionais');
      expect(tableNames).toContain('templates_procedimentos');
      expect(tableNames).toContain('especialidades_medicas');
    } finally {
      client.release();
    }
  });

  test('should have RLS enabled on all tables', async () => {
    const client = await testPool.connect();
    try {
      const result = await client.query(`
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN (
            'profiles', 'user_roles', 'clinicas', 'profissionais',
            'clinica_profissionais', 'templates_procedimentos', 'especialidades_medicas'
          )
      `);

      result.rows.forEach(row => {
        expect(row.rowsecurity).toBe(true);
      });
    } finally {
      client.release();
    }
  });

  test('should have required indexes', async () => {
    const client = await testPool.connect();
    try {
      const result = await client.query(`
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE schemaname = 'public'
          AND indexname LIKE 'idx_%'
        ORDER BY tablename, indexname
      `);

      const indexes = result.rows.map(row => row.indexname);
      expect(indexes).toContain('idx_profiles_email');
      expect(indexes).toContain('idx_user_roles_user_id');
      expect(indexes).toContain('idx_clinicas_ativo');
      expect(indexes).toContain('idx_profissionais_user_id');
      expect(indexes).toContain('idx_clinica_profissionais_clinica');
    } finally {
      client.release();
    }
  });

  test('should have reference data', async () => {
    const client = await testPool.connect();
    try {
      const result = await client.query(`
        SELECT count(*) as count 
        FROM public.especialidades_medicas 
        WHERE ativo = true
      `);

      expect(parseInt(result.rows[0].count)).toBeGreaterThan(0);
    } finally {
      client.release();
    }
  });
});

describe('OnboardingService Unit Tests', () => {
  let onboardingService;

  beforeAll(async () => {
    await createTestUser();
    onboardingService = new OnboardingService();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Clean up before each test
    await cleanupTestData();
    await createTestUser();
  });

  test('should validate onboarding data correctly', () => {
    const validData = { ...mockOnboardingData };
    const validation = onboardingService.validateOnboardingData(validData);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test('should reject invalid onboarding data', () => {
    const invalidData = {
      nome_completo: '', // Empty name
      clinica_nome: 'A', // Too short
      registro_profissional: '123', // Too short
      email: 'invalid-email' // Invalid email
    };

    const validation = onboardingService.validateOnboardingData(invalidData);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  test('should check onboarding status correctly', async () => {
    const result = await onboardingService.checkOnboardingStatus(mockUser.id);
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('onboarding_complete');
    expect(result.data).toHaveProperty('completion_percentage');
    expect(result.data).toHaveProperty('steps');
    expect(result.data.onboarding_complete).toBe(false); // Should be false initially
  });

  test('should complete full onboarding process', async () => {
    const result = await onboardingService.completeOnboarding(
      mockUser.id, 
      mockUser.email, 
      mockOnboardingData
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('profile');
    expect(result.data).toHaveProperty('userRole');
    expect(result.data).toHaveProperty('clinic');
    expect(result.data).toHaveProperty('professional');
    expect(result.data).toHaveProperty('clinicProfessional');
    expect(result.data).toHaveProperty('templates');

    // Verify profile data
    expect(result.data.profile.nome_completo).toBe(mockOnboardingData.nome_completo);
    expect(result.data.profile.email).toBe(mockUser.email);

    // Verify clinic data
    expect(result.data.clinic.nome).toBe(mockOnboardingData.clinica_nome);

    // Verify professional data
    expect(result.data.professional.registro_profissional).toBe(mockOnboardingData.registro_profissional);

    // Verify templates were created
    expect(result.data.templates.length).toBeGreaterThan(0);
  }, 30000); // 30 second timeout for complex operation

  test('should handle duplicate registration error', async () => {
    // First onboarding should succeed
    await onboardingService.completeOnboarding(
      mockUser.id, 
      mockUser.email, 
      mockOnboardingData
    );

    // Create another user with same registration
    const anotherUserId = '550e8400-e29b-41d4-a716-446655440001';
    const client = await testPool.connect();
    try {
      await client.query(`
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES ($1, $2, 'encrypted_password', now(), now(), now())
      `, [anotherUserId, 'another@example.com']);
    } finally {
      client.release();
    }

    // Second onboarding with same registration should fail
    await expect(
      onboardingService.completeOnboarding(
        anotherUserId, 
        'another@example.com', 
        mockOnboardingData
      )
    ).rejects.toThrow();

    // Cleanup
    await testPool.query('DELETE FROM auth.users WHERE id = $1', [anotherUserId]);
  }, 30000);
});

describe('Onboarding API Integration Tests', () => {
  let app;
  let token;

  beforeAll(async () => {
    // Import app after environment is set up
    app = require('../src/server');
    await createTestUser();
    token = generateTestToken();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Clean up before each test
    await cleanupTestData();
    await createTestUser();
  });

  test('POST /api/onboarding/complete should complete onboarding', async () => {
    const response = await request(app)
      .post('/api/onboarding/complete')
      .set('Authorization', `Bearer ${token}`)
      .send(mockOnboardingData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('sucesso');
    expect(response.body.data).toHaveProperty('user');
    expect(response.body.data).toHaveProperty('clinic');
    expect(response.body.data).toHaveProperty('professional');
    expect(response.body.data).toHaveProperty('summary');

    // Verify summary
    const summary = response.body.data.summary;
    expect(summary.profile_created).toBe(true);
    expect(summary.role_created).toBe(true);
    expect(summary.clinic_created).toBe(true);
    expect(summary.professional_created).toBe(true);
    expect(summary.clinic_link_created).toBe(true);
    expect(summary.templates_created).toBeGreaterThan(0);
  }, 30000);

  test('GET /api/onboarding/status should return onboarding status', async () => {
    // First complete onboarding
    await request(app)
      .post('/api/onboarding/complete')
      .set('Authorization', `Bearer ${token}`)
      .send(mockOnboardingData);

    // Then check status
    const response = await request(app)
      .get('/api/onboarding/status')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.onboarding_complete).toBe(true);
    expect(response.body.data.completion_percentage).toBe(100);
    expect(response.body.data.steps.profile).toBe(true);
    expect(response.body.data.steps.role).toBe(true);
    expect(response.body.data.steps.clinic).toBe(true);
    expect(response.body.data.steps.professional).toBe(true);
    expect(response.body.data.steps.clinic_link).toBe(true);
  }, 30000);

  test('GET /api/onboarding/data should return user onboarding data', async () => {
    // First complete onboarding
    await request(app)
      .post('/api/onboarding/complete')
      .set('Authorization', `Bearer ${token}`)
      .send(mockOnboardingData);

    // Then get data
    const response = await request(app)
      .get('/api/onboarding/data')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('nome_completo');
    expect(response.body.data).toHaveProperty('clinica_nome');
    expect(response.body.data).toHaveProperty('registro_profissional');
    expect(response.body.data.nome_completo).toBe(mockOnboardingData.nome_completo);
    expect(response.body.data.clinica_nome).toBe(mockOnboardingData.clinica_nome);
  }, 30000);

  test('POST /api/onboarding/complete should validate required fields', async () => {
    const invalidData = {
      nome_completo: '', // Empty required field
      clinica_nome: mockOnboardingData.clinica_nome,
      registro_profissional: mockOnboardingData.registro_profissional
    };

    const response = await request(app)
      .post('/api/onboarding/complete')
      .set('Authorization', `Bearer ${token}`)
      .send(invalidData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.details.validationErrors).toBeDefined();
  });

  test('POST /api/onboarding/complete should handle duplicate registration', async () => {
    // First onboarding should succeed
    await request(app)
      .post('/api/onboarding/complete')
      .set('Authorization', `Bearer ${token}`)
      .send(mockOnboardingData)
      .expect(201);

    // Create another user
    const anotherUserId = '550e8400-e29b-41d4-a716-446655440001';
    const anotherToken = generateTestToken(anotherUserId, 'another@example.com');
    
    const client = await testPool.connect();
    try {
      await client.query(`
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES ($1, $2, 'encrypted_password', now(), now(), now())
      `, [anotherUserId, 'another@example.com']);
    } finally {
      client.release();
    }

    // Second onboarding with same registration should fail
    const response = await request(app)
      .post('/api/onboarding/complete')
      .set('Authorization', `Bearer ${anotherToken}`)
      .send(mockOnboardingData)
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('DUPLICATE_REGISTRATION');

    // Cleanup
    await testPool.query('DELETE FROM auth.users WHERE id = $1', [anotherUserId]);
  }, 30000);

  test('POST /api/onboarding/retry/:step should retry failed steps', async () => {
    // First complete partial onboarding (just profile and role)
    const client = await testPool.connect();
    try {
      // Create profile
      await client.query(`
        INSERT INTO public.profiles (id, email, nome_completo)
        VALUES ($1, $2, $3)
      `, [mockUser.id, mockUser.email, mockOnboardingData.nome_completo]);

      // Create role
      await client.query(`
        INSERT INTO public.user_roles (user_id, role)
        VALUES ($1, 'proprietaria')
      `, [mockUser.id]);
    } finally {
      client.release();
    }

    // Retry clinic creation
    const response = await request(app)
      .post('/api/onboarding/retry/clinic')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: mockOnboardingData.clinica_nome,
        cnpj: mockOnboardingData.clinica_cnpj,
        telefone_principal: mockOnboardingData.clinica_telefone,
        email_contato: mockOnboardingData.clinica_email
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('data');
  }, 30000);

  test('should require authentication for all endpoints', async () => {
    await request(app)
      .post('/api/onboarding/complete')
      .send(mockOnboardingData)
      .expect(401);

    await request(app)
      .get('/api/onboarding/status')
      .expect(401);

    await request(app)
      .get('/api/onboarding/data')
      .expect(401);
  });
});

describe('Error Handling Tests', () => {
  let onboardingService;

  beforeAll(async () => {
    await createTestUser();
    onboardingService = new OnboardingService();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  test('should handle database connection errors gracefully', async () => {
    // Mock a connection error by using invalid connection
    const originalPool = require('../src/db/connection').pool;
    
    // This test would require more sophisticated mocking
    // For now, we'll test that the service handles errors properly
    const invalidData = {
      nome_completo: null, // This should cause a database error
      clinica_nome: mockOnboardingData.clinica_nome,
      registro_profissional: mockOnboardingData.registro_profissional
    };

    await expect(
      onboardingService.completeOnboarding(mockUser.id, mockUser.email, invalidData)
    ).rejects.toThrow();
  });

  test('should validate professional registration formats', () => {
    const testCases = [
      { registration: 'CRM123456SP', type: 'CRM', expected: true },
      { registration: 'CRO654321RJ', type: 'CRO', expected: true },
      { registration: 'INVALID', type: 'CRM', expected: false },
      { registration: '123', type: 'CRM', expected: false }
    ];

    const { ValidationHelper } = require('../src/middleware/errorHandler');

    testCases.forEach(testCase => {
      const result = ValidationHelper.validateProfessionalRegistration(
        testCase.registration, 
        testCase.type
      );
      expect(result).toBe(testCase.expected);
    });
  });
});

// Performance Tests
describe('Performance Tests', () => {
  let onboardingService;

  beforeAll(async () => {
    await createTestUser();
    onboardingService = new OnboardingService();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  test('should complete onboarding within reasonable time', async () => {
    const startTime = Date.now();
    
    await onboardingService.completeOnboarding(
      mockUser.id, 
      mockUser.email, 
      mockOnboardingData
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete within 10 seconds
    expect(duration).toBeLessThan(10000);
  }, 15000);

  test('should handle concurrent onboarding requests', async () => {
    const userIds = [
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440003',
      '550e8400-e29b-41d4-a716-446655440004'
    ];

    // Create test users
    const client = await testPool.connect();
    try {
      for (const userId of userIds) {
        await client.query(`
          INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
          VALUES ($1, $2, 'encrypted_password', now(), now(), now())
        `, [userId, `test${userId}@example.com`]);
      }
    } finally {
      client.release();
    }

    // Run concurrent onboarding
    const promises = userIds.map((userId, index) => {
      const userData = {
        ...mockOnboardingData,
        clinica_nome: `Clínica Teste ${index + 1}`,
        registro_profissional: `CRM${123456 + index}SP`
      };
      
      return onboardingService.completeOnboarding(
        userId, 
        `test${userId}@example.com`, 
        userData
      );
    });

    const results = await Promise.all(promises);
    
    // All should succeed
    results.forEach(result => {
      expect(result.success).toBe(true);
    });

    // Cleanup
    for (const userId of userIds) {
      await testPool.query('DELETE FROM public.templates_procedimentos WHERE criado_por = $1', [userId]);
      await testPool.query('DELETE FROM public.clinica_profissionais WHERE user_id = $1', [userId]);
      await testPool.query('DELETE FROM public.profissionais WHERE user_id = $1', [userId]);
      await testPool.query('DELETE FROM public.clinicas WHERE criado_por = $1', [userId]);
      await testPool.query('DELETE FROM public.user_roles WHERE user_id = $1', [userId]);
      await testPool.query('DELETE FROM public.profiles WHERE id = $1', [userId]);
      await testPool.query('DELETE FROM auth.users WHERE id = $1', [userId]);
    }
  }, 30000);
});