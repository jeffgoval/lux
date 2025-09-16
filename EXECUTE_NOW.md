# 🚀 EXECUTAR CONFIGURAÇÃO DO APPWRITE AGORA

## 📋 Passos para Configurar

### 1. Faça Login no Appwrite CLI
```bash
appwrite login
```
- Use o **email** da sua conta Appwrite
- Use a **senha** da sua conta Appwrite

### 2. Execute o Script de Configuração
```bash
.\setup-appwrite.bat
```

Ou manualmente, execute cada comando:

## 🔧 Comandos Manuais (se o script falhar)

### Inicializar projeto:
```bash
appwrite init project --project-id 68c841cf00032cd36a87
```

### Criar database:
```bash
appwrite databases create --database-id main --name "Sistema Clínicas Estética"
```

### Criar collections essenciais:

#### 1. Profiles:
```bash
appwrite databases createCollection --database-id main --collection-id profiles --name "User Profiles" --permissions "read(\"users\")" "write(\"users\")" --document-security false

appwrite databases createStringAttribute --database-id main --collection-id profiles --key user_id --size 255 --required true
appwrite databases createStringAttribute --database-id main --collection-id profiles --key nome_completo --size 255 --required true
appwrite databases createStringAttribute --database-id main --collection-id profiles --key email --size 255 --required true
appwrite databases createBooleanAttribute --database-id main --collection-id profiles --key ativo --required true --default true
appwrite databases createBooleanAttribute --database-id main --collection-id profiles --key primeiro_acesso --required true --default true
```

#### 2. User Roles:
```bash
appwrite databases createCollection --database-id main --collection-id user_roles --name "User Roles" --permissions "read(\"users\")" "write(\"users\")" --document-security false

appwrite databases createStringAttribute --database-id main --collection-id user_roles --key user_id --size 255 --required true
appwrite databases createStringAttribute --database-id main --collection-id user_roles --key organizacao_id --size 255 --required false
appwrite databases createStringAttribute --database-id main --collection-id user_roles --key clinica_id --size 255 --required false
appwrite databases createEnumAttribute --database-id main --collection-id user_roles --key role --elements "super_admin","proprietaria","gerente","profissionais","recepcionistas","visitante","cliente" --required true
appwrite databases createBooleanAttribute --database-id main --collection-id user_roles --key ativo --required true --default true
appwrite databases createStringAttribute --database-id main --collection-id user_roles --key criado_por --size 255 --required true
```

#### 3. Clínicas:
```bash
appwrite databases createCollection --database-id main --collection-id clinicas --name "Clínicas" --permissions "read(\"users\")" "write(\"users\")" --document-security false

appwrite databases createStringAttribute --database-id main --collection-id clinicas --key organizacao_id --size 255 --required true
appwrite databases createStringAttribute --database-id main --collection-id clinicas --key nome --size 255 --required true
appwrite databases createBooleanAttribute --database-id main --collection-id clinicas --key ativo --required true --default true
appwrite databases createStringAttribute --database-id main --collection-id clinicas --key criado_por --size 255 --required true
```

### Criar Storage:
```bash
appwrite storage createBucket --bucket-id uploads --name "Sistema Uploads" --permissions "read(\"users\")" "write(\"users\")" --file-security true --maximum-file-size 52428800
```

## ✅ Verificação

Após executar, verifique se funcionou:

```bash
# Listar databases
appwrite databases list

# Listar collections
appwrite databases listCollections --database-id main

# Listar buckets
appwrite storage listBuckets
```

## 🎯 Próximo Passo

Após configurar com sucesso, execute:
```bash
npm run dev
```

E teste se a conexão está funcionando!

---

**💡 Dica**: Se algum comando falhar, aguarde alguns segundos e tente novamente. O Appwrite pode ter rate limiting.