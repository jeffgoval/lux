# 🔄 Sistema de Backup do Supabase

Sistema simples e eficaz para backup do banco de dados Supabase via API.

## 📋 Arquivos Incluídos

- `backup-supabase-final.js` - Script principal de backup via API
- `schedule-backup.js` - Agendador simples de backups
- `backup-supabase.bat` - Script para Windows (facilita o uso)

## 🚀 Como Usar

### Backup Manual (Recomendado)

```bash
# Backup via API (funciona sempre)
npm run backup:api

# Ou diretamente
node scripts/backup-supabase-final.js
```

### Windows - Uso Simplificado

```cmd
# Backup manual
backup-supabase.bat

# Backup único programado
backup-supabase.bat once

# Agendador contínuo
backup-supabase.bat schedule
```

### Backup Automático

```bash
# Backup único
npm run backup:once

# Agendador (backup a cada hora)
npm run backup:schedule
```

## 📊 O que é Feito Backup

O sistema tenta fazer backup das seguintes tabelas:
- `profiles` ✅
- `user_roles` ✅  
- `organizations`, `clinics`, `roles`, etc. (se existirem)

**Nota**: Tabelas que retornam erro 404 simplesmente não existem ainda ou não têm acesso público.

### Restauração

```bash
# Script interativo de restauração
node scripts/restore-supabase.js
```

O script irá:
1. Listar todos os backups disponíveis
2. Permitir seleção do backup desejado
3. Verificar integridade do arquivo
4. Escolher ambiente (local ou produção)
5. Executar restauração com confirmações de segurança

## 📁 Estrutura de Arquivos

```
backups/
├── backup_full_2025-01-12_14-30-00.sql
├── backup_schema_2025-01-12_08-00-00.sql
└── backup_data_2025-01-12_12-15-30.sql

logs/
└── backup-scheduler.log
```

## 🔧 Configurações Avançadas

### Personalizar Agendamentos

Edite `backup-scheduler.js`:

```javascript
const SCHEDULE_CONFIG = {
  dailyFull: '0 2 * * *',      // 2:00 AM diário
  schemaBackup: '0 */6 * * *', // A cada 6 horas
  hourlyData: '0 * * * *'      // A cada hora
};
```

### Configurar Notificações

No `backup-scheduler.js`, descomente e configure:

```javascript
// Webhook do Slack
const webhook = 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL';

// Ou configure email, Discord, etc.
```

### Alterar Retenção de Backups

Em `backup-supabase.js`:

```javascript
const CONFIG = {
  maxBackups: 20, // Manter 20 backups em vez de 10
};
```

## 🛡️ Segurança

### Backup Local (Desenvolvimento)
- Usa conexão local do Supabase
- Seguro para testes e desenvolvimento

### Backup Produção
- Requer string de conexão explícita
- Múltiplas confirmações de segurança
- Logs detalhados de todas as operações

### Boas Práticas
- Mantenha backups em local seguro
- Teste restaurações regularmente
- Configure notificações de erro
- Monitore espaço em disco

## 🚨 Solução de Problemas

### Erro: "Supabase CLI não encontrado"
```bash
npm install -g supabase
supabase login
```

### Erro: "Projeto não linkado"
```bash
supabase link --project-ref dvnyfwpphuuujhodqkko
```

### Backup vazio ou corrompido
- Verifique conectividade com internet
- Confirme permissões do projeto
- Verifique espaço em disco

### Falha na restauração
- Confirme integridade do backup
- Verifique string de conexão
- Teste em ambiente local primeiro

## 📊 Monitoramento

### Logs do Sistema
```bash
# Ver logs do agendador
tail -f logs/backup-scheduler.log

# Ver status dos backups
ls -la backups/
```

### Verificação de Saúde
O sistema verifica automaticamente:
- Disponibilidade da Supabase CLI
- Espaço em disco
- Conectividade de rede
- Integridade dos backups

## 🔄 Automação com CI/CD

### GitHub Actions
```yaml
name: Backup Database
on:
  schedule:
    - cron: '0 2 * * *'  # Diário às 2:00 AM

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install Supabase CLI
        run: npm install -g supabase
      - name: Run Backup
        run: node scripts/backup-supabase.js
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique os logs em `logs/backup-scheduler.log`
2. Teste conectividade: `supabase status`
3. Verifique permissões do projeto no dashboard Supabase

## 🎯 Próximos Passos

1. **Teste o sistema**: Execute um backup manual
2. **Configure agendamento**: Inicie o scheduler
3. **Teste restauração**: Use um backup em ambiente local
4. **Configure notificações**: Adicione webhooks ou email
5. **Monitore regularmente**: Verifique logs e integridade