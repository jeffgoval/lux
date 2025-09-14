# Executar correções SQL via API REST do Supabase
Write-Host "🚀 Executando correções de onboarding..." -ForegroundColor Green

# Ler arquivo .env
$envFile = Get-Content ".env" | ForEach-Object {
    if ($_ -match "^([^#][^=]+)=(.*)$") {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"').Trim("'")
        Set-Variable -Name $key -Value $value -Scope Global
    }
}

$url = "$VITE_SUPABASE_URL"
$apikey = "$VITE_SUPABASE_ANON_KEY"

Write-Host "🔗 URL: $url" -ForegroundColor Blue
Write-Host "🔑 API Key presente: $($apikey.Length > 0)" -ForegroundColor Blue

# Comandos SQL para executar
$sqlCommands = @(
    "ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();",
    "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primeiro_acesso BOOLEAN DEFAULT true NOT NULL;",
    "CREATE INDEX IF NOT EXISTS idx_profiles_primeiro_acesso ON public.profiles(user_id, primeiro_acesso);",
    "DROP POLICY IF EXISTS `"Users can view own profile`" ON public.profiles;",
    "CREATE POLICY `"profiles_select_own`" ON public.profiles FOR SELECT USING (auth.uid() = user_id);",
    "CREATE POLICY `"profiles_insert_own`" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);",
    "CREATE POLICY `"profiles_update_own`" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);"
)

$success = 0
$total = $sqlCommands.Count

foreach ($sql in $sqlCommands) {
    Write-Host "🔧 Executando: $($sql.Substring(0, [Math]::Min(50, $sql.Length)))..." -ForegroundColor Yellow
    
    try {
        $body = @{ sql = $sql } | ConvertTo-Json
        
        $headers = @{
            "Content-Type" = "application/json"
            "apikey" = $apikey
            "Authorization" = "Bearer $apikey"
        }
        
        $response = Invoke-RestMethod -Uri "$url/rest/v1/rpc/exec" -Method POST -Body $body -Headers $headers -ErrorAction Stop
        
        Write-Host "✅ Sucesso!" -ForegroundColor Green
        $success++
    }
    catch {
        Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
        
        # Tentar método alternativo
        try {
            $response = Invoke-RestMethod -Uri "$url/rest/v1/" -Method POST -Body $sql -Headers $headers -ContentType "application/sql" -ErrorAction Stop
            Write-Host "✅ Sucesso (método alternativo)!" -ForegroundColor Green
            $success++
        }
        catch {
            Write-Host "❌ Método alternativo também falhou: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Start-Sleep -Milliseconds 500
}

Write-Host "`n📊 Resultado: $success/$total comandos executados com sucesso" -ForegroundColor Cyan

if ($success -eq $total) {
    Write-Host "🎉 Todas as correções foram aplicadas!" -ForegroundColor Green
    Write-Host "🧪 Testando fluxo..." -ForegroundColor Yellow
    
    node test-onboarding-flow.cjs
} else {
    Write-Host "⚠️  Algumas correções falharam." -ForegroundColor Yellow
    Write-Host "📝 Execute manualmente no Supabase SQL Editor:" -ForegroundColor White
    Write-Host "🔗 https://supabase.com/dashboard/project/dvnyfwpphuuujhodqkko/sql" -ForegroundColor Blue
    
    Write-Host "`n📋 SQL para copiar:" -ForegroundColor White
    foreach ($sql in $sqlCommands) {
        Write-Host $sql -ForegroundColor Gray
    }
}