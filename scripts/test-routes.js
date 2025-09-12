#!/usr/bin/env node

import { spawn } from 'child_process';
import fetch from 'node-fetch';

/**
 * Route testing utility for validating SPA routes
 */
class RouteValidator {
  constructor(baseUrl = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
    this.routes = [
      '/',
      '/landing',
      '/auth',
      '/agendamento',
      '/clientes',
      '/servicos',
      '/produtos',
      '/equipamentos',
      '/financeiro',
      '/comunicacao',
      '/prontuarios',
      '/perfil',
      '/onboarding',
      '/unauthorized',
      '/nonexistent-route' // Should return 200 but show 404 page
    ];
  }

  /**
   * Test all routes for accessibility
   */
  async testAllRoutes() {
    console.log(`🧪 Testing routes on ${this.baseUrl}...\n`);
    
    const results = [];
    
    for (const route of this.routes) {
      const result = await this.testRoute(route);
      results.push(result);
      
      const status = result.accessible ? '✅' : '❌';
      const statusCode = result.status || 'N/A';
      console.log(`${status} ${route} (${statusCode})`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
    
    this.printSummary(results);
    return results;
  }

  /**
   * Test a specific route
   */
  async testRoute(path) {
    const url = `${this.baseUrl}${path}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        timeout: 5000,
        headers: {
          'User-Agent': 'Route-Validator/1.0'
        }
      });
      
      const contentType = response.headers.get('content-type') || '';
      const isHtml = contentType.includes('text/html');
      
      return {
        path,
        status: response.status,
        accessible: response.status === 200,
        contentType,
        isHtml,
        error: response.status !== 200 ? `HTTP ${response.status}` : null
      };
      
    } catch (error) {
      return {
        path,
        status: null,
        accessible: false,
        error: error.message
      };
    }
  }

  /**
   * Print test summary
   */
  printSummary(results) {
    console.log('\n📊 ROUTE TEST SUMMARY');
    console.log('='.repeat(40));
    
    const accessible = results.filter(r => r.accessible).length;
    const total = results.length;
    const failed = results.filter(r => !r.accessible);
    
    console.log(`Total routes tested: ${total}`);
    console.log(`Accessible: ${accessible}`);
    console.log(`Failed: ${total - accessible}`);
    console.log(`Success rate: ${((accessible / total) * 100).toFixed(1)}%`);
    
    if (failed.length > 0) {
      console.log('\n❌ FAILED ROUTES:');
      failed.forEach(route => {
        console.log(`   ${route.path}: ${route.error}`);
      });
    }
    
    console.log('\n💡 NOTES:');
    console.log('   - All routes should return 200 for SPAs');
    console.log('   - 404 errors indicate server configuration issues');
    console.log('   - Non-existent routes should return 200 but show 404 page');
  }

  /**
   * Start local preview server and test routes
   */
  async testWithPreview() {
    console.log('🚀 Starting preview server...');
    
    return new Promise((resolve, reject) => {
      const preview = spawn('npm', ['run', 'preview'], {
        stdio: 'pipe',
        shell: true
      });
      
      let serverReady = false;
      
      preview.stdout.on('data', async (data) => {
        const output = data.toString();
        console.log(output);
        
        if (output.includes('Local:') && !serverReady) {
          serverReady = true;
          console.log('✅ Preview server ready!\n');
          
          // Wait a moment for server to fully start
          setTimeout(async () => {
            try {
              const results = await this.testAllRoutes();
              preview.kill();
              resolve(results);
            } catch (error) {
              preview.kill();
              reject(error);
            }
          }, 2000);
        }
      });
      
      preview.stderr.on('data', (data) => {
        console.error(`Preview error: ${data}`);
      });
      
      preview.on('close', (code) => {
        if (!serverReady) {
          reject(new Error(`Preview server failed to start (exit code ${code})`));
        }
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (!serverReady) {
          preview.kill();
          reject(new Error('Preview server startup timeout'));
        }
      }, 30000);
    });
  }
}

// CLI interface
const args = process.argv.slice(2);
const baseUrl = args[0] || 'http://localhost:8080';
const usePreview = args.includes('--preview');

const validator = new RouteValidator(baseUrl);

if (usePreview) {
  validator.testWithPreview().catch(console.error);
} else {
  validator.testAllRoutes().catch(console.error);
}

export default RouteValidator;