/**
 * Validation functions for fundamental enums
 * Provides type-safe validation and conversion utilities
 * Requirements: 1.1, 2.1, 3.1, 6.1
 */

import {
  TipoProcedimento,
  EspecialidadeMedica,
  CategoriaProduto,
  StatusProduto,
  TipoMovimentacao,
  UnidadeMedida,
  StatusProntuario,
  TipoImagem,
  StatusAgendamento,
  PrioridadeAgendamento,
  TipoNotificacao,
  StatusNotificacao,
  CanalComunicacao,
  TipoRelatorio,
  PeriodoRelatorio,
  MetodoPagamento,
  StatusPagamento
} from '../types/enums';

// Generic enum validator
function isValidEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value: string
): value is T[keyof T] {
  return Object.values(enumObject).includes(value as T[keyof T]);
}

// Specific validators for each enum
export const EnumValidators = {
  // Tipo Procedimento
  isTipoProcedimento: (value: string): value is TipoProcedimento => {
    return isValidEnumValue(TipoProcedimento, value);
  },

  // Especialidade Médica
  isEspecialidadeMedica: (value: string): value is EspecialidadeMedica => {
    return isValidEnumValue(EspecialidadeMedica, value);
  },

  // Categoria Produto
  isCategoriaProduto: (value: string): value is CategoriaProduto => {
    return isValidEnumValue(CategoriaProduto, value);
  },

  // Status Produto
  isStatusProduto: (value: string): value is StatusProduto => {
    return isValidEnumValue(StatusProduto, value);
  },

  // Tipo Movimentação
  isTipoMovimentacao: (value: string): value is TipoMovimentacao => {
    return isValidEnumValue(TipoMovimentacao, value);
  },

  // Unidade Medida
  isUnidadeMedida: (value: string): value is UnidadeMedida => {
    return isValidEnumValue(UnidadeMedida, value);
  },

  // Status Prontuário
  isStatusProntuario: (value: string): value is StatusProntuario => {
    return isValidEnumValue(StatusProntuario, value);
  },

  // Tipo Imagem
  isTipoImagem: (value: string): value is TipoImagem => {
    return isValidEnumValue(TipoImagem, value);
  },

  // Status Agendamento
  isStatusAgendamento: (value: string): value is StatusAgendamento => {
    return isValidEnumValue(StatusAgendamento, value);
  },

  // Prioridade Agendamento
  isPrioridadeAgendamento: (value: string): value is PrioridadeAgendamento => {
    return isValidEnumValue(PrioridadeAgendamento, value);
  },

  // Tipo Notificação
  isTipoNotificacao: (value: string): value is TipoNotificacao => {
    return isValidEnumValue(TipoNotificacao, value);
  },

  // Status Notificação
  isStatusNotificacao: (value: string): value is StatusNotificacao => {
    return isValidEnumValue(StatusNotificacao, value);
  },

  // Canal Comunicação
  isCanalComunicacao: (value: string): value is CanalComunicacao => {
    return isValidEnumValue(CanalComunicacao, value);
  },

  // Tipo Relatório
  isTipoRelatorio: (value: string): value is TipoRelatorio => {
    return isValidEnumValue(TipoRelatorio, value);
  },

  // Período Relatório
  isPeriodoRelatorio: (value: string): value is PeriodoRelatorio => {
    return isValidEnumValue(PeriodoRelatorio, value);
  },

  // Método Pagamento
  isMetodoPagamento: (value: string): value is MetodoPagamento => {
    return isValidEnumValue(MetodoPagamento, value);
  },

  // Status Pagamento
  isStatusPagamento: (value: string): value is StatusPagamento => {
    return isValidEnumValue(StatusPagamento, value);
  }
};

// Array validators for multiple values
export const ArrayValidators = {
  // Validate array of especialidades
  validateEspecialidades: (especialidades: string[]): EspecialidadeMedica[] => {
    const validEspecialidades: EspecialidadeMedica[] = [];
    const invalidValues: string[] = [];

    especialidades.forEach(esp => {
      if (EnumValidators.isEspecialidadeMedica(esp)) {
        validEspecialidades.push(esp);
      } else {
        invalidValues.push(esp);
      }
    });

    if (invalidValues.length > 0) {
      throw new Error(`Invalid especialidades: ${invalidValues.join(', ')}`);
    }

    return validEspecialidades;
  },

  // Validate array of tipos de procedimento
  validateTiposProcedimento: (tipos: string[]): TipoProcedimento[] => {
    const validTipos: TipoProcedimento[] = [];
    const invalidValues: string[] = [];

    tipos.forEach(tipo => {
      if (EnumValidators.isTipoProcedimento(tipo)) {
        validTipos.push(tipo);
      } else {
        invalidValues.push(tipo);
      }
    });

    if (invalidValues.length > 0) {
      throw new Error(`Invalid tipos de procedimento: ${invalidValues.join(', ')}`);
    }

    return validTipos;
  }
};

// Conversion utilities
export const EnumConverters = {
  // Convert string to enum with fallback
  toTipoProcedimento: (value: string, fallback: TipoProcedimento = TipoProcedimento.OUTRO): TipoProcedimento => {
    return EnumValidators.isTipoProcedimento(value) ? value : fallback;
  },

  toEspecialidadeMedica: (value: string, fallback: EspecialidadeMedica = EspecialidadeMedica.OUTRO): EspecialidadeMedica => {
    return EnumValidators.isEspecialidadeMedica(value) ? value : fallback;
  },

  toCategoriaProduto: (value: string, fallback: CategoriaProduto = CategoriaProduto.ACESSORIOS): CategoriaProduto => {
    return EnumValidators.isCategoriaProduto(value) ? value : fallback;
  },

  toStatusProduto: (value: string, fallback: StatusProduto = StatusProduto.DISPONIVEL): StatusProduto => {
    return EnumValidators.isStatusProduto(value) ? value : fallback;
  },

  toStatusAgendamento: (value: string, fallback: StatusAgendamento = StatusAgendamento.AGENDADO): StatusAgendamento => {
    return EnumValidators.isStatusAgendamento(value) ? value : fallback;
  },

  toPrioridadeAgendamento: (value: string, fallback: PrioridadeAgendamento = PrioridadeAgendamento.NORMAL): PrioridadeAgendamento => {
    return EnumValidators.isPrioridadeAgendamento(value) ? value : fallback;
  }
};

// Display labels for enums (for UI)
export const EnumLabels = {
  TipoProcedimento: {
    [TipoProcedimento.BOTOX_TOXINA]: 'Botox/Toxina Botulínica',
    [TipoProcedimento.PREENCHIMENTO]: 'Preenchimento',
    [TipoProcedimento.HARMONIZACAO_FACIAL]: 'Harmonização Facial',
    [TipoProcedimento.LASER_IPL]: 'Laser/IPL',
    [TipoProcedimento.PEELING]: 'Peeling',
    [TipoProcedimento.TRATAMENTO_CORPORAL]: 'Tratamento Corporal',
    [TipoProcedimento.SKINCARE_AVANCADO]: 'Skincare Avançado',
    [TipoProcedimento.MICROAGULHAMENTO]: 'Microagulhamento',
    [TipoProcedimento.RADIOFREQUENCIA]: 'Radiofrequência',
    [TipoProcedimento.CRIOLIPOLISE]: 'Criolipólise',
    [TipoProcedimento.LIMPEZA_PELE]: 'Limpeza de Pele',
    [TipoProcedimento.HIDRATACAO_FACIAL]: 'Hidratação Facial',
    [TipoProcedimento.MASSAGEM_MODELADORA]: 'Massagem Modeladora',
    [TipoProcedimento.DRENAGEM_LINFATICA]: 'Drenagem Linfática',
    [TipoProcedimento.CARBOXITERAPIA]: 'Carboxiterapia',
    [TipoProcedimento.MESOTERAPIA]: 'Mesoterapia',
    [TipoProcedimento.OUTRO]: 'Outro'
  },

  EspecialidadeMedica: {
    [EspecialidadeMedica.DERMATOLOGIA]: 'Dermatologia',
    [EspecialidadeMedica.CIRURGIA_PLASTICA]: 'Cirurgia Plástica',
    [EspecialidadeMedica.MEDICINA_ESTETICA]: 'Medicina Estética',
    [EspecialidadeMedica.FISIOTERAPIA_DERMATOFUNCIONAL]: 'Fisioterapia Dermatofuncional',
    [EspecialidadeMedica.BIOMEDICINA_ESTETICA]: 'Biomedicina Estética',
    [EspecialidadeMedica.ENFERMAGEM_ESTETICA]: 'Enfermagem Estética',
    [EspecialidadeMedica.ESTETICISTA]: 'Esteticista',
    [EspecialidadeMedica.COSMETOLOGIA]: 'Cosmetologia',
    [EspecialidadeMedica.TERAPIA_CAPILAR]: 'Terapia Capilar',
    [EspecialidadeMedica.PODOLOGIA]: 'Podologia',
    [EspecialidadeMedica.OUTRO]: 'Outro'
  },

  StatusAgendamento: {
    [StatusAgendamento.AGENDADO]: 'Agendado',
    [StatusAgendamento.CONFIRMADO]: 'Confirmado',
    [StatusAgendamento.EM_ANDAMENTO]: 'Em Andamento',
    [StatusAgendamento.CONCLUIDO]: 'Concluído',
    [StatusAgendamento.CANCELADO]: 'Cancelado',
    [StatusAgendamento.REAGENDADO]: 'Reagendado',
    [StatusAgendamento.FALTA]: 'Falta',
    [StatusAgendamento.EM_ESPERA]: 'Em Espera'
  },

  PrioridadeAgendamento: {
    [PrioridadeAgendamento.BAIXA]: 'Baixa',
    [PrioridadeAgendamento.NORMAL]: 'Normal',
    [PrioridadeAgendamento.ALTA]: 'Alta',
    [PrioridadeAgendamento.URGENTE]: 'Urgente',
    [PrioridadeAgendamento.VIP]: 'VIP'
  }
};

// Validation result type
export interface ValidationResult<T> {
  isValid: boolean;
  value?: T;
  error?: string;
}

// Generic validation function with result
export function validateEnum<T extends Record<string, string>>(
  enumObject: T,
  value: string,
  enumName: string
): ValidationResult<T[keyof T]> {
  if (isValidEnumValue(enumObject, value)) {
    return {
      isValid: true,
      value: value as T[keyof T]
    };
  }

  return {
    isValid: false,
    error: `Invalid ${enumName}: ${value}. Valid values are: ${Object.values(enumObject).join(', ')}`
  };
}