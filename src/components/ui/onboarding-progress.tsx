/**
 * 📊 COMPONENTE DE PROGRESSO DO ONBOARDING
 * 
 * Progress bar visual com steps e feedback detalhado
 */

import React from 'react';
import { Check, Circle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type OnboardingStep = 
  | 'personal_data'
  | 'clinic_setup'
  | 'professional_setup'
  | 'service_setup'
  | 'configuration'
  | 'completion';

export type StepStatus = 'pending' | 'current' | 'loading' | 'completed' | 'error';

interface Step {
  id: OnboardingStep;
  title: string;
  description: string;
  status: StepStatus;
  estimatedTime?: string;
}

interface OnboardingProgressProps {
  currentStep: OnboardingStep;
  steps: Step[];
  className?: string;
  showEstimatedTime?: boolean;
  showDescriptions?: boolean;
  compact?: boolean;
}

interface ProgressStepProps {
  step: Step;
  isLast: boolean;
  compact: boolean;
  showEstimatedTime: boolean;
  showDescriptions: boolean;
}

// ============================================================================
// CONFIGURAÇÃO DOS STEPS
// ============================================================================

export const DEFAULT_ONBOARDING_STEPS: Step[] = [
  {
    id: 'personal_data',
    title: 'Dados Pessoais',
    description: 'Informações básicas do seu perfil',
    status: 'pending',
    estimatedTime: '1 min'
  },
  {
    id: 'clinic_setup',
    title: 'Configurar Clínica',
    description: 'Dados da sua clínica estética',
    status: 'pending',
    estimatedTime: '2 min'
  },
  {
    id: 'professional_setup',
    title: 'Perfil Profissional',
    description: 'Suas especialidades e experiência',
    status: 'pending',
    estimatedTime: '2 min'
  },
  {
    id: 'service_setup',
    title: 'Serviços Oferecidos',
    description: 'Procedimentos que você realiza',
    status: 'pending',
    estimatedTime: '3 min'
  },
  {
    id: 'configuration',
    title: 'Configurações Finais',
    description: 'Ajustes e preferências do sistema',
    status: 'pending',
    estimatedTime: '1 min'
  },
  {
    id: 'completion',
    title: 'Finalização',
    description: 'Revisão e ativação da conta',
    status: 'pending',
    estimatedTime: '1 min'
  }
];

// ============================================================================
// COMPONENTE DE STEP INDIVIDUAL
// ============================================================================

function ProgressStep({
  step,
  isLast,
  compact,
  showEstimatedTime,
  showDescriptions
}: ProgressStepProps) {
  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return <Check className="w-4 h-4 text-white" />;
      case 'current':
        return <Circle className="w-4 h-4 text-white fill-current" />;
      case 'loading':
        return <Loader2 className="w-4 h-4 text-white animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-white" />;
      case 'pending':
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStepColors = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return {
          circle: 'bg-green-500 border-green-500',
          line: 'bg-green-500',
          text: 'text-green-700',
          description: 'text-green-600'
        };
      case 'current':
        return {
          circle: 'bg-blue-500 border-blue-500 ring-4 ring-blue-100',
          line: 'bg-gray-300',
          text: 'text-blue-700 font-semibold',
          description: 'text-blue-600'
        };
      case 'loading':
        return {
          circle: 'bg-blue-500 border-blue-500 ring-4 ring-blue-100',
          line: 'bg-gray-300',
          text: 'text-blue-700 font-semibold',
          description: 'text-blue-600'
        };
      case 'error':
        return {
          circle: 'bg-red-500 border-red-500',
          line: 'bg-gray-300',
          text: 'text-red-700',
          description: 'text-red-600'
        };
      case 'pending':
      default:
        return {
          circle: 'bg-gray-200 border-gray-300',
          line: 'bg-gray-300',
          text: 'text-gray-500',
          description: 'text-gray-400'
        };
    }
  };

  const colors = getStepColors(step.status);

  return (
    <div className="relative flex items-start">
      {/* Step Circle */}
      <div className="flex-shrink-0 relative">
        <div
          className={cn(
            'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200',
            colors.circle
          )}
        >
          {getStepIcon(step.status)}
        </div>
        
        {/* Connecting Line */}
        {!isLast && (
          <div
            className={cn(
              'absolute top-8 left-4 w-0.5 h-12 transition-all duration-200',
              compact ? 'h-8' : 'h-12',
              colors.line
            )}
          />
        )}
      </div>

      {/* Step Content */}
      <div className="ml-4 flex-1 pb-8">
        <div className="flex items-center gap-2">
          <h3 className={cn('text-sm font-medium transition-colors', colors.text)}>
            {step.title}
          </h3>
          
          {showEstimatedTime && step.estimatedTime && step.status === 'pending' && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              {step.estimatedTime}
            </span>
          )}
          
          {step.status === 'loading' && (
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded animate-pulse">
              Processando...
            </span>
          )}
        </div>
        
        {showDescriptions && !compact && (
          <p className={cn('text-sm mt-1 transition-colors', colors.description)}>
            {step.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function OnboardingProgress({
  currentStep,
  steps,
  className,
  showEstimatedTime = true,
  showDescriptions = true,
  compact = false
}: OnboardingProgressProps) {
  // Calcular progresso geral
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  // Calcular tempo estimado restante
  const remainingSteps = steps.filter(step => 
    step.status === 'pending' || step.status === 'current'
  );
  const estimatedTimeRemaining = remainingSteps.reduce((total, step) => {
    if (step.estimatedTime) {
      const minutes = parseInt(step.estimatedTime.replace(/\D/g, ''));
      return total + minutes;
    }
    return total;
  }, 0);

  return (
    <div className={cn('bg-white rounded-lg border p-6', className)}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Configuração da Conta
          </h2>
          <span className="text-sm text-gray-500">
            {completedSteps} de {totalSteps} concluídos
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {/* Time Estimate */}
        {showEstimatedTime && estimatedTimeRemaining > 0 && (
          <p className="text-sm text-gray-600">
            Tempo estimado restante: ~{estimatedTimeRemaining} minutos
          </p>
        )}
      </div>

      {/* Steps List */}
      <div className="space-y-0">
        {steps.map((step, index) => (
          <ProgressStep
            key={step.id}
            step={step}
            isLast={index === steps.length - 1}
            compact={compact}
            showEstimatedTime={showEstimatedTime}
            showDescriptions={showDescriptions}
          />
        ))}
      </div>

      {/* Footer */}
      {completedSteps === totalSteps && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">
              Configuração concluída com sucesso!
            </span>
          </div>
          <p className="text-green-700 text-sm mt-1">
            Sua conta está pronta para uso. Você será redirecionado em instantes.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HOOK PARA GERENCIAR PROGRESSO
// ============================================================================

export function useOnboardingProgress(initialSteps: Step[] = DEFAULT_ONBOARDING_STEPS) {
  const [steps, setSteps] = React.useState<Step[]>(initialSteps);

  const updateStepStatus = (stepId: OnboardingStep, status: StepStatus) => {
    setSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId ? { ...step, status } : step
      )
    );
  };

  const setCurrentStep = (stepId: OnboardingStep) => {
    setSteps(prevSteps =>
      prevSteps.map(step => {
        if (step.id === stepId) {
          return { ...step, status: 'current' };
        } else if (step.status === 'current') {
          return { ...step, status: 'pending' };
        }
        return step;
      })
    );
  };

  const completeStep = (stepId: OnboardingStep) => {
    updateStepStatus(stepId, 'completed');
  };

  const setStepLoading = (stepId: OnboardingStep) => {
    updateStepStatus(stepId, 'loading');
  };

  const setStepError = (stepId: OnboardingStep) => {
    updateStepStatus(stepId, 'error');
  };

  const getCurrentStep = (): Step | undefined => {
    return steps.find(step => step.status === 'current');
  };

  const getProgress = () => {
    const completed = steps.filter(step => step.status === 'completed').length;
    return {
      completed,
      total: steps.length,
      percentage: (completed / steps.length) * 100
    };
  };

  const isComplete = () => {
    return steps.every(step => step.status === 'completed');
  };

  return {
    steps,
    updateStepStatus,
    setCurrentStep,
    completeStep,
    setStepLoading,
    setStepError,
    getCurrentStep,
    getProgress,
    isComplete
  };
}