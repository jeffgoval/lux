# 📊 Análise de Lacunas: WARP.md vs Banco Remoto

**Data:** 14 de setembro de 2025  
**Status:** 🔴 CRÍTICO - Nenhuma tabela encontrada no banco remoto

## 🎯 Resumo Executivo

O arquivo `WARP.md` documenta a existência de 16+ tabelas essenciais para o sistema de gestão de clínicas estéticas, mas **nenhuma dessas tabelas está presente no banco de dados Supabase remoto**. 

**Progresso atual:** 0% (0/16+ tabelas implementadas)

## 📋 Tabelas Documentadas vs Realidade

### ❌ **TABELAS FALTANTES (Todas)**

| # | Nome da Tabela | Criticidade | Dependências | Status |
|---|---|---|---|---|
| 1 | `profiles` | 🔴 CRÍTICA | auth.users | FALTANTE |
| 2 | `user_roles` | 🔴 CRÍTICA | profiles, organizacoes, clinicas | FALTANTE |
| 3 | `organizacoes` | 🟡 MÉDIA | profiles | FALTANTE |
| 4 | `clinicas` | 🔴 CRÍTICA | organizacoes, profiles | FALTANTE |
| 5 | `clinica_profissionais` | 🔴 CRÍTICA | clinicas, profiles | FALTANTE |
| 6 | `especialidades_medicas` | 🟡 MÉDIA | - | FALTANTE |
| 7 | `templates_procedimentos` | 🟡 MÉDIA | clinicas | FALTANTE |
| 8 | `prontuarios` | 🔴 CRÍTICA | clinicas, profiles | FALTANTE |
| 9 | `sessoes_atendimento` | 🔴 CRÍTICA | prontuarios, profiles | FALTANTE |
| 10 | `imagens_medicas` | 🟡 MÉDIA | sessoes_atendimento | FALTANTE |
| 11 | `consentimentos_digitais` | 🟡 MÉDIA | prontuarios, profiles | FALTANTE |
| 12 | `auditoria_medica` | 🟡 MÉDIA | prontuarios, profiles | FALTANTE |
| 13 | `profissionais_especialidades` | 🟡 MÉDIA | profiles, especialidades_medicas | FALTANTE |
| 14 | `convites` | 🟡 MÉDIA | organizacoes, clinicas, profiles | FALTANTE |
| 15 | `user_sessions` | 🟡 MÉDIA | profiles | FALTANTE |
| 16 | `salas_clinica` | 🟡 MÉDIA | clinicas | FALTANTE |

## 🔗 Análise de Dependências

### Ordem de Criação Recomendada (por nível de dependência):

**Nível 0 - Independentes (podem ser criadas primeiro):**
- `especialidades_medicas`

**Nível 1 - Dependem apenas de auth.users:**
- `profiles`

**Nível 2 - Dependem de profiles:**
- `organizacoes`
- `user_sessions`
- `profissionais_especialidades`

**Nível 3 - Dependem de organizacoes:**
- `clinicas`
- `convites`

**Nível 4 - Dependem de clinicas:**
- `clinica_profissionais`
- `templates_procedimentos`
- `salas_clinica`
- `user_roles` (também depende de organizacoes)

**Nível 5 - Dependem de clinicas + profiles:**
- `prontuarios`

**Nível 6 - Dependem de prontuarios:**
- `sessoes_atendimento`
- `consentimentos_digitais`
- `auditoria_medica`

**Nível 7 - Dependem de sessoes_atendimento:**
- `imagens_medicas`

## 🛠️ Tipos e Enums Necessários

### Enums que devem ser criados ANTES das tabelas:

```sql
-- Tipos de plano
CREATE TYPE plano_type AS ENUM ('basico', 'premium', 'enterprise');

-- Tipos de role de usuário
CREATE TYPE user_role_type AS ENUM (
  'super_admin', 'proprietaria', 'gerente', 
  'profissionais', 'recepcionistas', 'visitante', 'cliente'
);

-- Especialidades médicas
CREATE TYPE especialidade_medica AS ENUM (
  'dermatologia', 'cirurgia_plastica', 'medicina_estetica',
  'fisioterapia_estetica', 'nutricao', 'psicologia',
  'enfermagem_estetica', 'biomedicina_estetica'
);

-- Status de convites
CREATE TYPE status_convite AS ENUM (
  'pendente', 'aceito', 'recusado', 'cancelado', 'expirado'
);

-- Tipos de procedimento
CREATE TYPE tipo_procedimento AS ENUM (
  'botox_toxina', 'preenchimento', 'harmonizacao_facial',
  'laser_ipl', 'peeling', 'tratamento_corporal', 
  'skincare_avancado', 'outro'
);

-- Status do prontuário
CREATE TYPE status_prontuario AS ENUM (
  'ativo', 'arquivado', 'transferido'
);
```

## 🔧 Funções Necessárias

```sql
-- Funções de validação
CREATE OR REPLACE FUNCTION validate_email(email TEXT) RETURNS BOOLEAN;
CREATE OR REPLACE FUNCTION validate_cpf(cpf TEXT) RETURNS BOOLEAN;
CREATE OR REPLACE FUNCTION validate_cnpj(cnpj TEXT) RETURNS BOOLEAN;

-- Funções de trigger
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER;

-- Funções utilitárias
CREATE OR REPLACE FUNCTION generate_secure_token(length INTEGER) RETURNS TEXT;
```

## 🚀 Plano de Implementação

### Fase 1 - Fundação (Crítico)
1. Criar extensões e tipos base
2. Criar funções utilitárias
3. Criar `especialidades_medicas` (referência)
4. Criar `profiles` (base de usuários)

### Fase 2 - Estrutura Organizacional
1. Criar `organizacoes`
2. Criar `clinicas`
3. Criar `user_roles`

### Fase 3 - Recursos Principais
1. Criar `clinica_profissionais`
2. Criar `templates_procedimentos`
3. Criar `prontuarios`

### Fase 4 - Recursos Avançados
1. Criar `sessoes_atendimento`
2. Criar `imagens_medicas`
3. Criar `consentimentos_digitais`
4. Criar `auditoria_medica`

### Fase 5 - Funcionalidades Auxiliares
1. Criar `profissionais_especialidades`
2. Criar `convites`
3. Criar `user_sessions`
4. Criar `salas_clinica`

## ⚠️ Riscos e Impactos

### 🔴 **CRÍTICO** - Sistema Não Funcional
- **Auth/Onboarding:** Sem `profiles` e `user_roles`, o sistema de autenticação não funciona
- **Multi-tenancy:** Sem `organizacoes` e `clinicas`, não há isolamento de dados
- **Funcionalidade Core:** Sem `prontuarios` e `sessoes_atendimento`, não há funcionalidade médica

### 🟡 **MÉDIO** - Funcionalidades Limitadas
- Templates, especialidades e convites são importantes mas não bloqueantes
- Auditoria e sessões podem ser implementadas posteriormente

## 🎯 Próximos Passos Recomendados

1. **URGENTE:** Criar scripts de migração para as tabelas críticas (Fase 1-3)
2. **MÉDIO:** Implementar funcionalidades avançadas (Fase 4-5)
3. **BAIXO:** Otimizar índices e performance

## 📝 Observações Técnicas

- Todas as tabelas precisam de RLS (Row Level Security) habilitado
- Índices de performance devem ser criados junto com as tabelas
- Triggers de `updated_at` devem ser aplicados onde necessário
- Políticas de segurança RLS devem ser definidas após criação das tabelas

---

**⚡ Status:** Pronto para criação de scripts de migração  
**🎯 Prioridade:** MÁXIMA - Sistema completamente não funcional sem essas tabelas