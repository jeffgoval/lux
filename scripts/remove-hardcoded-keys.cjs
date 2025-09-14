#!/usr/bin/env node

/**
 * 🔐 SCRIPT DE LIMPEZA DE CHAVES HARDCODED
 * 
 * Remove todas as chaves do Supabase hardcoded do código
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 REMOVENDO CHAVES HARDCODED...\n');

// Padrões de chaves a serem removidos
const KEY_PATTERNS = [
  /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, // JWT tokens
  /https:\/\/[a-z0-9]+\.supabase\.co/g, // URLs hardcoded
  /sb-[a-z0-9-]+/g, // Service keys
];

// Arquivos a serem limpos
const FILES_TO_CLEAN = [
  'scripts/backup-supabase-final.js',
  'scripts/backup-working.js',
  'scripts/execute-sql.js',
  'execute-sql-via-api.js',
  'nuclear-delete-users.cjs'
];

function cleanFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Substituir chaves hardcoded por variáveis de ambiente
  KEY_PATTERNS.forEach(pattern => {
    if (pattern.test(content)) {
      console.log(`🔑 Removendo chaves de: ${filePath}`);
      content = content.replace(pattern, 'REMOVED_FOR_SECURITY');
      modified = true;
    }
  });

  if (modified) {
    // Adicionar require dotenv se não existir
    if (!content.includes('dotenv') && !content.includes('process.env')) {
      content = "require('dotenv').config();\n\n" + content;
    }

    fs.writeFileSync(filePath, content);
    console.log(`✅ Limpo: ${filePath}`);
  } else {
    console.log(`✅ Já limpo: ${filePath}`);
  }
}

// Limpar arquivos específicos
FILES_TO_CLEAN.forEach(cleanFile);

console.log('\n🎉 LIMPEZA CONCLUÍDA!');
console.log('\n📋 PRÓXIMOS PASSOS:');
console.log('1. Revogue as chaves no Supabase Dashboard');
console.log('2. Gere novas chaves');
console.log('3. Atualize seu arquivo .env local');
console.log('4. Nunca commite o arquivo .env');
