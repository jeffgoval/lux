/**
 * Tests for EncryptionService
 * Validates AES-256 encryption, key rotation, and field-specific encryption
 */

import { EncryptionService, EncryptedData } from '../../services/encryption.service';

// Mock crypto for testing environment
const mockCrypto = {
  getRandomValues: jest.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  subtle: {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    deriveKey: jest.fn(),
    importKey: jest.fn(),
    digest: jest.fn()
  }
};

// Setup global crypto mock
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true
});

// Mock btoa/atob for Node.js environment
global.btoa = jest.fn((str: string) => Buffer.from(str, 'binary').toString('base64'));
global.atob = jest.fn((str: string) => Buffer.from(str, 'base64').toString('binary'));

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;
  const testMasterKey = 'test-master-key-for-unit-tests';

  beforeEach(() => {
    jest.clearAllMocks();
    encryptionService = new EncryptionService(testMasterKey);
    
    // Setup default mock implementations
    mockCrypto.subtle.importKey.mockResolvedValue({} as CryptoKey);
    mockCrypto.subtle.deriveKey.mockResolvedValue({} as CryptoKey);
    mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(32));
    mockCrypto.subtle.decrypt.mockResolvedValue(new TextEncoder().encode('decrypted-data'));
    mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));
  });

  describe('encryptData', () => {
    it('should encrypt plaintext data successfully', async () => {
      const plaintext = 'sensitive-patient-data';
      
      const result = await encryptionService.encryptData(plaintext);
      
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('salt');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('algorithm', 'AES-GCM');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('number');
    });

    it('should use provided key version', async () => {
      const plaintext = 'test-data';
      const customVersion = 'v123-custom';
      
      const result = await encryptionService.encryptData(plaintext, customVersion);
      
      expect(result.version).toBe(customVersion);
    });

    it('should generate unique IV and salt for each encryption', async () => {
      const plaintext = 'same-data';
      
      const result1 = await encryptionService.encryptData(plaintext);
      const result2 = await encryptionService.encryptData(plaintext);
      
      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.salt).not.toBe(result2.salt);
    });

    it('should handle encryption errors gracefully', async () => {
      mockCrypto.subtle.encrypt.mockRejectedValue(new Error('Encryption failed'));
      
      await expect(encryptionService.encryptData('test')).rejects.toThrow('Encryption failed');
    });
  });

  describe('decryptData', () => {
    it('should decrypt encrypted data successfully', async () => {
      const mockEncryptedData: EncryptedData = {
        data: 'encrypted-base64-data',
        iv: 'iv-base64',
        salt: 'salt-base64',
        version: 'v1-test',
        algorithm: 'AES-GCM',
        timestamp: Date.now()
      };

      const result = await encryptionService.decryptData(mockEncryptedData);
      
      expect(result).toBe('decrypted-data');
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'AES-GCM',
          iv: expect.any(ArrayBuffer)
        }),
        expect.any(Object),
        expect.any(ArrayBuffer)
      );
    });

    it('should handle decryption errors gracefully', async () => {
      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'));
      
      const mockEncryptedData: EncryptedData = {
        data: 'invalid-data',
        iv: 'iv',
        salt: 'salt',
        version: 'v1',
        algorithm: 'AES-GCM',
        timestamp: Date.now()
      };

      await expect(encryptionService.decryptData(mockEncryptedData)).rejects.toThrow('Decryption failed');
    });
  });

  describe('encryptFields', () => {
    it('should encrypt specified fields in an object', async () => {
      const testData = {
        id: '123',
        name: 'John Doe',
        cpf: '123.456.789-00',
        email: 'john@example.com',
        publicInfo: 'not sensitive'
      };

      const result = await encryptionService.encryptFields(
        testData,
        ['cpf', 'email']
      );

      expect(result.id).toBe('123');
      expect(result.name).toBe('John Doe');
      expect(result.publicInfo).toBe('not sensitive');
      expect(result.encryptedFields).toEqual(['cpf', 'email']);
      expect(result.encryptionVersion).toBeDefined();
      expect(typeof result.cpf).toBe('object'); // Should be EncryptedData object
      expect(typeof result.email).toBe('object'); // Should be EncryptedData object
    });

    it('should handle non-string fields by JSON stringifying them', async () => {
      const testData = {
        id: 123,
        metadata: { sensitive: true, value: 42 }
      };

      const result = await encryptionService.encryptFields(
        testData,
        ['metadata']
      );

      expect(result.encryptedFields).toContain('metadata');
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(ArrayBuffer)
      );
    });

    it('should skip undefined and null fields', async () => {
      const testData = {
        defined: 'value',
        undefined: undefined,
        null: null
      };

      const result = await encryptionService.encryptFields(
        testData,
        ['defined', 'undefined', 'null']
      );

      expect(result.encryptedFields).toEqual(['defined']);
      expect(result.undefined).toBeUndefined();
      expect(result.null).toBeNull();
    });
  });

  describe('decryptFields', () => {
    it('should decrypt specified fields in an object', async () => {
      const encryptedData = {
        id: '123',
        name: 'John Doe',
        cpf: {
          data: 'encrypted-cpf',
          iv: 'iv',
          salt: 'salt',
          version: 'v1',
          algorithm: 'AES-GCM',
          timestamp: Date.now()
        } as EncryptedData,
        encryptedFields: ['cpf'],
        encryptionVersion: 'v1'
      };

      // Mock decryption to return the original CPF
      mockCrypto.subtle.decrypt.mockResolvedValue(
        new TextEncoder().encode('123.456.789-00')
      );

      const result = await encryptionService.decryptFields(encryptedData);

      expect(result.id).toBe('123');
      expect(result.name).toBe('John Doe');
      expect(result.cpf).toBe('123.456.789-00');
      expect(result).not.toHaveProperty('encryptedFields');
      expect(result).not.toHaveProperty('encryptionVersion');
    });

    it('should handle JSON objects in encrypted fields', async () => {
      const encryptedData = {
        metadata: {
          data: 'encrypted-json',
          iv: 'iv',
          salt: 'salt',
          version: 'v1',
          algorithm: 'AES-GCM',
          timestamp: Date.now()
        } as EncryptedData,
        encryptedFields: ['metadata'],
        encryptionVersion: 'v1'
      };

      // Mock decryption to return JSON string
      mockCrypto.subtle.decrypt.mockResolvedValue(
        new TextEncoder().encode('{"key": "value", "number": 42}')
      );

      const result = await encryptionService.decryptFields(encryptedData);

      expect(result.metadata).toEqual({ key: 'value', number: 42 });
    });
  });

  describe('generateDataHash', () => {
    it('should generate SHA-256 hash for data integrity', async () => {
      const testData = 'data-to-hash';
      
      const hash = await encryptionService.generateDataHash(testData);
      
      expect(typeof hash).toBe('string');
      expect(mockCrypto.subtle.digest).toHaveBeenCalledWith(
        'SHA-256',
        expect.any(ArrayBuffer)
      );
    });
  });

  describe('verifyDataHash', () => {
    it('should verify data integrity correctly', async () => {
      const testData = 'original-data';
      const correctHash = 'correct-hash';
      
      // Mock generateDataHash to return the correct hash
      jest.spyOn(encryptionService, 'generateDataHash').mockResolvedValue(correctHash);
      
      const isValid = await encryptionService.verifyDataHash(testData, correctHash);
      
      expect(isValid).toBe(true);
    });

    it('should detect data tampering', async () => {
      const testData = 'original-data';
      const wrongHash = 'wrong-hash';
      
      // Mock generateDataHash to return different hash
      jest.spyOn(encryptionService, 'generateDataHash').mockResolvedValue('different-hash');
      
      const isValid = await encryptionService.verifyDataHash(testData, wrongHash);
      
      expect(isValid).toBe(false);
    });
  });

  describe('key rotation', () => {
    it('should rotate keys and return new version', async () => {
      const newVersion = await encryptionService.rotateKeys();
      
      expect(typeof newVersion).toBe('string');
      expect(newVersion).toMatch(/^v\d+-[a-f0-9]+$/);
    });

    it('should determine when key rotation is needed', () => {
      // This test would need to mock the internal key age calculation
      const shouldRotate = encryptionService.shouldRotateKeys();
      
      expect(typeof shouldRotate).toBe('boolean');
    });

    it('should re-encrypt data with new key version', async () => {
      const originalEncrypted: EncryptedData = {
        data: 'old-encrypted-data',
        iv: 'iv',
        salt: 'salt',
        version: 'v1-old',
        algorithm: 'AES-GCM',
        timestamp: Date.now()
      };

      // Mock decryption and re-encryption
      mockCrypto.subtle.decrypt.mockResolvedValue(
        new TextEncoder().encode('original-plaintext')
      );

      const reEncrypted = await encryptionService.reEncryptData(originalEncrypted, 'v2-new');
      
      expect(reEncrypted.version).toBe('v2-new');
      expect(reEncrypted.data).toBeDefined();
      expect(reEncrypted.iv).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle missing master key gracefully', () => {
      // Test with no master key provided
      const serviceWithoutKey = new EncryptionService();
      
      // Should not throw during construction
      expect(serviceWithoutKey).toBeInstanceOf(EncryptionService);
    });

    it('should handle crypto API failures', async () => {
      mockCrypto.subtle.deriveKey.mockRejectedValue(new Error('Key derivation failed'));
      
      await expect(encryptionService.encryptData('test')).rejects.toThrow();
    });
  });

  describe('compliance requirements', () => {
    it('should use AES-256-GCM algorithm', async () => {
      const result = await encryptionService.encryptData('test-data');
      
      expect(result.algorithm).toBe('AES-GCM');
    });

    it('should generate unique encryption parameters', async () => {
      const results = await Promise.all([
        encryptionService.encryptData('same-data'),
        encryptionService.encryptData('same-data'),
        encryptionService.encryptData('same-data')
      ]);

      // All IVs should be unique
      const ivs = results.map(r => r.iv);
      const uniqueIvs = new Set(ivs);
      expect(uniqueIvs.size).toBe(3);

      // All salts should be unique
      const salts = results.map(r => r.salt);
      const uniqueSalts = new Set(salts);
      expect(uniqueSalts.size).toBe(3);
    });

    it('should include timestamp for audit trails', async () => {
      const beforeEncryption = Date.now();
      const result = await encryptionService.encryptData('audit-data');
      const afterEncryption = Date.now();
      
      expect(result.timestamp).toBeGreaterThanOrEqual(beforeEncryption);
      expect(result.timestamp).toBeLessThanOrEqual(afterEncryption);
    });
  });
});