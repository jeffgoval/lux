export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  timeout?: number;
}

export const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
  backoffMultiplier: 2,
  timeout: 10000
};

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const finalConfig = { ...defaultRetryConfig, ...config };
  const startTime = Date.now();
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      // Add timeout wrapper if specified
      let result: T;
      if (finalConfig.timeout) {
        result = await Promise.race([
          fn(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), finalConfig.timeout)
          )
        ]);
      } else {
        result = await fn();
      }

      return {
        success: true,
        data: result,
        attempts: attempt + 1,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If this was the last attempt, don't wait
      if (attempt === finalConfig.maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
        finalConfig.maxDelay
      );

      console.log(`Retry attempt ${attempt + 1} failed, waiting ${delay}ms before retry:`, lastError.message);
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: finalConfig.maxRetries + 1,
    totalTime: Date.now() - startTime
  };
}

/**
 * Retry specifically for Supabase operations
 */
export async function retrySupabaseOperation<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  return retryWithBackoff(async () => {
    const { data, error } = await operation();
    
    if (error) {
      throw new Error(`Supabase error: ${error.message || error}`);
    }
    
    return data;
  }, config);
}

/**
 * Retry with different strategies based on error type
 */
export async function retryWithStrategy<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  shouldRetry?: (error: Error, attempt: number) => boolean
): Promise<RetryResult<T>> {
  const finalConfig = { ...defaultRetryConfig, ...config };
  const startTime = Date.now();
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const result = await fn();
      return {
        success: true,
        data: result,
        attempts: attempt + 1,
        totalTime: Date.now() - startTime
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry based on custom logic
      if (shouldRetry && !shouldRetry(lastError, attempt)) {
        console.log(`Custom retry logic says don't retry for error:`, lastError.message);
        break;
      }
      
      // If this was the last attempt, don't wait
      if (attempt === finalConfig.maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const baseDelay = finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt);
      const jitter = Math.random() * 0.1 * baseDelay; // Add up to 10% jitter
      const delay = Math.min(baseDelay + jitter, finalConfig.maxDelay);

      console.log(`Retry attempt ${attempt + 1} failed, waiting ${Math.round(delay)}ms before retry:`, lastError.message);
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: finalConfig.maxRetries + 1,
    totalTime: Date.now() - startTime
  };
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Network errors are usually retryable
  if (message.includes('network') || 
      message.includes('timeout') || 
      message.includes('connection') ||
      message.includes('fetch')) {
    return true;
  }
  
  // Supabase specific retryable errors
  if (message.includes('pgrst116')) { // Not found - might be temporary
    return true;
  }
  
  // Rate limiting
  if (message.includes('rate limit') || message.includes('429')) {
    return true;
  }
  
  // Server errors (5xx)
  if (message.includes('500') || 
      message.includes('502') || 
      message.includes('503') || 
      message.includes('504')) {
    return true;
  }
  
  return false;
}

/**
 * Create a retry configuration for different scenarios
 */
export const retryConfigs = {
  // Fast retry for critical operations
  critical: {
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 3000,
    backoffMultiplier: 1.5,
    timeout: 8000
  },
  
  // Standard retry for normal operations
  standard: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
    timeout: 10000
  },
  
  // Patient retry for background operations
  background: {
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 8000,
    backoffMultiplier: 2.5,
    timeout: 15000
  },
  
  // Quick retry for UI operations
  ui: {
    maxRetries: 2,
    baseDelay: 300,
    maxDelay: 1500,
    backoffMultiplier: 2,
    timeout: 5000
  }
};

/**
 * Utility to create a retryable version of any async function
 */
export function makeRetryable<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  config: Partial<RetryConfig> = {}
) {
  return async (...args: T): Promise<R> => {
    const result = await retryWithBackoff(() => fn(...args), config);
    
    if (result.success) {
      return result.data!;
    } else {
      throw result.error || new Error('Retry failed');
    }
  };
}