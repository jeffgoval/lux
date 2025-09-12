# 📁 Diretório de Backups

Este diretório armazena os backups automáticos do banco de dados Supabase.

## 📋 Tipos de Backup

- `backup_full_*.sql` - Backup completo (schema + dados)
- `backup_schema_*.sql` - Apenas estrutura do banco
- `backup_data_*.sql` - Apenas dados

## 🔄 Retenção

O sistema mantém automaticamente os 10 backups mais recentes de cada tipo.

## 🚨 Importante

- Arquivos de backup não são versionados no Git
- Mantenha backups importantes em local seguro
- Teste restaurações regularmente