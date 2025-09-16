import { 
  OnboardingStep, 
  OnboardingData, 
  OnboardingState, 
  OnboardingStepConfig,
  OnboardingNavigation,
  StepValidation
} from '@/types/onboarding';
import { User, Building2, Users, Star, Clock, CheckCircle } from 'lucide-react';

// Default onboarding data
export const createDefaultOnboardingData = (): OnboardingData => ({
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
});

// Step configurations with validation logic
export const ONBOARDING_STEPS: Record<OnboardingStep, OnboardingStepConfig> = {
  [OnboardingStep.PERSONAL_DATA]: {
    id: OnboardingStep.PERSONAL_DATA,
    title: 'Dados Pessoais',
    description: 'Vamos começar coletando algumas informações básicas sobre você.',
    icon: User,
    validate: (data: OnboardingData): StepValidation => {
      const errors: Record<string, string> = {};
      const requiredFields = ['nomeCompleto', 'telefone', 'especialidade'];

      if (!data.nomeCompleto?.trim()) {
        errors.nomeCompleto = 'Nome completo é obrigatório';
      }
      if (!data.telefone?.trim()) {
        errors.telefone = 'Telefone é obrigatório';
      }
      if (!data.especialidade?.trim()) {
        errors.especialidade = 'Especialidade é obrigatória';
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
        requiredFields
      };
    },
    canNavigateFrom: true,
    canNavigateTo: true
  },

  [OnboardingStep.CLINIC_SETUP]: {
    id: OnboardingStep.CLINIC_SETUP,
    title: 'Sua Clínica',
    description: 'Vamos começar entendendo sua estrutura clínica atual.',
    icon: Building2,
    validate: (data: OnboardingData): StepValidation => {
      const errors: Record<string, string> = {};
      const requiredFields = ['nomeClinica', 'enderecoCidade', 'enderecoEstado'];

      if (!data.nomeClinica?.trim()) {
        errors.nomeClinica = 'Nome da clínica é obrigatório';
      }
      if (!data.enderecoCidade?.trim()) {
        errors.enderecoCidade = 'Cidade é obrigatória';
      }
      if (!data.enderecoEstado?.trim()) {
        errors.enderecoEstado = 'Estado é obrigatório';
      }

      // Additional validation for multiple clinics
      if (data.temMultiplasClinicas && !data.nomeRede?.trim()) {
        errors.nomeRede = 'Nome da rede é obrigatório quando possui múltiplas clínicas';
        requiredFields.push('nomeRede');
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
        requiredFields
      };
    },
    canNavigateFrom: true,
    canNavigateTo: true
  },

  [OnboardingStep.PROFESSIONAL_SETUP]: {
    id: OnboardingStep.PROFESSIONAL_SETUP,
    title: 'Primeiro Profissional',
    description: 'Vamos cadastrar o primeiro profissional da clínica.',
    icon: Users,
    validate: (data: OnboardingData): StepValidation => {
      const errors: Record<string, string> = {};
      const requiredFields: string[] = [];

      if (!data.souEuMesma) {
        if (!data.nomeProfissional?.trim()) {
          errors.nomeProfissional = 'Nome do profissional é obrigatório';
          requiredFields.push('nomeProfissional');
        }
        if (!data.especialidadeProfissional?.trim()) {
          errors.especialidadeProfissional = 'Especialidade do profissional é obrigatória';
          requiredFields.push('especialidadeProfissional');
        }
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
        requiredFields
      };
    },
    canNavigateFrom: true,
    canNavigateTo: true
  },

  [OnboardingStep.SERVICE_SETUP]: {
    id: OnboardingStep.SERVICE_SETUP,
    title: 'Primeiro Serviço',
    description: 'Vamos cadastrar o primeiro serviço oferecido pela clínica.',
    icon: Star,
    validate: (data: OnboardingData): StepValidation => {
      const errors: Record<string, string> = {};
      const requiredFields = ['nomeServico', 'duracaoServico', 'precoServico'];

      if (!data.nomeServico?.trim()) {
        errors.nomeServico = 'Nome do serviço é obrigatório';
      }
      if (!data.duracaoServico || data.duracaoServico <= 0) {
        errors.duracaoServico = 'Duração deve ser maior que zero';
      }
      if (!data.precoServico?.trim()) {
        errors.precoServico = 'Preço do serviço é obrigatório';
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
        requiredFields
      };
    },
    canNavigateFrom: true,
    canNavigateTo: true
  },

  [OnboardingStep.CONFIGURATION]: {
    id: OnboardingStep.CONFIGURATION,
    title: 'Configurações',
    description: 'Por último, vamos definir os horários de funcionamento da clínica.',
    icon: Clock,
    validate: (data: OnboardingData): StepValidation => {
      const errors: Record<string, string> = {};
      const requiredFields = ['horarioInicio', 'horarioFim'];

      if (!data.horarioInicio?.trim()) {
        errors.horarioInicio = 'Horário de início é obrigatório';
      }
      if (!data.horarioFim?.trim()) {
        errors.horarioFim = 'Horário de fim é obrigatório';
      }

      // Validate time format and logic
      if (data.horarioInicio && data.horarioFim) {
        const inicio = new Date(`2000-01-01T${data.horarioInicio}:00`);
        const fim = new Date(`2000-01-01T${data.horarioFim}:00`);
        
        if (inicio >= fim) {
          errors.horarioFim = 'Horário de fim deve ser posterior ao horário de início';
        }
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
        requiredFields
      };
    },
    canNavigateFrom: true,
    canNavigateTo: true
  },

  [OnboardingStep.COMPLETION]: {
    id: OnboardingStep.COMPLETION,
    title: 'Finalização',
    description: 'Finalizando a configuração da sua clínica.',
    icon: CheckCircle,
    validate: (): StepValidation => ({
      isValid: true,
      errors: {},
      requiredFields: []
    }),
    canNavigateFrom: false,
    canNavigateTo: false
  }
};

// Step order for navigation
const STEP_ORDER: OnboardingStep[] = [
  OnboardingStep.PERSONAL_DATA,
  OnboardingStep.CLINIC_SETUP,
  OnboardingStep.PROFESSIONAL_SETUP,
  OnboardingStep.SERVICE_SETUP,
  OnboardingStep.CONFIGURATION,
  OnboardingStep.COMPLETION
];

export class OnboardingStateMachine {
  private state: OnboardingState;
  private listeners: Array<(state: OnboardingState) => void> = [];

  constructor(initialState?: Partial<OnboardingState>) {
    this.state = {
      currentStep: OnboardingStep.PERSONAL_DATA,
      data: createDefaultOnboardingData(),
      isLoading: false,
      error: null,
      canProceed: false,
      validationErrors: {},
      isTransitioning: false,
      ...initialState
    };

    this.validateCurrentStep();
  }

  // State getters
  getCurrentState(): OnboardingState {
    return { ...this.state };
  }

  getCurrentStep(): OnboardingStep {
    return this.state.currentStep;
  }

  getData(): OnboardingData {
    return { ...this.state.data };
  }

  getStepConfig(step?: OnboardingStep): OnboardingStepConfig {
    return ONBOARDING_STEPS[step || this.state.currentStep];
  }

  // Navigation methods
  getNavigation(): OnboardingNavigation {
    const currentIndex = STEP_ORDER.indexOf(this.state.currentStep);
    const canGoPrevious = currentIndex > 0 && !this.state.isTransitioning;
    const canGoNext = this.state.canProceed && currentIndex < STEP_ORDER.length - 1 && !this.state.isTransitioning;

    return {
      canGoNext,
      canGoPrevious,
      nextStep: canGoNext ? STEP_ORDER[currentIndex + 1] : null,
      previousStep: canGoPrevious ? STEP_ORDER[currentIndex - 1] : null
    };
  }

  canNavigateToStep(targetStep: OnboardingStep): boolean {
    const targetIndex = STEP_ORDER.indexOf(targetStep);
    const currentIndex = STEP_ORDER.indexOf(this.state.currentStep);
    
    // Can only navigate backwards or to the next step if current is valid
    return targetIndex <= currentIndex || (targetIndex === currentIndex + 1 && this.state.canProceed);
  }

  // State mutations
  updateData(updates: Partial<OnboardingData>): void {
    this.state = {
      ...this.state,
      data: { ...this.state.data, ...updates },
      persistedAt: new Date()
    };
    
    this.validateCurrentStep();
    this.notifyListeners();
  }

  setLoading(isLoading: boolean): void {
    this.state = { ...this.state, isLoading };
    this.notifyListeners();
  }

  setError(error: string | null): void {
    this.state = { ...this.state, error };
    this.notifyListeners();
  }

  // Step navigation
  async goToStep(targetStep: OnboardingStep): Promise<boolean> {
    if (!this.canNavigateToStep(targetStep) || this.state.isTransitioning) {
      return false;
    }

    this.state = { ...this.state, isTransitioning: true };
    this.notifyListeners();

    try {
      // Validate current step before leaving (if moving forward)
      const currentIndex = STEP_ORDER.indexOf(this.state.currentStep);
      const targetIndex = STEP_ORDER.indexOf(targetStep);
      
      if (targetIndex > currentIndex && !this.state.canProceed) {
        throw new Error('Cannot proceed from current step due to validation errors');
      }

      this.state = {
        ...this.state,
        currentStep: targetStep,
        isTransitioning: false,
        error: null
      };

      this.validateCurrentStep();
      this.notifyListeners();
      return true;
    } catch (error) {
      this.state = {
        ...this.state,
        isTransitioning: false,
        error: error instanceof Error ? error.message : 'Navigation failed'
      };
      this.notifyListeners();
      return false;
    }
  }

  async goNext(): Promise<boolean> {
    const navigation = this.getNavigation();
    if (!navigation.canGoNext || !navigation.nextStep) {
      return false;
    }
    return this.goToStep(navigation.nextStep);
  }

  async goPrevious(): Promise<boolean> {
    const navigation = this.getNavigation();
    if (!navigation.canGoPrevious || !navigation.previousStep) {
      return false;
    }
    return this.goToStep(navigation.previousStep);
  }

  // Validation
  private validateCurrentStep(): void {
    const stepConfig = this.getStepConfig();
    const validation = stepConfig.validate(this.state.data);
    
    this.state = {
      ...this.state,
      canProceed: validation.isValid,
      validationErrors: validation.errors
    };
  }

  validateStep(step: OnboardingStep): StepValidation {
    const stepConfig = ONBOARDING_STEPS[step];
    return stepConfig.validate(this.state.data);
  }

  validateAllSteps(): Record<OnboardingStep, StepValidation> {
    const results: Record<OnboardingStep, StepValidation> = {} as any;
    
    for (const step of STEP_ORDER) {
      if (step !== OnboardingStep.COMPLETION) {
        results[step] = this.validateStep(step);
      }
    }
    
    return results;
  }

  // Progress tracking
  getProgress(): { current: number; total: number; percentage: number } {
    const currentIndex = STEP_ORDER.indexOf(this.state.currentStep);
    const total = STEP_ORDER.length - 1; // Exclude completion step from progress
    const current = Math.min(currentIndex + 1, total);
    const percentage = (current / total) * 100;

    return { current, total, percentage };
  }

  // Event handling
  subscribe(listener: (state: OnboardingState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Persistence helpers
  serialize(): string {
    return JSON.stringify({
      ...this.state,
      persistedAt: new Date().toISOString()
    });
  }

  static deserialize(serialized: string): OnboardingStateMachine {
    try {
      const state = JSON.parse(serialized);
      return new OnboardingStateMachine({
        ...state,
        persistedAt: state.persistedAt ? new Date(state.persistedAt) : undefined
      });
    } catch (error) {
      throw new Error('Failed to deserialize onboarding state');
    }
  }

  // Reset state
  reset(): void {
    this.state = {
      currentStep: OnboardingStep.PERSONAL_DATA,
      data: createDefaultOnboardingData(),
      isLoading: false,
      error: null,
      canProceed: false,
      validationErrors: {},
      isTransitioning: false
    };
    
    this.validateCurrentStep();
    this.notifyListeners();
  }
}