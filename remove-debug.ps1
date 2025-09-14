# Script para remover todos os debugs do projeto
param(
    [switch]$DryRun = $false
)

$rootPath = Get-Location
$totalFiles = 0
$modifiedFiles = 0

Write-Host "Iniciando limpeza de debugs..." -ForegroundColor Yellow

# Encontrar todos os arquivos JS/TS
$files = Get-ChildItem -Path $rootPath -Recurse -Include "*.js", "*.jsx", "*.ts", "*.tsx" -File |
    Where-Object { $_.FullName -notmatch "node_modules|dist|build|\.git" }

Write-Host "Encontrados $($files.Count) arquivos para verificar" -ForegroundColor Cyan

foreach ($file in $files) {
    $totalFiles++
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    $modified = $false

    if ([string]::IsNullOrEmpty($content)) {
        continue
    }

    # Remover console.* statements
    $content = $content -replace '(?m)^\s*console\.\w+\([^;]*\);?\s*$', ''
    $content = $content -replace 'console\.\w+\([^)]*\);?', ''
    
    # Remover debugger statements
    $content = $content -replace '(?m)^\s*debugger;?\s*$', ''
    $content = $content -replace '\s*debugger;?\s*', ''
    
    # Remover mensagens específicas do AuthRouter
    $content = $content -replace '.*AuthRouter V2: Modo Seguro.*\n?', ''
    $content = $content -replace '.*AuthGuard Estavel Ativo.*\n?', ''
    
    # Remover linhas vazias excessivas
    $content = $content -replace '(\r?\n){3,}', "`n`n"

    if ($content -ne $originalContent) {
        $modified = $true
        $modifiedFiles++
        
        Write-Host "Modificando: $($file.FullName)" -ForegroundColor Green
        
        if (-not $DryRun) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        }
    }
}

Write-Host "`nLimpeza concluida!" -ForegroundColor Green
Write-Host "Arquivos verificados: $totalFiles" -ForegroundColor Cyan
Write-Host "Arquivos modificados: $modifiedFiles" -ForegroundColor Yellow

if ($DryRun) {
    Write-Host "Modo DryRun - Nenhum arquivo foi alterado" -ForegroundColor Magenta
    Write-Host "Execute sem o parametro -DryRun para aplicar as mudancas" -ForegroundColor Blue
}
