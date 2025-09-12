# 🚀 Deployment Guide - Auth Database Fix

Este guia fornece instruções passo a passo para aplicar todas as correções de autenticação e onboarding no seu sistema.

## 📋 Pré-requisitos

- Acesso ao Supabase Dashboard
- Backup do banco de dados atual (recomendado)
- Acesso ao código do backend
- Node.js 16+ instalado

## 🎯 Visão Geral das Correções

Esta implementação resolve os seguintes problemas:

1. ✅ **Tabelas faltantes** - Cria todas as tabelas necessárias
2. ✅ **Políticas RLS inadequadas** - Configura políticas permissivas para onboarding
3. ✅ **Fluxo de onboarding incompleto** - Implementa processo completo em transações
4. ✅ **Tratamento de erros** - Adiciona validação e tratamento robusto de erros
5. ✅ **Testes abrangentes** - Inclui testes para todos os componentes

## 🗂️ Arquivos Criados

### Scripts SQL
- `database-setup-complete.sql` - Script completo de configuração do banco
- `database-complete-schema.sql` - Schema completo das tabelas
- `rls-policies-onboarding.sql` - Políticas RLS para onboarding
- `database-integrity-verification.sql` - Funções de verificação

### Backend
- `src/services/OnboardingService.js` - Serviço completo de onboarding
- `src/middleware/errorHandler.js` - Tratamento de erros robusto
- `src/middleware/validation.js` - Validação de dados de entrada
- `src/routes/onboarding.js` - Endpoints de onboarding atualizados

### Testes
- `tests/onboarding.test.js` - Testes abrangentes
- `tests/setup.js` - Configuração de testes
- `package.json` - Configuração atualizada

## 🚀 Procedimento de Deployment

### Etapa 1: Backup do Banco de Dados

```bash
# Faça backup do banco atual (recomendado)
# No Supabase Dashboard > Settings > Database > Database backups
```

### Etapa 2: Executar Script de Configuração Completa

1. **Acesse o Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/[SEU_PROJECT_ID]/sql
   ```

2. **Execute o script principal:**
   - Abra o arquivo `database-setup-complete.sql`
   - Copie todo o conteúdo
   - Cole no SQL Editor do Supabase
   - Clique em "Run" para executar

3. **Verifique a execução:**
   ```sql
   -- Verificar se o setup foi concluído com sucesso
   SELECT * FROM public.setup_log 
   WHERE step_name = 'SETUP_COMPLETE' 
   ORDER BY execution_timestamp DESC 
   LIMIT 1;
   ```

### Etapa 3: Verificar Integridade do Banco

Execute as funções de verificação:

```sql
-- Verificação rápida
SELECT public.quick_health_check();

-- Verificação completa
SELECT public.verify_database_complete();
```

### Etapa 4: Atualizar o Backend

1. **Instalar dependências:**
   ```bash
   cd backend-simple
   npm install
   ```

2. **Executar testes:**
   ```bash
   # Testes específicos de onboarding
   npm run test:onboarding
   
   # Todos os testes
   npm test
   ```

3. **Iniciar o servidor:**
   ```bash
   npm run dev
   ```

### Etapa 5: Verificação Final

1. **Teste o endpoint de saúde:**
   ```bash
   curl http://localhost:8080/api/health
   ```

2. **Teste o onboarding completo:**
   ```bash
   # Registrar usuário
   curl -X POST http://localhost:8080/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "teste@exemplo.com",
       "password": "MinhaSenh@123",
       "nome_completo": "Usuário Teste"
     }'
   
   # Fazer login e obter token
   curl -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "teste@exemplo.com",
       "password": "MinhaSenh@123"
     }'
   
   # Completar onboarding (use o token obtido)
   curl -X POST http://localhost:8080/api/onboarding/complete \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer [SEU_TOKEN]" \
     -d '{
       "nome_completo": "Dr. João Silva",
       "telefone": "11999999999",
       "clinica_nome": "Clínica Teste",
       "registro_profissional": "CRM123456SP"
     }'
   ```

## ✅ Checklist de Verificação

### Banco de Dados
- [ ] Todas as tabelas foram criadas
- [ ] RLS está habilitado em todas as tabelas
- [ ] Políticas RLS estão configuradas
- [ ] Dados de referência foram inseridos
- [ ] Índices foram criados
- [ ] Triggers estão funcionando

### Backend
- [ ] Servidor inicia sem erros
- [ ] Endpoints de saúde respondem
- [ ] Middleware de erro está funcionando
- [ ] Validação de dados está ativa
- [ ] Logs estão sendo gerados

### Funcionalidade
- [ ] Registro de usuário funciona
- [ ] Login funciona
- [ ] Onboarding completo funciona
- [ ] Status do onboarding é retornado corretamente
- [ ] Dados do usuário são recuperados
- [ ] Retry de etapas funciona

### Testes
- [ ] Testes de schema passam
- [ ] Testes de serviço passam
- [ ] Testes de API passam
- [ ] Testes de erro passam
- [ ] Testes de performance passam

## 🔧 Solução de Problemas

### Problema: Tabelas não foram criadas

**Solução:**
```sql
-- Verificar se o script foi executado
SELECT * FROM public.setup_log ORDER BY execution_timestamp DESC;

-- Se necessário, executar novamente o script completo
-- O script é idempotente e pode ser executado múltiplas vezes
```

### Problema: RLS está bloqueando operações

**Solução:**
```sql
-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public';

-- Se necessário, recriar políticas
-- Execute o arquivo rls-policies-onboarding.sql
```

### Problema: Onboarding falha com erro de constraint

**Solução:**
```sql
-- Verificar constraints
SELECT conname, contype, confrelid::regclass as foreign_table
FROM pg_constraint 
WHERE conrelid = 'public.clinica_profissionais'::regclass;

-- Verificar se todas as foreign keys existem
SELECT public.verify_constraints();
```

### Problema: Testes falhando

**Solução:**
```bash
# Verificar variáveis de ambiente
echo $DATABASE_URL
echo $TEST_DATABASE_URL

# Executar testes com debug
DEBUG=1 npm test

# Executar apenas um teste específico
npm test -- --testNamePattern="should complete onboarding"
```

## 📊 Monitoramento Pós-Deployment

### Logs Importantes

1. **Setup do banco:**
   ```sql
   SELECT * FROM public.setup_log 
   WHERE status = 'ERROR' 
   ORDER BY execution_timestamp DESC;
   ```

2. **Logs da aplicação:**
   ```bash
   # Verificar logs do servidor
   tail -f logs/app.log
   
   # Ou no console durante desenvolvimento
   npm run dev
   ```

### Métricas de Saúde

1. **Status do banco:**
   ```sql
   SELECT public.quick_health_check();
   ```

2. **Performance do onboarding:**
   ```sql
   -- Verificar tempo médio de onboarding
   SELECT 
     AVG(EXTRACT(EPOCH FROM (atualizado_em - criado_em))) as avg_seconds
   FROM public.profiles 
   WHERE criado_em > now() - interval '1 day';
   ```

### Alertas Recomendados

1. **Falhas de onboarding** - Monitorar logs de erro
2. **Tempo de resposta** - Alertar se > 10 segundos
3. **Violações RLS** - Monitorar tentativas de acesso negado
4. **Duplicações** - Alertar sobre tentativas de registro duplicado

## 🔄 Rollback (Se Necessário)

Se algo der errado, você pode fazer rollback:

1. **Restaurar backup do banco:**
   - Use o backup criado na Etapa 1
   - No Supabase Dashboard > Settings > Database

2. **Reverter código do backend:**
   ```bash
   git checkout HEAD~1  # Voltar para commit anterior
   npm install
   npm start
   ```

3. **Verificar funcionamento:**
   ```bash
   curl http://localhost:8080/api/health
   ```

## 📞 Suporte

Se encontrar problemas durante o deployment:

1. **Verifique os logs:**
   - Logs do setup: `SELECT * FROM public.setup_log`
   - Logs da aplicação: Console do servidor

2. **Execute verificações:**
   ```sql
   SELECT public.verify_database_complete();
   ```

3. **Teste componentes individuais:**
   ```bash
   npm run test:onboarding
   ```

4. **Documente o erro:**
   - Mensagem de erro completa
   - Passos que levaram ao erro
   - Logs relevantes

## 🎉 Conclusão

Após seguir este guia, seu sistema deve ter:

- ✅ Todas as tabelas necessárias criadas
- ✅ Políticas RLS configuradas corretamente
- ✅ Onboarding funcionando completamente
- ✅ Tratamento robusto de erros
- ✅ Testes abrangentes
- ✅ Monitoramento e verificação

O sistema agora está pronto para produção com um fluxo de onboarding robusto e confiável!