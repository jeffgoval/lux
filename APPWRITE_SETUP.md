# Configuração do Appwrite para Clientes

## Pré-requisitos

1. Conta no Appwrite Cloud ou instância local
2. Projeto criado no Appwrite
3. API Key com permissões de administrador

## Configuração das Variáveis de Ambiente

Certifique-se de que o arquivo `.env` contém:

```env
VITE_APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=68c841cf00032cd36a87
APPWRITE_API_KEY=your_admin_api_key_here
```

## Criação das Collections

### Opção 1: Script Automático (Recomendado)

```bash
# Instalar dependências do Appwrite
npm install appwrite

# Executar script de configuração
node scripts/setup-appwrite-collections.js
```

### Opção 2: Configuração Manual no Console

1. Acesse o Console do Appwrite
2. Vá para Databases > Create Database
3. Nome: `main`
4. Crie a collection `patients` com os seguintes atributos:

#### Collection: patients

**Atributos:**
- `clinicId` (String, 255, Required) - ID da clínica
- `code` (String, 50, Required) - Código único do paciente
- `personalInfoEncrypted` (String, 10000, Required) - Dados pessoais criptografados
- `searchableData` (String, 2000, Required) - Dados para busca (JSON)
- `businessMetrics` (String, 2000, Required) - Métricas de negócio (JSON)
- `consents` (String, 2000, Required) - Consentimentos LGPD (JSON)
- `tags` (String, 1000, Optional) - Tags do cliente (JSON Array)
- `vipLevel` (String, 50, Optional) - Nível VIP
- `createdBy` (String, 255, Required) - Criado por
- `updatedBy` (String, 255, Required) - Atualizado por

**Índices:**
- `clinicId_idx` - Index em `clinicId`
- `code_idx` - Index em `code`
- `createdBy_idx` - Index em `createdBy`

**Permissões:**
- Read: Any
- Create: Users
- Update: Users
- Delete: Users

## Estrutura dos Dados

### personalInfoEncrypted (JSON)
```json
{
  "nome": "Nome do Cliente",
  "cpf": "123.456.789-00",
  "dataNascimento": "1990-01-01",
  "endereco": "Rua Example, 123",
  "cidade": "São Paulo",
  "estado": "SP",
  "cep": "01234-567",
  "profissao": "Profissão",
  "estadoCivil": "solteiro",
  "observacoes": "Observações"
}
```

### searchableData (JSON)
```json
{
  "nomeHash": "hash_do_nome",
  "emailHash": "hash_do_email", 
  "telefoneHash": "hash_do_telefone",
  "categoria": "regular"
}
```

### businessMetrics (JSON)
```json
{
  "ltv": 0,
  "frequencia": 0,
  "ultimoAtendimento": null,
  "nps": null,
  "satisfacaoMedia": 0
}
```

### consents (JSON)
```json
{
  "tratamentoDados": true,
  "marketing": false,
  "dataConsentimento": "2024-01-01T00:00:00.000Z",
  "versaoTermos": "1.0"
}
```

## Verificação

Após a configuração, teste criando um cliente através do modal da aplicação. Os dados devem ser salvos na collection `patients` do Appwrite.

## Troubleshooting

### Erro: Collection not found
- Verifique se a collection `patients` foi criada
- Confirme o DATABASE_ID como `main`

### Erro: Permission denied
- Verifique as permissões da collection
- Confirme se o usuário está autenticado

### Erro: Attribute not found
- Verifique se todos os atributos foram criados
- Confirme os tipos e tamanhos dos atributos

## Próximos Passos

1. ✅ Collection de pacientes/clientes criada
2. 🔄 Implementar upload de arquivos (Storage)
3. 🔄 Implementar criptografia real dos dados sensíveis
4. 🔄 Configurar backup automático
5. 🔄 Implementar auditoria completa