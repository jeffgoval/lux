# Script PowerShell para criar todas as collections do Appwrite
# Sistema Multi-Tenant para Clínicas de Estética Premium

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

Write-Host "=== CRIANDO ESTRUTURA DO BANCO DE DADOS APPWRITE ===" -ForegroundColor Green
Write-Host "Database ID: $DATABASE_ID" -ForegroundColor Yellow
Write-Host "Project ID: $PROJECT_ID" -ForegroundColor Yellow
Write-Host ""

# ========== MÓDULO 1: IDENTIDADE E AUTORIZAÇÃO ==========
Write-Host "### MÓDULO 1: IDENTIDADE E AUTORIZAÇÃO ###" -ForegroundColor Magenta

# Collection: organizations
Write-Host "Criando collection: organizations" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"organizations`" --name `"Organizações`" --document-security true"

# Atributos de organizations
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"organizations`" --key `"name`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"organizations`" --key `"cnpj`" --size 20 --required false"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"organizations`" --key `"plan`" --elements `"basico`",`"premium`",`"enterprise`" --required true --default `"basico`""
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"organizations`" --key `"status`" --elements `"active`",`"suspended`",`"cancelled`" --required true --default `"active`""
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"organizations`" --key `"features`" --size 5000 --required false --array true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"organizations`" --key `"billingInfo`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"organizations`" --key `"settings`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"organizations`" --key `"limits`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"organizations`" --key `"createdBy`" --size 255 --required true"

# Índices de organizations
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"organizations`" --key `"cnpj_unique`" --type `"unique`" --attributes `"cnpj`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"organizations`" --key `"status_idx`" --type `"key`" --attributes `"status`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"organizations`" --key `"plan_idx`" --type `"key`" --attributes `"plan`""

# Collection: clinics
Write-Host "Criando collection: clinics" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"clinics`" --name `"Clínicas`" --document-security true"

# Atributos de clinics
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"clinics`" --key `"organizationId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"clinics`" --key `"name`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"clinics`" --key `"slug`" --size 100 --required true"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"clinics`" --key `"type`" --elements `"matriz`",`"filial`" --required true --default `"matriz`""
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"clinics`" --key `"address`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"clinics`" --key `"contact`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"clinics`" --key `"businessHours`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"clinics`" --key `"settings`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"clinics`" --key `"integrations`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"clinics`" --key `"status`" --elements `"active`",`"inactive`" --required true --default `"active`""
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"clinics`" --key `"createdBy`" --size 255 --required true"

# Índices de clinics
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"clinics`" --key `"organizationId_idx`" --type `"key`" --attributes `"organizationId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"clinics`" --key `"slug_unique`" --type `"unique`" --attributes `"slug`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"clinics`" --key `"status_idx`" --type `"key`" --attributes `"status`""

# Collection: users_profile
Write-Host "Criando collection: users_profile" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"users_profile`" --name `"Perfis de Usuários`" --document-security true"

# Atributos de users_profile
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"users_profile`" --key `"userId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-email-attribute --database-id `"$DATABASE_ID`" --collection-id `"users_profile`" --key `"email`" --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"users_profile`" --key `"fullName`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"users_profile`" --key `"cpf`" --size 255 --required false" # Será criptografado
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"users_profile`" --key `"rg`" --size 255 --required false" # Será criptografado
Execute-AppwriteCommand "appwrite databases create-datetime-attribute --database-id `"$DATABASE_ID`" --collection-id `"users_profile`" --key `"birthDate`" --required false"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"users_profile`" --key `"gender`" --elements `"M`",`"F`",`"O`" --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"users_profile`" --key `"phone`" --size 20 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"users_profile`" --key `"whatsapp`" --size 20 --required false"
Execute-AppwriteCommand "appwrite databases create-url-attribute --database-id `"$DATABASE_ID`" --collection-id `"users_profile`" --key `"avatarUrl`" --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"users_profile`" --key `"address`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"users_profile`" --key `"preferences`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"users_profile`" --key `"metadata`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"users_profile`" --key `"status`" --elements `"active`",`"inactive`",`"blocked`" --required true --default `"active`""

# Índices de users_profile
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"users_profile`" --key `"userId_unique`" --type `"unique`" --attributes `"userId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"users_profile`" --key `"email_unique`" --type `"unique`" --attributes `"email`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"users_profile`" --key `"status_idx`" --type `"key`" --attributes `"status`""

# Collection: user_roles
Write-Host "Criando collection: user_roles" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"user_roles`" --name `"Papéis de Usuários`" --document-security true"

# Atributos de user_roles
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"user_roles`" --key `"userId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"user_roles`" --key `"organizationId`" --size 255 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"user_roles`" --key `"clinicId`" --size 255 --required false"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"user_roles`" --key `"role`" --elements `"super_admin`",`"owner`",`"admin`",`"manager`",`"professional`",`"receptionist`",`"client`" --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"user_roles`" --key `"permissions`" --size 255 --required false --array true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"user_roles`" --key `"departments`" --size 100 --required false --array true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"user_roles`" --key `"specialties`" --size 100 --required false --array true"
Execute-AppwriteCommand "appwrite databases create-float-attribute --database-id `"$DATABASE_ID`" --collection-id `"user_roles`" --key `"commissionRate`" --required false --min 0 --max 100"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"user_roles`" --key `"workSchedule`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-datetime-attribute --database-id `"$DATABASE_ID`" --collection-id `"user_roles`" --key `"validFrom`" --required true"
Execute-AppwriteCommand "appwrite databases create-datetime-attribute --database-id `"$DATABASE_ID`" --collection-id `"user_roles`" --key `"validUntil`" --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"user_roles`" --key `"createdBy`" --size 255 --required true"

# Índices de user_roles
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"user_roles`" --key `"userId_clinicId_idx`" --type `"key`" --attributes `"userId`",`"clinicId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"user_roles`" --key `"organizationId_idx`" --type `"key`" --attributes `"organizationId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"user_roles`" --key `"role_idx`" --type `"key`" --attributes `"role`""

# ========== MÓDULO 2: CLIENTES/PACIENTES ==========
Write-Host "" 
Write-Host "### MÓDULO 2: CLIENTES/PACIENTES ###" -ForegroundColor Magenta

# Collection: patients
Write-Host "Criando collection: patients" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"patients`" --name `"Pacientes`" --document-security true"

# Atributos de patients
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"patients`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"patients`" --key `"clinicId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"patients`" --key `"code`" --size 50 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"patients`" --key `"personalInfo`" --size 10000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"patients`" --key `"contact`" --size 10000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"patients`" --key `"healthInfo`" --size 20000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"patients`" --key `"marketing`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"patients`" --key `"metrics`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"patients`" --key `"consent`" --size 5000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"patients`" --key `"notes`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"patients`" --key `"status`" --elements `"active`",`"inactive`",`"blocked`" --required true --default `"active`""
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"patients`" --key `"createdBy`" --size 255 --required true"

# Índices de patients
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"patients`" --key `"tenant_clinic_idx`" --type `"key`" --attributes `"tenantId`",`"clinicId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"patients`" --key `"code_idx`" --type `"key`" --attributes `"code`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"patients`" --key `"status_idx`" --type `"key`" --attributes `"status`""

# ========== MÓDULO 3: AGENDAMENTOS ==========
Write-Host ""
Write-Host "### MÓDULO 3: AGENDAMENTOS ###" -ForegroundColor Magenta

# Collection: services
Write-Host "Criando collection: services" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"services`" --name `"Serviços`" --document-security true"

# Atributos de services
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"services`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"services`" --key `"clinicId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"services`" --key `"categoryId`" --size 255 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"services`" --key `"name`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"services`" --key `"description`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"services`" --key `"code`" --size 50 --required true"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"services`" --key `"type`" --elements `"procedure`",`"consultation`",`"package`" --required true --default `"procedure`""
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"services`" --key `"pricing`" --size 10000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"services`" --key `"duration`" --size 1000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"services`" --key `"requirements`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"services`" --key `"protocols`" --size 20000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"services`" --key `"commission`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"services`" --key `"media`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"services`" --key `"seo`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"services`" --key `"status`" --elements `"active`",`"inactive`",`"draft`" --required true --default `"draft`""
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"services`" --key `"createdBy`" --size 255 --required true"

# Índices de services
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"services`" --key `"tenant_clinic_idx`" --type `"key`" --attributes `"tenantId`",`"clinicId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"services`" --key `"code_unique`" --type `"unique`" --attributes `"code`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"services`" --key `"status_idx`" --type `"key`" --attributes `"status`""

# Collection: appointments
Write-Host "Criando collection: appointments" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --name `"Agendamentos`" --document-security true"

# Atributos de appointments
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"clinicId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"code`" --size 50 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"patientId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"professionalId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"serviceId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"roomId`" --size 255 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"scheduling`" --size 5000 --required true"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"source`" --elements `"app`",`"whatsapp`",`"phone`",`"walk-in`",`"ai`" --required true --default `"app`""
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"aiMetadata`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"status`" --elements `"scheduled`",`"confirmed`",`"in-progress`",`"completed`",`"cancelled`",`"no-show`" --required true --default `"scheduled`""
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"statusHistory`" --size 20000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"financial`" --size 10000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"checkin`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"notes`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"reminders`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"rating`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"createdBy`" --size 255 --required true"

# Índices de appointments
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"tenant_clinic_date_idx`" --type `"key`" --attributes `"tenantId`",`"clinicId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"patientId_idx`" --type `"key`" --attributes `"patientId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"professionalId_idx`" --type `"key`" --attributes `"professionalId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"status_idx`" --type `"key`" --attributes `"status`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"appointments`" --key `"code_unique`" --type `"unique`" --attributes `"code`""

# Collection: waiting_list
Write-Host "Criando collection: waiting_list" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"waiting_list`" --name `"Lista de Espera`" --document-security true"

# Atributos de waiting_list
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"waiting_list`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"waiting_list`" --key `"clinicId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"waiting_list`" --key `"patientId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"waiting_list`" --key `"serviceId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"waiting_list`" --key `"professionalId`" --size 255 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"waiting_list`" --key `"preferences`" --size 10000 --required true"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"waiting_list`" --key `"priority`" --elements `"low`",`"medium`",`"high`" --required true --default `"medium`""
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"waiting_list`" --key `"reason`" --size 1000 --required false"
Execute-AppwriteCommand "appwrite databases create-float-attribute --database-id `"$DATABASE_ID`" --collection-id `"waiting_list`" --key `"aiScore`" --required false --min 0 --max 1"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"waiting_list`" --key `"status`" --elements `"waiting`",`"notified`",`"scheduled`",`"expired`" --required true --default `"waiting`""
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"waiting_list`" --key `"notifications`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-datetime-attribute --database-id `"$DATABASE_ID`" --collection-id `"waiting_list`" --key `"expiresAt`" --required true"

# Índices de waiting_list
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"waiting_list`" --key `"tenant_clinic_status_idx`" --type `"key`" --attributes `"tenantId`",`"clinicId`",`"status`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"waiting_list`" --key `"patientId_idx`" --type `"key`" --attributes `"patientId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"waiting_list`" --key `"priority_idx`" --type `"key`" --attributes `"priority`""

Write-Host ""
Write-Host "=== CRIAÇÃO PARCIAL CONCLUÍDA ===" -ForegroundColor Green
Write-Host "Foram criadas as collections dos módulos 1, 2 e 3" -ForegroundColor Yellow
Write-Host "Execute o script create-appwrite-collections-part2.ps1 para criar o restante das collections" -ForegroundColor Yellow