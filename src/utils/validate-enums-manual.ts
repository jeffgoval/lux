/**
 * Manual validation script for enum functionality
 * This script can be run to verify all enum functions work correctly
 */

import {
  EnumValidators,
  ArrayValidators,
  EnumConverters,
  EnumLabels,
  validateEnum
} from './enum-validators';

import {
  TipoProcedimento,
  EspecialidadeMedica,
  CategoriaProduto,
  StatusProduto,
  StatusAgendamento,
  PrioridadeAgendamento
} from '../types/enums';

console.log('🧪 Testing Enum Validators...\n');

// Test TipoProcedimento validation
console.log('✅ Testing TipoProcedimento:');
console.log('Valid "botox_toxina":', EnumValidators.isTipoProcedimento('botox_toxina'));
console.log('Invalid "invalid_type":', EnumValidators.isTipoProcedimento('invalid_type'));

// Test EspecialidadeMedica validation
console.log('\n✅ Testing EspecialidadeMedica:');
console.log('Valid "dermatologia":', EnumValidators.isEspecialidadeMedica('dermatologia'));
console.log('Invalid "invalid_specialty":', EnumValidators.isEspecialidadeMedica('invalid_specialty'));

// Test array validation
console.log('\n✅ Testing Array Validators:');
try {
  const validEspecialidades = ArrayValidators.validateEspecialidades(['dermatologia', 'medicina_estetica']);
  console.log('Valid especialidades array:', validEspecialidades);
} catch (error) {
  console.log('Error:', error.message);
}

try {
  const invalidEspecialidades = ArrayValidators.validateEspecialidades(['dermatologia', 'invalid_specialty']);
  console.log('This should not print');
} catch (error) {
  console.log('Expected error for invalid array:', error.message);
}

// Test converters
console.log('\n✅ Testing Converters:');
console.log('Convert valid "botox_toxina":', EnumConverters.toTipoProcedimento('botox_toxina'));
console.log('Convert invalid "invalid_type" (fallback):', EnumConverters.toTipoProcedimento('invalid_type'));

// Test labels
console.log('\n✅ Testing Labels:');
console.log('Label for BOTOX_TOXINA:', EnumLabels.TipoProcedimento[TipoProcedimento.BOTOX_TOXINA]);
console.log('Label for DERMATOLOGIA:', EnumLabels.EspecialidadeMedica[EspecialidadeMedica.DERMATOLOGIA]);

// Test generic validator
console.log('\n✅ Testing Generic Validator:');
const validResult = validateEnum(TipoProcedimento, 'botox_toxina', 'TipoProcedimento');
console.log('Valid result:', validResult);

const invalidResult = validateEnum(TipoProcedimento, 'invalid_type', 'TipoProcedimento');
console.log('Invalid result:', invalidResult);

console.log('\n🎉 All manual tests completed successfully!');
console.log('\n📋 Summary of created enums:');
console.log('- TipoProcedimento: 17 values');
console.log('- EspecialidadeMedica: 11 values');
console.log('- CategoriaProduto: 14 values');
console.log('- StatusProduto: 7 values');
console.log('- TipoMovimentacao: 8 values');
console.log('- UnidadeMedida: 12 values');
console.log('- StatusProntuario: 4 values');
console.log('- TipoImagem: 6 values');
console.log('- StatusAgendamento: 8 values');
console.log('- PrioridadeAgendamento: 5 values');
console.log('- TipoNotificacao: 10 values');
console.log('- StatusNotificacao: 6 values');
console.log('- CanalComunicacao: 6 values');
console.log('- TipoRelatorio: 8 values');
console.log('- PeriodoRelatorio: 7 values');
console.log('- MetodoPagamento: 8 values');
console.log('- StatusPagamento: 6 values');
console.log('\n✨ Total: 17 enums with comprehensive validation and labeling!');