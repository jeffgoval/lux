import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Ler .env
const env = fs.readFileSync('.env', 'utf8')
  .split('\n')
  .reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key && value) acc[key.trim()] = value.trim().replace(/"/g, '');
    return acc;
  }, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function forceCreateProfile() {
  const email = 'jon@gmail.com'; // Usuário problema
  
  try {
    // 1. Buscar o usuário auth
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    const authUser = users?.find(u => u.email === email);
    
    if (!authUser) {
      console.log('❌ Usuário não encontrado no auth');
      return;
    }
    
    console.log('✅ Usuário encontrado:', authUser.id);
    
    // 2. Criar profile forçadamente
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: authUser.id,
        nome_completo: authUser.email.split('@')[0],
        email: authUser.email,
        primeiro_acesso: true,
        ativo: true
      })
      .select();
      
    if (error) {
      console.log('❌ Erro ao criar profile:', error.message);
    } else {
      console.log('✅ Profile criado:', data);
    }
    
    // 3. Criar role também
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: authUser.id,
        role: 'visitante',
        ativo: true,
        criado_por: authUser.id
      });
      
    if (roleError) {
      console.log('❌ Erro ao criar role:', roleError.message);
    } else {
      console.log('✅ Role criada');
    }
    
  } catch (error) {
    console.log('❌ Erro:', error.message);
  }
}

forceCreateProfile();