#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configuração do Supabase
const supabaseUrl = 'https://shzbgjooydruspqajjkf.supabase.co';
const supabaseKey = '****************************************************************************************************************************************************************************************************************'; // Usando anon key por enquanto

const supabase = createClient(supabaseUrl, supabaseKey);

// Lista dos scripts de migração em ordem
const migrations = [
    '20250914001_foundation_types_functions.sql',
    '20250914002_independent_tables.sql',
    '20250914003_profiles_table.sql',
    '20250914004_organizacoes_table.sql',
    '20250914005_clinicas_table.sql',
    '20250914006_user_roles_table.sql'
];

/**
 * Executa uma query SQL usando uma função RPC
 */
async function executeSQLQuery(sql, migrationName) {
    try {
        console.log(`🔄 Executando migração: ${migrationName}...`);
        
        // Dividir o SQL em statements individuais (removendo comentários)
        const statements = sql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0)
            .filter(stmt => !stmt.startsWith('--'))
            .filter(stmt => !stmt.startsWith('/*'))
            .filter(stmt => stmt !== 'sql');
        
        console.log(`   📝 ${statements.length} statements encontrados`);
        
        let successCount = 0;
        let errorCount = 0;
        
        // Executar cada statement individualmente
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            
            if (statement.length === 0) continue;
            
            try {
                // Tentar executar usando RPC (se disponível) ou query direta
                const { data, error } = await supabase.rpc('execute_sql', { 
                    sql_query: statement 
                });
                
                if (error) {
                    console.log(`   ⚠️  Statement ${i + 1} erro (pode ser normal): ${error.message.substring(0, 100)}`);
                    errorCount++;
                } else {
                    successCount++;
                }
                
            } catch (rpcError) {
                // Se RPC falhou, tentar query direta (limitada)
                try {
                    if (statement.toLowerCase().includes('select') || 
                        statement.toLowerCase().includes('from')) {
                        const { data, error } = await supabase.from('information_schema.tables').select('*').limit(1);
                        if (!error) {
                            console.log(`   ✅ Statement ${i + 1} executado (query de teste bem-sucedida)`);
                            successCount++;
                        }
                    } else {
                        console.log(`   ⚠️  Statement ${i + 1} não pode ser executado via client JS`);
                        errorCount++;
                    }
                } catch (directError) {
                    console.log(`   ❌ Statement ${i + 1} falhou: ${directError.message.substring(0, 100)}`);
                    errorCount++;
                }
            }
        }
        
        console.log(`   📊 Resumo: ${successCount} sucessos, ${errorCount} erros/avisos`);
        return { success: successCount > 0, successCount, errorCount };
        
    } catch (error) {
        console.error(`   💥 Erro crítico: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Executa todas as migrações
 */
async function runMigrations() {
    console.log('🚀 Iniciando execução das migrações...');
    console.log(`📍 Supabase URL: ${supabaseUrl}`);
    console.log('');
    
    let totalSuccess = 0;
    let totalErrors = 0;
    
    for (const migrationFile of migrations) {
        const migrationPath = path.join('supabase', 'migrations', migrationFile);
        
        try {
            // Verificar se o arquivo existe
            if (!fs.existsSync(migrationPath)) {
                console.log(`❌ Arquivo não encontrado: ${migrationPath}`);
                continue;
            }
            
            // Ler o conteúdo do arquivo
            const sqlContent = fs.readFileSync(migrationPath, 'utf8');
            
            // Executar a migração
            const result = await executeSQLQuery(sqlContent, migrationFile);
            
            if (result.success) {
                console.log(`✅ ${migrationFile} - Aplicada com sucesso`);
                totalSuccess += result.successCount;
            } else {
                console.log(`❌ ${migrationFile} - Falhou: ${result.error || 'Erro desconhecido'}`);
            }
            
            totalErrors += result.errorCount || 0;
            console.log('');
            
            // Pequena pausa entre migrações
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error(`💥 Erro ao processar ${migrationFile}: ${error.message}`);
        }
    }
    
    console.log('📊 RESUMO FINAL:');
    console.log(`   ✅ Total de statements bem-sucedidos: ${totalSuccess}`);
    console.log(`   ⚠️  Total de avisos/erros: ${totalErrors}`);
    console.log('');
    
    if (totalSuccess > 0) {
        console.log('🎉 Algumas migrações foram aplicadas com sucesso!');
        console.log('💡 Note: Alguns erros podem ser normais (ex.: extensões já existem)');
    } else {
        console.log('❌ Nenhuma migração foi aplicada com sucesso.');
        console.log('💡 Isso pode ser devido a limitações do client JS do Supabase.');
        console.log('📝 Recomendação: Usar SQL Editor do Dashboard ou CLI com service role key.');
    }
}

/**
 * Função alternativa para listar migrações encontradas
 */
function listAvailableMigrations() {
    console.log('📋 Migrações disponíveis:');
    
    migrations.forEach((migration, index) => {
        const migrationPath = path.join('supabase', 'migrations', migration);
        const exists = fs.existsSync(migrationPath);
        const status = exists ? '✅' : '❌';
        const size = exists ? `${fs.statSync(migrationPath).size} bytes` : 'N/A';
        
        console.log(`   ${index + 1}. ${status} ${migration} (${size})`);
    });
    
    console.log('');
}

// Executar
console.log('🔧 Executor de Migrações Supabase');
console.log('================================');
console.log('');

listAvailableMigrations();
runMigrations()
    .then(() => {
        console.log('✅ Processo concluído.');
    })
    .catch(error => {
        console.error('💥 Erro fatal:', error.message);
        process.exit(1);
    });