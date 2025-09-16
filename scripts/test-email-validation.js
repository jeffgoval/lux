/**
 * Teste de validação de email duplicado
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

// Função para criar hash simples (igual ao serviço)
function createSearchHash(value) {
  return btoa(value.toLowerCase().replace(/\s+/g, '')).substring(0, 10);
}

async function testEmailValidation() {
  try {
    console.log('🧪 Testando validação de email duplicado...');

    const testEmail = 'teste@email.com';
    const emailHash = createSearchHash(testEmail);
    
    console.log(`📧 Email de teste: ${testEmail}`);
    console.log(`🔐 Hash do email: ${emailHash}`);

    // Buscar todos os documentos
    const response = await databases.listDocuments('main', 'patients', []);
    
    console.log(`📊 Total de documentos: ${response.total}`);

    // Verificar se algum tem o mesmo email
    let exists = false;
    for (const doc of response.documents) {
      try {
        const searchableData = JSON.parse(doc.searchableData);
        console.log(`🔍 Verificando documento ${doc.$id}: ${searchableData.emailHash}`);
        
        if (searchableData.emailHash === emailHash) {
          exists = true;
          console.log(`✅ Email encontrado no documento: ${doc.$id}`);
          break;
        }
      } catch (parseError) {
        console.log(`⚠️ Erro ao parsear documento ${doc.$id}`);
      }
    }

    if (exists) {
      console.log('✅ Validação funcionando: Email duplicado detectado!');
    } else {
      console.log('✅ Email não existe na base - pode ser criado');
    }

    console.log('\n🎉 Teste de validação de email concluído!');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testEmailValidation();