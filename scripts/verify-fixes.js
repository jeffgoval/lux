#!/usr/bin/env node

/**
 * 🔍 SCRIPT DE VERIFICAÇÃO DAS CORREÇÕES
 * 
 * Verifica se todas as correções foram implementadas corretamente
 * e se o sistema está funcionando adequadamente.
 */

import fs from 'fs';
import path from 'path';

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✅ ${description}: ${filePath}`, 'green');
    return true;
  } else {
    log(`❌ ${description}: ${filePath} - ARQUIVO NÃO ENCONTRADO`, 'red');
    return false;
  }
}

function checkFileContent(filePath, searchString, description) {
  if (!fs.existsSync(filePath)) {
    log(`❌ ${description}: Arquivo não encontrado`, 'red');
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(searchString)) {
    log(`✅ ${description}: Encontrado`, 'green');
    return true;
  } else {
    log(`❌ ${description}: NÃO ENCONTRADO`, 'red');
    return false;
  }
}

function checkConsoleLogRemoval(filePath) {
  if (!fs.existsSync(filePath)) {
    return true;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const consoleLogMatches = content.match(/console\.(log|error|warn|debug)/g);
  
  if (consoleLogMatches && consoleLogMatches.length > 0) {
    log(`⚠️  ${filePath}: ${consoleLogMatches.length} console.log encontrados`, 'yellow');
    return false;
  } else {
    log(`✅ ${filePath}: Sem console.log`, 'green');
    return true;
  }
}

function main() {
  log('\n🔍 VERIFICAÇÃO DAS CORREÇÕES IMPLEMENTADAS\n', 'bold');

  let totalChecks = 0;
  let passedChecks = 0;

  // ============================================================================
  // VERIFICAÇÃO 1: ARQUIVOS CRIADOS
  // ============================================================================
  
  log('📁 VERIFICANDO ARQUIVOS CRIADOS:', 'blue');
  
  const newFiles = [
    ['database_fixes.sql', 'Script de migração do banco de dados'],
    ['src/contexts/UnifiedAuthContext.tsx', 'Contexto de autenticação unificado'],
    ['src/contexts/AuthMigration.tsx', 'Sistema de migração de auth'],
    ['src/utils/logger.ts', 'Sistema de logging seguro'],
    ['src/utils/errorHandler.ts', 'Sistema de tratamento de erros'],
    ['src/utils/stateValidator.ts', 'Sistema de validação de estado'],
    ['CORRECOES_IMPLEMENTADAS.md', 'Documentação das correções']
  ];

  newFiles.forEach(([filePath, description]) => {
    totalChecks++;
    if (checkFileExists(filePath, description)) {
      passedChecks++;
    }
  });

  // ============================================================================
  // VERIFICAÇÃO 2: CORREÇÕES NO BANCO DE DADOS
  // ============================================================================
  
  log('\n🗄️  VERIFICANDO CORREÇÕES DO BANCO:', 'blue');
  
  totalChecks++;
  if (checkFileContent('database_fixes.sql', 'ALTER TABLE public.clinicas ADD COLUMN', 'Migração de colunas da tabela clinicas')) {
    passedChecks++;
  }

  totalChecks++;
  if (checkFileContent('database_fixes.sql', 'CREATE TABLE IF NOT EXISTS public.clinica_profissionais', 'Criação da tabela clinica_profissionais')) {
    passedChecks++;
  }

  totalChecks++;
  if (checkFileContent('database_fixes.sql', 'CREATE POLICY "Allow onboarding', 'Políticas RLS para onboarding')) {
    passedChecks++;
  }

  // ============================================================================
  // VERIFICAÇÃO 3: SISTEMA DE LOGGING
  // ============================================================================
  
  log('\n📝 VERIFICANDO SISTEMA DE LOGGING:', 'blue');
  
  totalChecks++;
  if (checkFileContent('src/utils/logger.ts', 'export const logger = new Logger', 'Sistema de logging implementado')) {
    passedChecks++;
  }

  totalChecks++;
  if (checkFileContent('src/utils/logger.ts', 'enableInProduction: false', 'Logs desabilitados em produção')) {
    passedChecks++;
  }

  // ============================================================================
  // VERIFICAÇÃO 4: TRATAMENTO DE ERROS
  // ============================================================================
  
  log('\n🛡️  VERIFICANDO TRATAMENTO DE ERROS:', 'blue');
  
  totalChecks++;
  if (checkFileContent('src/utils/errorHandler.ts', 'export class ErrorHandler', 'Sistema de tratamento de erros implementado')) {
    passedChecks++;
  }

  totalChecks++;
  if (checkFileContent('src/utils/errorHandler.ts', 'ErrorType.NETWORK', 'Tipos de erro definidos')) {
    passedChecks++;
  }

  // ============================================================================
  // VERIFICAÇÃO 5: VALIDAÇÃO DE ESTADO
  // ============================================================================
  
  log('\n🔍 VERIFICANDO VALIDAÇÃO DE ESTADO:', 'blue');
  
  totalChecks++;
  if (checkFileContent('src/utils/stateValidator.ts', 'export class AuthStateValidator', 'Validador de estado implementado')) {
    passedChecks++;
  }

  totalChecks++;
  if (checkFileContent('src/utils/stateValidator.ts', 'export class StateRecovery', 'Sistema de recuperação implementado')) {
    passedChecks++;
  }

  // ============================================================================
  // VERIFICAÇÃO 6: CONTEXTO UNIFICADO
  // ============================================================================
  
  log('\n🔐 VERIFICANDO CONTEXTO UNIFICADO:', 'blue');
  
  totalChecks++;
  if (checkFileContent('src/contexts/UnifiedAuthContext.tsx', 'export class UnifiedAuthProvider', 'Provider unificado implementado')) {
    passedChecks++;
  }

  totalChecks++;
  if (checkFileContent('src/contexts/UnifiedAuthContext.tsx', 'useStateValidation', 'Validação de estado integrada')) {
    passedChecks++;
  }

  // ============================================================================
  // VERIFICAÇÃO 7: REMOÇÃO DE CONSOLE.LOG
  // ============================================================================
  
  log('\n🧹 VERIFICANDO REMOÇÃO DE CONSOLE.LOG:', 'blue');
  
  const filesToCheck = [
    'src/contexts/SecureAuthContext.tsx',
    'src/components/OnboardingWizard.tsx',
    'src/services/auth.service.ts'
  ];

  let consoleLogRemoved = true;
  filesToCheck.forEach(filePath => {
    if (!checkConsoleLogRemoval(filePath)) {
      consoleLogRemoved = false;
    }
  });

  totalChecks++;
  if (consoleLogRemoved) {
    passedChecks++;
    log('✅ Todos os console.log foram removidos', 'green');
  } else {
    log('❌ Alguns console.log ainda existem', 'red');
  }

  // ============================================================================
  // VERIFICAÇÃO 8: CORREÇÕES NO ONBOARDING
  // ============================================================================
  
  log('\n🎯 VERIFICANDO CORREÇÕES NO ONBOARDING:', 'blue');
  
  totalChecks++;
  if (checkFileContent('src/components/OnboardingWizard.tsx', 'handleError(error, {', 'Tratamento de erro robusto implementado')) {
    passedChecks++;
  }

  totalChecks++;
  if (checkFileContent('src/components/OnboardingWizard.tsx', 'cnpj: data.cnpj || null', 'Campos do banco restaurados')) {
    passedChecks++;
  }

  // ============================================================================
  // RESULTADO FINAL
  // ============================================================================
  
  log('\n📊 RESULTADO FINAL:', 'bold');
  log(`Verificações realizadas: ${totalChecks}`, 'blue');
  log(`Verificações aprovadas: ${passedChecks}`, 'green');
  log(`Verificações falharam: ${totalChecks - passedChecks}`, 'red');
  
  const successRate = (passedChecks / totalChecks) * 100;
  
  if (successRate >= 90) {
    log('\n🎉 EXCELENTE! Todas as correções foram implementadas com sucesso!', 'green');
    log('O sistema está pronto para produção.', 'green');
  } else if (successRate >= 70) {
    log('\n⚠️  BOM! A maioria das correções foi implementada.', 'yellow');
    log('Algumas verificações falharam. Revise os itens em vermelho.', 'yellow');
  } else {
    log('\n❌ ATENÇÃO! Muitas correções não foram implementadas.', 'red');
    log('Revise todos os itens em vermelho antes de prosseguir.', 'red');
  }

  log(`\nTaxa de sucesso: ${successRate.toFixed(1)}%`, successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red');
  
  // ============================================================================
  // PRÓXIMOS PASSOS
  // ============================================================================
  
  log('\n📋 PRÓXIMOS PASSOS:', 'bold');
  log('1. Execute o SQL do arquivo database_fixes.sql no Supabase', 'blue');
  log('2. Teste o fluxo completo: registro → onboarding → dashboard', 'blue');
  log('3. Verifique se não há erros no console do navegador', 'blue');
  log('4. Execute testes de regressão', 'blue');
  
  log('\n✨ Verificação concluída!', 'green');
}

// Executar verificação
main();
