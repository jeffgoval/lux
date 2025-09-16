/**
 * 🚨 UTILITÁRIOS PARA EXIBIÇÃO DE ERROS
 * 
 * Funções para renderizar erros de forma segura no React
 */

/**
 * Converte um erro (string ou objeto) em string para exibição
 */
export function formatErrorForDisplay(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object') {
    // Se tem propriedade message
    if ('message' in error && typeof (error as any).message === 'string') {
      return (error as any).message;
    }
    
    // Se é um objeto Error
    if (error instanceof Error) {
      return error.message;
    }
    
    // Tentar JSON.stringify como fallback
    try {
      return JSON.stringify(error);
    } catch {
      return 'Erro desconhecido';
    }
  }
  
  return 'Erro desconhecido';
}