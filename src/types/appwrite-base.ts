/**
 * Base types and mixins for Appwrite migration
 * Implements optimized structure with audit trails and encryption support
 */

// Base interface for all Appwrite documents
export interface BaseDocument {
  $id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  version: number;
  isActive: boolean;
}

// Audit log entry structure
export interface AuditLogEntry {
  action: 'create' | 'update' | 'delete' | 'view';
  timestamp: Date;
  userId: string;
  changes?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}

// Mixin for auditable documents
export interface AuditableDocument extends BaseDocument {
  auditLog: AuditLogEntry[];
}

// Mixin for encrypted documents
export interface EncryptedDocument extends BaseDocument {
  encryptedFields: string[];
  encryptionVersion: string;
  dataHash: string;
}

// Combined mixin for documents that need both audit and encryption
export interface SecureAuditableDocument extends AuditableDocument, EncryptedDocument {}

// Contact information structure
export interface ContactInfo {
  phone: string;
  whatsapp?: string;
  email: string;
}

// Address structure with geolocation support
export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: [number, number]; // [lat, lng]
}

// Business metrics structure
export interface BusinessMetrics {
  ltv: number;
  totalSpent: number;
  appointmentCount: number;
  lastAppointmentAt?: Date;
  averageTicket: number;
  churnRisk: 'low' | 'medium' | 'high';
}

// LGPD consent structure
export interface LGPDConsents {
  lgpdAccepted: boolean;
  lgpdAcceptedAt: Date;
  marketingConsent: boolean;
  imageUseConsent: boolean;
  dataRetentionDays: number;
}

// Digital signature structure
export interface DigitalSignature {
  professionalId: string;
  signedAt: Date;
  signatureHash: string;
  certificateId?: string;
}

// Access control structure
export interface AccessControl {
  level: 'public' | 'restricted' | 'confidential';
  authorizedUsers: string[];
  accessLog: Array<{
    userId: string;
    accessedAt: Date;
    action: 'view' | 'edit' | 'print' | 'export';
    ip: string;
  }>;
}

// Compliance structure
export interface ComplianceInfo {
  retentionPolicy: string;
  scheduledDeletionAt?: Date;
  legalHoldUntil?: Date;
}

// Status history entry
export interface StatusHistoryEntry {
  status: string;
  timestamp: Date;
  userId: string;
  reason?: string;
}

// Financial information structure
export interface FinancialInfo {
  servicePrice: number;
  discountAmount: number;
  finalPrice: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  commissionAmount?: number;
}

// Metadata for AI and automation
export interface AutomationMetadata {
  source: 'app' | 'whatsapp' | 'phone' | 'walk_in' | 'ai';
  aiConfidence?: number;
  automationTriggers?: string[];
}

// Scheduling information optimized for queries
export interface SchedulingInfo {
  date: string; // YYYY-MM-DD for indexing
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationMinutes: number;
  timezone: string;
  
  // Calculated fields for optimization
  dateTimeStart: Date; // Full timestamp
  dateTimeEnd: Date;
  dayOfWeek: number; // 0-6 for reports
  weekOfYear: number;
  monthYear: string; // YYYY-MM for aggregations
}

// Searchable data structure (LGPD compliant)
export interface SearchableData {
  firstNameHash: string; // Hash for search
  phoneHash: string;
  emailHash: string;
  birthYear: number; // Only year for statistics
}

// Organization metrics cache
export interface OrganizationMetrics {
  totalClinics: number;
  totalUsers: number;
  storageUsedMB: number;
  lastActivityAt: Date;
}

// Clinic settings structure
export interface ClinicSettings {
  timezone: string;
  defaultAppointmentDuration: number;
  workingHours: Record<string, { start: string; end: string }>;
}

// Common enums
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type PaymentStatus = 'pending' | 'partial' | 'paid';
export type ChurnRisk = 'low' | 'medium' | 'high';
export type VipLevel = 'bronze' | 'silver' | 'gold' | 'platinum';
export type OrganizationPlan = 'basic' | 'premium' | 'enterprise';
export type OrganizationStatus = 'active' | 'suspended' | 'cancelled';
export type ClinicType = 'main' | 'branch';
export type OperationalStatus = 'active' | 'maintenance' | 'closed';
export type MedicalRecordType = 'anamnesis' | 'evolution' | 'prescription' | 'exam' | 'procedure';
export type AccessLevel = 'public' | 'restricted' | 'confidential';