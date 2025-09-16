/**
 * Tests for enum validation functions
 * Requirements: 1.1, 2.1, 3.1, 6.1
 */

import {
  EnumValidators,
  ArrayValidators,
  EnumConverters,
  EnumLabels,
  validateEnum
} from '../enum-validators';

import {
  TipoProcedimento,
  EspecialidadeMedica,
  CategoriaProduto,
  StatusProduto,
  StatusAgendamento,
  PrioridadeAgendamento
} from '../../types/enums';

describe('EnumValidators', () => {
  describe('isTipoProcedimento', () => {
    it('should validate valid tipo procedimento', () => {
      expect(EnumValidators.isTipoProcedimento('botox_toxina')).toBe(true);
      expect(EnumValidators.isTipoProcedimento('preenchimento')).toBe(true);
      expect(EnumValidators.isTipoProcedimento('outro')).toBe(true);
    });

    it('should reject invalid tipo procedimento', () => {
      expect(EnumValidators.isTipoProcedimento('invalid_type')).toBe(false);
      expect(EnumValidators.isTipoProcedimento('')).toBe(false);
      expect(EnumValidators.isTipoProcedimento('BOTOX_TOXINA')).toBe(false); // case sensitive
    });
  });

  describe('isEspecialidadeMedica', () => {
    it('should validate valid especialidade medica', () => {
      expect(EnumValidators.isEspecialidadeMedica('dermatologia')).toBe(true);
      expect(EnumValidators.isEspecialidadeMedica('medicina_estetica')).toBe(true);
      expect(EnumValidators.isEspecialidadeMedica('esteticista')).toBe(true);
    });

    it('should reject invalid especialidade medica', () => {
      expect(EnumValidators.isEspecialidadeMedica('invalid_specialty')).toBe(false);
      expect(EnumValidators.isEspecialidadeMedica('')).toBe(false);
    });
  });

  describe('isCategoriaProduto', () => {
    it('should validate valid categoria produto', () => {
      expect(EnumValidators.isCategoriaProduto('cremes')).toBe(true);
      expect(EnumValidators.isCategoriaProduto('injetaveis')).toBe(true);
      expect(EnumValidators.isCategoriaProduto('descartaveis')).toBe(true);
    });

    it('should reject invalid categoria produto', () => {
      expect(EnumValidators.isCategoriaProduto('invalid_category')).toBe(false);
      expect(EnumValidators.isCategoriaProduto('')).toBe(false);
    });
  });

  describe('isStatusAgendamento', () => {
    it('should validate valid status agendamento', () => {
      expect(EnumValidators.isStatusAgendamento('agendado')).toBe(true);
      expect(EnumValidators.isStatusAgendamento('confirmado')).toBe(true);
      expect(EnumValidators.isStatusAgendamento('concluido')).toBe(true);
    });

    it('should reject invalid status agendamento', () => {
      expect(EnumValidators.isStatusAgendamento('invalid_status')).toBe(false);
      expect(EnumValidators.isStatusAgendamento('')).toBe(false);
    });
  });
});

describe('ArrayValidators', () => {
  describe('validateEspecialidades', () => {
    it('should validate array of valid especialidades', () => {
      const especialidades = ['dermatologia', 'medicina_estetica', 'esteticista'];
      const result = ArrayValidators.validateEspecialidades(especialidades);
      
      expect(result).toEqual([
        EspecialidadeMedica.DERMATOLOGIA,
        EspecialidadeMedica.MEDICINA_ESTETICA,
        EspecialidadeMedica.ESTETICISTA
      ]);
    });

    it('should throw error for invalid especialidades', () => {
      const especialidades = ['dermatologia', 'invalid_specialty', 'esteticista'];
      
      expect(() => {
        ArrayValidators.validateEspecialidades(especialidades);
      }).toThrow('Invalid especialidades: invalid_specialty');
    });

    it('should handle empty array', () => {
      const result = ArrayValidators.validateEspecialidades([]);
      expect(result).toEqual([]);
    });
  });

  describe('validateTiposProcedimento', () => {
    it('should validate array of valid tipos procedimento', () => {
      const tipos = ['botox_toxina', 'preenchimento', 'peeling'];
      const result = ArrayValidators.validateTiposProcedimento(tipos);
      
      expect(result).toEqual([
        TipoProcedimento.BOTOX_TOXINA,
        TipoProcedimento.PREENCHIMENTO,
        TipoProcedimento.PEELING
      ]);
    });

    it('should throw error for invalid tipos procedimento', () => {
      const tipos = ['botox_toxina', 'invalid_type', 'peeling'];
      
      expect(() => {
        ArrayValidators.validateTiposProcedimento(tipos);
      }).toThrow('Invalid tipos de procedimento: invalid_type');
    });
  });
});

describe('EnumConverters', () => {
  describe('toTipoProcedimento', () => {
    it('should convert valid string to enum', () => {
      expect(EnumConverters.toTipoProcedimento('botox_toxina')).toBe(TipoProcedimento.BOTOX_TOXINA);
      expect(EnumConverters.toTipoProcedimento('preenchimento')).toBe(TipoProcedimento.PREENCHIMENTO);
    });

    it('should return fallback for invalid string', () => {
      expect(EnumConverters.toTipoProcedimento('invalid_type')).toBe(TipoProcedimento.OUTRO);
      expect(EnumConverters.toTipoProcedimento('')).toBe(TipoProcedimento.OUTRO);
    });

    it('should use custom fallback', () => {
      const customFallback = TipoProcedimento.PEELING;
      expect(EnumConverters.toTipoProcedimento('invalid_type', customFallback)).toBe(customFallback);
    });
  });

  describe('toStatusAgendamento', () => {
    it('should convert valid string to enum', () => {
      expect(EnumConverters.toStatusAgendamento('confirmado')).toBe(StatusAgendamento.CONFIRMADO);
      expect(EnumConverters.toStatusAgendamento('concluido')).toBe(StatusAgendamento.CONCLUIDO);
    });

    it('should return fallback for invalid string', () => {
      expect(EnumConverters.toStatusAgendamento('invalid_status')).toBe(StatusAgendamento.AGENDADO);
    });
  });
});

describe('EnumLabels', () => {
  it('should have labels for TipoProcedimento', () => {
    expect(EnumLabels.TipoProcedimento[TipoProcedimento.BOTOX_TOXINA]).toBe('Botox/Toxina Botulínica');
    expect(EnumLabels.TipoProcedimento[TipoProcedimento.PREENCHIMENTO]).toBe('Preenchimento');
    expect(EnumLabels.TipoProcedimento[TipoProcedimento.OUTRO]).toBe('Outro');
  });

  it('should have labels for EspecialidadeMedica', () => {
    expect(EnumLabels.EspecialidadeMedica[EspecialidadeMedica.DERMATOLOGIA]).toBe('Dermatologia');
    expect(EnumLabels.EspecialidadeMedica[EspecialidadeMedica.MEDICINA_ESTETICA]).toBe('Medicina Estética');
    expect(EnumLabels.EspecialidadeMedica[EspecialidadeMedica.ESTETICISTA]).toBe('Esteticista');
  });

  it('should have labels for StatusAgendamento', () => {
    expect(EnumLabels.StatusAgendamento[StatusAgendamento.AGENDADO]).toBe('Agendado');
    expect(EnumLabels.StatusAgendamento[StatusAgendamento.CONFIRMADO]).toBe('Confirmado');
    expect(EnumLabels.StatusAgendamento[StatusAgendamento.CONCLUIDO]).toBe('Concluído');
  });

  it('should have labels for PrioridadeAgendamento', () => {
    expect(EnumLabels.PrioridadeAgendamento[PrioridadeAgendamento.NORMAL]).toBe('Normal');
    expect(EnumLabels.PrioridadeAgendamento[PrioridadeAgendamento.VIP]).toBe('VIP');
    expect(EnumLabels.PrioridadeAgendamento[PrioridadeAgendamento.URGENTE]).toBe('Urgente');
  });
});

describe('validateEnum', () => {
  it('should return valid result for valid enum value', () => {
    const result = validateEnum(TipoProcedimento, 'botox_toxina', 'TipoProcedimento');
    
    expect(result.isValid).toBe(true);
    expect(result.value).toBe(TipoProcedimento.BOTOX_TOXINA);
    expect(result.error).toBeUndefined();
  });

  it('should return invalid result for invalid enum value', () => {
    const result = validateEnum(TipoProcedimento, 'invalid_type', 'TipoProcedimento');
    
    expect(result.isValid).toBe(false);
    expect(result.value).toBeUndefined();
    expect(result.error).toContain('Invalid TipoProcedimento: invalid_type');
    expect(result.error).toContain('Valid values are:');
  });

  it('should include all valid values in error message', () => {
    const result = validateEnum(StatusProduto, 'invalid_status', 'StatusProduto');
    
    expect(result.error).toContain('disponivel');
    expect(result.error).toContain('baixo_estoque');
    expect(result.error).toContain('vencido');
  });
});

describe('Integration Tests', () => {
  it('should work with all enum types', () => {
    // Test that all enum validators work
    expect(EnumValidators.isTipoProcedimento(TipoProcedimento.BOTOX_TOXINA)).toBe(true);
    expect(EnumValidators.isEspecialidadeMedica(EspecialidadeMedica.DERMATOLOGIA)).toBe(true);
    expect(EnumValidators.isCategoriaProduto(CategoriaProduto.CREMES)).toBe(true);
    expect(EnumValidators.isStatusProduto(StatusProduto.DISPONIVEL)).toBe(true);
    expect(EnumValidators.isStatusAgendamento(StatusAgendamento.AGENDADO)).toBe(true);
    expect(EnumValidators.isPrioridadeAgendamento(PrioridadeAgendamento.NORMAL)).toBe(true);
  });

  it('should handle edge cases consistently', () => {
    // Test empty strings
    expect(EnumValidators.isTipoProcedimento('')).toBe(false);
    expect(EnumValidators.isEspecialidadeMedica('')).toBe(false);
    
    // Test null/undefined (should be handled by TypeScript, but test runtime behavior)
    expect(EnumValidators.isTipoProcedimento(null as any)).toBe(false);
    expect(EnumValidators.isEspecialidadeMedica(undefined as any)).toBe(false);
  });
});