/**
 * Tests for Appwrite migration types and validators
 * Ensures type safety and validation integrity
 */

import {
  Organization,
  Clinic,
  Patient,
  Appointment,
  MedicalRecord,
  User,
  Service,
  Room,
  OrganizationSettings,
  Notification,
  validators,
  validateDocument,
  validateBatch,
  ValidationError,
  CollectionName,
  MIGRATION_PHASES,
  isOrganization,
  isClinic,
  isPatient,
  getCollectionValidator
} from '../types/appwrite-migration';

describe('Appwrite Migration Types', () => {
  describe('Base Document Structure', () => {
    it('should validate base document fields', () => {
      const baseDoc = {
        $id: 'test-id',
        tenantId: 'tenant-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
        version: 1,
        isActive: true
      };

      // Should not throw for valid base structure
      expect(() => {
        validators.organizations.parse({
          ...baseDoc,
          name: 'Test Org',
          slug: 'test-org',
          plan: 'basic',
          status: 'active',
          metrics: {
            totalClinics: 0,
            totalUsers: 0,
            storageUsedMB: 0,
            lastActivityAt: new Date()
          }
        });
      }).not.toThrow();
    });

    it('should reject invalid base document fields', () => {
      const invalidDoc = {
        $id: '', // Invalid: empty string
        tenantId: 'tenant-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
        version: 0, // Invalid: must be >= 1
        isActive: true
      };

      expect(() => {
        validators.organizations.parse({
          ...invalidDoc,
          name: 'Test Org',
          slug: 'test-org',
          plan: 'basic',
          status: 'active',
          metrics: {
            totalClinics: 0,
            totalUsers: 0,
            storageUsedMB: 0,
            lastActivityAt: new Date()
          }
        });
      }).toThrow();
    });
  });

  describe('Organization Validation', () => {
    const validOrganization: Organization = {
      $id: 'org-1',
      tenantId: 'tenant-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
      version: 1,
      isActive: true,
      name: 'Test Organization',
      slug: 'test-organization',
      plan: 'premium',
      status: 'active',
      metrics: {
        totalClinics: 5,
        totalUsers: 25,
        storageUsedMB: 1024,
        lastActivityAt: new Date()
      }
    };

    it('should validate correct organization data', () => {
      expect(() => {
        validateDocument(validators.organizations, validOrganization, 'organizations');
      }).not.toThrow();
    });

    it('should reject invalid slug format', () => {
      const invalidOrg = {
        ...validOrganization,
        slug: 'Invalid Slug!' // Should be kebab-case
      };

      expect(() => {
        validateDocument(validators.organizations, invalidOrg, 'organizations');
      }).toThrow(ValidationError);
    });

    it('should validate CNPJ format when provided', () => {
      const orgWithCNPJ = {
        ...validOrganization,
        cnpj: '12.345.678/0001-90'
      };

      expect(() => {
        validateDocument(validators.organizations, orgWithCNPJ, 'organizations');
      }).not.toThrow();
    });

    it('should reject invalid CNPJ format', () => {
      const orgWithInvalidCNPJ = {
        ...validOrganization,
        cnpj: '12345678000190' // Missing formatting
      };

      expect(() => {
        validateDocument(validators.organizations, orgWithInvalidCNPJ, 'organizations');
      }).toThrow(ValidationError);
    });
  });

  describe('Clinic Validation', () => {
    const validClinic: Clinic = {
      $id: 'clinic-1',
      tenantId: 'tenant-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
      version: 1,
      isActive: true,
      organizationId: 'org-1',
      name: 'Main Clinic',
      slug: 'main-clinic',
      type: 'main',
      contact: {
        phone: '11999999999',
        whatsapp: '11999999999',
        email: 'contact@clinic.com'
      },
      address: {
        street: 'Rua das Flores',
        number: '123',
        complement: 'Sala 101',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        coordinates: [-23.5505, -46.6333]
      },
      settings: {
        timezone: 'America/Sao_Paulo',
        defaultAppointmentDuration: 60,
        workingHours: {
          monday: { start: '08:00', end: '18:00' },
          tuesday: { start: '08:00', end: '18:00' }
        }
      },
      operationalStatus: 'active'
    };

    it('should validate correct clinic data', () => {
      expect(() => {
        validateDocument(validators.clinics, validClinic, 'clinics');
      }).not.toThrow();
    });

    it('should reject invalid email format', () => {
      const invalidClinic = {
        ...validClinic,
        contact: {
          ...validClinic.contact,
          email: 'invalid-email'
        }
      };

      expect(() => {
        validateDocument(validators.clinics, invalidClinic, 'clinics');
      }).toThrow(ValidationError);
    });

    it('should reject invalid zipCode format', () => {
      const invalidClinic = {
        ...validClinic,
        address: {
          ...validClinic.address,
          zipCode: '12345' // Invalid format
        }
      };

      expect(() => {
        validateDocument(validators.clinics, invalidClinic, 'clinics');
      }).toThrow(ValidationError);
    });
  });

  describe('Patient Validation', () => {
    const validPatient: Patient = {
      $id: 'patient-1',
      tenantId: 'tenant-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
      version: 1,
      isActive: true,
      auditLog: [],
      encryptedFields: ['personalInfoEncrypted'],
      encryptionVersion: 'v1',
      dataHash: 'hash123',
      clinicId: 'clinic-1',
      code: 'PAT-001',
      personalInfoEncrypted: 'encrypted-data',
      searchableData: {
        firstNameHash: 'hash1',
        phoneHash: 'hash2',
        emailHash: 'hash3',
        birthYear: 1990
      },
      businessMetrics: {
        ltv: 5000,
        totalSpent: 2500,
        appointmentCount: 10,
        lastAppointmentAt: new Date(),
        averageTicket: 250,
        churnRisk: 'low'
      },
      consents: {
        lgpdAccepted: true,
        lgpdAcceptedAt: new Date(),
        marketingConsent: true,
        imageUseConsent: false,
        dataRetentionDays: 2555 // 7 years
      },
      tags: ['vip', 'frequent'],
      vipLevel: 'gold'
    };

    it('should validate correct patient data', () => {
      expect(() => {
        validateDocument(validators.patients, validPatient, 'patients');
      }).not.toThrow();
    });

    it('should reject invalid birth year', () => {
      const invalidPatient = {
        ...validPatient,
        searchableData: {
          ...validPatient.searchableData,
          birthYear: 1800 // Too old
        }
      };

      expect(() => {
        validateDocument(validators.patients, invalidPatient, 'patients');
      }).toThrow(ValidationError);
    });

    it('should reject negative business metrics', () => {
      const invalidPatient = {
        ...validPatient,
        businessMetrics: {
          ...validPatient.businessMetrics,
          ltv: -100 // Invalid: negative value
        }
      };

      expect(() => {
        validateDocument(validators.patients, invalidPatient, 'patients');
      }).toThrow(ValidationError);
    });
  });

  describe('Appointment Validation', () => {
    const validAppointment: Appointment = {
      $id: 'appointment-1',
      tenantId: 'tenant-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
      version: 1,
      isActive: true,
      clinicId: 'clinic-1',
      code: 'APPT-20241215-001',
      patientId: 'patient-1',
      professionalId: 'user-1',
      serviceId: 'service-1',
      roomId: 'room-1',
      scheduling: {
        date: '2024-12-15',
        startTime: '14:00',
        endTime: '15:00',
        durationMinutes: 60,
        timezone: 'America/Sao_Paulo',
        dateTimeStart: new Date('2024-12-15T14:00:00-03:00'),
        dateTimeEnd: new Date('2024-12-15T15:00:00-03:00'),
        dayOfWeek: 0,
        weekOfYear: 50,
        monthYear: '2024-12'
      },
      status: 'scheduled',
      statusHistory: [],
      financial: {
        servicePrice: 200,
        discountAmount: 20,
        finalPrice: 180,
        paymentStatus: 'pending'
      },
      metadata: {
        source: 'app',
        aiConfidence: 0.95
      }
    };

    it('should validate correct appointment data', () => {
      expect(() => {
        validateDocument(validators.appointments, validAppointment, 'appointments');
      }).not.toThrow();
    });

    it('should reject invalid date format', () => {
      const invalidAppointment = {
        ...validAppointment,
        scheduling: {
          ...validAppointment.scheduling,
          date: '15/12/2024' // Invalid format, should be YYYY-MM-DD
        }
      };

      expect(() => {
        validateDocument(validators.appointments, invalidAppointment, 'appointments');
      }).toThrow(ValidationError);
    });

    it('should reject invalid time format', () => {
      const invalidAppointment = {
        ...validAppointment,
        scheduling: {
          ...validAppointment.scheduling,
          startTime: '2:00 PM' // Invalid format, should be HH:MM
        }
      };

      expect(() => {
        validateDocument(validators.appointments, invalidAppointment, 'appointments');
      }).toThrow(ValidationError);
    });
  });

  describe('Batch Validation', () => {
    it('should validate batch of organizations', () => {
      const organizations = [
        {
          $id: 'org-1',
          tenantId: 'tenant-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
          version: 1,
          isActive: true,
          name: 'Org 1',
          slug: 'org-1',
          plan: 'basic',
          status: 'active',
          metrics: {
            totalClinics: 1,
            totalUsers: 5,
            storageUsedMB: 100,
            lastActivityAt: new Date()
          }
        },
        {
          $id: 'org-2',
          tenantId: 'tenant-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
          version: 1,
          isActive: true,
          name: 'Org 2',
          slug: 'invalid slug!', // Invalid
          plan: 'premium',
          status: 'active',
          metrics: {
            totalClinics: 2,
            totalUsers: 10,
            storageUsedMB: 200,
            lastActivityAt: new Date()
          }
        }
      ];

      const result = validateBatch(validators.organizations, organizations, 'organizations');
      
      expect(result.valid).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].index).toBe(1);
      expect(result.errors[0].error).toBeInstanceOf(ValidationError);
    });
  });

  describe('Type Guards', () => {
    const org: Organization = {
      $id: 'org-1',
      tenantId: 'tenant-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
      version: 1,
      isActive: true,
      name: 'Test Org',
      slug: 'test-org',
      plan: 'basic',
      status: 'active',
      metrics: {
        totalClinics: 0,
        totalUsers: 0,
        storageUsedMB: 0,
        lastActivityAt: new Date()
      }
    };

    it('should correctly identify organization', () => {
      expect(isOrganization(org)).toBe(true);
    });

    it('should correctly reject non-organization', () => {
      const notOrg = { $id: 'test', name: 'test' };
      expect(isOrganization(notOrg as any)).toBe(false);
    });
  });

  describe('Migration Configuration', () => {
    it('should have correct migration phases', () => {
      expect(MIGRATION_PHASES).toHaveLength(9);
      expect(MIGRATION_PHASES[0].name).toBe('setup');
      expect(MIGRATION_PHASES[1].name).toBe('organizations');
    });

    it('should have correct collection validators', () => {
      expect(getCollectionValidator(CollectionName.ORGANIZATIONS)).toBe(validators.organizations);
      expect(getCollectionValidator(CollectionName.CLINICS)).toBe(validators.clinics);
      expect(getCollectionValidator(CollectionName.PATIENTS)).toBe(validators.patients);
    });
  });

  describe('Validation Error Handling', () => {
    it('should provide detailed error information', () => {
      const invalidData = {
        $id: '', // Invalid
        name: 'Test'
      };

      try {
        validateDocument(validators.organizations, invalidData, 'organizations');
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.field).toBe('$id');
        expect(validationError.issues).toBeDefined();
        expect(validationError.issues.length).toBeGreaterThan(0);
      }
    });
  });
});