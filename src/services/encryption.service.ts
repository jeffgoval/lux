/**
 * EncryptionService - AES-256 encryption service for sensitive data
 * 
 * Features:
 * - AES-256-GCM encryption for authenticated encryption
 * - Key rotation support with versioning
 * - Field-specific encryption for granular control
 * - Secure key derivation using PBKDF2
 * - Base64 encoding for storage compatibility
 * 
 * Requirements: 4.1, 4.2
 */

interface EncryptionConfig {
  algorithm: 'AES-GCM';
  keyLength: 256;
  ivLength: 12; // 96 bits for GCM
  saltLength: 32; // 256 bits
  iterations: 100000; // PBKDF2 iterations
}

interface EncryptedData {
  data: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  salt: string; // Base64 encoded salt
  version: string; // Key version for rotation
  algorithm: string; // Encryption algorithm used
  timestamp: number; // Encryption timestamp
}

interface KeyRotationConfig {
  currentVersion: string;
  masterKey: string;
  rotationSchedule: number; // Days between rotations
  maxKeyAge: number; // Maximum key age in days
}

export class EncryptionService {
  private config: EncryptionConfig = {
    algorithm: 'AES-GCM',
    keyLength: 256,
    ivLength: 12,
    saltLength: 32,
    iterations: 100000
  };

  private keyRotationConfig: KeyRotationConfig;
  private keyCache = new Map<string, CryptoKey>();

  constructor(masterKey?: string) {
    this.keyRotationConfig = {
      currentVersion: this.generateKeyVersion(),
      masterKey: masterKey || this.getMasterKeyFromEnv(),
      rotationSchedule: 90, // 90 days
      maxKeyAge: 365 // 1 year
    };
  }

  /**
   * Encrypt sensitive data with AES-256-GCM
   */
  async encryptData(plaintext: string, keyVersion?: string): Promise<EncryptedData> {
    try {
      const version = keyVersion || this.keyRotationConfig.currentVersion;
      const key = await this.getDerivedKey(version);
      
      // Generate random IV and salt
      const iv = crypto.getRandomValues(new Uint8Array(this.config.ivLength));
      const salt = crypto.getRandomValues(new Uint8Array(this.config.saltLength));
      
      // Encrypt the data
      const encoder = new TextEncoder();
      const data = encoder.encode(plaintext);
      
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.config.algorithm,
          iv: iv
        },
        key,
        data
      );

      return {
        data: this.arrayBufferToBase64(encryptedBuffer),
        iv: this.arrayBufferToBase64(iv),
        salt: this.arrayBufferToBase64(salt),
        version,
        algorithm: this.config.algorithm,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(encryptedData: EncryptedData): Promise<string> {
    try {
      const key = await this.getDerivedKey(encryptedData.version);
      
      const encryptedBuffer = this.base64ToArrayBuffer(encryptedData.data);
      const iv = this.base64ToArrayBuffer(encryptedData.iv);
      
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: encryptedData.algorithm as any,
          iv: iv
        },
        key,
        encryptedBuffer
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt specific fields in an object
   */
  async encryptFields<T extends Record<string, any>>(
    data: T,
    fieldsToEncrypt: (keyof T)[],
    keyVersion?: string
  ): Promise<T & { encryptedFields: string[]; encryptionVersion: string }> {
    const result = { ...data };
    const encryptedFields: string[] = [];
    const version = keyVersion || this.keyRotationConfig.currentVersion;

    for (const field of fieldsToEncrypt) {
      if (data[field] !== undefined && data[field] !== null) {
        const fieldValue = typeof data[field] === 'string' 
          ? data[field] 
          : JSON.stringify(data[field]);
        
        const encrypted = await this.encryptData(fieldValue, version);
        result[field] = encrypted;
        encryptedFields.push(field as string);
      }
    }

    return {
      ...result,
      encryptedFields,
      encryptionVersion: version
    };
  }

  /**
   * Decrypt specific fields in an object
   */
  async decryptFields<T extends Record<string, any>>(
    data: T & { encryptedFields?: string[]; encryptionVersion?: string }
  ): Promise<T> {
    const result = { ...data };
    const { encryptedFields, encryptionVersion, ...cleanData } = result;

    if (encryptedFields && encryptedFields.length > 0) {
      for (const field of encryptedFields) {
        if (cleanData[field] && typeof cleanData[field] === 'object') {
          const encryptedData = cleanData[field] as EncryptedData;
          const decrypted = await this.decryptData(encryptedData);
          
          // Try to parse as JSON, fallback to string
          try {
            cleanData[field] = JSON.parse(decrypted);
          } catch {
            cleanData[field] = decrypted;
          }
        }
      }
    }

    return cleanData as T;
  }

  /**
   * Generate hash for data integrity verification
   */
  async generateDataHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return this.arrayBufferToBase64(hashBuffer);
  }

  /**
   * Verify data integrity using hash
   */
  async verifyDataHash(data: string, hash: string): Promise<boolean> {
    const computedHash = await this.generateDataHash(data);
    return computedHash === hash;
  }

  /**
   * Rotate encryption keys
   */
  async rotateKeys(): Promise<string> {
    const newVersion = this.generateKeyVersion();
    
    // Clear old key from cache
    this.keyCache.delete(this.keyRotationConfig.currentVersion);
    
    // Update current version
    this.keyRotationConfig.currentVersion = newVersion;
    
    // Pre-generate new key
    await this.getDerivedKey(newVersion);
    
    return newVersion;
  }

  /**
   * Check if key rotation is needed
   */
  shouldRotateKeys(): boolean {
    const keyAge = this.getKeyAge(this.keyRotationConfig.currentVersion);
    return keyAge >= this.keyRotationConfig.rotationSchedule;
  }

  /**
   * Get all active key versions (for migration purposes)
   */
  getActiveKeyVersions(): string[] {
    return Array.from(this.keyCache.keys());
  }

  /**
   * Re-encrypt data with new key version
   */
  async reEncryptData(encryptedData: EncryptedData, newKeyVersion?: string): Promise<EncryptedData> {
    const plaintext = await this.decryptData(encryptedData);
    return this.encryptData(plaintext, newKeyVersion);
  }

  // Private methods

  private async getDerivedKey(version: string): Promise<CryptoKey> {
    if (this.keyCache.has(version)) {
      return this.keyCache.get(version)!;
    }

    const salt = this.generateSaltFromVersion(version);
    const keyMaterial = await this.importKeyMaterial();
    
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.config.iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: this.config.algorithm,
        length: this.config.keyLength
      },
      false, // Not extractable
      ['encrypt', 'decrypt']
    );

    this.keyCache.set(version, derivedKey);
    return derivedKey;
  }

  private async importKeyMaterial(): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.keyRotationConfig.masterKey);
    
    return crypto.subtle.importKey(
      'raw',
      keyData,
      'PBKDF2',
      false,
      ['deriveKey']
    );
  }

  private generateKeyVersion(): string {
    const timestamp = Date.now();
    const random = crypto.getRandomValues(new Uint8Array(4));
    const randomHex = Array.from(random, byte => byte.toString(16).padStart(2, '0')).join('');
    return `v${timestamp}-${randomHex}`;
  }

  private generateSaltFromVersion(version: string): Uint8Array {
    // Generate deterministic salt from version for key derivation
    const encoder = new TextEncoder();
    const versionData = encoder.encode(version + this.keyRotationConfig.masterKey);
    
    // Use a simple hash to generate salt (in production, use a more robust method)
    const salt = new Uint8Array(this.config.saltLength);
    for (let i = 0; i < this.config.saltLength; i++) {
      salt[i] = versionData[i % versionData.length] ^ (i * 7);
    }
    
    return salt;
  }

  private getKeyAge(version: string): number {
    const match = version.match(/^v(\d+)-/);
    if (!match) return Infinity;
    
    const timestamp = parseInt(match[1]);
    const ageMs = Date.now() - timestamp;
    return Math.floor(ageMs / (1000 * 60 * 60 * 24)); // Days
  }

  private getMasterKeyFromEnv(): string {
    // In production, this should come from a secure key management service
    const envKey = import.meta.env.VITE_ENCRYPTION_MASTER_KEY;
    
    if (!envKey) {
      console.warn('No master key found in environment. Using default key for development.');
      return 'dev-master-key-change-in-production-' + Date.now();
    }
    
    return envKey;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Singleton instance for application-wide use
export const encryptionService = new EncryptionService();

// Type exports for use in other modules
export type { EncryptedData, EncryptionConfig, KeyRotationConfig };