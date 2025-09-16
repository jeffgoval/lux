#!/usr/bin/env pwsh
# Script para substituir importações do Supabase pelo Appwrite

Write-Host "🔄 Iniciando substituição das importações Supabase -> Appwrite..." -ForegroundColor Yellow

# Lista de arquivos que precisam ser atualizados
$files = @(
    "src/utils/validation.ts",
    "src/utils/userDataRecovery.ts", 
    "src/utils/signupTestHelper.ts",
    "src/utils/healthCheck.ts",
    "src/utils/integrity-debug.ts",
    "src/utils/forceUserSetup.ts",
    "src/services/optimized-auth.service.ts",
    "src/services/SmartSchedulingEngine.ts",
    "src/services/VipReschedulingService.ts",
    "src/services/VIPSchedulingService.ts",
    "src/services/VIPNotificationService.ts",
    "src/services/validation.service.ts",
    "src/services/RevenueOptimizer.ts",
    "src/services/onboarding-operations.ts",
    "src/services/NotificationEngine.ts",
    "src/pages/Prontuarios.tsx",
    "src/services/IntelligentAlertsEngine.ts",
    "src/services/integrity-verification.service.ts",
    "src/pages/Perfil.tsx",
    "src/services/imagem-medica.service.ts",
    "src/services/imagem-acesso.service.ts",
    "src/services/auth.service.ts",
    "src/services/auth-recovery-strategies.ts",
    "src/hooks/useClinica.ts",
    "src/hooks/useForceProfile.ts",
    "src/hooks/useMetrics.ts",
    "src/hooks/useProntuarios.ts",
    "src/hooks/useSystemRoles.ts",
    "src/hooks/useRoleData.ts",
    "src/contexts/SecureAuthContext.tsx",
    "src/components/OnboardingWizard.tsx",
    "src/components/debug/AuthDebug.tsx",
    "src/contexts/UnifiedAuthContext.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "📝 Atualizando: $file" -ForegroundColor Green
        
        # Ler conteúdo do arquivo
        $content = Get-Content $file -Raw
        
        # Substituir importação do Supabase pelo Appwrite
        $content = $content -replace "import \{ supabase \} from '@/integrations/supabase/client';", "import { databases, account, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';"
        
        # Salvar arquivo atualizado
        Set-Content -Path $file -Value $content -NoNewline
        
        Write-Host "OK $file atualizado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Arquivo não encontrado: $file" -ForegroundColor Yellow
    }
}

Write-Host "Substituicao concluida! Agora voce precisa atualizar o codigo para usar as APIs do Appwrite." -ForegroundColor Green
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Revisar cada arquivo e adaptar as chamadas de API do Supabase para Appwrite" -ForegroundColor White
Write-Host "2. Testar a aplicação para garantir que tudo funciona" -ForegroundColor White
Write-Host "3. Remover a pasta src/integrations/supabase quando não precisar mais" -ForegroundColor White