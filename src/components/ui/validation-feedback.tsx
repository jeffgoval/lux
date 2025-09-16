/**
 * Validation feedback components
 * Provides consistent UI feedback for validation results
 */

import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationFeedbackProps {
  isValid?: boolean;
  isValidating?: boolean;
  errors?: string[];
  className?: string;
  showSuccess?: boolean;
}

export const ValidationFeedback: React.FC<ValidationFeedbackProps> = ({
  isValid,
  isValidating,
  errors = [],
  className,
  showSuccess = true
}) => {
  if (isValidating) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Validando...</span>
      </div>
    );
  }

  if (errors.length > 0) {
    return (
      <div className={cn("space-y-1", className)}>
        {errors.map((error, index) => (
          <div key={index} className="flex items-center gap-2 text-sm text-destructive">
            <XCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ))}
      </div>
    );
  }

  if (isValid && showSuccess) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-green-600", className)}>
        <CheckCircle className="h-4 w-4" />
        <span>Válido</span>
      </div>
    );
  }

  return null;
};

interface FieldValidationProps {
  label: string;
  isValid?: boolean;
  isValidating?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export const FieldValidation: React.FC<FieldValidationProps> = ({
  label,
  isValid,
  isValidating,
  error,
  className,
  children
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
      </label>
      {children}
      {(isValidating || error || isValid) && (
        <ValidationFeedback
          isValid={isValid}
          isValidating={isValidating}
          errors={error ? [error] : []}
          showSuccess={true}
        />
      )}
    </div>
  );
};

interface ValidationSummaryProps {
  title?: string;
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  className?: string;
}

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  title = "Validação",
  isValid,
  errors,
  warnings = [],
  className
}) => {
  if (isValid && warnings.length === 0) {
    return (
      <div className={cn("rounded-lg border border-green-200 bg-green-50 p-4", className)}>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <h3 className="font-medium text-green-800">{title} - Todos os dados são válidos</h3>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <h3 className="font-medium text-red-800">Erros de Validação</h3>
          </div>
          <ul className="space-y-1 text-sm text-red-700">
            {errors.map((error, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-red-400">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <h3 className="font-medium text-yellow-800">Avisos</h3>
          </div>
          <ul className="space-y-1 text-sm text-yellow-700">
            {warnings.map((warning, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-yellow-400">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

interface InlineValidationProps {
  isValid?: boolean;
  isValidating?: boolean;
  error?: string;
  size?: 'sm' | 'md';
}

export const InlineValidation: React.FC<InlineValidationProps> = ({
  isValid,
  isValidating,
  error,
  size = 'sm'
}) => {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  if (isValidating) {
    return <Loader2 className={cn(iconSize, "animate-spin text-muted-foreground")} />;
  }

  if (error) {
    return <XCircle className={cn(iconSize, "text-destructive")} />;
  }

  if (isValid) {
    return <CheckCircle className={cn(iconSize, "text-green-600")} />;
  }

  return null;
};

// Progress indicator for multi-step validation
interface ValidationProgressProps {
  steps: Array<{
    name: string;
    isValid?: boolean;
    isValidating?: boolean;
    errors?: string[];
  }>;
  className?: string;
}

export const ValidationProgress: React.FC<ValidationProgressProps> = ({
  steps,
  className
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-3 p-2 rounded-lg border">
          <div className="flex-shrink-0">
            <InlineValidation
              isValid={step.isValid}
              isValidating={step.isValidating}
              error={step.errors?.[0]}
              size="md"
            />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">{step.name}</div>
            {step.errors && step.errors.length > 0 && (
              <div className="text-xs text-destructive mt-1">
                {step.errors[0]}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};