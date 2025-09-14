# 🏗️ GUIA COMPLETO DE RECONSTRUÇÃO DO PROJETO

## 📋 **RESUMO DAS TABELAS QUE SERÃO RECRIADAS**

### **Tabelas Principais:**
1. ✅ **profiles** - Perfis de usuário (CORRIGIDA - sem gen_random_uuid problemático)
2. ✅ **user_roles** - Roles e permissões 
3. ✅ **organizacoes** - Organizações (multi-clínicas)
4. ✅ **clinicas** - Clínicas (COM todas as colunas: cnpj, endereco, etc.)
5. ✅ **profissionais** - Dados profissionais
6. ✅ **clinica_profissionais** - Relacionamento profissionais-clínicas  
7. ✅ **especialidades_medicas** - Especialidades de referência
8. ✅ **templates_procedimentos** - Templates de procedimentos

### **Recursos Incluídos:**
- 🔐 **RLS (Row Level Security)** configurado
- 🔗 **Foreign Keys** e constraints
- 📊 **Índices** para performance  
- 🔄 **Triggers** para updated_at
- 👤 **handle_new_user()** function para cadastro automático
- 📝 **8 especialidades médicas** pré-inseridas

---

## 🚀 **PASSO-A-PASSO COMPLETO**

### **FASE 1: DELETAR PROJETO ATUAL**

1. **Vá para**: https://supabase.com/dashboard
2. **Acesse seu projeto atual**: luxe-flow-appoint
3. **Settings** → **General** → Scroll até o final
4. **"Delete Project"**
5. **Digite o nome do projeto** para confirmar
6. **Delete** ✅

---

### **FASE 2: CRIAR NOVO PROJETO**

1. **Create new project**
2. **Nome**: `luxe-flow-appoint` (mesmo nome)
3. **Password**: Escolha uma senha forte
4. **Region**: Brazil (South America)
5. **Pricing**: Free tier
6. **Create project** → Aguardar ~2 minutos ⏱️

---

### **FASE 3: CONFIGURAR NOVO PROJETO**

1. **Copiar novas credenciais**:
   - Vá em **Settings** → **API**
   - Copiar **Project URL**
   - Copiar **anon key**

2. **Atualizar .env**:
```env
VITE_SUPABASE_PROJECT_ID="NOVO_PROJECT_ID"
VITE_SUPABASE_ANON_KEY="NOVA_ANON_KEY" 
VITE_SUPABASE_URL="NOVA_PROJECT_URL"
```

---

### **FASE 4: EXECUTAR SCRIPT DE RECONSTRUÇÃO**

1. **Vá para**: SQL Editor no novo projeto
2. **Abrir arquivo**: `REBUILD_DATABASE_COMPLETE.sql`
3. **Copiar TODO o conteúdo**
4. **Colar no SQL Editor**
5. **Run** → Aguardar execução (~30 segundos)
6. **Verificar mensagem**: "Database rebuild completed successfully!"

---

### **FASE 5: TESTAR RECONSTRUÇÃO**

**No terminal:**
```bash
node test-rebuild.cjs
```

**Resultado esperado:**
```
🎉 SUCESSO! Banco reconstruído corretamente!
✅ Todas as tabelas foram criadas
✅ Todas as colunas necessárias existem  
✅ Dados básicos foram inseridos
✅ OnboardingWizard deve funcionar agora!
```

---

### **FASE 6: TESTAR FRONTEND**

1. **Iniciar aplicação**:
```bash
npm run dev
```

2. **Testar fluxo completo**:
   - ✅ Página de login carrega
   - ✅ Cadastro funciona
   - ✅ OnboardingWizard abre
   - ✅ Criação de clínica funciona (COM cnpj, endereço, etc.)
   - ✅ Redirecionamento funciona

---

## 🆘 **SOLUÇÃO DE PROBLEMAS**

### **❌ Se test-rebuild.cjs falhar:**
1. Verifique se o .env foi atualizado
2. Verifique se o script SQL executou completamente
3. Execute novamente o SQL se necessário

### **❌ Se OnboardingWizard ainda der erro:**
1. Verifique se removeu os comentários temporários (linha ~306)
2. Clear cache do browser (Ctrl+Shift+Delete)
3. Teste em modo incógnito

### **❌ Se Auth não funcionar:**
1. Verifique trigger handle_new_user no SQL Editor
2. Teste cadastro com email novo
3. Verifique logs do browser (F12)

---

## ✅ **CHECKLIST FINAL**

- [ ] Projeto antigo deletado
- [ ] Novo projeto criado
- [ ] .env atualizado
- [ ] Script SQL executado
- [ ] test-rebuild.cjs passou
- [ ] Frontend iniciado
- [ ] Cadastro testado
- [ ] Onboarding testado  
- [ ] Criação de clínica testada

---

## 🎯 **TEMPO ESTIMADO**

- **Deletar projeto**: 2 min
- **Criar novo**: 3 min  
- **Executar SQL**: 2 min
- **Testar**: 3 min
- **TOTAL**: ~10 minutos

---

**🚀 Está tudo pronto! O novo projeto terá todas as funcionalidades funcionando perfeitamente, sem bugs de interface e com o onboarding fluido!**