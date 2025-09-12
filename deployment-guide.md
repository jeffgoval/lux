# Guia de Deploy Rápido - DigitalOcean

## 🚀 Deploy em 1 hora (sem RLS, sem dor de cabeça!)

### Passo 1: Database (10 minutos)

1. **Criar Database no DigitalOcean**
   - Acesse: https://cloud.digitalocean.com/databases
   - Create Database → PostgreSQL 15
   - Basic plan ($15/mês)
   - Região mais próxima

2. **Executar Schema**
   ```bash
   # Conectar ao database
   psql "postgresql://username:password@host:25060/database?sslmode=require"
   
   # Executar o schema
   \i database-schema-simple.sql
   ```

### Passo 2: Backend Deploy (20 minutos)

1. **Preparar arquivos**
   ```bash
   cd backend-simple
   npm install
   ```

2. **Deploy no App Platform**
   - Acesse: https://cloud.digitalocean.com/apps
   - Create App → GitHub/GitLab
   - Selecionar repositório
   - Configurar:
     - Type: Web Service
     - Source Directory: `/backend-simple`
     - Build Command: `npm install`
     - Run Command: `npm start`

3. **Configurar Environment Variables**
   ```
   DATABASE_URL=postgresql://user:pass@host:25060/db?sslmode=require
   JWT_SECRET=seu_jwt_secret_super_seguro_123456789
   NODE_ENV=production
   FRONTEND_URL=https://seu-frontend.ondigitalocean.app
   ```

### Passo 3: Frontend Deploy (20 minutos)

1. **Atualizar código**
   ```bash
   # Substituir AuthContext
   mv src/contexts/AuthContext.tsx src/contexts/AuthContext-old.tsx
   mv src/contexts/AuthContext-new.tsx src/contexts/AuthContext.tsx
   
   # Adicionar variável de ambiente
   echo "VITE_API_URL=https://seu-backend.ondigitalocean.app/api" > .env.production
   ```

2. **Deploy no App Platform**
   - Create App → GitHub/GitLab
   - Configurar:
     - Type: Static Site
     - Build Command: `npm run build`
     - Output Directory: `dist`

### Passo 4: Testar (10 minutos)

1. **Criar usuário teste**
   ```bash
   curl -X POST https://seu-backend.ondigitalocean.app/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "teste@teste.com",
       "password": "123456",
       "nome_completo": "Usuário Teste"
     }'
   ```

2. **Fazer login**
   ```bash
   curl -X POST https://seu-backend.ondigitalocean.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "teste@teste.com",
       "password": "123456"
     }'
   ```

## ✅ Checklist Final

- [ ] Database criado e schema executado
- [ ] Backend deployado com env vars
- [ ] Frontend deployado com API URL
- [ ] Teste de registro funcionando
- [ ] Teste de login funcionando
- [ ] Onboarding funcionando (criar clínica)

## 🎉 Resultado

- ✅ **Auth funcionando** sem RLS
- ✅ **Onboarding funcionando** sem complicação
- ✅ **Deploy completo** em ~1 hora
- ✅ **Custo previsível** (~$32/mês)
- ✅ **Sem dor de cabeça** com políticas

## 💡 Próximos Passos

Depois que estiver funcionando, você pode:
1. Adicionar mais endpoints conforme necessário
2. Implementar upload de arquivos
3. Adicionar mais tabelas (clientes, agendamentos, etc.)
4. Configurar domínio customizado
5. Adicionar monitoramento

**Sem RLS, sem trigger, só PostgreSQL puro que FUNCIONA!**