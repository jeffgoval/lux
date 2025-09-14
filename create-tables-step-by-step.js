import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://dvnyfwpphuuujhodqkko.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTablesStepByStep() {

  // Primeiro, vamos tentar criar as tabelas usando INSERT direto
  // Isso vai nos dar informações sobre a estrutura atual

  try {
    const { data, error } = await supabase
      .from('clinica_profissionais')
      .select('*')
      .limit(1);
    
    if (error) {

    } else {

    }
  } catch (e) {

  }

  try {
    const { data, error } = await supabase
      .from('templates_procedimentos')
      .select('*')
      .limit(1);
    
    if (error) {

    } else {

    }
  } catch (e) {

  }

  // Tentar inserir um registro de teste para ver se as políticas estão funcionando
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {

    } else {

      // Testar política de user_roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);
      
      if (rolesError) {

      } else {

      }
      
      // Testar política de clinicas
      const { data: clinicas, error: clinicasError } = await supabase
        .from('clinicas')
        .select('*')
        .limit(1);
      
      if (clinicasError) {

      } else {

      }
    }
  } catch (e) {

  }

}

createTablesStepByStep();
