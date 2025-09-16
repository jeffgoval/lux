/**
 * Main export file for Appwrite migration types and validators
 * Provides a single entry point for all migration-related types
 */

import { CollectionName } from './appwrite-collections';

import { validators } from './appwrite-validators';

import { CollectionName } from './appwrite-collections';

import { User } from './appwrite-collections';

import { AppwriteDocument } from './appwrite-collections';

import { MedicalRecord } from './appwrite-collections';

import { AppwriteDocument } from './appwrite-collections';

import { Appointment } from './appwrite-collections';

import { AppwriteDocument } from './appwrite-collections';

import { Patient } from './appwrite-collections';

import { AppwriteDocument } from './appwrite-collections';

import { Clinic } from './appwrite-collections';

import { AppwriteDocument } from './appwrite-collections';

import { Organization } from './appwrite-collections';

import { AppwriteDocument } from './appwrite-collections';

import { CollectionName } from './appwrite-collections';

import { CollectionName } from './appwrite-collections';

import { CollectionName } from './appwrite-collections';

import { CollectionName } from './appwrite-collections';

import { CollectionName } from './appwrite-collections';

import { CollectionName } from './appwrite-collections';

import { CollectionName } from './appwrite-collections';

import { CollectionName } from './appwrite-collections';

import { CollectionName } from './appwrite-collections';

import { CollectionName } from './appwrite-collections';

import { CollectionName } from './appwrite-collections';

// Base types and mixins
export * from './appwrite-base';

// Collection interfaces
export * from './appwrite-collections';

// Validators and validation utilities
export * from './appwrite-validators';

// Re-export commonly used types for convenience
export type {
  BaseDocument,
  AuditableDocument,
  EncryptedDocument,
  SecureAuditableDocument,
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
  AppwriteDocument
} from './appwrite-collections';

export {
  CollectionName,
  validators,
  validateDocument,
  validatePartialDocument,
  validateBatch,
  ValidationError
} from './appwrite-validators';

// Explicit re-exports for better compatibility
export { BaseDocument as BaseDocumentInterface } from './appwrite-base';
export { validateDocument as validateDocumentFunction } from './appwrite-validators';

// Migration-specific types
export interface MigrationConfig {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  validateBeforeMigration: boolean;
  createBackups: boolean;
  dryRun: boolean;
}

export interface MigrationResult {
  collectionName: string;
  totalRecords: number;
  migratedRecords: number;
  failedRecords: number;
  errors: Array<{
    recordId?: string;
    error: string;
    data?: any;
  }>;
  duration: number;
  startTime: Date;
  endTime: Date;
}

export interface MigrationProgress {
  phase: string;
  currentCollection?: string;
  progress: number; // 0-100
  recordsProcessed: number;
  totalRecords: number;
  estimatedTimeRemaining?: number;
  errors: number;
  warnings: number;
}

export interface MigrationPhase {
  name: string;
  description: string;
  collections: CollectionName[];
  dependencies: string[];
  rollbackSupported: boolean;
  criticalPhase: boolean;
}

// Default migration configuration
export const DEFAULT_MIGRATION_CONFIG: MigrationConfig = {
  batchSize: 100,
  maxRetries: 3,
  retryDelay: 1000,
  validateBeforeMigration: true,
  createBackups: true,
  dryRun: false
};

// Migration phases definition
export const MIGRATION_PHASES: MigrationPhase[] = [
  {
    name: 'setup',
    description: 'Create collections and configure database',
    collections: [],
    dependencies: [],
    rollbackSupported: true,
    criticalPhase: false
  },
  {
    name: 'organizations',
    description: 'Migrate organization data',
    collections: [CollectionName.ORGANIZATIONS, CollectionName.ORGANIZATION_SETTINGS],
    dependencies: ['setup'],
    rollbackSupported: true,
    criticalPhase: true
  },
  {
    name: 'clinics',
    description: 'Migrate clinic data',
    collections: [CollectionName.CLINICS],
    dependencies: ['organizations'],
    rollbackSupported: true,
    criticalPhase: true
  },
  {
    name: 'users',
    description: 'Migrate user accounts and authentication',
    collections: [CollectionName.USERS],
    dependencies: ['organizations', 'clinics'],
    rollbackSupported: true,
    criticalPhase: true
  },
  {
    name: 'services_rooms',
    description: 'Migrate services and rooms',
    collections: [CollectionName.SERVICES, CollectionName.ROOMS],
    dependencies: ['clinics'],
    rollbackSupported: true,
    criticalPhase: false
  },
  {
    name: 'patients',
    description: 'Migrate patient data with encryption',
    collections: [CollectionName.PATIENTS],
    dependencies: ['clinics'],
    rollbackSupported: true,
    criticalPhase: true
  },
  {
    name: 'appointments',
    description: 'Migrate appointment data',
    collections: [CollectionName.APPOINTMENTS],
    dependencies: ['patients', 'users', 'services_rooms'],
    rollbackSupported: true,
    criticalPhase: true
  },
  {
    name: 'medical_records',
    description: 'Migrate medical records with maximum security',
    collections: [CollectionName.MEDICAL_RECORDS],
    dependencies: ['patients', 'appointments'],
    rollbackSupported: true,
    criticalPhase: true
  },
  {
    name: 'notifications',
    description: 'Migrate notification history',
    collections: [CollectionName.NOTIFICATIONS],
    dependencies: ['users', 'patients'],
    rollbackSupported: true,
    criticalPhase: false
  }
];

// Type guards for runtime type checking
export function isOrganization(doc: AppwriteDocument): doc is Organization {
  return 'plan' in doc && 'metrics' in doc;
}

export function isClinic(doc: AppwriteDocument): doc is Clinic {
  return 'organizationId' in doc && 'contact' in doc && 'address' in doc;
}

export function isPatient(doc: AppwriteDocument): doc is Patient {
  return 'personalInfoEncrypted' in doc && 'searchableData' in doc && 'businessMetrics' in doc;
}

export function isAppointment(doc: AppwriteDocument): doc is Appointment {
  return 'scheduling' in doc && 'financial' in doc && 'patientId' in doc;
}

export function isMedicalRecord(doc: AppwriteDocument): doc is MedicalRecord {
  return 'encryptedContent' in doc && 'digitalSignature' in doc && 'accessControl' in doc;
}

export function isUser(doc: AppwriteDocument): doc is User {
  return 'email' in doc && 'roles' in doc && 'preferences' in doc;
}

// Utility functions for migration
export function getCollectionValidator(collectionName: CollectionName) {
  return validators[collectionName];
}

export function getMigrationPhase(phaseName: string): MigrationPhase | undefined {
  return MIGRATION_PHASES.find(phase => phase.name === phaseName);
}

export function getPhaseCollections(phaseName: string): CollectionName[] {
  const phase = getMigrationPhase(phaseName);
  return phase ? phase.collections : [];
}

export function getPhaseDependencies(phaseName: string): string[] {
  const phase = getMigrationPhase(phaseName);
  return phase ? phase.dependencies : [];
}