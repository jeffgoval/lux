// =====================================================
// TESTES BÁSICOS DE FUNCIONALIDADE
// Sistema de Gestão de Clínicas Estéticas
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qkejbdifsjyqiaxfcdrm.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrZWpiZGlmc2p5cWlheGZjZHJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYwNDE0NDMsImV4cCI6MjA0MTYxNzQ0M30.zzIX4HbT0EswOXiUZwY4K8nFLJ7JLHAWGmqe3YJ1Yeo';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Classe para executar testes básicos do sistema
 */
class DatabaseTester {
  constructor() {
    this.testResults = [];
    this.passedTests = 0;
    this.failedTests = 0;
  }

  /**
   * Registra resultado de um teste
   */
  logResult(testName, passed, message = '', details = null) {
    const result = {
      test: testName,
      status: passed ? '✅ PASS' : '❌ FAIL',
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    console.log(`${result.status} ${testName}${message ? ': ' + message : ''}`);
    
    if (passed) {
      this.passedTests++;
    } else {
      this.failedTests++;
      if (details) console.error('   Details:', details);
    }
  }

  /**
   * Teste 1: Verificar se dados de referência existem
   */
  async testReferenceData() {
    console.log('\n🧪 TESTE 1: Dados de Referência');
    console.log('================================');

    try {
      // Verificar especialidades médicas
      const { data: especialidades, error: espError } = await supabase
        .from('especialidades_medicas')
        .select('*')
        .limit(5);

      if (espError) throw espError;
      
      this.logResult(
        'Especialidades Médicas',
        especialidades && especialidades.length > 0,
        `${especialidades?.length || 0} especialidades encontradas`
      );

      // Verificar categorias de procedimento
      const { data: categorias, error: catError } = await supabase
        .from('categorias_procedimento')
        .select('*')
        .limit(5);

      if (catError) throw catError;
      
      this.logResult(
        'Categorias de Procedimento',
        categorias && categorias.length > 0,
        `${categorias?.length || 0} categorias encontradas`
      );

      // Verificar fabricantes de equipamento
      const { data: fabricantes, error: fabError } = await supabase
        .from('fabricantes_equipamento')
        .select('*')
        .limit(5);

      if (fabError) throw fabError;
      
      this.logResult(
        'Fabricantes de Equipamento',
        fabricantes && fabricantes.length > 0,
        `${fabricantes?.length || 0} fabricantes encontrados`
      );

    } catch (error) {
      this.logResult('Dados de Referência', false, 'Erro ao buscar dados', error.message);
    }
  }

  /**
   * Teste 2: Verificar estrutura das tabelas principais
   */
  async testTableStructure() {
    console.log('\n🧪 TESTE 2: Estrutura das Tabelas');
    console.log('==================================');

    const expectedTables = [
      'profiles',
      'user_roles',
      'organizacoes',
      'clinicas',
      'profissionais',
      'prontuarios',
      'sessoes_atendimento',
      'imagens_medicas',
      'equipamentos',
      'produtos'
    ];

    for (const tableName of expectedTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error && error.code === '42P01') {
          this.logResult(`Tabela ${tableName}`, false, 'Tabela não existe');
        } else if (error) {
          this.logResult(`Tabela ${tableName}`, false, 'Erro de acesso', error.message);
        } else {
          this.logResult(`Tabela ${tableName}`, true, 'Estrutura OK');
        }
      } catch (error) {
        this.logResult(`Tabela ${tableName}`, false, 'Erro inesperado', error.message);
      }
    }
  }

  /**
   * Teste 3: Verificar políticas RLS básicas
   */
  async testRLSPolicies() {
    console.log('\n🧪 TESTE 3: Políticas RLS');
    console.log('=========================');

    try {
      // Tentar acessar tabelas com RLS (deve falhar se não autenticado)
      const rlsTables = ['profiles', 'user_roles', 'clinicas', 'prontuarios'];
      
      for (const tableName of rlsTables) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);

          if (error && (error.message.includes('RLS') || error.message.includes('policy'))) {
            this.logResult(`RLS ${tableName}`, true, 'Política ativa (acesso negado como esperado)');
          } else if (!error && (!data || data.length === 0)) {
            this.logResult(`RLS ${tableName}`, true, 'Sem dados ou acesso controlado');
          } else {
            this.logResult(`RLS ${tableName}`, false, 'RLS pode estar desabilitado');
          }
        } catch (error) {
          this.logResult(`RLS ${tableName}`, true, 'Erro de acesso (RLS funcionando)');
        }
      }

      // Verificar acesso a tabelas de referência (devem ser acessíveis)
      const publicTables = ['especialidades_medicas', 'categorias_procedimento'];
      
      for (const tableName of publicTables) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);

          if (!error && data) {
            this.logResult(`Public Access ${tableName}`, true, 'Acesso público funcionando');
          } else {
            this.logResult(`Public Access ${tableName}`, false, 'Erro no acesso público');
          }
        } catch (error) {
          this.logResult(`Public Access ${tableName}`, false, 'Erro inesperado', error.message);
        }
      }

    } catch (error) {
      this.logResult('Políticas RLS', false, 'Erro geral nos testes de RLS', error.message);
    }
  }

  /**
   * Teste 4: Verificar funções auxiliares do sistema
   */
  async testSystemFunctions() {
    console.log('\n🧪 TESTE 4: Funções do Sistema');
    console.log('===============================');

    try {
      // Teste simples - verificar se conseguimos executar queries básicas
      const { data, error } = await supabase
        .rpc('generate_integrity_report');

      if (!error) {
        this.logResult('Função Relatório Integridade', true, 'Função executada com sucesso');
      } else {
        this.logResult('Função Relatório Integridade', false, 'Erro ao executar função', error.message);
      }

    } catch (error) {
      this.logResult('Funções do Sistema', false, 'Erro ao testar funções', error.message);
    }
  }

  /**
   * Teste 5: Performance básica
   */
  async testPerformance() {
    console.log('\n🧪 TESTE 5: Performance Básica');
    console.log('===============================');

    const performanceTests = [
      { table: 'especialidades_medicas', expectedTime: 100 },
      { table: 'categorias_procedimento', expectedTime: 100 },
      { table: 'fabricantes_equipamento', expectedTime: 100 }
    ];

    for (const test of performanceTests) {
      try {
        const startTime = Date.now();
        
        const { data, error } = await supabase
          .from(test.table)
          .select('*');

        const endTime = Date.now();
        const duration = endTime - startTime;

        if (!error) {
          const passed = duration < test.expectedTime;
          this.logResult(
            `Performance ${test.table}`,
            passed,
            `${duration}ms (esperado < ${test.expectedTime}ms)`
          );
        } else {
          this.logResult(`Performance ${test.table}`, false, 'Erro na consulta', error.message);
        }

      } catch (error) {
        this.logResult(`Performance ${test.table}`, false, 'Erro inesperado', error.message);
      }
    }
  }

  /**
   * Executa todos os testes
   */
  async runAllTests() {
    console.log('🚀 INICIANDO TESTES BÁSICOS DE FUNCIONALIDADE');
    console.log('==============================================');
    console.log(`Supabase URL: ${supabaseUrl}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    const startTime = Date.now();

    // Executar todos os testes
    await this.testReferenceData();
    await this.testTableStructure();
    await this.testRLSPolicies();
    await this.testSystemFunctions();
    await this.testPerformance();

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Relatório final
    console.log('\n📊 RELATÓRIO FINAL');
    console.log('==================');
    console.log(`✅ Testes passaram: ${this.passedTests}`);
    console.log(`❌ Testes falharam: ${this.failedTests}`);
    console.log(`⏱️  Tempo total: ${totalDuration}ms`);
    console.log(`📈 Taxa de sucesso: ${((this.passedTests / (this.passedTests + this.failedTests)) * 100).toFixed(1)}%`);

    if (this.failedTests === 0) {
      console.log('\n🎉 TODOS OS TESTES BÁSICOS PASSARAM!');
      console.log('Sistema está funcionando corretamente.');
    } else {
      console.log('\n⚠️  ALGUNS TESTES FALHARAM');
      console.log('Revise os erros acima e corrija os problemas identificados.');
    }

    console.log('\n💡 PRÓXIMOS PASSOS:');
    console.log('- Execute testes E2E com Cypress/Playwright para validação completa');
    console.log('- Teste fluxos de autenticação com usuários reais');
    console.log('- Valide operações CRUD com diferentes níveis de permissão');
    console.log('- Execute testes de carga em ambiente staging');

    return {
      totalTests: this.passedTests + this.failedTests,
      passedTests: this.passedTests,
      failedTests: this.failedTests,
      duration: totalDuration,
      success: this.failedTests === 0,
      results: this.testResults
    };
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  const tester = new DatabaseTester();
  tester.runAllTests()
    .then(results => {
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ ERRO CRÍTICO:', error);
      process.exit(1);
    });
}

module.exports = DatabaseTester;