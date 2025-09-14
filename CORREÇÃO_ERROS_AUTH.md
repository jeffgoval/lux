# 🛠️ GUIA COMPLETO DE CORREÇÃO DOS ERROS DE AUTENTICAÇÃO

## 📋 PROBLEMAS IDENTIFICADOS

Com base nos erros observados nos logs:

1. **❌ Erro de Refresh Token**: `Invalid Refresh Token: Refresh Token Not Found`
2. **❌ Erro de RLS**: `new row violates row-level security policy for table "user_roles"`  
3. **⚠️ Warnings de Autocomplete**: Inputs sem atributos autocomplete adequados

---

## 🔧 SOLUÇÕES IMPLEMENTADAS

### ✅ **1. Correção dos Inputs de Autocomplete**

**Problema**: Warnings no console sobre falta de atributos autocomplete
**Solução**: Adicionados atributos corretos nos formulários:
- Email: `autocomplete="email"`
- Senha (cadastro): `autocomplete="new-password"`
- Senha (login): `autocomplete="current-password"`

### ✅ **2. Script de Diagnóstico de Autenticação**

**Arquivo**: `scripts/fix-auth-issues.cjs`
**Função**: Diagnostica problemas de conexão e autenticação

### ✅ **3. Script SQL para Correção de RLS**

**Arquivo**: `scripts/fix-rls-policies.sql`  
**Função**: Corrige políticas de Row Level Security restritivas

---

## 🚀 PASSOS PARA RESOLVER OS PROBLEMAS

### **Passo 1: Limpar Estado de Autenticação**

1. **Abrir DevTools** (F12)
2. **Ir para Application > Local Storage**
3. **Executar no Console**:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### **Passo 2: Corrigir Políticas RLS no Supabase**

1. **Acessar**: https://supabase.com/dashboard/project/shzbgjooydruspqajjkf
2. **Ir para**: SQL Editor
3. **Executar o conteúdo completo do arquivo**: `scripts/fix-rls-policies.sql`
4. **Verificar sucesso**: Deve mostrar políticas criadas sem erros

### **Passo 3: Testar o Sistema**

Execute o diagnóstico:
```bash
node scripts/fix-auth-issues.cjs
```

Se tudo estiver correto, deve mostrar:
- ✅ Conexão funcionando
- ✅ Políticas RLS adequadas
- ✅ Trigger handle_new_user ativo

### **Passo 4: Testar Fluxo de Cadastro**

1. **Iniciar aplicação**: `npm run dev`
2. **Ir para**: http://localhost:5173/auth
3. **Fazer cadastro** com dados reais
4. **Verificar**:
   - Redirecionamento para `/onboarding`
   - Sem erros no console
   - Profile e role criados automaticamente

---

## 🔍 VERIFICAÇÕES FINAIS

### **No Console do Browser**

**✅ Sem erros relacionados a**:
- Refresh token
- RLS violations
- Autocomplete warnings

### **No Supabase Dashboard**

**✅ Verificar que existem**:
- Política: `auth_users_can_create_own_roles`
- Política: `auth_users_can_create_own_profile`
- Trigger: `on_auth_user_created`

### **Teste Manual Completo**

1. **Cadastro**: Email + Senha → Sem erros
2. **Onboarding**: Formulário completo → Profile atualizado
3. **Login**: Mesmo email/senha → Dashboard acessível
4. **Logout**: Limpa sessão corretamente

---

## 🆘 SOLUÇÃO DE PROBLEMAS

### **Se o erro de Refresh Token persistir**

```bash
# Limpar completamente o estado
node scripts/fix-auth-issues.cjs --clear

# No browser, executar:
localStorage.removeItem('sb-shzbgjooydruspqajjkf-auth-token')
```

### **Se o erro de RLS persistir**

```sql
-- Executar no SQL Editor do Supabase
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_roles';

-- Se não mostrar políticas, executar novamente o fix-rls-policies.sql
```

### **Se o cadastro não criar profile/role**

```sql
-- Verificar se o trigger existe
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Se não existir, executar a seção do trigger no fix-rls-policies.sql
```

---

## 📊 LOGS ESPERADOS APÓS CORREÇÃO

### **Console do Browser (Limpo)**
```
Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
[Sem outros erros]
```

### **Fluxo de Cadastro (Sucesso)**
```
1. Usuário preenche formulário
2. POST para /auth/v1/signup → 200 OK
3. Trigger executa → Profile + Role criados
4. Redirecionamento para /onboarding → 200 OK
5. Onboarding completo → Dashboard acessível
```

---

## 🎯 RESULTADO FINAL ESPERADO

- ✅ **Refresh Token**: Tokens válidos e renovação automática
- ✅ **RLS**: Políticas permitem operações de onboarding  
- ✅ **Autocomplete**: Sem warnings no console
- ✅ **Fluxo Completo**: Cadastro → Onboarding → Dashboard funcional

---

## 📞 PRÓXIMOS PASSOS

1. **Executar as correções** seguindo este guia
2. **Testar cadastro** de novo usuário
3. **Verificar logs** para confirmar ausência de erros
4. **Monitorar comportamento** em produção

**⚠️ IMPORTANTE**: Execute o script SQL no Supabase antes de testar o cadastro!
