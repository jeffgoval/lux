/**
 * 🛡️ SINGLE FLIGHT MANAGER
 * 
 * Sistema que previne múltiplas consultas simultâneas para o mesmo recurso.
 * Elimina race conditions causadas por múltiplos componentes buscando 
 * dados do usuário simultaneamente.
 */

type PromiseResolver<T> = {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

interface FlightEntry<T> {
  promise: Promise<T>;
  resolvers: PromiseResolver<T>[];
  startTime: number;
  timeout?: NodeJS.Timeout;
}

export class SingleFlightManager {
  private flights = new Map<string, FlightEntry<any>>();
  private readonly DEFAULT_TIMEOUT = 5000; // 5 segundos

  /**
   * 🚀 Executa função apenas uma vez por chave
   * 
   * Se já existe uma execução em andamento para a mesma chave,
   * retorna a mesma Promise ao invés de executar novamente.
   */
  async execute<T>(
    key: string, 
    fn: () => Promise<T>, 
    timeoutMs: number = this.DEFAULT_TIMEOUT
  ): Promise<T> {
    // Verificar se já existe flight em andamento
    const existing = this.flights.get(key);
    if (existing) {

      return existing.promise;
    }

    // Criar novo flight

    const flight = this.createFlight<T>(key, fn, timeoutMs);
    this.flights.set(key, flight);

    try {
      const result = await flight.promise;

      return result;
    } catch (error) {

      throw error;
    } finally {
      // Limpar flight após conclusão
      this.cleanupFlight(key);
    }
  }

  /**
   * 🏗️ Cria novo flight com timeout automático
   */
  private createFlight<T>(
    key: string, 
    fn: () => Promise<T>, 
    timeoutMs: number
  ): FlightEntry<T> {
    const resolvers: PromiseResolver<T>[] = [];

    const promise = new Promise<T>((resolve, reject) => {
      resolvers.push({ resolve, reject });

      // Executar função original
      fn()
        .then(result => {
          // Resolver todas as promises pendentes
          resolvers.forEach(resolver => resolver.resolve(result));
        })
        .catch(error => {
          // Rejeitar todas as promises pendentes  
          resolvers.forEach(resolver => resolver.reject(error));
        });
    });

    // Configurar timeout automático
    const timeout = setTimeout(() => {
      const error = new Error(`Flight timeout após ${timeoutMs}ms: ${key}`);
      resolvers.forEach(resolver => resolver.reject(error));
      this.cleanupFlight(key);
    }, timeoutMs);

    return {
      promise,
      resolvers,
      startTime: Date.now(),
      timeout
    };
  }

  /**
   * 🧹 Limpa flight concluído
   */
  private cleanupFlight(key: string): void {
    const flight = this.flights.get(key);
    if (flight?.timeout) {
      clearTimeout(flight.timeout);
    }
    this.flights.delete(key);
  }

  /**
   * 🔍 Verifica se flight está em andamento
   */
  isFlightInProgress(key: string): boolean {
    return this.flights.has(key);
  }

  /**
   * ❌ Cancela flight em andamento
   */
  cancelFlight(key: string): void {
    const flight = this.flights.get(key);
    if (flight) {
      const error = new Error(`Flight cancelado: ${key}`);
      flight.resolvers.forEach(resolver => resolver.reject(error));
      this.cleanupFlight(key);
    }
  }

  /**
   * 📊 Estatísticas de flights
   */
  getStats(): {
    activeFlights: number;
    activeKeys: string[];
  } {
    return {
      activeFlights: this.flights.size,
      activeKeys: Array.from(this.flights.keys())
    };
  }

  /**
   * 🧹 Limpa todos os flights (usar com cuidado)
   */
  cancelAllFlights(): void {
    const keys = Array.from(this.flights.keys());
    keys.forEach(key => this.cancelFlight(key));
  }
}

/**
 * 🔧 INSTÂNCIA SINGLETON
 * 
 * Usar esta instância global para garantir que o single-flight
 * funcione corretamente em toda a aplicação.
 */
export const singleFlightManager = new SingleFlightManager();

/**
 * 🎯 HELPERS ESPECÍFICOS PARA AUTH
 * 
 * Funções convenientes para operações comuns de autenticação.
 */
export class AuthFlightManager {
  private flightManager: SingleFlightManager;

  constructor(manager: SingleFlightManager = singleFlightManager) {
    this.flightManager = manager;
  }

  /**
   * 👤 Busca profile do usuário (single flight)
   */
  async fetchUserProfile(userId: string, fetchFn: () => Promise<any>): Promise<any> {
    const key = `profile:${userId}`;
    return this.flightManager.execute(key, fetchFn, 3000);
  }

  /**
   * 👑 Busca roles do usuário (single flight)
   */
  async fetchUserRoles(userId: string, fetchFn: () => Promise<any[]>): Promise<any[]> {
    const key = `roles:${userId}`;
    return this.flightManager.execute(key, fetchFn, 3000);
  }

  /**
   * 🏢 Busca dados de clínica (single flight)
   */
  async fetchClinicData(clinicId: string, fetchFn: () => Promise<any>): Promise<any> {
    const key = `clinic:${clinicId}`;
    return this.flightManager.execute(key, fetchFn, 3000);
  }

  /**
   * 🔐 Validação de sessão (single flight)
   */
  async validateSession(sessionFn: () => Promise<any>): Promise<any> {
    const key = 'session:validate';
    return this.flightManager.execute(key, sessionFn, 2000);
  }

  /**
   * 🧬 Criação de dados de usuário (single flight)
   */
  async createUserData(userId: string, createFn: () => Promise<any>): Promise<any> {
    const key = `create:${userId}`;
    return this.flightManager.execute(key, createFn, 5000);
  }

  /**
   * 📊 Status dos flights de auth
   */
  getAuthFlightStatus(): {
    total: number;
    active: string[];
    profiles: string[];
    roles: string[];
    sessions: string[];
  } {
    const stats = this.flightManager.getStats();
    
    return {
      total: stats.activeFlights,
      active: stats.activeKeys,
      profiles: stats.activeKeys.filter(k => k.startsWith('profile:')),
      roles: stats.activeKeys.filter(k => k.startsWith('roles:')),
      sessions: stats.activeKeys.filter(k => k.startsWith('session:'))
    };
  }

  /**
   * 🚨 Cancelar todos os flights de auth (emergência)
   */
  cancelAllAuthFlights(): void {
    const stats = this.flightManager.getStats();
    const authKeys = stats.activeKeys.filter(key => 
      key.startsWith('profile:') || 
      key.startsWith('roles:') || 
      key.startsWith('session:') ||
      key.startsWith('create:')
    );
    
    authKeys.forEach(key => this.flightManager.cancelFlight(key));
  }
}

/**
 * 🔧 INSTÂNCIA SINGLETON PARA AUTH
 */
export const authFlightManager = new AuthFlightManager();

/**
 * 🧪 UTILS PARA TESTE
 */
export const flightTestUtils = {
  /**
   * Simula função lenta para testes
   */
  async slowFunction<T>(result: T, delayMs: number): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    return result;
  },

  /**
   * Simula função que falha para testes
   */
  async failingFunction(errorMessage: string): Promise<never> {
    await new Promise(resolve => setTimeout(resolve, 100));
    throw new Error(errorMessage);
  },

  /**
   * Cria múltiplas chamadas simultâneas para teste
   */
  async createConcurrentCalls<T>(
    manager: SingleFlightManager,
    key: string,
    fn: () => Promise<T>,
    count: number
  ): Promise<T[]> {
    const promises = Array(count).fill(null).map(() => 
      manager.execute(key, fn)
    );
    
    return Promise.all(promises);
  }
};
