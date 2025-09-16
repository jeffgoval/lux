/**
 * 🧪 TESTES UNITÁRIOS - SISTEMA DE RECOVERY DE ERROS
 * 
 * Testes para classificação de erros, estratégias de recovery,
 * retry com backoff exponencial e error boundaries
 */

import { AuthErrorType, AuthError, RecoveryStrategy } from '@/types/auth.types';
import { ErrorRecoveryService } from '@/services/error-recovery.service';
import { authService } from '@/services/auth.service';
import { supabase } from '@/lib/supabase';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('@/services/auth.service');
jest.mock('@/lib/supabase');
jest.mock('@/utils/logger');

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// ============================================================================
// TESTES DE CLASSIFICAÇÃO DE ERROS
// ============================================================================

describe('Error Classification', () => {
  let recoveryService: ErrorRecoveryService;

  beforeEach(() => {
    recoveryService = new ErrorRecoveryService();
    jest.clearAllMocks();
  });

  describe('Error Type Detection', () => {
    it('should classify authentication errors correctly', () => {
      const errors = [
        'Invalid credentials',
        'User not found',
        'Password incorrect',
        'Account locked'
      ];

      errors.forEach(message => {
        const error = recoveryService.classifyError(new Error(message));
        expect(error.type).toBe(AuthErrorType.AUTHENTICATION);
        expect(error.recoverable).toBe(false);
      });
    });

    it('should classify authorization errors correctly', () => {
      const errors = [
        'Insufficient permissions',
        'Access denied',
        'Role required',
        'Permission denied'
      ];

      errors.forEach(message => {
        const error = recoveryService.classifyError(new Error(message));
        expect(error.type).toBe(AuthErrorType.AUTHORIZATION);
        expect(error.recoverable).toBe(false);
      });
    });

    it('should classify validation errors correctly', () => {
      const errors = [
        'Invalid email format',
        'Password too short',
        'Required field missing',
        'Invalid phone number'
      ];

      errors.forEach(message => {
        const error = recoveryService.classifyError(new Error(message));
        expect(error.type).toBe(AuthErrorType.VALIDATION);
        expect(error.recoverable).toBe(true);
      });
    });

    it('should classify database errors correctly', () => {
      const errors = [
        'Connection failed',
        'Query timeout',
        'Database unavailable',
        'Transaction failed'
      ];

      errors.forEach(message => {
        const error = recoveryService.classifyError(new Error(message));
        expect(error.type).toBe(AuthErrorType.DATABASE);
        expect(error.recoverable).toBe(true);
      });
    });

    it('should classify network errors correctly', () => {
      const errors = [
        'Network error',
        'Request timeout',
        'Connection refused',
        'DNS resolution failed'
      ];

      errors.forEach(message => {
        const error = recoveryService.classifyError(new Error(message));
        expect(error.type).toBe(AuthErrorType.NETWORK);
        expect(error.recoverable).toBe(true);
      });
    });

    it('should classify timeout errors correctly', () => {
      const errors = [
        'Request timeout',
        'Operation timed out',
        'Timeout exceeded',
        'Response timeout'
      ];

      errors.forEach(message => {
        const error = recoveryService.classifyError(new Error(message));
        expect(error.type).toBe(AuthErrorType.TIMEOUT);
        expect(error.recoverable).toBe(true);
        expect(error.retryAfter).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Context Extraction', () => {
    it('should extract context from Supabase errors', () => {
      const supabaseError = {
        message: 'Invalid credentials',
        code: 'invalid_credentials',
        details: 'Email or password is incorrect'
      };

      const error = recoveryService.classifyError(supabaseError);

      expect(error.code).toBe('invalid_credentials');
      expect(error.context).toEqual({
        details: 'Email or password is incorrect',
        source: 'supabase'
      });
    });

    it('should extract context from network errors', () => {
      const networkError = new Error('Network error');
      (networkError as any).status = 500;
      (networkError as any).statusText = 'Internal Server Error';

      const error = recoveryService.classifyError(networkError);

      expect(error.context).toEqual({
        status: 500,
        statusText: 'Internal Server Error',
        source: 'network'
      });
    });
  });
});

// ============================================================================
// TESTES DE ESTRATÉGIAS DE RECOVERY
// ============================================================================

describe('Recovery Strategies', () => {
  let recoveryService: ErrorRecoveryService;

  beforeEach(() => {
    recoveryService = new ErrorRecoveryService();
    jest.clearAllMocks();
  });

  describe('Database Recovery', () => {
    it('should attempt database reconnection', async () => {
      const error: AuthError = {
        type: AuthErrorType.DATABASE,
        message: 'Connection failed',
        recoverable: true
      };

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null
      });

      const result = await recoveryService.attemptRecovery(error);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('database_reconnect');
    });

    it('should handle database recovery failure', async () => {
      const error: AuthError = {
        type: AuthErrorType.DATABASE,
        message: 'Connection failed',
        recoverable: true
      };

      mockSupabase.auth.getUser.mockRejectedValue(new Error('Still failing'));

      const result = await recoveryService.attemptRecovery(error);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Auth Recovery', () => {
    it('should attempt token refresh', async () => {
      const error: AuthError = {
        type: AuthErrorType.AUTHENTICATION,
        message: 'Token expired',
        recoverable: true
      };

      mockAuthService.refreshTokens.mockResolvedValue({
        success: true,
        tokens: {
          accessToken: 'new-token',
          refreshToken: 'new-refresh',
          expiresAt: new Date(),
          tokenType: 'Bearer'
        }
      });

      const result = await recoveryService.attemptRecovery(error);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('token_refresh');
    });

    it('should handle token refresh failure', async () => {
      const error: AuthError = {
        type: AuthErrorType.AUTHENTICATION,
        message: 'Token expired',
        recoverable: true
      };

      mockAuthService.refreshTokens.mockResolvedValue({
        success: false,
        error: 'Refresh token invalid'
      });

      const result = await recoveryService.attemptRecovery(error);

      expect(result.success).toBe(false);
    });
  });

  describe('Network Recovery', () => {
    it('should implement exponential backoff', async () => {
      const error: AuthError = {
        type: AuthErrorType.NETWORK,
        message: 'Network error',
        recoverable: true
      };

      const startTime = Date.now();
      
      // Mock network failure then success
      mockSupabase.auth.getUser
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { user: null },
          error: null
        });

      const result = await recoveryService.attemptRecovery(error);

      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeGreaterThan(100); // Should have waited for backoff
    });

    it('should respect maximum retry attempts', async () => {
      const error: AuthError = {
        type: AuthErrorType.NETWORK,
        message: 'Network error',
        recoverable: true
      };

      // Mock continuous failure
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Network error'));

      const result = await recoveryService.attemptRecovery(error);

      expect(result.success).toBe(false);
      expect(result.attemptsUsed).toBe(3); // Default max attempts
    });
  });

  describe('Validation Recovery', () => {
    it('should provide validation suggestions', async () => {
      const error: AuthError = {
        type: AuthErrorType.VALIDATION,
        message: 'Invalid email format',
        recoverable: true
      };

      const result = await recoveryService.attemptRecovery(error);

      expect(result.success).toBe(false); // Cannot auto-fix validation
      expect(result.suggestions).toContain('Please check email format');
    });

    it('should handle data format corrections', async () => {
      const error: AuthError = {
        type: AuthErrorType.VALIDATION,
        message: 'Phone number format invalid',
        recoverable: true,
        context: { field: 'phone', value: '11999999999' }
      };

      const result = await recoveryService.attemptRecovery(error);

      expect(result.suggestions).toContain('Format: +55 11 99999-9999');
    });
  });
});

// ============================================================================
// TESTES DE RETRY COM BACKOFF
// ============================================================================

describe('Retry with Backoff', () => {
  let recoveryService: ErrorRecoveryService;

  beforeEach(() => {
    recoveryService = new ErrorRecoveryService();
    jest.clearAllMocks();
  });

  it('should implement exponential backoff correctly', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce('Success');

    const startTime = Date.now();
    
    const result = await recoveryService.retryWithBackoff(
      operation,
      { maxAttempts: 3, baseDelay: 100 }
    );

    const duration = Date.now() - startTime;

    expect(result).toBe('Success');
    expect(operation).toHaveBeenCalledTimes(3);
    expect(duration).toBeGreaterThan(300); // 100ms + 200ms + operation time
  });

  it('should respect maximum attempts', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

    await expect(
      recoveryService.retryWithBackoff(operation, { maxAttempts: 2 })
    ).rejects.toThrow('Always fails');

    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should apply jitter to prevent thundering herd', async () => {
    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;
    
    global.setTimeout = jest.fn((callback, delay) => {
      delays.push(delay as number);
      return originalSetTimeout(callback, 0);
    }) as any;

    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('Fail'))
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValueOnce('Success');

    await recoveryService.retryWithBackoff(
      operation,
      { maxAttempts: 3, baseDelay: 100, jitter: true }
    );

    // Delays should have some randomness
    expect(delays[0]).toBeGreaterThanOrEqual(50);
    expect(delays[0]).toBeLessThanOrEqual(150);
    expect(delays[1]).toBeGreaterThanOrEqual(100);
    expect(delays[1]).toBeLessThanOrEqual(300);

    global.setTimeout = originalSetTimeout;
  });

  it('should handle immediate success', async () => {
    const operation = jest.fn().mockResolvedValue('Immediate success');

    const result = await recoveryService.retryWithBackoff(operation);

    expect(result).toBe('Immediate success');
    expect(operation).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// TESTES DE ERROR BOUNDARIES
// ============================================================================

describe('Error Boundary Integration', () => {
  let recoveryService: ErrorRecoveryService;

  beforeEach(() => {
    recoveryService = new ErrorRecoveryService();
    jest.clearAllMocks();
  });

  it('should provide fallback strategies for unrecoverable errors', () => {
    const error: AuthError = {
      type: AuthErrorType.AUTHENTICATION,
      message: 'Invalid credentials',
      recoverable: false
    };

    const fallback = recoveryService.getFallbackStrategy(error);

    expect(fallback.action).toBe('redirect');
    expect(fallback.to).toBe('/auth');
    expect(fallback.message).toContain('Please log in again');
  });

  it('should provide retry strategies for recoverable errors', () => {
    const error: AuthError = {
      type: AuthErrorType.NETWORK,
      message: 'Network error',
      recoverable: true
    };

    const fallback = recoveryService.getFallbackStrategy(error);

    expect(fallback.action).toBe('retry');
    expect(fallback.canRetry).toBe(true);
    expect(fallback.retryAfter).toBeGreaterThan(0);
  });

  it('should provide user-friendly error messages', () => {
    const errors = [
      {
        type: AuthErrorType.NETWORK,
        message: 'fetch failed',
        expected: 'Connection problem. Please check your internet.'
      },
      {
        type: AuthErrorType.DATABASE,
        message: 'connection timeout',
        expected: 'Service temporarily unavailable. Please try again.'
      },
      {
        type: AuthErrorType.VALIDATION,
        message: 'email invalid',
        expected: 'Please check your email format.'
      }
    ];

    errors.forEach(({ type, message, expected }) => {
      const error: AuthError = { type, message, recoverable: true };
      const fallback = recoveryService.getFallbackStrategy(error);
      
      expect(fallback.userMessage).toContain(expected.split('.')[0]);
    });
  });

  it('should track error frequency for monitoring', () => {
    const error: AuthError = {
      type: AuthErrorType.NETWORK,
      message: 'Network error',
      recoverable: true
    };

    recoveryService.recordError(error);
    recoveryService.recordError(error);
    recoveryService.recordError(error);

    const stats = recoveryService.getErrorStats();

    expect(stats.network).toBe(3);
    expect(stats.total).toBe(3);
    expect(stats.mostFrequent).toBe(AuthErrorType.NETWORK);
  });
});

// ============================================================================
// TESTES DE INTEGRAÇÃO
// ============================================================================

describe('Error Recovery Integration', () => {
  let recoveryService: ErrorRecoveryService;

  beforeEach(() => {
    recoveryService = new ErrorRecoveryService();
    jest.clearAllMocks();
  });

  it('should handle complete recovery flow', async () => {
    const originalError = new Error('Connection failed');
    
    // Classify error
    const classifiedError = recoveryService.classifyError(originalError);
    expect(classifiedError.type).toBe(AuthErrorType.DATABASE);
    expect(classifiedError.recoverable).toBe(true);

    // Mock successful recovery
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });

    // Attempt recovery
    const recoveryResult = await recoveryService.attemptRecovery(classifiedError);
    
    expect(recoveryResult.success).toBe(true);
    expect(recoveryResult.strategy).toBe('database_reconnect');
  });

  it('should escalate to fallback when recovery fails', async () => {
    const originalError = new Error('Persistent network error');
    
    const classifiedError = recoveryService.classifyError(originalError);
    
    // Mock failed recovery
    mockSupabase.auth.getUser.mockRejectedValue(new Error('Still failing'));

    const recoveryResult = await recoveryService.attemptRecovery(classifiedError);
    expect(recoveryResult.success).toBe(false);

    // Get fallback strategy
    const fallback = recoveryService.getFallbackStrategy(classifiedError);
    expect(fallback.action).toBe('retry');
    expect(fallback.canRetry).toBe(true);
  });

  it('should provide comprehensive error reporting', async () => {
    const errors = [
      new Error('Network error'),
      new Error('Database timeout'),
      new Error('Invalid credentials'),
      new Error('Permission denied')
    ];

    for (const error of errors) {
      const classified = recoveryService.classifyError(error);
      recoveryService.recordError(classified);
      
      if (classified.recoverable) {
        await recoveryService.attemptRecovery(classified);
      }
    }

    const report = recoveryService.generateErrorReport();

    expect(report.totalErrors).toBe(4);
    expect(report.recoverableErrors).toBe(2);
    expect(report.successfulRecoveries).toBeGreaterThanOrEqual(0);
    expect(report.errorsByType).toHaveProperty(AuthErrorType.NETWORK);
    expect(report.errorsByType).toHaveProperty(AuthErrorType.DATABASE);
    expect(report.errorsByType).toHaveProperty(AuthErrorType.AUTHENTICATION);
    expect(report.errorsByType).toHaveProperty(AuthErrorType.AUTHORIZATION);
  });
});