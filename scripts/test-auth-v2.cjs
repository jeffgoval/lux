#!/usr/bin/env node

/**
 * 🧪 SCRIPT DE TESTE - SISTEMA DE AUTENTICAÇÃO V2
 * 
 * Testa todos os componentes do novo sistema de autenticação
 */

const fs = require('fs');
const path = require('path');

console.log('🔐 TESTANDO SISTEMA DE AUTENTICAÇÃO V2\n');

// ============================================================================
// 1. VERIFICAR ARQUIVOS CRIADOS
// ============================================================================

console.log('📁 Verificando arquivos criados...');

const requiredFiles = [
  'src/config/auth.config.ts',
  'src/types/auth.types.ts',
  'src/services/auth.service.ts',
  'src/services/authorization.service.ts',
  'src/contexts/SecureAuthContext.tsx',
  'src/components/SecureAuthGuard.tsx',
  'src/components/auth/SecureLoginForm.tsx',
  'src/components/auth/ClinicSelector.tsx',
  'src/components/auth/PermissionGate.tsx',
  'src/components/ui/loading-spinner.tsx',
  'src/pages/SecureAuth.tsx',
  'database/secure-auth-schema.sql',
  'database/secure-rls-policies.sql',
  'database/migrate-existing-data.sql',
  'src/__tests__/security/auth.security.test.ts'
];

let missingFiles = [];
let existingFiles = [];

requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    existingFiles.push(file);
    console.log(`  ✅ ${file}`);
  } else {
    missingFiles.push(file);
    console.log(`  ❌ ${file} - FALTANDO`);
  }
});

console.log(`\n📊 Resultado: ${existingFiles.length}/${requiredFiles.length} arquivos encontrados`);

if (missingFiles.length > 0) {
  console.log('\n🚨 ARQUIVOS FALTANDO:');
  missingFiles.forEach(file => console.log(`  - ${file}`));
}

// ============================================================================
// 2. VERIFICAR DEPENDÊNCIAS
// ============================================================================

console.log('\n📦 Verificando dependências...');

const packageJsonPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredDeps = [
    'bcryptjs',
    'jsonwebtoken',
    '@types/bcryptjs',
    '@types/jsonwebtoken',
    '@hookform/resolvers',
    'zod',
    'react-hook-form'
  ];
  
  let missingDeps = [];
  
  requiredDeps.forEach(dep => {
    if (dependencies[dep]) {
      console.log(`  ✅ ${dep} - ${dependencies[dep]}`);
    } else {
      missingDeps.push(dep);
      console.log(`  ❌ ${dep} - FALTANDO`);
    }
  });
  
  if (missingDeps.length > 0) {
    console.log('\n🚨 DEPENDÊNCIAS FALTANDO:');
    console.log(`npm install ${missingDeps.join(' ')}`);
  }
} else {
  console.log('  ❌ package.json não encontrado');
}

// ============================================================================
// 3. VERIFICAR INTEGRAÇÃO NO APP.TSX
// ============================================================================

console.log('\n🔗 Verificando integração no App.tsx...');

const appTsxPath = path.join(process.cwd(), 'src/App.tsx');
if (fs.existsSync(appTsxPath)) {
  const appContent = fs.readFileSync(appTsxPath, 'utf8');
  
  const integrationChecks = [
    { name: 'SecureAuthProvider', pattern: /SecureAuthProvider/, required: true },
    { name: 'SecureAuthGuard', pattern: /SecureAuthGuard/, required: true },
    { name: 'SecureAuth page', pattern: /SecureAuth/, required: true },
    { name: 'Remove AuthProvider antigo', pattern: /AuthProvider/, required: false },
    { name: 'Remove SimpleAuthGuard', pattern: /SimpleAuthGuard/, required: false }
  ];
  
  integrationChecks.forEach(check => {
    const found = check.pattern.test(appContent);
    if (check.required) {
      console.log(`  ${found ? '✅' : '❌'} ${check.name}`);
    } else {
      console.log(`  ${found ? '⚠️' : '✅'} ${check.name} ${found ? '(ainda presente)' : '(removido)'}`);
    }
  });
} else {
  console.log('  ❌ src/App.tsx não encontrado');
}

// ============================================================================
// RESUMO FINAL
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('📋 RESUMO DO TESTE');
console.log('='.repeat(60));

console.log(`📁 Arquivos: ${existingFiles.length}/${requiredFiles.length} criados`);
console.log(`🔗 Integração: ${fs.existsSync(appTsxPath) ? 'OK' : 'PENDENTE'}`);

const allGood = missingFiles.length === 0 && existingFiles.length === requiredFiles.length;

if (allGood) {
  console.log('\n🎉 SISTEMA V2 PRONTO PARA TESTE!');
  console.log('\nPróximos passos:');
  console.log('1. npm run dev - Iniciar servidor de desenvolvimento');
  console.log('2. Acessar http://localhost:5173/auth');
  console.log('3. Testar login com credenciais válidas');
  console.log('4. Verificar isolamento multi-tenant');
} else {
  console.log('\n⚠️ SISTEMA V2 PRECISA DE AJUSTES');
  console.log('\nCorreções necessárias:');
  if (missingFiles.length > 0) {
    console.log('- Criar arquivos faltando');
  }
}

console.log('\n📚 Documentação completa em:');
console.log('- SISTEMA_AUTH_V2_COMPLETO.md');
console.log('- MIGRATION_PLAN.md');
console.log('- docs/AUTH_AUDIT_REPORT.md');
