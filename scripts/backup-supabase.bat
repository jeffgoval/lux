@echo off
REM Script de Backup Automatizado do Supabase para Windows
REM Uso: backup-supabase.bat [full|schema|data]

setlocal enabledelayedexpansion

REM Configurações
set PROJECT_ID=dvnyfwpphuuujhodqkko
set BACKUP_DIR=backups
set MAX_BACKUPS=10

REM Criar diretório de backup se não existir
if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
    echo ✅ Diretório de backup criado: %BACKUP_DIR%
)

REM Verificar se Supabase CLI está instalado
supabase --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Supabase CLI não encontrado!
    echo Instale com: npm install -g supabase
    exit /b 1
)

REM Gerar timestamp para o nome do arquivo
for /f "tokens=1-6 delims=/:. " %%a in ("%date% %time%") do (
    set timestamp=%%c-%%b-%%a_%%d-%%e-%%f
)

REM Determinar tipo de backup
set BACKUP_TYPE=%1
if "%BACKUP_TYPE%"=="" set BACKUP_TYPE=full

REM Gerar nome do arquivo
set FILENAME=backup_%BACKUP_TYPE%_%timestamp%.sql
set FILEPATH=%BACKUP_DIR%\%FILENAME%

echo 🚀 Iniciando backup automatizado do Supabase...
echo 📋 Tipo: %BACKUP_TYPE%
echo 📁 Arquivo: %FILEPATH%
echo.

REM Executar backup baseado no tipo
if /i "%BACKUP_TYPE%"=="schema" (
    echo 🔄 Fazendo backup do schema...
    supabase db dump --schema-only --file "%FILEPATH%"
) else if /i "%BACKUP_TYPE%"=="data" (
    echo 🔄 Fazendo backup dos dados...
    supabase db dump --data-only --file "%FILEPATH%"
) else (
    echo 🔄 Fazendo backup completo...
    supabase db dump --file "%FILEPATH%"
)

if errorlevel 1 (
    echo ❌ Erro durante o backup!
    exit /b 1
)

REM Verificar se o arquivo foi criado
if exist "%FILEPATH%" (
    for %%A in ("%FILEPATH%") do (
        set size=%%~zA
        set /a sizeMB=!size!/1024/1024
    )
    echo.
    echo ✅ Backup criado com sucesso!
    echo 📁 Arquivo: %FILEPATH%
    echo 📊 Tamanho: !sizeMB! MB
) else (
    echo ❌ Arquivo de backup não foi criado!
    exit /b 1
)

REM Limpar backups antigos (manter apenas os mais recentes)
echo.
echo 🧹 Limpando backups antigos...

set count=0
for /f "delims=" %%f in ('dir /b /o-d "%BACKUP_DIR%\backup_*.sql" 2^>nul') do (
    set /a count+=1
    if !count! gtr %MAX_BACKUPS% (
        del "%BACKUP_DIR%\%%f"
        echo 🗑️  Removido: %%f
    )
)

echo.
echo 🎉 Backup concluído com sucesso!
echo 💡 Para restaurar: supabase db reset --db-url [CONNECTION_STRING]

pause