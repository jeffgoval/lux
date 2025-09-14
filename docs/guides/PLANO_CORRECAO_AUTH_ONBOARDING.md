# 🔥 PLANO DE CORREÇÃO COMPLETA - AUTH/ONBOARDING

**Status**: 🚨 CRÍTICO - Onboarding não funciona por colunas faltantes no banco  
**Erro Principal**: `Could not find the 'cnpj' column of 'clinicas' in the schema cache`

---

## 🎯 PROBLEMAS IDENTIFICADOS

### 1. **Colunas Faltantes na Tabela `clinicas`** (🚨 CRÍTICO)
- ❌ `cnpj` - Campo obrigatório para clínicas brasileiras  
- ❌ `endereco` - Armazenamento de endereço em JSONB  
- ❌ `telefone_principal` - Telefone de contato  
- ❌ `email_contato` - Email de contato  
- ❌ `horario_funcionamento` - Horários em JSONB  
- ❌ `organizacao_id` - Referência à organização (opcional)

### 2. **Coluna Faltante na Tabela `profissionais`**
- ❌ `especialidades` - Array de especialidades médicas

### 3. **OnboardingWizard.tsx** (🔧 FIX APLICADO TEMPORARIAMENTE)
- ✅ Campos problemáticos foram comentados temporariamente
- ⚠️ Funcionalidade reduzida até migração ser aplicada

---

## 🚀 SOLUÇÃO IMEDIATA (15 minutos)

### **PASSO 1: Executar migração no Supabase Dashboard**

1. **Acesse**: https://supabase.com/dashboard/project/dvnyfwpphuuujhodqkko
2. **Vá para**: SQL Editor → New query
3. **Execute o SQL abaixo**:

```sql
-- 🚀 MIGRAÇÃO SIMPLIFICADA - Apenas o essencial para funcionar
-- Execute no Supabase SQL Editor (COPIE E COLE TUDO):

ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS endereco JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS telefone_principal TEXT;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS email_contato TEXT;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS horario_funcionamento JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS organizacao_id UUID;
ALTER TABLE public.profissionais ADD COLUMN IF NOT EXISTS especialidades TEXT[];
```

### **PASSO 2: Verificar se a migração funcionou**

Execute este comando no terminal do projeto:
```bash
node test-migration.cjs
```

**✅ Resultado esperado**: Todas as colunas devem aparecer como "existe"

### **PASSO 3: Restaurar OnboardingWizard**

Após confirmar que as colunas existem, desfaça o fix temporário:

```javascript
// EM src/components/OnboardingWizard.tsx, linha ~306
// MUDAR ISTO:
const clinicaPayload: any = {
  nome: data.nomeClinica,
  // CAMPOS TEMPORARIAMENTE REMOVIDOS - AGUARDANDO MIGRAÇÃO DO BANCO
  // cnpj: data.cnpj || null,
  // etc...
};

// PARA ISTO:
const clinicaPayload: any = {
  nome: data.nomeClinica,
  cnpj: data.cnpj || null,
  endereco: enderecoJson,
  telefone_principal: data.telefoneClinica || null,
  email_contato: data.emailClinica || null,
  horario_funcionamento: horarioFuncionamento
};
```

---

## 🔍 VERIFICAÇÃO COMPLETA

### **Checklist de Testes**:
- [ ] Registro de nova conta funciona
- [ ] Login funciona  
- [ ] Onboarding wizard não quebra
- [ ] Criação de clínica funciona
- [ ] Dados são salvos corretamente
- [ ] Redirecionamento funciona

### **Comandos úteis**:
```bash
# Verificar estrutura do banco
node inspect-database-schema.cjs

# Testar conexão e dados
node -e "console.log('Testando...'); require('./src/utils/authDebugger.ts')"
```

---

## 🛡️ PREVENÇÃO DE PROBLEMAS FUTUROS

### **1. Sincronização de Schema**
- ✅ Arquivo de migração criado: `20250913200000_add_missing_clinicas_columns.sql`
- ✅ Script de inspeção criado: `inspect-database-schema.cjs`

### **2. Validação de Tipos**
```bash
# TODO: Gerar tipos automáticos
supabase gen types typescript --local > src/types/supabase.ts
```

### **3. Testes de Regressão**
```bash
# TODO: Criar testes E2E para onboarding
npm run test:e2e:onboarding
```

---

## 📊 STATUS DO PROJETO

| Componente | Status | Ação Necessária |
|------------|--------|-----------------|
| Banco de Dados | 🔴 Colunas faltantes | **Executar SQL no Dashboard** |
| OnboardingWizard | 🟡 Fix temporário | Restaurar após migração |
| Auth Context | ✅ OK | Nenhuma |
| Políticas RLS | ✅ OK | Nenhuma |

---

## 🎯 PRÓXIMOS PASSOS APÓS CORREÇÃO

1. **Validação completa do fluxo**
2. **Testes com dados reais**
3. **Documentação atualizada**
4. **Deploy para produção**

---

**⚡ URGENTE**: Execute a migração SQL AGORA para restaurar o onboarding!

**🔗 Links importantes**:
- [Supabase Dashboard](https://supabase.com/dashboard/project/dvnyfwpphuuujhodqkko)
- [SQL Editor](https://supabase.com/dashboard/project/dvnyfwpphuuujhodqkko/sql)
- [Arquivo de Migração](./supabase/migrations/20250913200000_add_missing_clinicas_columns.sql)