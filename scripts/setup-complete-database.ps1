# Script PowerShell Mestre - Executa todos os scripts de criação do banco de dados
# Sistema Multi-Tenant para Clínicas de Estética Premium

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "    SETUP COMPLETO DO BANCO DE DADOS     " -ForegroundColor Cyan
Write-Host "         APPWRITE - LUXE FLOW            " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se estamos no diretório correto
$currentDir = Get-Location
if (-not (Test-Path ".\scripts")) {
    Write-Host "ERRO: Execute este script do diretório raiz do projeto!" -ForegroundColor Red
    Write-Host "Diretório atual: $currentDir" -ForegroundColor Yellow
    exit 1
}

# Função para executar script e verificar sucesso
function Execute-Script {
    param (
        [string]$ScriptName,
        [string]$Description
    )
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host " $Description" -ForegroundColor Yellow
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    
    $scriptPath = ".\scripts\$ScriptName"
    
    if (-not (Test-Path $scriptPath)) {
        Write-Host "ERRO: Script não encontrado: $scriptPath" -ForegroundColor Red
        return $false
    }
    
    # Executar o script
    & $scriptPath
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ERRO: Falha ao executar $ScriptName" -ForegroundColor Red
        return $false
    }
    
    Write-Host ""
    Write-Host "✓ $Description concluído com sucesso!" -ForegroundColor Green
    Start-Sleep -Seconds 2
    return $true
}

# Verificar pré-requisitos
Write-Host "### VERIFICANDO PRÉ-REQUISITOS ###" -ForegroundColor Magenta
Write-Host ""

# Verificar se o Appwrite CLI está instalado
try {
    $appwriteVersion = appwrite --version
    Write-Host "✓ Appwrite CLI instalado: $appwriteVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Appwrite CLI não está instalado!" -ForegroundColor Red
    Write-Host "  Instale com: npm install -g appwrite-cli" -ForegroundColor Yellow
    exit 1
}

# Verificar se está logado no Appwrite
try {
    $loginStatus = appwrite account get 2>&1
    if ($loginStatus -match "error") {
        Write-Host "✗ Você não está logado no Appwrite!" -ForegroundColor Red
        Write-Host "  Execute: appwrite login" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✓ Logado no Appwrite" -ForegroundColor Green
} catch {
    Write-Host "✗ Erro ao verificar login no Appwrite" -ForegroundColor Red
    exit 1
}

# Confirmar com o usuário
Write-Host ""
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host "           ATENÇÃO IMPORTANTE!            " -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Este script irá criar:" -ForegroundColor White
Write-Host "• 1 Database principal" -ForegroundColor White
Write-Host "• 32+ Collections com atributos" -ForegroundColor White
Write-Host "• 100+ Índices para otimização" -ForegroundColor White
Write-Host "• Permissões ABAC básicas" -ForegroundColor White
Write-Host ""
Write-Host "Projeto: 68c841cf00032cd36a87" -ForegroundColor Cyan
Write-Host "Endpoint: https://nyc.cloud.appwrite.io/v1" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tempo estimado: 15-20 minutos" -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Deseja continuar? (S/N)"
if ($confirmation -ne 'S' -and $confirmation -ne 's') {
    Write-Host "Operação cancelada pelo usuário." -ForegroundColor Yellow
    exit 0
}

# Medir tempo total
$startTime = Get-Date

# Array com os scripts na ordem correta
$scripts = @(
    @{
        Name = "create-appwrite-collections.ps1"
        Description = "Criando Collections - Parte 1 (Módulos 1-3)"
    },
    @{
        Name = "create-appwrite-collections-part2.ps1"
        Description = "Criando Collections - Parte 2 (Módulos 4-6)"
    },
    @{
        Name = "create-appwrite-collections-part3.ps1"
        Description = "Criando Collections - Parte 3 (Módulos 7-9)"
    },
    @{
        Name = "create-appwrite-permissions.ps1"
        Description = "Configurando Permissões ABAC"
    }
)

# Executar cada script
$success = $true
foreach ($script in $scripts) {
    $result = Execute-Script -ScriptName $script.Name -Description $script.Description
    if (-not $result) {
        $success = $false
        break
    }
}

# Calcular tempo total
$endTime = Get-Date
$duration = $endTime - $startTime
$minutes = [Math]::Floor($duration.TotalMinutes)
$seconds = $duration.Seconds

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "           SETUP FINALIZADO!              " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($success) {
    Write-Host "✓ SUCESSO: Todas as collections foram criadas!" -ForegroundColor Green
    Write-Host "✓ Tempo total: $minutes minutos e $seconds segundos" -ForegroundColor Green
    Write-Host ""
    Write-Host "### RESUMO DO QUE FOI CRIADO ###" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "MÓDULO 1 - Identidade e Autorização:" -ForegroundColor Yellow
    Write-Host "  ✓ organizations, clinics, users_profile, user_roles" -ForegroundColor White
    Write-Host ""
    Write-Host "MÓDULO 2 - Clientes/Pacientes:" -ForegroundColor Yellow
    Write-Host "  ✓ patients" -ForegroundColor White
    Write-Host ""
    Write-Host "MÓDULO 3 - Agendamentos:" -ForegroundColor Yellow
    Write-Host "  ✓ services, appointments, waiting_list" -ForegroundColor White
    Write-Host ""
    Write-Host "MÓDULO 4 - Prontuários Médicos:" -ForegroundColor Yellow
    Write-Host "  ✓ medical_records, medical_images, consent_forms" -ForegroundColor White
    Write-Host ""
    Write-Host "MÓDULO 5 - Financeiro:" -ForegroundColor Yellow
    Write-Host "  ✓ transactions, commissions, payment_methods" -ForegroundColor White
    Write-Host ""
    Write-Host "MÓDULO 6 - Estoque:" -ForegroundColor Yellow
    Write-Host "  ✓ products, inventory_movements, suppliers, purchase_orders" -ForegroundColor White
    Write-Host ""
    Write-Host "MÓDULO 7 - Comunicação:" -ForegroundColor Yellow
    Write-Host "  ✓ communication_templates, campaigns, notifications_log, segments" -ForegroundColor White
    Write-Host ""
    Write-Host "MÓDULO 8 - Analytics:" -ForegroundColor Yellow
    Write-Host "  ✓ kpi_definitions, analytics_data, reports" -ForegroundColor White
    Write-Host ""
    Write-Host "MÓDULO 9 - Integrações e Logs:" -ForegroundColor Yellow
    Write-Host "  ✓ integrations_config, audit_logs, system_logs, webhooks_log" -ForegroundColor White
    Write-Host ""
    Write-Host "### PRÓXIMOS PASSOS ###" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "1. Acesse o Console do Appwrite para verificar as collections:" -ForegroundColor White
    Write-Host "   https://cloud.appwrite.io/console/project-68c841cf00032cd36a87/databases" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Configure as Appwrite Functions para:" -ForegroundColor White
    Write-Host "   • Validação ABAC avançada" -ForegroundColor White
    Write-Host "   • Criptografia de dados sensíveis" -ForegroundColor White
    Write-Host "   • Triggers de negócio" -ForegroundColor White
    Write-Host "   • Integração com IA" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Ajuste as permissões específicas por collection" -ForegroundColor White
    Write-Host ""
    Write-Host "4. Configure o Storage Bucket para arquivos" -ForegroundColor White
    Write-Host ""
    Write-Host "5. Implemente as Functions de migração do Supabase" -ForegroundColor White
} else {
    Write-Host "✗ ERRO: O setup falhou em algum ponto!" -ForegroundColor Red
    Write-Host "  Verifique os logs acima para identificar o problema." -ForegroundColor Yellow
    Write-Host "  Você pode executar os scripts individualmente para debug." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")