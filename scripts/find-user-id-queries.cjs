const fs = require('fs');
const path = require('path');

function searchInFile(filePath, content) {
  const lines = content.split('\n');
  const results = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Procurar por queries que fazem .from('profiles') e depois .eq('user_id'
    if (line.includes("from('profiles')") || line.includes('from("profiles")')) {
      // Verificar as próximas 10 linhas para .eq('user_id'
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        if (lines[j].includes(".eq('user_id'") || lines[j].includes('.eq("user_id"')) {
          results.push({
            file: filePath,
            lineNumber: j + 1,
            line: lines[j].trim(),
            context: lines.slice(Math.max(0, i - 2), Math.min(lines.length, j + 3))
          });
        }
      }
    }
    
    // Procurar por queries que fazem profiles?select=...&user_id=
    if (line.includes('profiles?select=') && line.includes('user_id=')) {
      results.push({
        file: filePath,
        lineNumber: i + 1,
        line: line.trim(),
        context: lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3))
      });
    }
  }
  
  return results;
}

function searchInDirectory(dir, results = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Pular node_modules, .git, etc
      if (!item.startsWith('.') && item !== 'node_modules' && item !== 'dist' && item !== 'build') {
        searchInDirectory(fullPath, results);
      }
    } else if (stat.isFile()) {
      // Procurar apenas em arquivos TypeScript/JavaScript
      if (fullPath.match(/\.(ts|tsx|js|jsx)$/)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const fileResults = searchInFile(fullPath, content);
          results.push(...fileResults);
        } catch (error) {
          console.log(`Erro ao ler arquivo ${fullPath}:`, error.message);
        }
      }
    }
  }
  
  return results;
}

console.log('🔍 PROCURANDO POR QUERIES INCORRETAS NA TABELA PROFILES...\n');

const results = searchInDirectory('./src');

if (results.length === 0) {
  console.log('✅ NENHUMA QUERY INCORRETA ENCONTRADA!');
  console.log('Todos os arquivos TypeScript/JavaScript estão usando as queries corretas.');
} else {
  console.log(`❌ ENCONTRADAS ${results.length} QUERIES INCORRETAS:\n`);
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ARQUIVO: ${result.file}`);
    console.log(`   LINHA: ${result.lineNumber}`);
    console.log(`   CÓDIGO: ${result.line}`);
    console.log(`   CONTEXTO:`);
    result.context.forEach((contextLine, i) => {
      const lineNum = result.lineNumber - 2 + i;
      const marker = lineNum === result.lineNumber ? '>>> ' : '    ';
      console.log(`   ${marker}${lineNum}: ${contextLine}`);
    });
    console.log('');
  });
}

console.log('\n🎯 PRÓXIMOS PASSOS:');
if (results.length > 0) {
  console.log('1. Corrigir as queries encontradas acima');
  console.log('2. Trocar .eq("user_id", ...) por .eq("id", ...) na tabela profiles');
  console.log('3. Testar novamente o cadastro');
} else {
  console.log('1. Limpar cache do browser completamente');
  console.log('2. Reiniciar o servidor de desenvolvimento');
  console.log('3. Testar em modo incógnito');
}
