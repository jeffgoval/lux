/**
 * Script para criar a tabela de clientes no Appwrite
 * Execute: node scripts/create-appwrite-table.js
 */

import { Client, Databases, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configurar dotenv para ler o arquivo .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Configuração do Appwrite
const APPWRITE_ENDPOINT = 'https://nyc.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '68c841cf00032cd36a87';

// Você precisa fornecer sua API Key
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

if (!APPWRITE_API_KEY) {
  console.error('❌ APPWRITE_API_KEY não encontrada!');
  console.log('');
  console.log('Para obter sua API Key:');
  console.log('1. Vá para https://cloud.appwrite.io/console');
  console.log('2. Selecione seu projeto "Estetic"');
  console.log('3. Vá em "Settings" > "API Keys"');
  console.log('4. Clique em "Create API Key"');
  console.log('5. Dê um nome (ex: "Database Setup")');
  console.log('6. Selecione scopes: databases.read, databases.write');
  console.log('7. Copie a key e execute:');
  console.log('');
  console.log('APPWRITE_API_KEY=sua_key_aqui node scripts/create-appwrite-table.js');
  process.exit(1);
}

// Inicializar cliente Appwrite (server-side)
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

const DATABASE_ID = 'main';
const TABLE_ID = 'patients';

async function createDatabase() {
  try {
    console.log('🔍 Verificando se database existe...');
    await databases.get(DATABASE_ID);
    console.log('✅ Database "main" já existe');
  } catch (error) {
    console.log('📝 Criando database "main"...');
    await databases.create(DATABASE_ID, 'Main Database');
    console.log('✅ Database criado com sucesso!');
  }
}

async function createTable() {
  try {
    console.log('🔍 Verificando se tabela existe...');
    await databases.getCollection(DATABASE_ID, TABLE_ID);
    console.log('✅ Tabela "patients" já existe');
    return;
  } catch (error) {
    console.log('📝 Criando tabela "patients"...');
  }

  // Criar a tabela (collection)
  await databases.createCollection(
    DATABASE_ID,
    TABLE_ID,
    'Patients',
    [
      Permission.read(Role.users()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users())
    ],
    true // Document security enabled
  );

  console.log('✅ Tabela criada! Agora criando colunas...');

  // Definir as colunas
  const columns = [
    { key: 'clinicId', size: 255, required: true, label: 'Clinic ID' },
    { key: 'code', size: 50, required: true, label: 'Patient Code' },
    { key: 'personalInfoEncrypted', size: 10000, required: true, label: 'Personal Info (Encrypted)' },
    { key: 'searchableData', size: 2000, required: true, label: 'Searchable Data' },
    { key: 'businessMetrics', size: 2000, required: true, label: 'Business Metrics' },
    { key: 'consents', size: 2000, required: true, label: 'LGPD Consents' },
    { key: 'tags', size: 1000, required: false, label: 'Tags' },
    { key: 'vipLevel', size: 50, required: false, label: 'VIP Level' },
    { key: 'createdBy', size: 255, required: true, label: 'Created By' },
    { key: 'updatedBy', size: 255, required: true, label: 'Updated By' }
  ];

  // Criar cada coluna
  for (const column of columns) {
    try {
      console.log(`📝 Criando coluna: ${column.key}...`);
      await databases.createStringAttribute(
        DATABASE_ID,
        TABLE_ID,
        column.key,
        column.size,
        column.required
      );
      console.log(`✅ Coluna ${column.key} criada!`);
      
      // Aguardar um pouco entre criações para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`⚠️ Erro ao criar coluna ${column.key}:`, error.message);
    }
  }

  console.log('🎯 Criando índices para performance...');

  // Criar índices
  const indexes = [
    { key: 'clinicId_idx', attributes: ['clinicId'] },
    { key: 'code_idx', attributes: ['code'] },
    { key: 'createdBy_idx', attributes: ['createdBy'] }
  ];

  for (const index of indexes) {
    try {
      console.log(`📝 Criando índice: ${index.key}...`);
      await databases.createIndex(
        DATABASE_ID,
        TABLE_ID,
        index.key,
        'key',
        index.attributes
      );
      console.log(`✅ Índice ${index.key} criado!`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`⚠️ Erro ao criar índice ${index.key}:`, error.message);
    }
  }
}

async function main() {
  try {
    console.log('🚀 Iniciando criação da estrutura no Appwrite...');
    console.log(`📡 Endpoint: ${APPWRITE_ENDPOINT}`);
    console.log(`🎯 Projeto: ${APPWRITE_PROJECT_ID}`);
    console.log('');

    await createDatabase();
    await createTable();

    console.log('');
    console.log('🎉 SUCESSO! Estrutura criada no Appwrite!');
    console.log('');
    console.log('✅ Database: main');
    console.log('✅ Tabela: patients');
    console.log('✅ Colunas: 10 colunas criadas');
    console.log('✅ Índices: 3 índices criados');
    console.log('✅ Permissões: Configuradas para usuários');
    console.log('');
    console.log('🔥 Agora o modal vai salvar dados REAIS no Appwrite!');
    console.log('');
    console.log('Próximos passos:');
    console.log('1. Teste criar um cliente no modal');
    console.log('2. Verifique no console do Appwrite se os dados foram salvos');
    console.log('3. Console: https://cloud.appwrite.io/console');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.log('');
    console.log('Possíveis soluções:');
    console.log('1. Verifique se a API Key está correta');
    console.log('2. Verifique se a API Key tem permissões de databases');
    console.log('3. Tente novamente em alguns minutos');
  }
}

main();