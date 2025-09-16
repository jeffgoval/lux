@echo off
echo 🚀 Criando atributos essenciais rapidamente...

echo Profiles - email...
appwrite databases create-string-attribute --database-id main --collection-id profiles --key email --size 255 --required true
timeout 1 >nul

echo Profiles - ativo...
appwrite databases create-boolean-attribute --database-id main --collection-id profiles --key ativo --required true --default true
timeout 1 >nul

echo Profiles - primeiro_acesso...
appwrite databases create-boolean-attribute --database-id main --collection-id profiles --key primeiro_acesso --required true --default true
timeout 2 >nul

echo 📝 Criando collection: user_roles...
appwrite databases create-collection --database-id main --collection-id user_roles --name "User Roles"
timeout 2 >nul

echo UserRoles - user_id...
appwrite databases create-string-attribute --database-id main --collection-id user_roles --key user_id --size 255 --required true
timeout 1 >nul

echo UserRoles - clinica_id...
appwrite databases create-string-attribute --database-id main --collection-id user_roles --key clinica_id --size 255 --required false
timeout 1 >nul

echo UserRoles - role...
appwrite databases create-enum-attribute --database-id main --collection-id user_roles --key role --elements "super_admin" "proprietaria" "gerente" "profissionais" "recepcionistas" "visitante" "cliente" --required true
timeout 1 >nul

echo UserRoles - ativo...
appwrite databases create-boolean-attribute --database-id main --collection-id user_roles --key ativo --required true --default true
timeout 1 >nul

echo UserRoles - criado_por...
appwrite databases create-string-attribute --database-id main --collection-id user_roles --key criado_por --size 255 --required true
timeout 2 >nul

echo 📝 Criando collection: clinicas...
appwrite databases create-collection --database-id main --collection-id clinicas --name "Clínicas"
timeout 2 >nul

echo Clinicas - organizacao_id...
appwrite databases create-string-attribute --database-id main --collection-id clinicas --key organizacao_id --size 255 --required true
timeout 1 >nul

echo Clinicas - nome...
appwrite databases create-string-attribute --database-id main --collection-id clinicas --key nome --size 255 --required true
timeout 1 >nul

echo Clinicas - ativo...
appwrite databases create-boolean-attribute --database-id main --collection-id clinicas --key ativo --required true --default true
timeout 1 >nul

echo Clinicas - criado_por...
appwrite databases create-string-attribute --database-id main --collection-id clinicas --key criado_por --size 255 --required true
timeout 2 >nul

echo 📁 Criando storage bucket...
appwrite storage create-bucket --bucket-id uploads --name "Sistema Uploads"

echo 🎉 Configuração básica completa!
pause