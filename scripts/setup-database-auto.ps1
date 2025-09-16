# Script PowerShell Mestre - Execução Automática
# Sistema Multi-Tenant para Clínicas de Estética Premium

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "    SETUP COMPLETO DO BANCO DE DADOS     " -ForegroundColor Cyan
Write-Host "         APPWRITE - LUXE FLOW            " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Medir tempo total
$startTime = Get-Date

Write-Host "### INICIANDO CRIAÇÃO DAS COLLECTIONS ###" -ForegroundColor Magenta
Write-Host ""

# Executar scripts na ordem
$scripts = @(
    ".\scripts\create-appwrite-collections.ps1",
    ".\scripts\create-appwrite-collections-part2.ps1",
    ".\scripts\create-appwrite-collections-part3.ps1",
    ".\scripts\create-appwrite-permissions.ps1"
)

$success = $true
foreach ($script in $scripts) {
    Write-Host "Executando: $script" -ForegroundColor Yellow
    
    try {
        & $script
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERRO ao executar $script" -ForegroundColor Red
            $success = $false
            break
        }
        Write-Host "[OK] $script concluido!" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "ERRO: $_" -ForegroundColor Red
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
    Write-Host "[SUCESSO] Todas as collections foram criadas!" -ForegroundColor Green
    Write-Host "[TEMPO] Total: $minutes minutos e $seconds segundos" -ForegroundColor Green
} else {
    Write-Host "[ERRO] O setup falhou!" -ForegroundColor Red
}

Write-Host ""