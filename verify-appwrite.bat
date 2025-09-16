@echo off
echo 🔍 Verificando configuração do Appwrite...
echo.

echo 📊 Status da configuração:
echo ================================

echo 🗄️ Databases:
appwrite databases list
echo.

echo 📝 Collections:
appwrite databases listCollections --database-id main
echo.

echo 📁 Storage Buckets:
appwrite storage listBuckets
echo.

echo 👤 Status da sessão:
appwrite account get
echo.

echo ✅ Verificação concluída!
pause