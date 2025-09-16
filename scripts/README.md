# 📚 Scripts de Configuração do Banco de Dados Appwrite

Este diretório contém todos os scripts necessários para criar a estrutura completa do banco de dados no Appwrite para o sistema Luxe Flow de clínicas de estética premium.

## 📋 Visão Geral

O sistema é composto por **32 collections** organizadas em **9 módulos funcionais**, com arquitetura multi-tenant, segurança LGPD e integração com IA.

## 🚀 Como Executar

### Opção 1: Setup Completo (Recomendado)

Execute o script mestre que rodará todos os outros na ordem correta:

```powershell
cd C:\Users\jonra\estetic\luxe-flow-appoint
.\scripts\setup-complete-database.ps1
```

Este script irá:
1. Verificar pré-requisitos (Appwrite CLI instalado e logado)
2. Criar todas as collections com atributos
3. Configurar índices para otimização
4. Aplicar permissões básicas
5. Exibir resumo do que foi criado

**Tempo estimado**: 15-20 minutos

### Opção 2: Execução Individual

Se preferir executar cada parte separadamente:

```powershell
# Parte 1: Módulos 1-3 (Identidade, Pacientes, Agendamentos)
.\scripts\create-appwrite-collections.ps1

# Parte 2: Módulos 4-6 (Prontuários, Financeiro, Estoque)
.\scripts\create-appwrite-collections-part2.ps1

# Parte 3: Módulos 7-9 (Comunicação, Analytics, Logs)
.\scripts\create-appwrite-collections-part3.ps1

# Configurar Permissões
.\scripts\create-appwrite-permissions.ps1
```

## 📁 Estrutura dos Scripts

### `setup-complete-database.ps1`
Script mestre que executa todos os outros na ordem correta. Inclui:
- Verificação de pré-requisitos
- Execução sequencial dos scripts
- Tratamento de erros
- Resumo final

### `create-appwrite-collections.ps1`
Cria collections dos módulos 1-3:
- **Módulo 1**: organizations, clinics, users_profile, user_roles
- **Módulo 2**: patients
- **Módulo 3**: services, appointments, waiting_list

### `create-appwrite-collections-part2.ps1`
Cria collections dos módulos 4-6:
- **Módulo 4**: medical_records, medical_images, consent_forms
- **Módulo 5**: transactions, commissions, payment_methods
- **Módulo 6**: products, inventory_movements, suppliers, purchase_orders

### `create-appwrite-collections-part3.ps1`
Cria collections dos módulos 7-9:
- **Módulo 7**: communication_templates, campaigns, notifications_log, segments
- **Módulo 8**: kpi_definitions, analytics_data, reports
- **Módulo 9**: integrations_config, audit_logs, system_logs, webhooks_log

### `create-appwrite-permissions.ps1`
Configura permissões ABAC básicas para todas as collections.

## ⚙️ Pré-requisitos

1. **Appwrite CLI instalado**
   ```bash
   npm install -g appwrite-cli
   ```

2. **Login no Appwrite**
   ```bash
   appwrite login
   ```

3. **Projeto configurado**
   - Project ID: `68c841cf00032cd36a87`
   - Endpoint: `https://nyc.cloud.appwrite.io/v1`

## 🔧 Configuração

Todos os scripts usam as seguintes configurações:

```powershell
$DATABASE_ID = "main"
$PROJECT_ID = "68c841cf00032cd36a87"
$ENDPOINT = "https://nyc.cloud.appwrite.io/v1"
```

Para alterar, edite as variáveis no início de cada script.

## 📊 Collections Criadas

### Total: 32 Collections

| Módulo | Collections | Quantidade |
|--------|------------|------------|
| Identidade | organizations, clinics, users_profile, user_roles | 4 |
| Pacientes | patients | 1 |
| Agendamentos | services, appointments, waiting_list | 3 |
| Prontuários | medical_records, medical_images, consent_forms | 3 |
| Financeiro | transactions, commissions, payment_methods | 3 |
| Estoque | products, inventory_movements, suppliers, purchase_orders | 4 |
| Comunicação | communication_templates, campaigns, notifications_log, segments | 4 |
| Analytics | kpi_definitions, analytics_data, reports | 3 |
| Logs | integrations_config, audit_logs, system_logs, webhooks_log | 4 |

## 🔐 Segurança

- **Multi-tenant**: Isolamento por `tenantId` e `clinicId`
- **LGPD**: Campos sensíveis marcados para criptografia
- **Auditoria**: Logs completos em `audit_logs`
- **Permissões**: ABAC configurado (necessita ajustes após Functions)

## ❗ Observações Importantes

1. **Permissões temporárias**: As permissões estão configuradas como `role:all` temporariamente. Ajuste após criar as Appwrite Functions.

2. **Campos JSON**: Muitos campos complexos são armazenados como strings JSON. Parse será necessário no frontend.

3. **Índices**: Mais de 100 índices foram criados para otimização. Monitor o desempenho e ajuste conforme necessário.

4. **Limites de tamanho**: Alguns campos têm limites grandes (até 1MB). Considere otimizar se necessário.

## 🚨 Troubleshooting

### Erro: "Appwrite CLI não está instalado"
```bash
npm install -g appwrite-cli
```

### Erro: "Você não está logado no Appwrite"
```bash
appwrite login
```

### Erro: "Collection já existe"
- Execute os scripts individualmente pulando os que já foram criados
- Ou delete as collections existentes no console do Appwrite

### Erro de timeout
- Aumente o delay entre comandos editando `Start-Sleep -Seconds 1` nos scripts
- Execute os scripts em partes menores

## 📝 Próximos Passos

Após executar os scripts:

1. **Verificar no Console**
   - Acesse: https://cloud.appwrite.io/console/project-68c841cf00032cd36a87/databases
   - Verifique se todas as collections foram criadas

2. **Criar Appwrite Functions**
   - Validação ABAC avançada
   - Criptografia de dados sensíveis
   - Triggers de negócio
   - Integração com IA

3. **Configurar Storage**
   - Criar bucket para arquivos
   - Configurar permissões

4. **Ajustar Permissões**
   - Substituir `role:all` por permissões específicas
   - Implementar validação por tenant

5. **Popular Dados Iniciais**
   - Criar script de seed
   - Importar dados do Supabase

## 📞 Suporte

Em caso de dúvidas ou problemas:
- Verifique os logs detalhados dos scripts
- Consulte a documentação do Appwrite
- Revise o arquivo ESTRUTURA_BANCO_APPWRITE_COMPLETA.md