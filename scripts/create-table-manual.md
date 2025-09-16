# 🎯 Como Criar a Tabela no Console do Appwrite

Já que a API Key não tem permissões suficientes, vamos criar manualmente no console:

## 📋 **Passo a Passo:**

### 1. **Acesse o Console**
- Vá para: https://cloud.appwrite.io/console
- Faça login na sua conta
- Selecione o projeto **"Estetic"**

### 2. **Criar Database**
- No menu lateral, clique em **"Databases"**
- Clique no botão **"Create Database"**
- **Name**: `Main Database`
- **Database ID**: `main`
- Clique **"Create"**

### 3. **Criar Tabela**
- Dentro do database "main", clique em **"Create Collection"**
- **Name**: `Patients`
- **Collection ID**: `patients`
- Clique **"Create"**

### 4. **Adicionar Colunas (Attributes)**
Na tabela "patients", vá para a aba **"Attributes"** e adicione estas colunas:

#### Clique em "Create Attribute" → "String" para cada uma:

1. **clinicId**
   - Type: String
   - Size: 255
   - Required: ✅ Yes
   - Array: ❌ No

2. **code**
   - Type: String
   - Size: 50
   - Required: ✅ Yes
   - Array: ❌ No

3. **personalInfoEncrypted**
   - Type: String
   - Size: 10000
   - Required: ✅ Yes
   - Array: ❌ No

4. **searchableData**
   - Type: String
   - Size: 2000
   - Required: ✅ Yes
   - Array: ❌ No

5. **businessMetrics**
   - Type: String
   - Size: 2000
   - Required: ✅ Yes
   - Array: ❌ No

6. **consents**
   - Type: String
   - Size: 2000
   - Required: ✅ Yes
   - Array: ❌ No

7. **tags**
   - Type: String
   - Size: 1000
   - Required: ❌ No
   - Array: ❌ No

8. **vipLevel**
   - Type: String
   - Size: 50
   - Required: ❌ No
   - Array: ❌ No

9. **createdBy**
   - Type: String
   - Size: 255
   - Required: ✅ Yes
   - Array: ❌ No

10. **updatedBy**
    - Type: String
    - Size: 255
    - Required: ✅ Yes
    - Array: ❌ No

### 5. **Configurar Permissões**
- Vá para a aba **"Settings"** da collection
- **Document Security**: ✅ Enabled
- **Permissions**:
  - Read: `users`
  - Create: `users`
  - Update: `users`
  - Delete: `users`

### 6. **Criar Índices (Opcional)**
Na aba **"Indexes"**, clique **"Create Index"**:

1. **clinicId_idx**
   - Type: Key
   - Attributes: `clinicId`

2. **code_idx**
   - Type: Key
   - Attributes: `code`

---

## ✅ **Verificação**

Depois de criar tudo, você deve ver:
- ✅ Database: "main"
- ✅ Collection: "patients"
- ✅ 10 attributes (colunas)
- ✅ Permissões configuradas
- ✅ 2 índices (opcional)

## 🚀 **Teste**

Depois de criar a estrutura:
1. Volte para a aplicação
2. Abra o modal de novo cliente
3. Preencha os dados
4. Clique em "Criar Cliente"
5. Verifique no console do Appwrite se o documento foi criado!

---

**Precisa de ajuda? Me avise quando terminar de criar a estrutura!** 🎉