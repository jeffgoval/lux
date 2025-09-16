/**
 * Zod validators for Appwrite collections
 * Ensures data integrity and type safety during migration and runtime
 */

import { z } from 'zod';

// Base validators
const baseDocumentSchema = z.object({
  $id: z.string().min(1),
  tenantId: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().min(1),
  updatedBy: z.string().optional(),
  version: z.number().int().min(1),
  isActive: z.boolean()
});

const auditLogEntrySchema = z.object({
  action: z.enum(['create', 'update', 'delete', 'view']),
  timestamp: z.date(),
  userId: z.string().min(1),
  changes: z.record(z.any()).optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional()
});

const auditableDocumentSchema = baseDocumentSchema.extend({
  auditLog: z.array(auditLogEntrySchema)
});

const encryptedDocumentSchema = baseDocumentSchema.extend({
  encryptedFields: z.array(z.string()),
  encryptionVersion: z.string().min(1),
  dataHash: z.string().min(1)
});

const secureAuditableDocumentSchema = auditableDocumentSchema.merge(encryptedDocumentSchema);

// Common structure validators
const contactInfoSchema = z.object({
  phone: z.string().min(10).max(15),
  whatsapp: z.string().min(10).max(15).optional(),
  email: z.string().email()
});

const addressSchema = z.object({
  street: z.string().min(1).max(200),
  number: z.string().min(1).max(20),
  complement: z.string().max(100).optional(),
  neighborhood: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
  state: z.string().min(2).max(2),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/),
  coordinates: z.tuple([z.number(), z.number()]).optional()
});

const businessMetricsSchema = z.object({
  ltv: z.number().min(0),
  totalSpent: z.number().min(0),
  appointmentCount: z.number().int().min(0),
  lastAppointmentAt: z.date().optional(),
  averageTicket: z.number().min(0),
  churnRisk: z.enum(['low', 'medium', 'high'])
});

const lgpdConsentsSchema = z.object({
  lgpdAccepted: z.boolean(),
  lgpdAcceptedAt: z.date(),
  marketingConsent: z.boolean(),
  imageUseConsent: z.boolean(),
  dataRetentionDays: z.number().int().min(1)
});

const digitalSignatureSchema = z.object({
  professionalId: z.string().min(1),
  signedAt: z.date(),
  signatureHash: z.string().min(1),
  certificateId: z.string().optional()
});

const accessControlSchema = z.object({
  level: z.enum(['public', 'restricted', 'confidential']),
  authorizedUsers: z.array(z.string()),
  accessLog: z.array(z.object({
    userId: z.string().min(1),
    accessedAt: z.date(),
    action: z.enum(['view', 'edit', 'print', 'export']),
    ip: z.string().min(1)
  }))
});

const complianceInfoSchema = z.object({
  retentionPolicy: z.string().min(1),
  scheduledDeletionAt: z.date().optional(),
  legalHoldUntil: z.date().optional()
});

const statusHistoryEntrySchema = z.object({
  status: z.string().min(1),
  timestamp: z.date(),
  userId: z.string().min(1),
  reason: z.string().optional()
});

const financialInfoSchema = z.object({
  servicePrice: z.number().min(0),
  discountAmount: z.number().min(0),
  finalPrice: z.number().min(0),
  paymentStatus: z.enum(['pending', 'partial', 'paid']),
  commissionAmount: z.number().min(0).optional()
});

const automationMetadataSchema = z.object({
  source: z.enum(['app', 'whatsapp', 'phone', 'walk_in', 'ai']),
  aiConfidence: z.number().min(0).max(1).optional(),
  automationTriggers: z.array(z.string()).optional()
});

const schedulingInfoSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().int().min(1),
  timezone: z.string().min(1),
  dateTimeStart: z.date(),
  dateTimeEnd: z.date(),
  dayOfWeek: z.number().int().min(0).max(6),
  weekOfYear: z.number().int().min(1).max(53),
  monthYear: z.string().regex(/^\d{4}-\d{2}$/)
});

const searchableDataSchema = z.object({
  firstNameHash: z.string().min(1),
  phoneHash: z.string().min(1),
  emailHash: z.string().min(1),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear())
});

const organizationMetricsSchema = z.object({
  totalClinics: z.number().int().min(0),
  totalUsers: z.number().int().min(0),
  storageUsedMB: z.number().min(0),
  lastActivityAt: z.date()
});

const clinicSettingsSchema = z.object({
  timezone: z.string().min(1),
  defaultAppointmentDuration: z.number().int().min(1),
  workingHours: z.record(z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/)
  }))
});

// Collection validators
export const organizationValidator = baseDocumentSchema.extend({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/).optional(),
  plan: z.enum(['basic', 'premium', 'enterprise']),
  status: z.enum(['active', 'suspended', 'cancelled']),
  settingsId: z.string().optional(),
  metrics: organizationMetricsSchema,
  billingInfoEncrypted: z.string().optional()
});

export const clinicValidator = baseDocumentSchema.extend({
  organizationId: z.string().min(1),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  type: z.enum(['main', 'branch']),
  contact: contactInfoSchema,
  address: addressSchema,
  settings: clinicSettingsSchema,
  operationalStatus: z.enum(['active', 'maintenance', 'closed'])
});

export const patientValidator = secureAuditableDocumentSchema.extend({
  clinicId: z.string().min(1),
  code: z.string().min(1).max(50),
  personalInfoEncrypted: z.string().min(1),
  searchableData: searchableDataSchema,
  businessMetrics: businessMetricsSchema,
  consents: lgpdConsentsSchema,
  tags: z.array(z.string()),
  vipLevel: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional()
});

export const appointmentValidator = baseDocumentSchema.extend({
  clinicId: z.string().min(1),
  code: z.string().min(1).max(50),
  patientId: z.string().min(1),
  professionalId: z.string().min(1),
  serviceId: z.string().min(1),
  roomId: z.string().optional(),
  scheduling: schedulingInfoSchema,
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  statusHistory: z.array(statusHistoryEntrySchema),
  financial: financialInfoSchema,
  metadata: automationMetadataSchema
});

export const medicalRecordValidator = secureAuditableDocumentSchema.extend({
  patientId: z.string().min(1),
  clinicId: z.string().min(1),
  appointmentId: z.string().optional(),
  professionalId: z.string().min(1),
  recordNumber: z.string().min(1).max(50),
  type: z.enum(['anamnesis', 'evolution', 'prescription', 'exam', 'procedure']),
  encryptedContent: z.string().min(1),
  contentHash: z.string().min(1),
  digitalSignature: digitalSignatureSchema,
  accessControl: accessControlSchema,
  compliance: complianceInfoSchema
});

export const userValidator = auditableDocumentSchema.extend({
  organizationId: z.string().min(1),
  clinicId: z.string().optional(),
  email: z.string().email(),
  name: z.string().min(1).max(200),
  avatar: z.string().url().optional(),
  emailVerified: z.boolean(),
  lastLoginAt: z.date().optional(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  professionalInfo: z.object({
    license: z.string().min(1),
    specialty: z.string().min(1),
    crm: z.string().optional()
  }).optional(),
  preferences: z.object({
    language: z.string().min(2).max(5),
    timezone: z.string().min(1),
    notifications: z.record(z.boolean())
  }),
  status: z.enum(['active', 'inactive', 'suspended'])
});

export const serviceValidator = baseDocumentSchema.extend({
  clinicId: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.string().min(1).max(100),
  price: z.number().min(0),
  currency: z.string().length(3),
  durationMinutes: z.number().int().min(1),
  bufferMinutes: z.number().int().min(0),
  availableDays: z.array(z.number().int().min(0).max(6)),
  requiredProfessionals: z.array(z.string()),
  maxConcurrentBookings: z.number().int().min(1),
  advanceBookingDays: z.number().int().min(0),
  cancellationPolicy: z.string().min(1)
});

export const roomValidator = baseDocumentSchema.extend({
  clinicId: z.string().min(1),
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(50),
  type: z.enum(['consultation', 'procedure', 'surgery', 'recovery']),
  capacity: z.number().int().min(1),
  equipment: z.array(z.string()),
  maintenanceSchedule: z.object({
    startDate: z.date(),
    endDate: z.date(),
    reason: z.string().min(1)
  }).optional()
});

export const organizationSettingsValidator = baseDocumentSchema.extend({
  organizationId: z.string().min(1),
  general: z.object({
    defaultTimezone: z.string().min(1),
    defaultLanguage: z.string().min(2).max(5),
    dateFormat: z.string().min(1),
    timeFormat: z.string().min(1)
  }),
  business: z.object({
    fiscalYear: z.string().regex(/^\d{4}$/),
    defaultCurrency: z.string().length(3),
    taxRate: z.number().min(0).max(1)
  }),
  security: z.object({
    passwordPolicy: z.record(z.any()),
    sessionTimeout: z.number().int().min(1),
    mfaRequired: z.boolean()
  }),
  integrations: z.object({
    whatsapp: z.record(z.any()).optional(),
    email: z.record(z.any()).optional(),
    payment: z.record(z.any()).optional()
  })
});

export const notificationValidator = baseDocumentSchema.extend({
  organizationId: z.string().min(1),
  clinicId: z.string().optional(),
  recipientId: z.string().min(1),
  recipientType: z.enum(['user', 'patient']),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  type: z.enum(['info', 'warning', 'error', 'success']),
  channels: z.array(z.enum(['app', 'email', 'sms', 'whatsapp'])),
  status: z.enum(['pending', 'sent', 'delivered', 'failed']),
  scheduledFor: z.date().optional(),
  sentAt: z.date().optional(),
  relatedEntity: z.object({
    type: z.string().min(1),
    id: z.string().min(1)
  }).optional()
});

// Validator map for easy access
export const validators = {
  organizations: organizationValidator,
  clinics: clinicValidator,
  patients: patientValidator,
  appointments: appointmentValidator,
  medical_records: medicalRecordValidator,
  users: userValidator,
  services: serviceValidator,
  rooms: roomValidator,
  organization_settings: organizationSettingsValidator,
  notifications: notificationValidator
} as const;

// Type inference helpers
export type ValidatedOrganization = z.infer<typeof organizationValidator>;
export type ValidatedClinic = z.infer<typeof clinicValidator>;
export type ValidatedPatient = z.infer<typeof patientValidator>;
export type ValidatedAppointment = z.infer<typeof appointmentValidator>;
export type ValidatedMedicalRecord = z.infer<typeof medicalRecordValidator>;
export type ValidatedUser = z.infer<typeof userValidator>;
export type ValidatedService = z.infer<typeof serviceValidator>;
export type ValidatedRoom = z.infer<typeof roomValidator>;
export type ValidatedOrganizationSettings = z.infer<typeof organizationSettingsValidator>;
export type ValidatedNotification = z.infer<typeof notificationValidator>;

// Validation utility functions
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any,
    public issues: z.ZodIssue[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateDocument<T>(
  validator: z.ZodSchema<T>,
  data: unknown,
  collectionName: string
): T {
  try {
    return validator.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      throw new ValidationError(
        `Validation failed for ${collectionName}: ${firstIssue.message}`,
        firstIssue.path.join('.'),
        firstIssue.received,
        error.issues
      );
    }
    throw error;
  }
}

export function validatePartialDocument<T>(
  validator: z.ZodSchema<T>,
  data: unknown,
  collectionName: string
): Partial<T> {
  try {
    return validator.partial().parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      throw new ValidationError(
        `Partial validation failed for ${collectionName}: ${firstIssue.message}`,
        firstIssue.path.join('.'),
        firstIssue.received,
        error.issues
      );
    }
    throw error;
  }
}

// Batch validation for migration
export function validateBatch<T>(
  validator: z.ZodSchema<T>,
  dataArray: unknown[],
  collectionName: string
): { valid: T[]; errors: Array<{ index: number; error: ValidationError }> } {
  const valid: T[] = [];
  const errors: Array<{ index: number; error: ValidationError }> = [];

  dataArray.forEach((data, index) => {
    try {
      const validatedData = validateDocument(validator, data, collectionName);
      valid.push(validatedData);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push({ index, error });
      } else {
        errors.push({ 
          index, 
          error: new ValidationError(
            `Unknown validation error for ${collectionName}`,
            'unknown',
            data,
            []
          )
        });
      }
    }
  });

  return { valid, errors };
}