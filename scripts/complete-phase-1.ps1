Write-Host "🚀 COMPLETANDO FASE 1 - FUNDAÇÃO SÓLIDA" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""

Write-Host "📝 Criando collections essenciais restantes..." -ForegroundColor Blue

try {
    Write-Host "  → Organizações..." -ForegroundColor Cyan
    & appwrite databases create-collection --database-id main --collection-id organizacoes --name "Organizações"
    Start-Sleep -Seconds 2

    Write-Host "    ➕ Atributos organizações..." -ForegroundColor Gray
    & appwrite databases create-string-attribute --database-id main --collection-id organizacoes --key nome --size 255 --required true
    Start-Sleep -Seconds 1
    & appwrite databases create-string-attribute --database-id main --collection-id organizacoes --key cnpj --size 20 --required false
    Start-Sleep -Seconds 1
    & appwrite databases create-enum-attribute --database-id main --collection-id organizacoes --key plano --elements "basico" "premium" "enterprise" --required true
    Start-Sleep -Seconds 1
    & appwrite databases create-boolean-attribute --database-id main --collection-id organizacoes --key ativo --required true
    Start-Sleep -Seconds 1
    & appwrite databases create-string-attribute --database-id main --collection-id organizacoes --key criado_por --size 255 --required true
    Start-Sleep -Seconds 1
    & appwrite databases create-string-attribute --database-id main --collection-id organizacoes --key configuracoes --size 10000 --required false
    Start-Sleep -Seconds 2

    Write-Host "  → Convites..." -ForegroundColor Cyan
    & appwrite databases create-collection --database-id main --collection-id convites --name "Convites"
    Start-Sleep -Seconds 2

    Write-Host "    ➕ Atributos convites..." -ForegroundColor Gray
    & appwrite databases create-string-attribute --database-id main --collection-id convites --key email --size 255 --required true
    Start-Sleep -Seconds 1
    & appwrite databases create-enum-attribute --database-id main --collection-id convites --key role --elements "super_admin" "proprietaria" "gerente" "profissionais" "recepcionistas" "visitante" "cliente" --required true
    Start-Sleep -Seconds 1
    & appwrite databases create-string-attribute --database-id main --collection-id convites --key organizacao_id --size 255 --required false
    Start-Sleep -Seconds 1
    & appwrite databases create-string-attribute --database-id main --collection-id convites --key clinica_id --size 255 --required false
    Start-Sleep -Seconds 1
    & appwrite databases create-enum-attribute --database-id main --collection-id convites --key status --elements "pendente" "aceito" "recusado" "expirado" --required true
    Start-Sleep -Seconds 1
    & appwrite databases create-string-attribute --database-id main --collection-id convites --key token --size 255 --required true
    Start-Sleep -Seconds 1
    & appwrite databases create-datetime-attribute --database-id main --collection-id convites --key expires_at --required true
    Start-Sleep -Seconds 1
    & appwrite databases create-string-attribute --database-id main --collection-id convites --key criado_por --size 255 --required true
    Start-Sleep -Seconds 1

    Write-Host "🎉 FASE 1 COMPLETADA COM SUCESSO!" -ForegroundColor Green
} catch {
    Write-Host "❌ ERRO na execução: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Verifique se você está logado: appwrite login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ Collections criadas/atualizadas:" -ForegroundColor Green
Write-Host "  → profiles (já existia)" -ForegroundColor Gray
Write-Host "  → user_roles (já existia)" -ForegroundColor Gray
Write-Host "  → organizacoes (nova)" -ForegroundColor Yellow
Write-Host "  → clinicas (já existia)" -ForegroundColor Gray
Write-Host "  → convites (nova)" -ForegroundColor Yellow
Write-Host "  → notificacoes (já existia)" -ForegroundColor Gray
Write-Host "  → storage: uploads (já existia)" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Yellow
Write-Host "  1. Execute: npm run dev" -ForegroundColor Gray
Write-Host "  2. Teste sistema de auth" -ForegroundColor Gray
Write-Host "  3. Inicie Fase 2: Sistema de Clientes" -ForegroundColor Gray
