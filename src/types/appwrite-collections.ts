/**
 * Optimized Appwrite collection interfaces
 * Based on the migration design document with performance and security optimizations
 */

import {
  BaseDocument,
  AuditableDocument,
  EncryptedDocument,
  SecureAuditableDocument,
  ContactInfo,
  Address,
  BusinessMetrics,
  LGPDConsents,
  DigitalSignature,
  AccessControl,
  ComplianceInfo,
  StatusHistoryEntry,
  FinancialInfo,
  AutomationMetadata,
  SchedulingInfo,
  SearchableData,
  OrganizationMetrics,
  ClinicSettings,
  AppointmentStatus,
  OrganizationPlan,
  OrganizationStatus,
  ClinicType,
  OperationalStatus,
  MedicalRecordType,
  VipLevel
} from './appwrite-base';

// 1. Organizations - Simplified and optimized structure
export interface Organization extends BaseDocument {
  name: string;
  slug: string; // URL-friendly identifier
  cnpj?: string; // Encrypted
  plan: OrganizationPlan;
  status: OrganizationStatus;
  
  // Configurations in separate document for performance
  settingsId?: string; // FK to organization_settings
  
  // Cached metrics for dashboard
  metrics: OrganizationMetrics;
  
  // Encrypted billing info
  billingInfoEncrypted?: string;
}

// 2. Clinics - Optimized for frequent queries
export interface Clinic extends BaseDocument {
  organizationId: string;
  name: string;
  slug: string;
  type: ClinicType;
  
  // Structured contact data
  contact: ContactInfo;
  
  // Normalized address for geographic search
  address: Address;
  
  // Critical settings inline for performance
  settings: ClinicSettings;
  
  // Operational status
  operationalStatus: OperationalStatus;
}

// 3. Patients - Optimized for LGPD and performance
export interface Patient extends SecureAuditableDocument {
  clinicId: string;
  code: string; // Unique internal code per clinic
  
  // Encrypted personal information
  personalInfoEncrypted: string; // Encrypted JSON
  
  // Non-sensitive data for search (LGPD compliant)
  searchableData: SearchableData;
  
  // Business metrics
  businessMetrics: BusinessMetrics;
  
  // LGPD consents
  consents: LGPDConsents;
  
  // Tags for segmentation (denormalized for performance)
  tags: string[];
  vipLevel?: VipLevel;
}

// 4. Appointments - Optimized for scheduling engine
export interface Appointment extends BaseDocument {
  clinicId: string;
  code: string; // APPT-YYYYMMDD-NNN
  
  // Main references
  patientId: string;
  professionalId: string;
  serviceId: string;
  roomId?: string;
  
  // Optimized scheduling for temporal queries
  scheduling: SchedulingInfo;
  
  // Status with inline history for performance
  status: AppointmentStatus;
  statusHistory: StatusHistoryEntry[];
  
  // Financial data
  financial: FinancialInfo;
  
  // Metadata for AI and automation
  metadata: AutomationMetadata;
}

// 5. Medical Records - Maximum security and compliance
export interface MedicalRecord extends SecureAuditableDocument {
  patientId: string;
  clinicId: string;
  appointmentId?: string;
  professionalId: string;
  
  recordNumber: string; // Sequential number per patient
  type: MedicalRecordType;
  
  // Encrypted content
  encryptedContent: string;
  contentHash: string; // For integrity verification
  
  // Digital signature
  digitalSignature: DigitalSignature;
  
  // Granular access control
  accessControl: AccessControl;
  
  // Compliance and retention
  compliance: ComplianceInfo;
}

// 6. Users - Enhanced with role-based access
export interface User extends AuditableDocument {
  organizationId: string;
  clinicId?: string; // Optional for multi-clinic users
  
  // Basic info
  email: string;
  name: string;
  avatar?: string;
  
  // Authentication
  emailVerified: boolean;
  lastLoginAt?: Date;
  
  // Role and permissions
  roles: string[];
  permissions: string[];
  
  // Professional info (if applicable)
  professionalInfo?: {
    license: string;
    specialty: string;
    crm?: string;
  };
  
  // Preferences
  preferences: {
    language: string;
    timezone: string;
    notifications: Record<string, boolean>;
  };
  
  // Status
  status: 'active' | 'inactive' | 'suspended';
}

// 7. Services - Optimized for booking system
export interface Service extends BaseDocument {
  clinicId: string;
  
  name: string;
  description?: string;
  category: string;
  
  // Pricing
  price: number;
  currency: string;
  
  // Duration and scheduling
  durationMinutes: number;
  bufferMinutes: number; // Time between appointments
  
  // Availability
  isActive: boolean;
  availableDays: number[]; // 0-6 (Sunday-Saturday)
  
  // Professional requirements
  requiredProfessionals: string[];
  maxConcurrentBookings: number;
  
  // Business rules
  advanceBookingDays: number;
  cancellationPolicy: string;
}

// 8. Rooms - For resource management
export interface Room extends BaseDocument {
  clinicId: string;
  
  name: string;
  code: string;
  type: 'consultation' | 'procedure' | 'surgery' | 'recovery';
  
  // Capacity and equipment
  capacity: number;
  equipment: string[];
  
  // Availability
  isActive: boolean;
  maintenanceSchedule?: {
    startDate: Date;
    endDate: Date;
    reason: string;
  };
}

// 9. Organization Settings - Separated for performance
export interface OrganizationSettings extends BaseDocument {
  organizationId: string;
  
  // General settings
  general: {
    defaultTimezone: string;
    defaultLanguage: string;
    dateFormat: string;
    timeFormat: string;
  };
  
  // Business settings
  business: {
    fiscalYear: string;
    defaultCurrency: string;
    taxRate: number;
  };
  
  // Security settings
  security: {
    passwordPolicy: Record<string, any>;
    sessionTimeout: number;
    mfaRequired: boolean;
  };
  
  // Integration settings
  integrations: {
    whatsapp?: Record<string, any>;
    email?: Record<string, any>;
    payment?: Record<string, any>;
  };
}

// 10. Notifications - For communication system
export interface Notification extends BaseDocument {
  organizationId: string;
  clinicId?: string;
  
  // Recipients
  recipientId: string;
  recipientType: 'user' | 'patient';
  
  // Content
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  
  // Delivery
  channels: ('app' | 'email' | 'sms' | 'whatsapp')[];
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  
  // Scheduling
  scheduledFor?: Date;
  sentAt?: Date;
  
  // Metadata
  relatedEntity?: {
    type: string;
    id: string;
  };
}

// Type unions for easier use
export type AppwriteDocument = 
  | Organization 
  | Clinic 
  | Patient 
  | Appointment 
  | MedicalRecord 
  | User 
  | Service 
  | Room 
  | OrganizationSettings 
  | Notification;

// Collection names enum
export enum CollectionName {
  ORGANIZATIONS = 'organizations',
  CLINICS = 'clinics',
  PATIENTS = 'patients',
  APPOINTMENTS = 'appointments',
  MEDICAL_RECORDS = 'medical_records',
  USERS = 'users',
  SERVICES = 'services',
  ROOMS = 'rooms',
  ORGANIZATION_SETTINGS = 'organization_settings',
  NOTIFICATIONS = 'notifications'
}

// Database configuration
export interface DatabaseConfig {
  databaseId: string;
  collections: Record<CollectionName, {
    collectionId: string;
    name: string;
    permissions: string[];
    documentSecurity: boolean;
  }>;
}