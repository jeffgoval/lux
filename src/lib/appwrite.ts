/**
 * 🔥 APPWRITE CLIENT
 * 
 * Cliente Appwrite configurado para substituir o Supabase
 */

import { Client, Account, Databases, Storage, Teams, Functions, ID } from 'appwrite';

import { env, validateEnvironment } from '@/config/env.config';

// Validar variáveis de ambiente
validateEnvironment();

// Configurações do Appwrite
const APPWRITE_ENDPOINT = env.appwrite.endpoint;
const APPWRITE_PROJECT_ID = env.appwrite.projectId;

// Cliente principal
export const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

// Serviços Appwrite
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const teams = new Teams(client);
export const functions = new Functions(client);

// Constantes de configuração
export const DATABASE_ID = 'main';
export const STORAGE_BUCKET_ID = 'uploads';

// IDs das Collections (serão criadas no Appwrite Console)
export const COLLECTIONS = {
  PROFILES: 'profiles',
  ORGANIZACOES: 'organizacoes',
  CLINICAS: 'clinicas',
  USER_ROLES: 'user_roles',
  CONVITES: 'convites',
  PROFISSIONAIS_ESPECIALIDADES: 'profissionais_especialidades',
  AGENDAMENTOS: 'agendamentos',
  PRONTUARIOS: 'prontuarios',
  NOTIFICACOES: 'notificacoes',
  PATIENTS: 'patients', // Collection para clientes/pacientes
  SERVICES: 'services',
  APPOINTMENTS: 'appointments'
} as const;

// Helper para gerar IDs únicos
export { ID };

// Helpers para autenticação e sessão
export const appwriteService = {
  // Configurar cliente com JWT token para autenticação server-side
  setJWT: (jwt: string) => {
    client.setJWT(jwt);
  },

  // Limpar JWT
  clearJWT: () => {
    client.setJWT('');
  },

  // Verificar se usuário está logado
  isLoggedIn: async (): Promise<boolean> => {
    try {
      await account.get();
      return true;
    } catch {
      return false;
    }
  }
};