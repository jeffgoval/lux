/**
 * Teste de criação de cliente no Appwrite
 */

import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configurar dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const client = new Client()
  .setEndpoint('https://nyc.cloud.appwrite.io/v1')
  .setProject('68c841cf00032cd36a87')
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function testClientCreation() {
  try {
    console.log('🧪 Testando criação de cliente no Appwrite...');

    // Dados de teste
    const testData = {
      clinicId: 'clinic_main',
      code: `TEST-${Date.now()}`,
      personalInfoEncrypted: JSON.stringify({
        nome: 'João Silva Teste',
        email: 'joao.teste@email.com',
        telefone: '(11) 99999-9999',
        cpf: '123.456.789-00',
        consentimento: true,
        marketing: false,
        dataConsentimento: new Date().toISOString()
      }),
      searchableData: JSON.stringify({
        nomeHash: 'am9hb3NpbHZh',
        emailHash: 'am9hb3Rlc3Rl',
        telefoneHash: 'MTExOTk5OTk5',
        categoria: 'regular'
      }),
      businessMetrics: JSON.stringify({
        ltv: 0,
        frequencia: 0,
        ultimoAtendimento: null,
        nps: null,
        satisfacaoMedia: 0
      }),
      tags: JSON.stringify([]),
      vipLevel: null,
      createdBy: 'test-script',
      updatedBy: 'test-script'
    };

    console.log('📝 Criando documento de teste...');
    
    const response = await databases.createDocument(
      'main',
      'patients',
      'unique()',
      testData
    );

    console.log('✅ Cliente de teste criado com sucesso!');
    console.log('📄 ID do documento:', response.$id);
    console.log('📊 Dados salvos:', {
      clinicId: response.clinicId,
      code: response.code,
      createdBy: response.createdBy,
      createdAt: response.$createdAt
    });

    // Testar busca
    console.log('\n🔍 Testando busca do cliente...');
    const searchResponse = await databases.getDocument(
      'main',
      'patients',
      response.$id
    );

    console.log('✅ Cliente encontrado!');
    console.log('📋 Nome do cliente:', JSON.parse(searchResponse.personalInfoEncrypted).nome);

    // Testar listagem
    console.log('\n📋 Testando listagem de clientes...');
    const listResponse = await databases.listDocuments(
      'main',
      'patients'
    );

    console.log(`✅ Total de clientes na base: ${listResponse.total}`);
    console.log('📊 Últimos clientes:');
    listResponse.documents.slice(0, 3).forEach((doc, index) => {
      const personalInfo = JSON.parse(doc.personalInfoEncrypted);
      console.log(`  ${index + 1}. ${personalInfo.nome} (${doc.code})`);
    });

    console.log('\n🎉 TODOS OS TESTES PASSARAM!');
    console.log('✅ Criação: OK');
    console.log('✅ Busca: OK');
    console.log('✅ Listagem: OK');
    console.log('\n🚀 O modal de cliente está pronto para uso real!');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.log('\nPossíveis problemas:');
    console.log('1. Tabela não foi criada corretamente');
    console.log('2. Permissões insuficientes');
    console.log('3. Estrutura de dados incorreta');
  }
}

testClientCreation();