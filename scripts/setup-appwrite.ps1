# 🔥 SCRIPT PARA CONFIGURAR APPWRITE VIA CLI
# Execute este script após instalar a Appwrite CLI

Write-Host "🚀 Configurando Appwrite via CLI..." -ForegroundColor Green

# Verificar se CLI está instalada
if (-not (Get-Command appwrite -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Appwrite CLI não encontrada. Instale primeiro:" -ForegroundColor Red
    Write-Host "npm install -g appwrite-cli" -ForegroundColor Yellow
    exit 1
}

# Configurar projeto
Write-Host "📋 Configurando projeto..." -ForegroundColor Blue
appwrite init project --project-id 68c841cf00032cd36a87

# Criar database
Write-Host "🗄️ Criando database principal..." -ForegroundColor Blue
appwrite databases create --database-id main --name "Sistema Clínicas Estética"

# Função para criar collection com atributos
function Create-Collection {
    param(
        [string]$CollectionId,
        [string]$Name,
        [array]$Attributes
    )
    
    Write-Host "📝 Criando collection: $Name" -ForegroundColor Cyan
    appwrite databases createCollection `
        --database-id main `
        --collection-id $CollectionId `
        --name $Name `
        --permissions "read(`"users`")" "write(`"users`")" `
        --document-security false
    
    Start-Sleep -Seconds 2
    
    foreach ($attr in $Attributes) {
        Write-Host "  ➕ Adicionando atributo: $($attr.key)" -ForegroundColor Gray
        
        switch ($attr.type) {
            "string" {
                $cmd = "appwrite databases createStringAttribute --database-id main --collection-id $CollectionId --key $($attr.key) --size $($attr.size) --required $($attr.required)"
                if ($attr.default) { $cmd += " --default `"$($attr.default)`"" }
                Invoke-Expression $cmd
            }
            "boolean" {
                $cmd = "appwrite databases createBooleanAttribute --database-id main --collection-id $CollectionId --key $($attr.key) --required $($attr.required)"
                if ($attr.default -ne $null) { $cmd += " --default $($attr.default)" }
                Invoke-Expression $cmd
            }
            "integer" {
                $cmd = "appwrite databases createIntegerAttribute --database-id main --collection-id $CollectionId --key $($attr.key) --required $($attr.required)"
                if ($attr.default) { $cmd += " --default $($attr.default)" }
                Invoke-Expression $cmd
            }
            "float" {
                $cmd = "appwrite databases createFloatAttribute --database-id main --collection-id $CollectionId --key $($attr.key) --required $($attr.required)"
                Invoke-Expression $cmd
            }
            "datetime" {
                $cmd = "appwrite databases createDatetimeAttribute --database-id main --collection-id $CollectionId --key $($attr.key) --required $($attr.required)"
                Invoke-Expression $cmd
            }
            "enum" {
                $elements = $attr.elements -join '","'
                $cmd = "appwrite databases createEnumAttribute --database-id main --collection-id $CollectionId --key $($attr.key) --elements `"$elements`" --required $($attr.required)"
                if ($attr.default) { $cmd += " --default `"$($attr.default)`"" }
                Invoke-Expression $cmd
            }
        }
        Start-Sleep -Seconds 1
    }
    
    Write-Host "  ✅ Collection $Name criada com sucesso!" -ForegroundColor Green
    Start-Sleep -Seconds 2
}

# Criar todas as collections
$collections = @(
    @{
        id = "profiles"
        name = "User Profiles"
        attributes = @(
            @{key="user_id"; type="string"; size=255; required=$true},
            @{key="nome_completo"; type="string"; size=255; required=$true},
            @{key="email"; type="string"; size=255; required=$true},
            @{key="telefone"; type="string"; size=20; required=$false},
            @{key="avatar_url"; type="string"; size=500; required=$false},
            @{key="ativo"; type="boolean"; required=$true; default=$true},
            @{key="primeiro_acesso"; type="boolean"; required=$true; default=$true}
        )
    },
    @{
        id = "organizacoes"
        name = "Organizações"
        attributes = @(
            @{key="nome"; type="string"; size=255; required=$true},
            @{key="cnpj"; type="string"; size=20; required=$false},
            @{key="plano"; type="enum"; elements=@("basico","premium","enterprise"); required=$true},
            @{key="ativo"; type="boolean"; required=$true; default=$true},
            @{key="criado_por"; type="string"; size=255; required=$true},
            @{key="configuracoes"; type="string"; size=10000; required=$false}
        )
    },
    @{
        id = "clinicas"
        name = "Clínicas"
        attributes = @(
            @{key="organizacao_id"; type="string"; size=255; required=$true},
            @{key="nome"; type="string"; size=255; required=$true},
            @{key="endereco"; type="string"; size=500; required=$false},
            @{key="telefone"; type="string"; size=20; required=$false},
            @{key="email"; type="string"; size=255; required=$false},
            @{key="ativo"; type="boolean"; required=$true; default=$true},
            @{key="criado_por"; type="string"; size=255; required=$true},
            @{key="configuracoes"; type="string"; size=10000; required=$false}
        )
    },
    @{
        id = "user_roles"
        name = "User Roles"
        attributes = @(
            @{key="user_id"; type="string"; size=255; required=$true},
            @{key="organizacao_id"; type="string"; size=255; required=$false},
            @{key="clinica_id"; type="string"; size=255; required=$false},
            @{key="role"; type="enum"; elements=@("super_admin","proprietaria","gerente","profissionais","recepcionistas","visitante","cliente"); required=$true},
            @{key="ativo"; type="boolean"; required=$true; default=$true},
            @{key="criado_por"; type="string"; size=255; required=$true}
        )
    }
)

foreach ($collection in $collections) {
    Create-Collection -CollectionId $collection.id -Name $collection.name -Attributes $collection.attributes
}

# Criar storage bucket
Write-Host "📁 Criando storage bucket..." -ForegroundColor Blue
appwrite storage createBucket `
    --bucket-id uploads `
    --name "Sistema Uploads" `
    --permissions "read(`"users`")" "write(`"users`")" `
    --file-security true `
    --maximum-file-size 52428800 `
    --allowed-file-extensions "jpg,jpeg,png,gif,pdf,doc,docx"

Write-Host "🎉 Configuração do Appwrite concluída com sucesso!" -ForegroundColor Green
Write-Host "📋 Próximos passos:" -ForegroundColor Yellow
Write-Host "  1. Execute: npm run dev" -ForegroundColor Gray  
Write-Host "  2. Teste o login/registro" -ForegroundColor Gray
Write-Host "  3. Verifique no console se não há erros" -ForegroundColor Gray