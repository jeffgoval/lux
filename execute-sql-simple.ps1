Write-Host "🚀 Executando correções de onboarding..." -ForegroundColor Green

# Ler .env
$env = @{}
Get-Content ".env" | ForEach-Object {
    if ($_ -match "^([^#][^=]+)=(.*)$") {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"')
        $env[$key] = $value
    }
}

$url = $env["VITE_SUPABASE_URL"]
$apikey = $env["VITE_SUPABASE_ANON_KEY"]

Write-Host "URL: $url" -ForegroundColor Blue

# SQL Commands
$commands = @(
    "ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();",
    "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primeiro_acesso BOOLEAN DEFAULT true NOT NULL;"
)

$success = 0
foreach ($sql in $commands) {
    Write-Host "Executando: $($sql.Substring(0, [Math]::Min(40, $sql.Length)))..." -ForegroundColor Yellow
    
    try {
        $body = @{ sql = $sql } | ConvertTo-Json
        $headers = @{
            "Content-Type" = "application/json"
            "apikey" = $apikey
            "Authorization" = "Bearer $apikey"
        }
        
        Invoke-RestMethod -Uri "$url/rest/v1/rpc/exec" -Method POST -Body $body -Headers $headers | Out-Null
        Write-Host "Sucesso!" -ForegroundColor Green
        $success++
    }
    catch {
        Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "Resultado: $success/$($commands.Count) comandos executados" -ForegroundColor Cyan

if ($success -gt 0) {
    Write-Host "Testando fluxo..." -ForegroundColor Yellow
    node test-onboarding-flow.cjs
} else {
    Write-Host "Execute manualmente no Supabase:" -ForegroundColor Yellow
    Write-Host "https://supabase.com/dashboard/project/dvnyfwpphuuujhodqkko/sql" -ForegroundColor Blue
}