@echo off
echo 🚀 Configurando Appwrite via CLI...
echo.

REM Verificar se CLI está instalada
where appwrite >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Appwrite CLI não encontrada. Execute: npm install -g appwrite-cli
    pause
    exit /b 1
)

echo 📋 Inicializando projeto...
appwrite init project --project-id 68c841cf00032cd36a87

echo 🗄️ Criando database principal...
appwrite databases create --database-id main --name "Sistema Clínicas Estética"

timeout /t 2 >nul

echo 📝 Criando collection: profiles...
appwrite databases createCollection --database-id main --collection-id profiles --name "User Profiles" --permissions "read(\"users\")" "write(\"users\")" --document-security false

timeout /t 2 >nul

echo   ➕ Adicionando atributos ao profiles...
appwrite databases createStringAttribute --database-id main --collection-id profiles --key user_id --size 255 --required true
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id profiles --key nome_completo --size 255 --required true
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id profiles --key email --size 255 --required true
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id profiles --key telefone --size 20 --required false
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id profiles --key avatar_url --size 500 --required false
timeout /t 1 >nul
appwrite databases createBooleanAttribute --database-id main --collection-id profiles --key ativo --required true --default true
timeout /t 1 >nul
appwrite databases createBooleanAttribute --database-id main --collection-id profiles --key primeiro_acesso --required true --default true
timeout /t 2 >nul

echo   ✅ Collection profiles criada!

echo 📝 Criando collection: organizacoes...
appwrite databases createCollection --database-id main --collection-id organizacoes --name "Organizações" --permissions "read(\"users\")" "write(\"users\")" --document-security false

timeout /t 2 >nul

echo   ➕ Adicionando atributos ao organizacoes...
appwrite databases createStringAttribute --database-id main --collection-id organizacoes --key nome --size 255 --required true
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id organizacoes --key cnpj --size 20 --required false
timeout /t 1 >nul
appwrite databases createEnumAttribute --database-id main --collection-id organizacoes --key plano --elements "basico","premium","enterprise" --required true
timeout /t 1 >nul
appwrite databases createBooleanAttribute --database-id main --collection-id organizacoes --key ativo --required true --default true
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id organizacoes --key criado_por --size 255 --required true
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id organizacoes --key configuracoes --size 10000 --required false
timeout /t 2 >nul

echo   ✅ Collection organizacoes criada!

echo 📝 Criando collection: clinicas...
appwrite databases createCollection --database-id main --collection-id clinicas --name "Clínicas" --permissions "read(\"users\")" "write(\"users\")" --document-security false

timeout /t 2 >nul

echo   ➕ Adicionando atributos ao clinicas...
appwrite databases createStringAttribute --database-id main --collection-id clinicas --key organizacao_id --size 255 --required true
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id clinicas --key nome --size 255 --required true
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id clinicas --key endereco --size 500 --required false
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id clinicas --key telefone --size 20 --required false
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id clinicas --key email --size 255 --required false
timeout /t 1 >nul
appwrite databases createBooleanAttribute --database-id main --collection-id clinicas --key ativo --required true --default true
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id clinicas --key criado_por --size 255 --required true
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id clinicas --key configuracoes --size 10000 --required false
timeout /t 2 >nul

echo   ✅ Collection clinicas criada!

echo 📝 Criando collection: user_roles...
appwrite databases createCollection --database-id main --collection-id user_roles --name "User Roles" --permissions "read(\"users\")" "write(\"users\")" --document-security false

timeout /t 2 >nul

echo   ➕ Adicionando atributos ao user_roles...
appwrite databases createStringAttribute --database-id main --collection-id user_roles --key user_id --size 255 --required true
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id user_roles --key organizacao_id --size 255 --required false
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id user_roles --key clinica_id --size 255 --required false
timeout /t 1 >nul
appwrite databases createEnumAttribute --database-id main --collection-id user_roles --key role --elements "super_admin","proprietaria","gerente","profissionais","recepcionistas","visitante","cliente" --required true
timeout /t 1 >nul
appwrite databases createBooleanAttribute --database-id main --collection-id user_roles --key ativo --required true --default true
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id user_roles --key criado_por --size 255 --required true
timeout /t 2 >nul

echo   ✅ Collection user_roles criada!

echo 📝 Criando collection: agendamentos...
appwrite databases createCollection --database-id main --collection-id agendamentos --name "Agendamentos" --permissions "read(\"users\")" "write(\"users\")" --document-security false

timeout /t 2 >nul

echo   ➕ Adicionando atributos ao agendamentos...
appwrite databases createStringAttribute --database-id main --collection-id agendamentos --key clinica_id --size 255 --required true
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id agendamentos --key profissional_id --size 255 --required true
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id agendamentos --key cliente_id --size 255 --required true
timeout /t 1 >nul
appwrite databases createDatetimeAttribute --database-id main --collection-id agendamentos --key data_hora --required true
timeout /t 1 >nul
appwrite databases createIntegerAttribute --database-id main --collection-id agendamentos --key duracao_minutos --required true
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id agendamentos --key servico --size 255 --required true
timeout /t 1 >nul
appwrite databases createEnumAttribute --database-id main --collection-id agendamentos --key status --elements "agendado","confirmado","em_andamento","concluido","cancelado" --required true
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id agendamentos --key observacoes --size 1000 --required false
timeout /t 1 >nul
appwrite databases createFloatAttribute --database-id main --collection-id agendamentos --key valor --required false
timeout /t 1 >nul
appwrite databases createBooleanAttribute --database-id main --collection-id agendamentos --key is_vip --required true --default false
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id agendamentos --key criado_por --size 255 --required true
timeout /t 2 >nul

echo   ✅ Collection agendamentos criada!

echo 📝 Criando collection: notificacoes...
appwrite databases createCollection --database-id main --collection-id notificacoes --name "Notificações" --permissions "read(\"users\")" "write(\"users\")" --document-security false

timeout /t 2 >nul

echo   ➕ Adicionando atributos ao notificacoes...
appwrite databases createStringAttribute --database-id main --collection-id notificacoes --key user_id --size 255 --required true
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id notificacoes --key titulo --size 255 --required true
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id notificacoes --key mensagem --size 1000 --required true
timeout /t 1 >nul
appwrite databases createEnumAttribute --database-id main --collection-id notificacoes --key tipo --elements "info","warning","error","success" --required true
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id notificacoes --key categoria --size 100 --required false
timeout /t 1 >nul
appwrite databases createBooleanAttribute --database-id main --collection-id notificacoes --key lida --required true --default false
timeout /t 1 >nul
appwrite databases createDatetimeAttribute --database-id main --collection-id notificacoes --key data_leitura --required false
timeout /t 1 >nul
appwrite databases createStringAttribute --database-id main --collection-id notificacoes --key metadata --size 2000 --required false
timeout /t 2 >nul

echo   ✅ Collection notificacoes criada!

echo 📁 Criando storage bucket...
appwrite storage createBucket --bucket-id uploads --name "Sistema Uploads" --permissions "read(\"users\")" "write(\"users\")" --file-security true --maximum-file-size 52428800 --allowed-file-extensions "jpg,jpeg,png,gif,pdf,doc,docx"

echo.
echo 🎉 Configuração do Appwrite concluída com sucesso!
echo 📋 Próximos passos:
echo   1. Execute: npm run dev
echo   2. Teste o login/registro
echo   3. Verifique no console se não há erros
echo.
pause