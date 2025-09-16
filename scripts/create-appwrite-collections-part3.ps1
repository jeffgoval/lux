# Script PowerShell para criar collections do Appwrite - Parte 3
# Módulos: Comunicação, Analytics e Integrações/Logs

# Configurações
$DATABASE_ID = "main"
$PROJECT_ID = "68c841cf00032cd36a87"
$ENDPOINT = "https://nyc.cloud.appwrite.io/v1"

# Função helper para executar comandos Appwrite
function Execute-AppwriteCommand {
    param (
        [string]$Command
    )
    Write-Host "Executando: $Command" -ForegroundColor Cyan
    Invoke-Expression $Command
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erro ao executar comando!" -ForegroundColor Red
        exit 1
    }
    Start-Sleep -Seconds 1
}

Write-Host "=== CRIANDO COLLECTIONS PARTE 3 ===" -ForegroundColor Green
Write-Host "Database ID: $DATABASE_ID" -ForegroundColor Yellow
Write-Host ""

# ========== MÓDULO 7: COMUNICAÇÃO ==========
Write-Host "### MÓDULO 7: COMUNICAÇÃO ###" -ForegroundColor Magenta

# Collection: communication_templates
Write-Host "Criando collection: communication_templates" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"communication_templates`" --name `"Templates de Comunicação`" --document-security true"

# Atributos de communication_templates
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"communication_templates`" --key `"tenantId`" --size 255 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"communication_templates`" --key `"clinicId`" --size 255 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"communication_templates`" --key `"name`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"communication_templates`" --key `"code`" --size 100 --required true"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"communication_templates`" --key `"channel`" --elements `"email`",`"sms`",`"whatsapp`",`"push`" --required true"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"communication_templates`" --key `"type`" --elements `"transactional`",`"marketing`",`"internal`" --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"communication_templates`" --key `"subject`" --size 500 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"communication_templates`" --key `"content`" --size 100000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"communication_templates`" --key `"variables`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"communication_templates`" --key `"settings`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"communication_templates`" --key `"analytics`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"communication_templates`" --key `"status`" --elements `"active`",`"inactive`",`"draft`" --required true --default `"draft`""
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"communication_templates`" --key `"createdBy`" --size 255 --required true"

# Índices de communication_templates
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"communication_templates`" --key `"tenant_clinic_idx`" --type `"key`" --attributes `"tenantId`",`"clinicId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"communication_templates`" --key `"code_idx`" --type `"key`" --attributes `"code`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"communication_templates`" --key `"channel_type_idx`" --type `"key`" --attributes `"channel`",`"type`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"communication_templates`" --key `"status_idx`" --type `"key`" --attributes `"status`""

# Collection: campaigns
Write-Host "Criando collection: campaigns" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"campaigns`" --name `"Campanhas`" --document-security true"

# Atributos de campaigns
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"campaigns`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"campaigns`" --key `"clinicId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"campaigns`" --key `"name`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"campaigns`" --key `"description`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"campaigns`" --key `"type`" --elements `"one-time`",`"recurring`",`"triggered`" --required true"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"campaigns`" --key `"objective`" --elements `"retention`",`"reactivation`",`"promotion`",`"education`" --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"campaigns`" --key `"target`" --size 20000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"campaigns`" --key `"content`" --size 10000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"campaigns`" --key `"schedule`" --size 10000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"campaigns`" --key `"budget`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"campaigns`" --key `"performance`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"campaigns`" --key `"status`" --elements `"draft`",`"scheduled`",`"running`",`"paused`",`"completed`" --required true --default `"draft`""
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"campaigns`" --key `"createdBy`" --size 255 --required true"

# Índices de campaigns
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"campaigns`" --key `"tenant_clinic_idx`" --type `"key`" --attributes `"tenantId`",`"clinicId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"campaigns`" --key `"type_idx`" --type `"key`" --attributes `"type`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"campaigns`" --key `"status_idx`" --type `"key`" --attributes `"status`""

# Collection: notifications_log
Write-Host "Criando collection: notifications_log" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --name `"Log de Notificações`" --document-security true"

# Atributos de notifications_log
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --key `"clinicId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --key `"recipientId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --key `"recipientType`" --elements `"user`",`"patient`" --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --key `"templateCode`" --size 100 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --key `"campaignId`" --size 255 --required false"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --key `"channel`" --elements `"email`",`"sms`",`"whatsapp`",`"push`" --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --key `"subject`" --size 500 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --key `"content`" --size 50000 --required true"
Execute-AppwriteCommand "appwrite databases create-datetime-attribute --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --key `"sentAt`" --required true"
Execute-AppwriteCommand "appwrite databases create-datetime-attribute --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --key `"deliveredAt`" --required false"
Execute-AppwriteCommand "appwrite databases create-datetime-attribute --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --key `"openedAt`" --required false"
Execute-AppwriteCommand "appwrite databases create-datetime-attribute --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --key `"clickedAt`" --required false"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --key `"status`" --elements `"sent`",`"delivered`",`"opened`",`"clicked`",`"failed`",`"bounced`" --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --key `"error`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --key `"metadata`" --size 5000 --required false"

# Índices de notifications_log
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --key `"recipient_idx`" --type `"key`" --attributes `"recipientId`",`"recipientType`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --key `"campaign_idx`" --type `"key`" --attributes `"campaignId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --key `"sentAt_idx`" --type `"key`" --attributes `"sentAt`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"notifications_log`" --key `"status_idx`" --type `"key`" --attributes `"status`""

# Collection: segments
Write-Host "Criando collection: segments" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"segments`" --name `"Segmentos de Clientes`" --document-security true"

# Atributos de segments
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"segments`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"segments`" --key `"clinicId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"segments`" --key `"name`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"segments`" --key `"description`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"segments`" --key `"filters`" --size 50000 --required true"
Execute-AppwriteCommand "appwrite databases create-integer-attribute --database-id `"$DATABASE_ID`" --collection-id `"segments`" --key `"memberCount`" --required false --default 0 --min 0"
Execute-AppwriteCommand "appwrite databases create-datetime-attribute --database-id `"$DATABASE_ID`" --collection-id `"segments`" --key `"lastUpdated`" --required false"
Execute-AppwriteCommand "appwrite databases create-boolean-attribute --database-id `"$DATABASE_ID`" --collection-id `"segments`" --key `"isActive`" --required true --default true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"segments`" --key `"createdBy`" --size 255 --required true"

# Índices de segments
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"segments`" --key `"clinic_active_idx`" --type `"key`" --attributes `"clinicId`",`"isActive`""

# ========== MÓDULO 8: ANALYTICS ==========
Write-Host ""
Write-Host "### MÓDULO 8: ANALYTICS ###" -ForegroundColor Magenta

# Collection: kpi_definitions
Write-Host "Criando collection: kpi_definitions" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"kpi_definitions`" --name `"Definições de KPIs`" --document-security true"

# Atributos de kpi_definitions
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"kpi_definitions`" --key `"tenantId`" --size 255 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"kpi_definitions`" --key `"code`" --size 100 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"kpi_definitions`" --key `"name`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"kpi_definitions`" --key `"description`" --size 5000 --required true"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"kpi_definitions`" --key `"category`" --elements `"financial`",`"operational`",`"clinical`",`"marketing`" --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"kpi_definitions`" --key `"calculation`" --size 10000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"kpi_definitions`" --key `"display`" --size 5000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"kpi_definitions`" --key `"refresh`" --size 2000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"kpi_definitions`" --key `"access`" --size 5000 --required true"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"kpi_definitions`" --key `"status`" --elements `"active`",`"inactive`" --required true --default `"active`""

# Índices de kpi_definitions
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"kpi_definitions`" --key `"code_unique`" --type `"unique`" --attributes `"code`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"kpi_definitions`" --key `"category_idx`" --type `"key`" --attributes `"category`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"kpi_definitions`" --key `"status_idx`" --type `"key`" --attributes `"status`""

# Collection: analytics_data
Write-Host "Criando collection: analytics_data" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"analytics_data`" --name `"Dados de Analytics`" --document-security true"

# Atributos de analytics_data
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"analytics_data`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"analytics_data`" --key `"clinicId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"analytics_data`" --key `"kpiCode`" --size 100 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"analytics_data`" --key `"period`" --size 2000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"analytics_data`" --key `"dimensions`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"analytics_data`" --key `"metrics`" --size 10000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"analytics_data`" --key `"metadata`" --size 5000 --required false"

# Índices de analytics_data
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"analytics_data`" --key `"tenant_clinic_kpi_idx`" --type `"key`" --attributes `"tenantId`",`"clinicId`",`"kpiCode`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"analytics_data`" --key `"kpiCode_idx`" --type `"key`" --attributes `"kpiCode`""

# Collection: reports
Write-Host "Criando collection: reports" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"reports`" --name `"Relatórios`" --document-security true"

# Atributos de reports
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"reports`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"reports`" --key `"clinicId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"reports`" --key `"name`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"reports`" --key `"type`" --elements `"financial`",`"operational`",`"clinical`",`"custom`" --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"reports`" --key `"parameters`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"reports`" --key `"format`" --size 20 --required true --default `"pdf`""
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"reports`" --key `"status`" --elements `"pending`",`"processing`",`"completed`",`"failed`" --required true --default `"pending`""
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"reports`" --key `"fileId`" --size 255 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"reports`" --key `"error`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"reports`" --key `"createdBy`" --size 255 --required true"

# Índices de reports
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"reports`" --key `"clinic_type_idx`" --type `"key`" --attributes `"clinicId`",`"type`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"reports`" --key `"status_idx`" --type `"key`" --attributes `"status`""

# ========== MÓDULO 9: INTEGRAÇÕES E LOGS ==========
Write-Host ""
Write-Host "### MÓDULO 9: INTEGRAÇÕES E LOGS ###" -ForegroundColor Magenta

# Collection: integrations_config
Write-Host "Criando collection: integrations_config" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"integrations_config`" --name `"Configuração de Integrações`" --document-security true"

# Atributos de integrations_config
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"integrations_config`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"integrations_config`" --key `"clinicId`" --size 255 --required false"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"integrations_config`" --key `"provider`" --elements `"whatsapp`",`"google`",`"mercadopago`",`"twilio`",`"openai`",`"sendgrid`",`"aws`" --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"integrations_config`" --key `"credentials`" --size 50000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"integrations_config`" --key `"settings`" --size 20000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"integrations_config`" --key `"permissions`" --size 255 --required false --array true"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"integrations_config`" --key `"status`" --elements `"active`",`"inactive`",`"error`" --required true --default `"inactive`""
Execute-AppwriteCommand "appwrite databases create-datetime-attribute --database-id `"$DATABASE_ID`" --collection-id `"integrations_config`" --key `"lastSync`" --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"integrations_config`" --key `"errorLog`" --size 20000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"integrations_config`" --key `"createdBy`" --size 255 --required true"

# Índices de integrations_config
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"integrations_config`" --key `"tenant_provider_idx`" --type `"key`" --attributes `"tenantId`",`"provider`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"integrations_config`" --key `"clinicId_idx`" --type `"key`" --attributes `"clinicId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"integrations_config`" --key `"status_idx`" --type `"key`" --attributes `"status`""

# Collection: audit_logs
Write-Host "Criando collection: audit_logs" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"audit_logs`" --name `"Logs de Auditoria`" --document-security true"

# Atributos de audit_logs
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"audit_logs`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"audit_logs`" --key `"userId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"audit_logs`" --key `"action`" --elements `"create`",`"read`",`"update`",`"delete`",`"login`",`"logout`",`"export`",`"import`" --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"audit_logs`" --key `"resource`" --size 5000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"audit_logs`" --key `"changes`" --size 50000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"audit_logs`" --key `"context`" --size 10000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"audit_logs`" --key `"compliance`" --size 5000 --required false"

# Índices de audit_logs
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"audit_logs`" --key `"tenant_user_idx`" --type `"key`" --attributes `"tenantId`",`"userId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"audit_logs`" --key `"action_idx`" --type `"key`" --attributes `"action`""

# Collection: system_logs
Write-Host "Criando collection: system_logs" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"system_logs`" --name `"Logs do Sistema`" --document-security true"

# Atributos de system_logs
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"system_logs`" --key `"level`" --elements `"debug`",`"info`",`"warning`",`"error`",`"critical`" --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"system_logs`" --key `"service`" --size 100 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"system_logs`" --key `"message`" --size 5000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"system_logs`" --key `"context`" --size 20000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"system_logs`" --key `"stackTrace`" --size 50000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"system_logs`" --key `"userId`" --size 255 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"system_logs`" --key `"requestId`" --size 100 --required false"

# Índices de system_logs
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"system_logs`" --key `"level_service_idx`" --type `"key`" --attributes `"level`",`"service`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"system_logs`" --key `"userId_idx`" --type `"key`" --attributes `"userId`""

# Collection: webhooks_log
Write-Host "Criando collection: webhooks_log" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"webhooks_log`" --name `"Log de Webhooks`" --document-security true"

# Atributos de webhooks_log
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"webhooks_log`" --key `"provider`" --size 100 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"webhooks_log`" --key `"event`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"webhooks_log`" --key `"payload`" --size 100000 --required true"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"webhooks_log`" --key `"status`" --elements `"received`",`"processing`",`"completed`",`"failed`" --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"webhooks_log`" --key `"response`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"webhooks_log`" --key `"error`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-integer-attribute --database-id `"$DATABASE_ID`" --collection-id `"webhooks_log`" --key `"retryCount`" --required false --default 0 --min 0"

# Índices de webhooks_log
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"webhooks_log`" --key `"provider_event_idx`" --type `"key`" --attributes `"provider`",`"event`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"webhooks_log`" --key `"status_idx`" --type `"key`" --attributes `"status`""

Write-Host ""
Write-Host "=== CRIAÇÃO PARTE 3 CONCLUÍDA ===" -ForegroundColor Green
Write-Host "Foram criadas as collections dos módulos 7, 8 e 9" -ForegroundColor Yellow
Write-Host "Execute o script create-appwrite-permissions.ps1 para configurar as permissões das collections" -ForegroundColor Yellow