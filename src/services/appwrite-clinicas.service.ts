/**
 * 🔥 SERVIÇO DE CLÍNICAS APPWRITE
 * 
 * Serviço para gerenciar clínicas usando Appwrite
 */

import { Query } from 'appwrite';
import { COLLECTIONS } from '@/lib/appwrite';
import { AppwriteCrudService, AppwriteQueryBuilder } from './appwrite-crud.service';
import {
  ClinicaDocument,
  OrganizacaoDocument,
  UserRoleDocument
} from '@/types/appwrite.types';
import { authLogger } from '@/utils/logger';

export interface CreateClinicaData {
  organizacao_id: string;
  nome: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  criado_por: string;
  configuracoes?: Record<string, any>;
}

export interface UpdateClinicaData {
  nome?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  ativo?: boolean;
  configuracoes?: Record<string, any>;
}

export interface ClinicaFilters {
  organizacao_id?: string;
  ativo?: boolean;
  search?: string;
}

export class AppwriteClinicasService {
  /**
   * Listar clínicas com filtros
   */
  static async listarClinicas(
    filters: ClinicaFilters = {},
    page = 1,
    pageSize = 25
  ) {
    try {
      const queryFilters: string[] = [];

      // Filtrar por organização
      if (filters.organizacao_id) {
        queryFilters.push(
          AppwriteQueryBuilder.equals('organizacao_id', filters.organizacao_id)
        );
      }

      // Filtrar por status ativo
      if (filters.ativo !== undefined) {
        queryFilters.push(
          AppwriteQueryBuilder.equals('ativo', filters.ativo)
        );
      }

      // Busca por texto no nome
      if (filters.search) {
        queryFilters.push(
          AppwriteQueryBuilder.contains('nome', filters.search)
        );
      }

      const result = await AppwriteCrudService.paginate<ClinicaDocument>(
        COLLECTIONS.CLINICAS,
        page,
        pageSize,
        {
          filters: queryFilters,
          orderBy: [{ field: 'nome', direction: 'asc' }]
        }
      );

      return result;
    } catch (error) {
      authLogger.error('Erro ao listar clínicas:', error);
      return {
        success: false,
        error: 'Erro ao listar clínicas',
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }
  }

  /**
   * Buscar clínica por ID
   */
  static async buscarClinica(clinicaId: string) {
    try {
      const result = await AppwriteCrudService.getById<ClinicaDocument>(
        COLLECTIONS.CLINICAS,
        clinicaId
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      authLogger.error('Erro ao buscar clínica:', error);
      return {
        success: false,
        error: 'Clínica não encontrada'
      };
    }
  }

  /**
   * Criar nova clínica
   */
  static async criarClinica(dados: CreateClinicaData) {
    try {
      // Verificar se a organização existe
      const organizacaoResult = await AppwriteCrudService.getById<OrganizacaoDocument>(
        COLLECTIONS.ORGANIZACOES,
        dados.organizacao_id
      );

      if (!organizacaoResult.success) {
        return {
          success: false,
          error: 'Organização não encontrada'
        };
      }

      // Criar clínica
      const clinicaData = {
        ...dados,
        ativo: true,
        configuracoes: dados.configuracoes || {}
      };

      const result = await AppwriteCrudService.create<ClinicaDocument>(
        COLLECTIONS.CLINICAS,
        clinicaData
      );

      if (result.success) {
        authLogger.info('Clínica criada com sucesso', { 
          clinicaId: result.data?.$id,
          nome: dados.nome 
        });
      }

      return result;
    } catch (error) {
      authLogger.error('Erro ao criar clínica:', error);
      return {
        success: false,
        error: 'Erro ao criar clínica'
      };
    }
  }

  /**
   * Atualizar clínica
   */
  static async atualizarClinica(
    clinicaId: string,
    dados: UpdateClinicaData
  ) {
    try {
      const result = await AppwriteCrudService.update<ClinicaDocument>(
        COLLECTIONS.CLINICAS,
        clinicaId,
        dados
      );

      if (result.success) {
        authLogger.info('Clínica atualizada com sucesso', { clinicaId });
      }

      return result;
    } catch (error) {
      authLogger.error('Erro ao atualizar clínica:', error);
      return {
        success: false,
        error: 'Erro ao atualizar clínica'
      };
    }
  }

  /**
   * Desativar clínica (soft delete)
   */
  static async desativarClinica(clinicaId: string) {
    try {
      const result = await this.atualizarClinica(clinicaId, { ativo: false });
      
      if (result.success) {
        authLogger.info('Clínica desativada com sucesso', { clinicaId });
      }

      return result;
    } catch (error) {
      authLogger.error('Erro ao desativar clínica:', error);
      return {
        success: false,
        error: 'Erro ao desativar clínica'
      };
    }
  }

  /**
   * Buscar clínicas de um usuário
   */
  static async buscarClinicasUsuario(userId: string) {
    try {
      // Primeiro, buscar as roles do usuário
      const rolesResult = await AppwriteCrudService.findBy<UserRoleDocument>(
        COLLECTIONS.USER_ROLES,
        'user_id',
        userId,
        {
          filters: [AppwriteQueryBuilder.equals('ativo', true)]
        }
      );

      if (!rolesResult.success || !rolesResult.data) {
        return {
          success: true,
          data: [],
          total: 0
        };
      }

      // Se é super admin, retornar todas as clínicas
      const isSuperAdmin = rolesResult.data.some(role => role.role === 'super_admin');
      
      if (isSuperAdmin) {
        return this.listarClinicas({ ativo: true }, 1, 100);
      }

      // Senão, buscar apenas as clínicas específicas do usuário
      const clinicIds = rolesResult.data
        .filter(role => role.clinica_id)
        .map(role => role.clinica_id!);

      if (clinicIds.length === 0) {
        return {
          success: true,
          data: [],
          total: 0
        };
      }

      const result = await AppwriteCrudService.batchGet<ClinicaDocument>(
        COLLECTIONS.CLINICAS,
        clinicIds
      );

      // Filtrar apenas clínicas ativas
      if (result.success && result.data) {
        result.data = result.data.filter(clinica => clinica.ativo);
        result.total = result.data.length;
      }

      return result;
    } catch (error) {
      authLogger.error('Erro ao buscar clínicas do usuário:', error);
      return {
        success: false,
        error: 'Erro ao buscar clínicas do usuário'
      };
    }
  }

  /**
   * Verificar se usuário tem acesso à clínica
   */
  static async verificarAcessoClinica(userId: string, clinicaId: string) {
    try {
      const clinicasUsuario = await this.buscarClinicasUsuario(userId);
      
      if (!clinicasUsuario.success || !clinicasUsuario.data) {
        return false;
      }

      return clinicasUsuario.data.some(clinica => clinica.$id === clinicaId);
    } catch (error) {
      authLogger.error('Erro ao verificar acesso à clínica:', error);
      return false;
    }
  }

  /**
   * Estatísticas da clínica
   */
  static async obterEstatisticasClinica(clinicaId: string) {
    try {
      // Buscar informações básicas da clínica
      const clinicaResult = await this.buscarClinica(clinicaId);
      
      if (!clinicaResult.success) {
        return clinicaResult;
      }

      // Contar profissionais ativos
      const profissionaisResult = await AppwriteCrudService.count(
        COLLECTIONS.USER_ROLES,
        [
          AppwriteQueryBuilder.equals('clinica_id', clinicaId),
          AppwriteQueryBuilder.equals('ativo', true),
          AppwriteQueryBuilder.notEquals('role', 'cliente')
        ]
      );

      const estatisticas = {
        clinica: clinicaResult.data,
        totalProfissionais: profissionaisResult.success ? profissionaisResult.data : 0,
        // Aqui podemos adicionar mais estatísticas conforme necessário
        // totalAgendamentos: ...
        // totalClientes: ...
      };

      return {
        success: true,
        data: estatisticas
      };
    } catch (error) {
      authLogger.error('Erro ao obter estatísticas da clínica:', error);
      return {
        success: false,
        error: 'Erro ao obter estatísticas da clínica'
      };
    }
  }

  /**
   * Buscar clínicas por organização
   */
  static async buscarClinicasPorOrganizacao(organizacaoId: string) {
    try {
      return this.listarClinicas(
        { organizacao_id: organizacaoId, ativo: true },
        1,
        100
      );
    } catch (error) {
      authLogger.error('Erro ao buscar clínicas por organização:', error);
      return {
        success: false,
        error: 'Erro ao buscar clínicas por organização',
        data: [],
        total: 0,
        page: 1,
        pageSize: 100,
        totalPages: 0
      };
    }
  }
}