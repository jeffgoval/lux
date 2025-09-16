# Script PowerShell para criar collections do Appwrite - Parte 2
# Módulos: Prontuários Médicos, Financeiro e Estoque

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

Write-Host "=== CRIANDO COLLECTIONS PARTE 2 ===" -ForegroundColor Green
Write-Host "Database ID: $DATABASE_ID" -ForegroundColor Yellow
Write-Host ""

# ========== MÓDULO 4: PRONTUÁRIOS MÉDICOS ==========
Write-Host "### MÓDULO 4: PRONTUÁRIOS MÉDICOS ###" -ForegroundColor Magenta

# Collection: medical_records
Write-Host "Criando collection: medical_records" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"medical_records`" --name `"Prontuários Médicos`" --document-security true"

# Atributos de medical_records
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_records`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_records`" --key `"clinicId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_records`" --key `"patientId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_records`" --key `"appointmentId`" --size 255 --required false"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_records`" --key `"type`" --elements `"anamnesis`",`"evolution`",`"prescription`",`"exam`" --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_records`" --key `"template`" --size 255 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_records`" --key `"data`" --size 1000000 --required true" # 1MB para dados criptografados
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_records`" --key `"attachments`" --size 20000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_records`" --key `"signature`" --size 5000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_records`" --key `"revision`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_records`" --key `"access`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_records`" --key `"compliance`" --size 5000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_records`" --key `"createdBy`" --size 255 --required true"

# Índices de medical_records
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"medical_records`" --key `"tenant_clinic_patient_idx`" --type `"key`" --attributes `"tenantId`",`"clinicId`",`"patientId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"medical_records`" --key `"appointmentId_idx`" --type `"key`" --attributes `"appointmentId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"medical_records`" --key `"type_idx`" --type `"key`" --attributes `"type`""

# Collection: medical_images
Write-Host "Criando collection: medical_images" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"medical_images`" --name `"Imagens Médicas`" --document-security true"

# Atributos de medical_images
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_images`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_images`" --key `"clinicId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_images`" --key `"patientId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_images`" --key `"recordId`" --size 255 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_images`" --key `"appointmentId`" --size 255 --required false"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_images`" --key `"type`" --elements `"before`",`"after`",`"progress`",`"diagnostic`" --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_images`" --key `"category`" --size 100 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_images`" --key `"metadata`" --size 20000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_images`" --key `"files`" --size 20000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_images`" --key `"comparison`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_images`" --key `"privacy`" --size 5000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_images`" --key `"tags`" --size 100 --required false --array true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_images`" --key `"notes`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"medical_images`" --key `"createdBy`" --size 255 --required true"

# Índices de medical_images
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"medical_images`" --key `"tenant_clinic_patient_idx`" --type `"key`" --attributes `"tenantId`",`"clinicId`",`"patientId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"medical_images`" --key `"type_category_idx`" --type `"key`" --attributes `"type`",`"category`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"medical_images`" --key `"appointmentId_idx`" --type `"key`" --attributes `"appointmentId`""

# Collection: consent_forms
Write-Host "Criando collection: consent_forms" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"consent_forms`" --name `"Termos de Consentimento`" --document-security true"

# Atributos de consent_forms
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"consent_forms`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"consent_forms`" --key `"clinicId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"consent_forms`" --key `"patientId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"consent_forms`" --key `"type`" --size 100 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"consent_forms`" --key `"version`" --size 20 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"consent_forms`" --key `"content`" --size 100000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"consent_forms`" --key `"fileId`" --size 255 --required false"
Execute-AppwriteCommand "appwrite databases create-datetime-attribute --database-id `"$DATABASE_ID`" --collection-id `"consent_forms`" --key `"signedAt`" --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"consent_forms`" --key `"signatureData`" --size 100000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"consent_forms`" --key `"ipAddress`" --size 50 --required true"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"consent_forms`" --key `"status`" --elements `"active`",`"revoked`",`"expired`" --required true --default `"active`""

# Índices de consent_forms
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"consent_forms`" --key `"patient_type_idx`" --type `"key`" --attributes `"patientId`",`"type`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"consent_forms`" --key `"status_idx`" --type `"key`" --attributes `"status`""

# ========== MÓDULO 5: FINANCEIRO ==========
Write-Host ""
Write-Host "### MÓDULO 5: FINANCEIRO ###" -ForegroundColor Magenta

# Collection: transactions
Write-Host "Criando collection: transactions" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"transactions`" --name `"Transações Financeiras`" --document-security true"

# Atributos de transactions
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"transactions`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"transactions`" --key `"clinicId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"transactions`" --key `"code`" --size 50 --required true"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"transactions`" --key `"type`" --elements `"income`",`"expense`" --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"transactions`" --key `"category`" --size 100 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"transactions`" --key `"subcategory`" --size 100 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"transactions`" --key `"description`" --size 500 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"transactions`" --key `"amount`" --size 1000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"transactions`" --key `"references`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"transactions`" --key `"payment`" --size 10000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"transactions`" --key `"accounting`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"transactions`" --key `"documents`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"transactions`" --key `"reconciliation`" --size 2000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"transactions`" --key `"createdBy`" --size 255 --required true"

# Índices de transactions
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"transactions`" --key `"tenant_clinic_date_idx`" --type `"key`" --attributes `"tenantId`",`"clinicId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"transactions`" --key `"type_category_idx`" --type `"key`" --attributes `"type`",`"category`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"transactions`" --key `"code_unique`" --type `"unique`" --attributes `"code`""

# Collection: commissions
Write-Host "Criando collection: commissions" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"commissions`" --name `"Comissões`" --document-security true"

# Atributos de commissions
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"commissions`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"commissions`" --key `"clinicId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"commissions`" --key `"professionalId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"commissions`" --key `"period`" --size 1000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"commissions`" --key `"appointments`" --size 50000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"commissions`" --key `"summary`" --size 10000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"commissions`" --key `"payment`" --size 5000 --required true"

# Índices de commissions
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"commissions`" --key `"tenant_clinic_period_idx`" --type `"key`" --attributes `"tenantId`",`"clinicId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"commissions`" --key `"professionalId_idx`" --type `"key`" --attributes `"professionalId`""

# Collection: payment_methods
Write-Host "Criando collection: payment_methods" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"payment_methods`" --name `"Métodos de Pagamento`" --document-security true"

# Atributos de payment_methods
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"payment_methods`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"payment_methods`" --key `"clinicId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"payment_methods`" --key `"name`" --size 100 --required true"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"payment_methods`" --key `"type`" --elements `"cash`",`"debit`",`"credit`",`"pix`",`"transfer`",`"check`",`"other`" --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"payment_methods`" --key `"settings`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-float-attribute --database-id `"$DATABASE_ID`" --collection-id `"payment_methods`" --key `"taxRate`" --required false --min 0 --max 100"
Execute-AppwriteCommand "appwrite databases create-boolean-attribute --database-id `"$DATABASE_ID`" --collection-id `"payment_methods`" --key `"active`" --required true --default true"

# Índices de payment_methods
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"payment_methods`" --key `"clinic_active_idx`" --type `"key`" --attributes `"clinicId`",`"active`""

# ========== MÓDULO 6: ESTOQUE ==========
Write-Host ""
Write-Host "### MÓDULO 6: ESTOQUE ###" -ForegroundColor Magenta

# Collection: products
Write-Host "Criando collection: products" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"products`" --name `"Produtos`" --document-security true"

# Atributos de products
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"clinicId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"sku`" --size 50 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"barcode`" --size 50 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"name`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"description`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"category`" --size 100 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"brand`" --size 100 --required false"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"unit`" --elements `"un`",`"ml`",`"g`",`"cx`",`"kg`",`"l`" --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"presentation`" --size 255 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"stock`" --size 5000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"costs`" --size 5000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"suppliers`" --size 10000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"usage`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"compliance`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"status`" --elements `"active`",`"inactive`",`"discontinued`" --required true --default `"active`""
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"createdBy`" --size 255 --required true"

# Índices de products
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"tenant_clinic_idx`" --type `"key`" --attributes `"tenantId`",`"clinicId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"sku_unique`" --type `"unique`" --attributes `"sku`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"barcode_idx`" --type `"key`" --attributes `"barcode`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"category_idx`" --type `"key`" --attributes `"category`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"products`" --key `"status_idx`" --type `"key`" --attributes `"status`""

# Collection: inventory_movements
Write-Host "Criando collection: inventory_movements" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"inventory_movements`" --name `"Movimentações de Estoque`" --document-security true"

# Atributos de inventory_movements
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"inventory_movements`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"inventory_movements`" --key `"clinicId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"inventory_movements`" --key `"movementType`" --elements `"in`",`"out`",`"adjustment`",`"transfer`" --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"inventory_movements`" --key `"reason`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"inventory_movements`" --key `"reference`" --size 1000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"inventory_movements`" --key `"items`" --size 50000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"inventory_movements`" --key `"totals`" --size 2000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"inventory_movements`" --key `"source`" --size 2000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"inventory_movements`" --key `"validation`" --size 2000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"inventory_movements`" --key `"createdBy`" --size 255 --required true"

# Índices de inventory_movements
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"inventory_movements`" --key `"tenant_clinic_date_idx`" --type `"key`" --attributes `"tenantId`",`"clinicId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"inventory_movements`" --key `"movementType_idx`" --type `"key`" --attributes `"movementType`""

# Collection: suppliers
Write-Host "Criando collection: suppliers" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"suppliers`" --name `"Fornecedores`" --document-security true"

# Atributos de suppliers
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"suppliers`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"suppliers`" --key `"clinicId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"suppliers`" --key `"name`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"suppliers`" --key `"cnpj`" --size 20 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"suppliers`" --key `"contact`" --size 5000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"suppliers`" --key `"address`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"suppliers`" --key `"paymentTerms`" --size 2000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"suppliers`" --key `"notes`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-boolean-attribute --database-id `"$DATABASE_ID`" --collection-id `"suppliers`" --key `"active`" --required true --default true"

# Índices de suppliers
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"suppliers`" --key `"clinic_active_idx`" --type `"key`" --attributes `"clinicId`",`"active`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"suppliers`" --key `"cnpj_idx`" --type `"key`" --attributes `"cnpj`""

# Collection: purchase_orders
Write-Host "Criando collection: purchase_orders" -ForegroundColor Yellow
Execute-AppwriteCommand "appwrite databases create-collection --database-id `"$DATABASE_ID`" --collection-id `"purchase_orders`" --name `"Ordens de Compra`" --document-security true"

# Atributos de purchase_orders
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"purchase_orders`" --key `"tenantId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"purchase_orders`" --key `"clinicId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"purchase_orders`" --key `"code`" --size 50 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"purchase_orders`" --key `"supplierId`" --size 255 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"purchase_orders`" --key `"items`" --size 50000 --required true"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"purchase_orders`" --key `"totals`" --size 2000 --required true"
Execute-AppwriteCommand "appwrite databases create-datetime-attribute --database-id `"$DATABASE_ID`" --collection-id `"purchase_orders`" --key `"expectedAt`" --required false"
Execute-AppwriteCommand "appwrite databases create-enum-attribute --database-id `"$DATABASE_ID`" --collection-id `"purchase_orders`" --key `"status`" --elements `"draft`",`"sent`",`"confirmed`",`"partial`",`"received`",`"cancelled`" --required true --default `"draft`""
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"purchase_orders`" --key `"notes`" --size 5000 --required false"
Execute-AppwriteCommand "appwrite databases create-string-attribute --database-id `"$DATABASE_ID`" --collection-id `"purchase_orders`" --key `"createdBy`" --size 255 --required true"

# Índices de purchase_orders
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"purchase_orders`" --key `"clinic_status_idx`" --type `"key`" --attributes `"clinicId`",`"status`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"purchase_orders`" --key `"supplierId_idx`" --type `"key`" --attributes `"supplierId`""
Execute-AppwriteCommand "appwrite databases create-index --database-id `"$DATABASE_ID`" --collection-id `"purchase_orders`" --key `"code_unique`" --type `"unique`" --attributes `"code`""

Write-Host ""
Write-Host "=== CRIAÇÃO PARTE 2 CONCLUÍDA ===" -ForegroundColor Green
Write-Host "Foram criadas as collections dos módulos 4, 5 e 6" -ForegroundColor Yellow
Write-Host "Execute o script create-appwrite-collections-part3.ps1 para criar o restante das collections" -ForegroundColor Yellow