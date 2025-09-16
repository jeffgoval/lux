# Script para corrigir parâmetros do Appwrite CLI

Write-Host "Corrigindo parametros do Appwrite CLI..." -ForegroundColor Yellow

$scriptsToFix = @(
    ".\scripts\create-appwrite-collections.ps1",
    ".\scripts\create-appwrite-collections-part2.ps1", 
    ".\scripts\create-appwrite-collections-part3.ps1",
    ".\scripts\create-appwrite-permissions.ps1"
)

foreach ($script in $scriptsToFix) {
    Write-Host "Processando: $script" -ForegroundColor Cyan
    
    # Ler conteúdo do arquivo
    $content = Get-Content $script -Raw
    
    # Substituir parâmetros para formato correto
    $content = $content -replace '--databaseId', '--database-id'
    $content = $content -replace '--collectionId', '--collection-id'
    $content = $content -replace '--documentSecurity', '--document-security'
    
    # Salvar arquivo corrigido
    Set-Content $script $content -NoNewline
    
    Write-Host "[OK] $script corrigido!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Todos os parametros foram corrigidos!" -ForegroundColor Green