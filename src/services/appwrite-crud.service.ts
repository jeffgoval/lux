/**
 * 🔥 SERVIÇO BASE DE CRUD APPWRITE
 * 
 * Serviço genérico para operações CRUD que substitui o Supabase
 */

import { Query, AppwriteException } from 'appwrite';
import {
  databases,
  DATABASE_ID,
  ID
} from '@/lib/appwrite';
import {
  AppwriteDocument,
  AppwriteDocumentList,
  CreateDocumentInput,
  UpdateDocumentInput
} from '@/types/appwrite.types';

export interface QueryOptions {
  filters?: string[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
}

export interface CrudResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ListResult<T> {
  success: boolean;
  data?: T[];
  total?: number;
  error?: string;
}

export class AppwriteCrudService {
  /**
   * Listar documentos de uma collection
   */
  static async list<T>(
    collectionId: string,
    options: QueryOptions = {}
  ): Promise<ListResult<AppwriteDocument<T>>> {
    try {
      const queries: string[] = [];

      // Adicionar filtros
      if (options.filters) {
        queries.push(...options.filters);
      }

      // Adicionar ordenação
      if (options.orderBy) {
        options.orderBy.forEach(order => {
          if (order.direction === 'desc') {
            queries.push(Query.orderDesc(order.field));
          } else {
            queries.push(Query.orderAsc(order.field));
          }
        });
      }

      // Adicionar limit
      if (options.limit) {
        queries.push(Query.limit(options.limit));
      }

      // Adicionar offset
      if (options.offset) {
        queries.push(Query.offset(options.offset));
      }

      const result = await databases.listDocuments<AppwriteDocument<T>>(
        DATABASE_ID,
        collectionId,
        queries
      );

      return {
        success: true,
        data: result.documents,
        total: result.total
      };
    } catch (error) {
      const appwriteError = error as AppwriteException;
      return {
        success: false,
        error: appwriteError.message || 'Erro ao listar documentos'
      };
    }
  }

  /**
   * Buscar documento por ID
   */
  static async getById<T>(
    collectionId: string,
    documentId: string
  ): Promise<CrudResult<AppwriteDocument<T>>> {
    try {
      const result = await databases.getDocument<AppwriteDocument<T>>(
        DATABASE_ID,
        collectionId,
        documentId
      );

      return {
        success: true,
        data: result
      };
    } catch (error) {
      const appwriteError = error as AppwriteException;
      return {
        success: false,
        error: appwriteError.message || 'Documento não encontrado'
      };
    }
  }

  /**
   * Criar novo documento
   */
  static async create<T>(
    collectionId: string,
    data: CreateDocumentInput<T>,
    permissions?: string[]
  ): Promise<CrudResult<AppwriteDocument<T>>> {
    try {
      const result = await databases.createDocument<AppwriteDocument<T>>(
        DATABASE_ID,
        collectionId,
        ID.unique(),
        data,
        permissions
      );

      return {
        success: true,
        data: result
      };
    } catch (error) {
      const appwriteError = error as AppwriteException;
      return {
        success: false,
        error: appwriteError.message || 'Erro ao criar documento'
      };
    }
  }

  /**
   * Atualizar documento existente
   */
  static async update<T>(
    collectionId: string,
    documentId: string,
    data: UpdateDocumentInput<T>,
    permissions?: string[]
  ): Promise<CrudResult<AppwriteDocument<T>>> {
    try {
      const result = await databases.updateDocument<AppwriteDocument<T>>(
        DATABASE_ID,
        collectionId,
        documentId,
        data,
        permissions
      );

      return {
        success: true,
        data: result
      };
    } catch (error) {
      const appwriteError = error as AppwriteException;
      return {
        success: false,
        error: appwriteError.message || 'Erro ao atualizar documento'
      };
    }
  }

  /**
   * Deletar documento
   */
  static async delete(
    collectionId: string,
    documentId: string
  ): Promise<CrudResult<void>> {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        collectionId,
        documentId
      );

      return {
        success: true
      };
    } catch (error) {
      const appwriteError = error as AppwriteException;
      return {
        success: false,
        error: appwriteError.message || 'Erro ao deletar documento'
      };
    }
  }

  /**
   * Buscar documentos com filtro específico
   */
  static async findBy<T>(
    collectionId: string,
    field: string,
    value: any,
    options: Omit<QueryOptions, 'filters'> = {}
  ): Promise<ListResult<AppwriteDocument<T>>> {
    const filters = [Query.equal(field, value)];
    
    return this.list<T>(collectionId, {
      ...options,
      filters
    });
  }

  /**
   * Contar documentos
   */
  static async count(
    collectionId: string,
    filters: string[] = []
  ): Promise<CrudResult<number>> {
    try {
      const result = await databases.listDocuments(
        DATABASE_ID,
        collectionId,
        [...filters, Query.limit(1)]
      );

      return {
        success: true,
        data: result.total
      };
    } catch (error) {
      const appwriteError = error as AppwriteException;
      return {
        success: false,
        error: appwriteError.message || 'Erro ao contar documentos'
      };
    }
  }

  /**
   * Busca com paginação
   */
  static async paginate<T>(
    collectionId: string,
    page: number,
    pageSize: number = 25,
    options: Omit<QueryOptions, 'limit' | 'offset'> = {}
  ): Promise<ListResult<AppwriteDocument<T>> & { page: number; pageSize: number; totalPages: number }> {
    const offset = (page - 1) * pageSize;
    
    const result = await this.list<T>(collectionId, {
      ...options,
      limit: pageSize,
      offset
    });

    if (!result.success) {
      return {
        ...result,
        page,
        pageSize,
        totalPages: 0
      };
    }

    const totalPages = Math.ceil((result.total || 0) / pageSize);

    return {
      ...result,
      page,
      pageSize,
      totalPages
    };
  }

  /**
   * Busca em lote (batch)
   */
  static async batchGet<T>(
    collectionId: string,
    documentIds: string[]
  ): Promise<ListResult<AppwriteDocument<T>>> {
    try {
      const filters = [Query.equal('$id', documentIds)];
      
      return this.list<T>(collectionId, { filters });
    } catch (error) {
      const appwriteError = error as AppwriteException;
      return {
        success: false,
        error: appwriteError.message || 'Erro ao buscar documentos em lote'
      };
    }
  }
}

// Helpers para construir queries comuns
export const AppwriteQueryBuilder = {
  // Filtros
  equals: (field: string, value: any) => Query.equal(field, value),
  notEquals: (field: string, value: any) => Query.notEqual(field, value),
  contains: (field: string, value: string) => Query.contains(field, value),
  startsWith: (field: string, value: string) => Query.startsWith(field, value),
  endsWith: (field: string, value: string) => Query.endsWith(field, value),
  greaterThan: (field: string, value: any) => Query.greaterThan(field, value),
  lessThan: (field: string, value: any) => Query.lessThan(field, value),
  between: (field: string, start: any, end: any) => Query.between(field, start, end),
  isNull: (field: string) => Query.isNull(field),
  isNotNull: (field: string) => Query.isNotNull(field),
  
  // Ordenação
  orderAsc: (field: string) => Query.orderAsc(field),
  orderDesc: (field: string) => Query.orderDesc(field),
  
  // Paginação
  limit: (count: number) => Query.limit(count),
  offset: (count: number) => Query.offset(count),
  
  // Busca de texto
  search: (field: string, text: string) => Query.search(field, text)
};