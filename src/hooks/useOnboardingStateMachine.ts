import { useState, useEffect, useCallback, useRef } from 'react';
import { OnboardingStateMachine } from '@/services/onboarding-state-machine';
import { OnboardingPersistenceService } from '@/services/onboarding-persistence';
import { 
  OnboardingStep, 
  OnboardingData, 
  OnboardingState, 
  OnboardingNavigation,
  StepValidation 
} from '@/types/onboarding';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { authLogger } from '@/utils/logger';

interface UseOnboardingStateMachineReturn {
  // State
  state: OnboardingState;
  currentStep: OnboardingStep;
  data: OnboardingData;
  
  // Navigation
  navigation: OnboardingNavigation;
  progress: { current: number; total: number; percentage: number };
  
  // Actions
  updateData: (updates: Partial<OnboardingData>) => void;
  goNext: () => Promise<boolean>;
  goPrevious: () => Promise<boolean>;
  goToStep: (step: OnboardingStep) => Promise<boolean>;
  
  // Validation
  validateCurrentStep: () => StepValidation;
  validateStep: (step: OnboardingStep) => StepValidation;
  
  // Persistence
  saveState: () => Promise<void>;
  loadState: () => Promise<boolean>;
  clearState: () => Promise<void>;
  
  // Utility
  reset: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export function useOnboardingStateMachine(): UseOnboardingStateMachineReturn {
  const { user } = useUnifiedAuth();
  const stateMachineRef = useRef<OnboardingStateMachine | null>(null);
  const persistenceRef = useRef<OnboardingPersistenceService | null>(null);
  const [state, setState] = useState<OnboardingState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize state machine and persistence
  useEffect(() => {
    if (!stateMachineRef.current) {
      stateMachineRef.current = new OnboardingStateMachine();
      persistenceRef.current = OnboardingPersistenceService.create(user?.id);
      
      // Subscribe to state changes
      const unsubscribe = stateMachineRef.current.subscribe((newState) => {
        setState(newState);
        
        // Auto-save state changes (debounced)
        if (persistenceRef.current && newState.persistedAt) {
          persistenceRef.current.save(newState).catch((error) => {
            authLogger.error('Failed to auto-save onboarding state:', error);
          });
        }
      });

      // Set initial state
      setState(stateMachineRef.current.getCurrentState());
      setIsInitialized(true);

      return unsubscribe;
    }
  }, [user?.id]);

  // Auto-load persisted state on initialization
  useEffect(() => {
    if (isInitialized && persistenceRef.current && !state?.persistedAt) {
      loadState().catch((error) => {
        authLogger.error('Failed to load persisted onboarding state:', error);
      });
    }
  }, [isInitialized]);

  // Actions
  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    if (stateMachineRef.current) {
      stateMachineRef.current.updateData(updates);
    }
  }, []);

  const goNext = useCallback(async (): Promise<boolean> => {
    if (stateMachineRef.current) {
      return stateMachineRef.current.goNext();
    }
    return false;
  }, []);

  const goPrevious = useCallback(async (): Promise<boolean> => {
    if (stateMachineRef.current) {
      return stateMachineRef.current.goPrevious();
    }
    return false;
  }, []);

  const goToStep = useCallback(async (step: OnboardingStep): Promise<boolean> => {
    if (stateMachineRef.current) {
      return stateMachineRef.current.goToStep(step);
    }
    return false;
  }, []);

  const validateCurrentStep = useCallback((): StepValidation => {
    if (stateMachineRef.current) {
      return stateMachineRef.current.validateStep(stateMachineRef.current.getCurrentStep());
    }
    return { isValid: false, errors: {}, requiredFields: [] };
  }, []);

  const validateStep = useCallback((step: OnboardingStep): StepValidation => {
    if (stateMachineRef.current) {
      return stateMachineRef.current.validateStep(step);
    }
    return { isValid: false, errors: {}, requiredFields: [] };
  }, []);

  const saveState = useCallback(async (): Promise<void> => {
    if (persistenceRef.current && stateMachineRef.current) {
      const currentState = stateMachineRef.current.getCurrentState();
      await persistenceRef.current.save(currentState);
    }
  }, []);

  const loadState = useCallback(async (): Promise<boolean> => {
    if (persistenceRef.current && stateMachineRef.current) {
      try {
        const persistedState = await persistenceRef.current.load();
        if (persistedState) {
          // Create new state machine with persisted state
          const newStateMachine = new OnboardingStateMachine(persistedState);
          
          // Update refs
          stateMachineRef.current = newStateMachine;
          
          // Subscribe to new state machine
          const unsubscribe = newStateMachine.subscribe((newState) => {
            setState(newState);
          });

          // Set initial state
          setState(newStateMachine.getCurrentState());
          
          authLogger.debug('Onboarding state loaded from persistence');
          return true;
        }
      } catch (error) {
        authLogger.error('Failed to load onboarding state:', error);
      }
    }
    return false;
  }, []);

  const clearState = useCallback(async (): Promise<void> => {
    if (persistenceRef.current) {
      await persistenceRef.current.clear();
    }
    if (stateMachineRef.current) {
      stateMachineRef.current.reset();
    }
  }, []);

  const reset = useCallback(() => {
    if (stateMachineRef.current) {
      stateMachineRef.current.reset();
    }
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    if (stateMachineRef.current) {
      stateMachineRef.current.setLoading(loading);
    }
  }, []);

  const setError = useCallback((error: string | null) => {
    if (stateMachineRef.current) {
      stateMachineRef.current.setError(error);
    }
  }, []);

  // Computed values
  const navigation = stateMachineRef.current?.getNavigation() || {
    canGoNext: false,
    canGoPrevious: false,
    nextStep: null,
    previousStep: null
  };

  const progress = stateMachineRef.current?.getProgress() || {
    current: 1,
    total: 5,
    percentage: 20
  };

  // Return default state if not initialized
  if (!state || !isInitialized) {
    return {
      state: {
        currentStep: OnboardingStep.PERSONAL_DATA,
        data: {
          nomeCompleto: '',
          telefone: '',
          especialidade: '',
          temMultiplasClinicas: false,
          nomeRede: '',
          cnpjRede: '',
          nomeClinica: '',
          cnpj: '',
          enderecoRua: '',
          enderecoNumero: '',
          enderecoComplemento: '',
          enderecoBairro: '',
          enderecoCidade: '',
          enderecoEstado: '',
          enderecoCep: '',
          telefoneClinica: '',
          emailClinica: '',
          souEuMesma: false,
          nomeProfissional: '',
          emailProfissional: '',
          especialidadeProfissional: '',
          nomeServico: '',
          duracaoServico: 60,
          precoServico: '',
          descricaoServico: '',
          horarioInicio: '08:00',
          horarioFim: '18:00',
        },
        isLoading: false,
        error: null,
        canProceed: false,
        validationErrors: {},
        isTransitioning: false
      },
      currentStep: OnboardingStep.PERSONAL_DATA,
      data: {} as OnboardingData,
      navigation,
      progress,
      updateData,
      goNext,
      goPrevious,
      goToStep,
      validateCurrentStep,
      validateStep,
      saveState,
      loadState,
      clearState,
      reset,
      setLoading,
      setError
    };
  }

  return {
    state,
    currentStep: state.currentStep,
    data: state.data,
    navigation,
    progress,
    updateData,
    goNext,
    goPrevious,
    goToStep,
    validateCurrentStep,
    validateStep,
    saveState,
    loadState,
    clearState,
    reset,
    setLoading,
    setError
  };
}