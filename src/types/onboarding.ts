// Onboarding State Machine Types
export enum OnboardingStep {
  PERSONAL_DATA = 'personal_data',
  CLINIC_SETUP = 'clinic_setup',
  PROFESSIONAL_SETUP = 'professional_setup',
  SERVICE_SETUP = 'service_setup',
  CONFIGURATION = 'configuration',
  COMPLETION = 'completion'
}

export interface OnboardingData {
  // Dados pessoais
  nomeCompleto: string;
  telefone: string;
  especialidade: string;

  // Multiple clinics question
  temMultiplasClinicas: boolean;

  // Rede de clínicas (only if multiple clinics)
  nomeRede: string;
  cnpjRede: string;

  // Dados da clínica
  nomeClinica: string;
  cnpj: string;
  enderecoRua: string;
  enderecoNumero: string;
  enderecoComplemento: string;
  enderecoBairro: string;
  enderecoCidade: string;
  enderecoEstado: string;
  enderecoCep: string;
  telefoneClinica: string;
  emailClinica: string;

  // Primeiro profissional
  souEuMesma: boolean;
  nomeProfissional: string;
  emailProfissional: string;
  especialidadeProfissional: string;

  // Primeiro serviço
  nomeServico: string;
  duracaoServico: number;
  precoServico: string;
  descricaoServico: string;

  // Configurações básicas
  horarioInicio: string;
  horarioFim: string;
}

export interface OnboardingState {
  currentStep: OnboardingStep;
  data: OnboardingData;
  isLoading: boolean;
  error: string | null;
  canProceed: boolean;
  validationErrors: Record<string, string>;
  isTransitioning: boolean;
  persistedAt?: Date;
}

export interface StepValidation {
  isValid: boolean;
  errors: Record<string, string>;
  requiredFields: string[];
}

export interface OnboardingStepConfig {
  id: OnboardingStep;
  title: string;
  description: string;
  icon: any;
  validate: (data: OnboardingData) => StepValidation;
  canNavigateFrom: boolean;
  canNavigateTo: boolean;
}

export interface OnboardingNavigation {
  canGoNext: boolean;
  canGoPrevious: boolean;
  nextStep: OnboardingStep | null;
  previousStep: OnboardingStep | null;
}

export interface OnboardingPersistence {
  save: (state: OnboardingState) => Promise<void>;
  load: () => Promise<OnboardingState | null>;
  clear: () => Promise<void>;
}