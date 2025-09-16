# Script para corrigir comandos do Appwrite CLI

Write-Host "Corrigindo comandos do Appwrite CLI..." -ForegroundColor Yellow

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
    
    # Substituir comandos camelCase por kebab-case
    $content = $content -replace 'createCollection', 'create-collection'
    $content = $content -replace 'createStringAttribute', 'create-string-attribute'
    $content = $content -replace 'createEnumAttribute', 'create-enum-attribute'
    $content = $content -replace 'createBooleanAttribute', 'create-boolean-attribute'
    $content = $content -replace 'createIntegerAttribute', 'create-integer-attribute'
    $content = $content -replace 'createFloatAttribute', 'create-float-attribute'
    $content = $content -replace 'createDatetimeAttribute', 'create-datetime-attribute'
    $content = $content -replace 'createEmailAttribute', 'create-email-attribute'
    $content = $content -replace 'createUrlAttribute', 'create-url-attribute'
    $content = $content -replace 'createIndex', 'create-index'
    $content = $content -replace 'updateCollection', 'update-collection'
    
    # Salvar arquivo corrigido
    Set-Content $script $content -NoNewline
    
    Write-Host "[OK] $script corrigido!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Todos os comandos foram corrigidos!" -ForegroundColor Green