# 🔧 SOLUÇÃO: Perfis não sendo criados no cadastro

## ❗ Problema Identificado
O usuário ao se cadastrar não está sendo criado na tabela `profiles` porque:
1. A tabela `profiles` existe mas tem estrutura incorreta (coluna `user_id` não existe)
2. A trigger `on_auth_user_created` pode não estar funcionando corretamente
3. A função `handle_new_user()` pode ter problemas

## ✅ Solução Implementada

### Arquivos Criados:
- `fix_profiles_table.sql` - Script completo com todas as verificações
- `simple_fix_profiles.sql` - **Script simplificado para execução manual**
- `execute-fix-profiles.cjs` - Script Node.js para execução (não funcionou devido a limitações de RPC)

## 🚀 PASSOS PARA RESOLVER

### Opção 1: Execução via Supabase Dashboard (RECOMENDADO)

1. **Acesse o Supabase Dashboard**
   - Vá para [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Selecione seu projeto `luxe-flow-appoint`

2. **Abra o SQL Editor**
   - Clique em "SQL Editor" no menu lateral
   - Crie uma nova consulta

3. **Execute o Script**
   - Copie todo o conteúdo do arquivo `simple_fix_profiles.sql`
   - Cole no SQL Editor
   - Clique em "Run" para executar

4. **Verifique se funcionou**
   - Execute no SQL Editor: `SELECT COUNT(*) FROM public.profiles;`
   - Deve mostrar 0 (tabela vazia mas criada)

### Opção 2: Usando psql (se tiver acesso direto ao PostgreSQL)

```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" -f simple_fix_profiles.sql
```

## 🧪 TESTE DA SOLUÇÃO

Após executar o script, teste:

1. **Teste de cadastro**
   ```bash
   node check-users.cjs
   ```

2. **Faça um novo cadastro**
   - Vá para a página de auth do seu app
   - Cadastre um novo usuário de teste
   - Email: `teste@example.com`
   - Senha: `123456789`

3. **Verifique se o perfil foi criado**
   ```bash
   node check-users.cjs
   ```
   - Deve mostrar 1 profile criado
   - Deve mostrar 1 user_role criado

## 🔍 O QUE O SCRIPT FAZ

### 1. Limpeza
- ✅ Remove a tabela `profiles` problemática
- ✅ Remove triggers e funções antigas

### 2. Criação da Nova Estrutura
- ✅ Cria tabela `profiles` com estrutura correta
- ✅ Inclui todas as colunas necessárias:
  - `user_id` (referência para auth.users)
  - `nome_completo`, `email`, `telefone`
  - `cpf`, `data_nascimento`, `endereco`
  - `ativo`, `primeiro_acesso`
  - `configuracoes_usuario` (JSONB)
  - timestamps `criado_em`, `atualizado_em`

### 3. Sistema Automático
- ✅ Função `handle_new_user()` que cria perfil automaticamente
- ✅ Trigger `on_auth_user_created` que dispara na criação de usuário
- ✅ Cria também um role básico `visitante` para o usuário

### 4. Segurança
- ✅ Row Level Security (RLS) habilitado
- ✅ Políticas que permitem usuários verem apenas seu próprio perfil
- ✅ Função com `SECURITY DEFINER` para permitir inserção via trigger

## 📋 ESTRUTURA FINAL DA TABELA

```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_completo TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    telefone TEXT,
    avatar_url TEXT,
    cpf TEXT,
    data_nascimento DATE,
    endereco JSONB,
    ativo BOOLEAN NOT NULL DEFAULT true,
    primeiro_acesso BOOLEAN NOT NULL DEFAULT true,
    configuracoes_usuario JSONB DEFAULT '{}'::jsonb,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

## ⚡ FLUXO APÓS A CORREÇÃO

1. **Usuário faz cadastro** → `auth.users` recebe novo registro
2. **Trigger dispara** → `on_auth_user_created` detecta inserção
3. **Função executa** → `handle_new_user()` cria perfil em `profiles`
4. **Role criado** → Usuário recebe role `visitante` em `user_roles`
5. **App funciona** → `useAuth()` encontra perfil e roles do usuário

## 🎯 RESULTADO ESPERADO

Após executar o script:
- ✅ Novos cadastros criarão perfil automaticamente
- ✅ Tabela `profiles` terá estrutura correta
- ✅ AuthContext funcionará corretamente
- ✅ Usuários verão onboarding se `primeiro_acesso = true`

## 🚨 IMPORTANTE

- **Backup**: O script cria backup automático se houver dados existentes
- **Reversível**: Se algo der errado, a tabela de backup pode ser restaurada
- **Teste**: Sempre teste com usuário temporário primeiro

---

**Status**: ✅ Script pronto para execução
**Arquivo principal**: `simple_fix_profiles.sql`
**Próximo passo**: Executar no Supabase Dashboard