import { 
  retryWithBackoff, 
  retrySupabaseOperation, 
  isRetryableError, 
  retryConfigs,
  makeRetryable 
} from '@/utils/retryUtils';

describe('retryUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('retryWithBackoff', () => {
    it('succeeds on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await retryWithBackoff(mockFn);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and eventually succeeds', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');
      
      const result = await retryWithBackoff(mockFn, { maxRetries: 3, baseDelay: 10 });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('fails after max retries', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Persistent failure'));
      
      const result = await retryWithBackoff(mockFn, { maxRetries: 2, baseDelay: 10 });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Persistent failure');
      expect(result.attempts).toBe(3); // Initial attempt + 2 retries
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('respects timeout configuration', async () => {
      const mockFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      );
      
      const result = await retryWithBackoff(mockFn, { timeout: 100, maxRetries: 1 });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Operation timeout');
    });

    it('applies exponential backoff', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      const result = await retryWithBackoff(mockFn, { 
        maxRetries: 2, 
        baseDelay: 100, 
        backoffMultiplier: 2 
      });
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      // Should have waited at least 100ms + 200ms = 300ms
      expect(endTime - startTime).toBeGreaterThan(250);
    });

    it('respects max delay', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      const result = await retryWithBackoff(mockFn, { 
        maxRetries: 1, 
        baseDelay: 1000, 
        maxDelay: 200,
        backoffMultiplier: 2 
      });
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      // Should have waited max 200ms, not 1000ms
      expect(endTime - startTime).toBeLessThan(400);
    });
  });

  describe('retrySupabaseOperation', () => {
    it('handles successful Supabase response', async () => {
      const mockOperation = jest.fn().mockResolvedValue({
        data: { id: 1, name: 'test' },
        error: null
      });
      
      const result = await retrySupabaseOperation(mockOperation);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, name: 'test' });
    });

    it('handles Supabase error response', async () => {
      const mockOperation = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });
      
      const result = await retrySupabaseOperation(mockOperation);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Database error');
    });

    it('retries on Supabase errors', async () => {
      const mockOperation = jest.fn()
        .mockResolvedValueOnce({ data: null, error: { message: 'Temporary error' } })
        .mockResolvedValue({ data: { id: 1 }, error: null });
      
      const result = await retrySupabaseOperation(mockOperation, { maxRetries: 2, baseDelay: 10 });
      
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('isRetryableError', () => {
    it('identifies network errors as retryable', () => {
      expect(isRetryableError(new Error('Network error occurred'))).toBe(true);
      expect(isRetryableError(new Error('Connection timeout'))).toBe(true);
      expect(isRetryableError(new Error('Fetch failed'))).toBe(true);
    });

    it('identifies server errors as retryable', () => {
      expect(isRetryableError(new Error('500 Internal Server Error'))).toBe(true);
      expect(isRetryableError(new Error('502 Bad Gateway'))).toBe(true);
      expect(isRetryableError(new Error('503 Service Unavailable'))).toBe(true);
    });

    it('identifies rate limiting as retryable', () => {
      expect(isRetryableError(new Error('Rate limit exceeded'))).toBe(true);
      expect(isRetryableError(new Error('429 Too Many Requests'))).toBe(true);
    });

    it('identifies Supabase specific errors as retryable', () => {
      expect(isRetryableError(new Error('PGRST116 - Not found'))).toBe(true);
    });

    it('identifies non-retryable errors', () => {
      expect(isRetryableError(new Error('400 Bad Request'))).toBe(false);
      expect(isRetryableError(new Error('401 Unauthorized'))).toBe(false);
      expect(isRetryableError(new Error('403 Forbidden'))).toBe(false);
      expect(isRetryableError(new Error('Validation error'))).toBe(false);
    });
  });

  describe('retryConfigs', () => {
    it('provides different configurations for different scenarios', () => {
      expect(retryConfigs.critical.maxRetries).toBeGreaterThan(retryConfigs.ui.maxRetries);
      expect(retryConfigs.critical.baseDelay).toBeLessThan(retryConfigs.background.baseDelay);
      expect(retryConfigs.ui.timeout).toBeLessThan(retryConfigs.background.timeout);
    });

    it('has reasonable default values', () => {
      Object.values(retryConfigs).forEach(config => {
        expect(config.maxRetries).toBeGreaterThan(0);
        expect(config.baseDelay).toBeGreaterThan(0);
        expect(config.maxDelay).toBeGreaterThan(config.baseDelay);
        expect(config.backoffMultiplier).toBeGreaterThan(1);
        expect(config.timeout).toBeGreaterThan(0);
      });
    });
  });

  describe('makeRetryable', () => {
    it('creates a retryable version of a function', async () => {
      const originalFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');
      
      const retryableFn = makeRetryable(originalFn, { maxRetries: 2, baseDelay: 10 });
      
      const result = await retryableFn('arg1', 'arg2');
      
      expect(result).toBe('success');
      expect(originalFn).toHaveBeenCalledTimes(2);
      expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('throws error when retries are exhausted', async () => {
      const originalFn = jest.fn().mockRejectedValue(new Error('Persistent failure'));
      const retryableFn = makeRetryable(originalFn, { maxRetries: 1, baseDelay: 10 });
      
      await expect(retryableFn()).rejects.toThrow('Persistent failure');
      expect(originalFn).toHaveBeenCalledTimes(2);
    });

    it('preserves function arguments and return types', async () => {
      const originalFn = jest.fn((a: number, b: string) => `${a}-${b}`);
      const retryableFn = makeRetryable(originalFn);
      
      const result = await retryableFn(42, 'test');
      
      expect(result).toBe('42-test');
      expect(originalFn).toHaveBeenCalledWith(42, 'test');
    });
  });

  describe('Integration scenarios', () => {
    it('handles intermittent network failures', async () => {
      let callCount = 0;
      const mockFn = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('Network timeout');
        }
        return Promise.resolve('success');
      });
      
      const result = await retryWithBackoff(mockFn, retryConfigs.standard);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
    });

    it('handles database connection issues', async () => {
      const mockSupabaseOp = jest.fn()
        .mockResolvedValueOnce({ data: null, error: { message: 'Connection lost' } })
        .mockResolvedValueOnce({ data: null, error: { message: 'Connection lost' } })
        .mockResolvedValue({ data: { id: 1 }, error: null });
      
      const result = await retrySupabaseOperation(mockSupabaseOp, retryConfigs.critical);
      
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
    });

    it('respects timeout in real-world scenarios', async () => {
      const slowOperation = () => new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = await retryWithBackoff(slowOperation, { 
        timeout: 100, 
        maxRetries: 1,
        baseDelay: 10
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Operation timeout');
    });
  });
});