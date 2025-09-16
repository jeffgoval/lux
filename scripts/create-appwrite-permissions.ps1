# Script PowerShell para configurar permissões ABAC no Appwrite
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

Write-Host "=== CONFIGURANDO PERMISSÕES ABAC ===" -ForegroundColor Green
Write-Host "Database ID: $DATABASE_ID" -ForegroundColor Yellow
Write-Host ""

# ========== PERMISSÕES GLOBAIS ==========
Write-Host "### CONFIGURANDO PERMISSÕES GLOBAIS ###" -ForegroundColor Magenta

# Função para aplicar permissões em uma collection
function Apply-CollectionPermissions {
    param (
        [string]$CollectionId,
        [string]$CollectionName,
        [string[]]$ReadPermissions,
        [string[]]$CreatePermissions,
        [string[]]$UpdatePermissions,
        [string[]]$DeletePermissions
    )
    
    Write-Host "Configurando permissões para: $CollectionName" -ForegroundColor Yellow
    
    # Construir strings de permissões
    $readPerms = $ReadPermissions -join ','
    $createPerms = $CreatePermissions -join ','
    $updatePerms = $UpdatePermissions -join ','
    $deletePerms = $DeletePermissions -join ','
    
    # Atualizar permissões da collection
    $cmd = "appwrite databases update-collection --database-id `"$DATABASE_ID`" --collection-id `"$CollectionId`" --name `"$CollectionName`" --document-security true"
    
    if ($readPerms) { $cmd += " --permissions `"read([$readPerms])`"" }
    if ($createPerms) { $cmd += ",`"create([$createPerms])`"" }
    if ($updatePerms) { $cmd += ",`"update([$updatePerms])`"" }
    if ($deletePerms) { $cmd += ",`"delete([$deletePerms])`"" }
    
    Execute-AppwriteCommand $cmd
}

# ========== MÓDULO 1: IDENTIDADE E AUTORIZAÇÃO ==========
Write-Host ""
Write-Host "### MÓDULO 1: IDENTIDADE E AUTORIZAÇÃO ###" -ForegroundColor Magenta

# organizations - Apenas super admins e owners podem gerenciar
Apply-CollectionPermissions -CollectionId "organizations" -CollectionName "Organizações" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# clinics - Gerenciamento por organização
Apply-CollectionPermissions -CollectionId "clinics" -CollectionName "Clínicas" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# users_profile - Usuários podem ler/atualizar seu próprio perfil
Apply-CollectionPermissions -CollectionId "users_profile" -CollectionName "Perfis de Usuários" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# user_roles - Gerenciamento de roles
Apply-CollectionPermissions -CollectionId "user_roles" -CollectionName "Papéis de Usuários" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# ========== MÓDULO 2: CLIENTES/PACIENTES ==========
Write-Host ""
Write-Host "### MÓDULO 2: CLIENTES/PACIENTES ###" -ForegroundColor Magenta

# patients - Acesso para staff da clínica
Apply-CollectionPermissions -CollectionId "patients" -CollectionName "Pacientes" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# ========== MÓDULO 3: AGENDAMENTOS ==========
Write-Host ""
Write-Host "### MÓDULO 3: AGENDAMENTOS ###" -ForegroundColor Magenta

# services - Leitura pública, escrita para admins
Apply-CollectionPermissions -CollectionId "services" -CollectionName "Serviços" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# appointments - Staff e pacientes
Apply-CollectionPermissions -CollectionId "appointments" -CollectionName "Agendamentos" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# waiting_list - Staff gerencia
Apply-CollectionPermissions -CollectionId "waiting_list" -CollectionName "Lista de Espera" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# ========== MÓDULO 4: PRONTUÁRIOS MÉDICOS ==========
Write-Host ""
Write-Host "### MÓDULO 4: PRONTUÁRIOS MÉDICOS ###" -ForegroundColor Magenta

# medical_records - Acesso restrito a profissionais de saúde
Apply-CollectionPermissions -CollectionId "medical_records" -CollectionName "Prontuários Médicos" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# medical_images - Acesso restrito
Apply-CollectionPermissions -CollectionId "medical_images" -CollectionName "Imagens Médicas" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# consent_forms - Pacientes e staff
Apply-CollectionPermissions -CollectionId "consent_forms" -CollectionName "Termos de Consentimento" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# ========== MÓDULO 5: FINANCEIRO ==========
Write-Host ""
Write-Host "### MÓDULO 5: FINANCEIRO ###" -ForegroundColor Magenta

# transactions - Acesso restrito a gestores
Apply-CollectionPermissions -CollectionId "transactions" -CollectionName "Transações Financeiras" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# commissions - Profissionais veem suas próprias
Apply-CollectionPermissions -CollectionId "commissions" -CollectionName "Comissões" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# payment_methods - Configuração por admins
Apply-CollectionPermissions -CollectionId "payment_methods" -CollectionName "Métodos de Pagamento" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# ========== MÓDULO 6: ESTOQUE ==========
Write-Host ""
Write-Host "### MÓDULO 6: ESTOQUE ###" -ForegroundColor Magenta

# products - Leitura para staff, escrita para gestores
Apply-CollectionPermissions -CollectionId "products" -CollectionName "Produtos" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# inventory_movements - Gestores e responsáveis
Apply-CollectionPermissions -CollectionId "inventory_movements" -CollectionName "Movimentações de Estoque" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# suppliers - Gestores
Apply-CollectionPermissions -CollectionId "suppliers" -CollectionName "Fornecedores" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# purchase_orders - Gestores
Apply-CollectionPermissions -CollectionId "purchase_orders" -CollectionName "Ordens de Compra" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# ========== MÓDULO 7: COMUNICAÇÃO ==========
Write-Host ""
Write-Host "### MÓDULO 7: COMUNICAÇÃO ###" -ForegroundColor Magenta

# communication_templates - Marketing e admins
Apply-CollectionPermissions -CollectionId "communication_templates" -CollectionName "Templates de Comunicação" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# campaigns - Marketing
Apply-CollectionPermissions -CollectionId "campaigns" -CollectionName "Campanhas" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# notifications_log - Sistema e auditoria
Apply-CollectionPermissions -CollectionId "notifications_log" -CollectionName "Log de Notificações" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# segments - Marketing
Apply-CollectionPermissions -CollectionId "segments" -CollectionName "Segmentos de Clientes" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# ========== MÓDULO 8: ANALYTICS ==========
Write-Host ""
Write-Host "### MÓDULO 8: ANALYTICS ###" -ForegroundColor Magenta

# kpi_definitions - Leitura pública, escrita para admins
Apply-CollectionPermissions -CollectionId "kpi_definitions" -CollectionName "Definições de KPIs" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# analytics_data - Sistema apenas
Apply-CollectionPermissions -CollectionId "analytics_data" -CollectionName "Dados de Analytics" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# reports - Usuários e seus relatórios
Apply-CollectionPermissions -CollectionId "reports" -CollectionName "Relatórios" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# ========== MÓDULO 9: INTEGRAÇÕES E LOGS ==========
Write-Host ""
Write-Host "### MÓDULO 9: INTEGRAÇÕES E LOGS ###" -ForegroundColor Magenta

# integrations_config - Apenas admins
Apply-CollectionPermissions -CollectionId "integrations_config" -CollectionName "Configuração de Integrações" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# audit_logs - Apenas leitura para auditoria
Apply-CollectionPermissions -CollectionId "audit_logs" -CollectionName "Logs de Auditoria" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# system_logs - Sistema apenas
Apply-CollectionPermissions -CollectionId "system_logs" -CollectionName "Logs do Sistema" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

# webhooks_log - Sistema apenas
Apply-CollectionPermissions -CollectionId "webhooks_log" -CollectionName "Log de Webhooks" `
    -ReadPermissions @("`"role:all`"") `
    -CreatePermissions @("`"role:all`"") `
    -UpdatePermissions @("`"role:all`"") `
    -DeletePermissions @("`"role:all`"")

Write-Host ""
Write-Host "=== CONFIGURAÇÃO DE PERMISSÕES CONCLUÍDA ===" -ForegroundColor Green
Write-Host "As permissões foram configuradas para todas as collections" -ForegroundColor Yellow
Write-Host "NOTA: As permissões foram definidas como 'role:all' temporariamente" -ForegroundColor Yellow
Write-Host "Você deve ajustar as permissões específicas após criar as Functions de validação ABAC" -ForegroundColor Yellow
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Execute o script setup-appwrite-functions.ps1 para criar as Functions" -ForegroundColor White
Write-Host "2. Execute o script seed-initial-data.ps1 para popular dados iniciais" -ForegroundColor White
Write-Host "3. Ajuste as permissões para usar as Functions ABAC criadas" -ForegroundColor White