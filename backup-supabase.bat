@echo off
REM Script de Backup do Supabase para Windows
REM Uso: backup-supabase.bat [once|schedule]

echo 🚀 Backup do Supabase
echo.

if "%1"=="schedule" (
    echo ⏰ Iniciando agendador de backup...
    echo Pressione Ctrl+C para parar
    node scripts/schedule-backup.js
) else if "%1"=="once" (
    echo 📋 Executando backup único...
    node scripts/schedule-backup.js --once
) else (
    echo 📋 Executando backup manual...
    npm run backup:api
)

echo.
echo ✅ Concluído!
pause