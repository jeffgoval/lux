# 🔧 Correção Deploy DigitalOcean

## Problemas Corrigidos

### ✅ 1. Missing start command
- Adicionado `Procfile` com comando correto
- Script `start` definido no `package.json`
- Comando: `node src/server.js`

### ✅ 2. Port binding issue  
- Mudado porta padrão de 8000 para 8080
- Servidor escuta em `0.0.0.0:8080`
- Variável `PORT` configurada corretamente

### ✅ 3. Health check endpoints
- Adicionado `/health` para health checks
- Adicionado `/` como root endpoint
- Logs detalhados de inicialização

## 🚀 Como Fazer Deploy Agora

### Opção 1: Via GitHub (Recomendado)

1. **Push do código para GitHub**
   ```bash
   git add .
   git commit -m "Fix DigitalOcean deploy issues"
   git push origin main
   ```

2. **Criar App no DigitalOcean**
   - Acesse: https://cloud.digitalocean.com/apps
   - Create App → GitHub
   - Selecione seu repositório
   - Source Directory: `/backend-simple`

3. **Configurações do App**
   ```
   Name: clinica-backend
   Type: Web Service
   Source Directory: /backend-simple
   Build Command: npm install
   Run Command: node src/server.js
   HTTP Port: 8080
   ```

4. **Environment Variables**
   ```
   DATABASE_URL=postgresql://user:pass@host:25060/db?sslmode=require
   JWT_SECRET=seu_jwt_secret_super_seguro_aqui
   NODE_ENV=production
   PORT=8080
   FRONTEND_URL=https://seu-frontend.ondigitalocean.app
   ```

### Opção 2: Via CLI (Alternativa)

1. **Instalar doctl**
   ```bash
   # macOS
   brew install doctl
   
   # Linux
   wget https://github.com/digitalocean/doctl/releases/download/v1.94.0/doctl-1.94.0-linux-amd64.tar.gz
   tar xf doctl-1.94.0-linux-amd64.tar.gz
   sudo mv doctl /usr/local/bin
   ```

2. **Autenticar**
   ```bash
   doctl auth init
   ```

3. **Deploy**
   ```bash
   cd backend-simple
   doctl apps create .do/app.yaml
   ```

## 🧪 Testar Deploy

### 1. Health Check
```bash
curl https://seu-app.ondigitalocean.app/health
```

**Resposta esperada:**
```json
{
  "status": "OK",
  "message": "Health check passed",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 2. API Test
```bash
curl https://seu-app.ondigitalocean.app/api/health
```

### 3. Registro de usuário
```bash
curl -X POST https://seu-app.ondigitalocean.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@teste.com",
    "password": "123456",
    "nome_completo": "Teste User"
  }'
```

## 📋 Checklist de Deploy

- [ ] Código commitado no GitHub
- [ ] App criado no DigitalOcean
- [ ] Environment variables configuradas
- [ ] Database URL configurada
- [ ] Health check funcionando
- [ ] Endpoint `/api/health` respondendo
- [ ] Registro de usuário funcionando
- [ ] Login funcionando

## 🐛 Troubleshooting

### Se ainda der erro de porta:
```bash
# Verificar logs do app
doctl apps logs <app-id>
```

### Se der erro de database:
1. Verificar se DATABASE_URL está correto
2. Testar conexão manual:
   ```bash
   psql "postgresql://user:pass@host:25060/db?sslmode=require"
   ```

### Se der erro de build:
1. Verificar se `package.json` está correto
2. Verificar se todas as dependências estão listadas
3. Verificar logs de build no painel DigitalOcean

## 🎯 Próximos Passos

Depois que o backend estiver funcionando:

1. **Atualizar frontend**
   ```bash
   # Adicionar variável de ambiente
   echo "VITE_API_URL=https://seu-backend.ondigitalocean.app/api" > .env.production
   ```

2. **Deploy do frontend**
   - Mesmo processo, mas como Static Site
   - Build command: `npm run build`
   - Output directory: `dist`

3. **Testar integração completa**
   - Login no frontend
   - Onboarding funcionando
   - Criação de clínica

**Agora vai funcionar! 🚀**