#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Diagnostic tool for analyzing 404 errors in the React SPA
 */
class Diagnostic404 {
  constructor() {
    this.results = {
      buildStatus: {},
      configurationIssues: [],
      routeProblems: [],
      recommendations: []
    };
  }

  /**
   * Run complete diagnostic analysis
   */
  async runDiagnosis() {

    this.validateDistFolder();
    this.checkIndexHtml();
    this.verifyAssetPaths();
    this.validateVercelConfig();
    this.analyzeRouteConfiguration();
    this.generateRecommendations();
    
    this.printReport();
  }

  /**
   * Validate dist folder exists and has proper structure
   */
  validateDistFolder() {

    const distPath = path.join(projectRoot, 'dist');
    
    if (!fs.existsSync(distPath)) {
      this.results.buildStatus.distFolder = false;
      this.results.configurationIssues.push({
        type: 'build',
        severity: 'critical',
        message: 'Dist folder does not exist. Run "npm run build" first.',
        fix: 'npm run build'
      });
      return;
    }
    
    const distContents = fs.readdirSync(distPath);
    this.results.buildStatus.distFolder = true;
    this.results.buildStatus.distContents = distContents;

  }

  /**
   * Check if index.html exists and has proper content
   */
  checkIndexHtml() {

    const indexPath = path.join(projectRoot, 'dist', 'index.html');
    
    if (!fs.existsSync(indexPath)) {
      this.results.buildStatus.indexHtml = false;
      this.results.configurationIssues.push({
        type: 'build',
        severity: 'critical',
        message: 'index.html not found in dist folder',
        fix: 'Rebuild the application with "npm run build"'
      });
      return;
    }
    
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const hasReactRoot = indexContent.includes('id="root"');
    const hasScriptTags = indexContent.includes('<script');
    
    this.results.buildStatus.indexHtml = true;
    this.results.buildStatus.indexContent = {
      hasReactRoot,
      hasScriptTags,
      size: indexContent.length
    };
    
    if (!hasReactRoot) {
      this.results.configurationIssues.push({
        type: 'build',
        severity: 'high',
        message: 'index.html missing React root element',
        fix: 'Check if build process is generating correct HTML'
      });
    }
    
    if (!hasScriptTags) {
      this.results.configurationIssues.push({
        type: 'build',
        severity: 'high',
        message: 'index.html missing script tags',
        fix: 'Verify Vite build is including JS bundles'
      });
    }

  }

  /**
   * Verify asset paths and availability
   */
  verifyAssetPaths() {

    const assetsPath = path.join(projectRoot, 'dist', 'assets');
    
    if (!fs.existsSync(assetsPath)) {
      this.results.configurationIssues.push({
        type: 'build',
        severity: 'high',
        message: 'Assets folder not found',
        fix: 'Check Vite build configuration for asset handling'
      });
      return;
    }
    
    const assets = fs.readdirSync(assetsPath);
    const jsFiles = assets.filter(file => file.endsWith('.js'));
    const cssFiles = assets.filter(file => file.endsWith('.css'));
    
    this.results.buildStatus.assets = {
      total: assets.length,
      jsFiles: jsFiles.length,
      cssFiles: cssFiles.length
    };

  }

  /**
   * Validate Vercel configuration
   */
  validateVercelConfig() {

    const vercelConfigPath = path.join(projectRoot, 'vercel.json');
    
    if (!fs.existsSync(vercelConfigPath)) {
      this.results.configurationIssues.push({
        type: 'config',
        severity: 'critical',
        message: 'vercel.json not found',
        fix: 'Create vercel.json with SPA rewrite rules'
      });
      return;
    }
    
    try {
      const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
      this.results.buildStatus.vercelConfig = vercelConfig;
      
      // Check for SPA rewrite rule
      const hasRewriteRule = vercelConfig.rewrites && 
        vercelConfig.rewrites.some(rule => 
          rule.source === '/(.*)' && rule.destination === '/index.html'
        );
      
      if (!hasRewriteRule) {
        this.results.configurationIssues.push({
          type: 'config',
          severity: 'critical',
          message: 'Missing SPA rewrite rule in vercel.json',
          fix: 'Add rewrite rule: {"source": "/(.*)", "destination": "/index.html"}'
        });
      } else {

      }
      
    } catch (error) {
      this.results.configurationIssues.push({
        type: 'config',
        severity: 'critical',
        message: `Invalid vercel.json: ${error.message}`,
        fix: 'Fix JSON syntax in vercel.json'
      });
    }
  }

  /**
   * Analyze route configuration in App.tsx
   */
  analyzeRouteConfiguration() {

    const appPath = path.join(projectRoot, 'src', 'App.tsx');
    
    if (!fs.existsSync(appPath)) {
      this.results.routeProblems.push({
        type: 'missing-file',
        message: 'App.tsx not found',
        severity: 'critical'
      });
      return;
    }
    
    const appContent = fs.readFileSync(appPath, 'utf8');
    
    // Extract routes from App.tsx
    const routeMatches = appContent.match(/<Route\s+path="([^"]+)"/g) || [];
    const routes = routeMatches.map(match => {
      const pathMatch = match.match(/path="([^"]+)"/);
      return pathMatch ? pathMatch[1] : null;
    }).filter(Boolean);
    
    this.results.buildStatus.routes = routes;
    
    // Check for BrowserRouter
    const hasBrowserRouter = appContent.includes('BrowserRouter');
    if (!hasBrowserRouter) {
      this.results.routeProblems.push({
        type: 'router-config',
        message: 'BrowserRouter not found - this may cause routing issues',
        severity: 'high'
      });
    }
    
    // Check for catch-all route
    const hasCatchAll = routes.includes('*');
    if (!hasCatchAll) {
      this.results.routeProblems.push({
        type: 'missing-catchall',
        message: 'No catch-all route (*) found for 404 handling',
        severity: 'medium'
      });
    }

  }

  /**
   * Generate recommendations based on findings
   */
  generateRecommendations() {
    const critical = this.results.configurationIssues.filter(issue => issue.severity === 'critical');
    const high = this.results.configurationIssues.filter(issue => issue.severity === 'high');
    
    if (critical.length > 0) {
      this.results.recommendations.push('🚨 CRITICAL: Fix critical configuration issues first');
    }
    
    if (!this.results.buildStatus.distFolder) {
      this.results.recommendations.push('1. Run "npm run build" to generate dist folder');
    }
    
    if (critical.some(issue => issue.type === 'config')) {
      this.results.recommendations.push('2. Fix vercel.json configuration for SPA routing');
    }
    
    if (high.length > 0) {
      this.results.recommendations.push('3. Address high-priority build issues');
    }
    
    this.results.recommendations.push('4. Test the application locally with "npm run preview"');
    this.results.recommendations.push('5. Deploy and test all routes in production');
  }

  /**
   * Print diagnostic report
   */
  printReport() {

    // Build Status

    if (this.results.buildStatus.assets) {

    }
    if (this.results.buildStatus.routes) {

    }
    
    // Configuration Issues
    if (this.results.configurationIssues.length > 0) {

      this.results.configurationIssues.forEach((issue, index) => {
        const icon = issue.severity === 'critical' ? '🚨' : issue.severity === 'high' ? '⚠️' : 'ℹ️';

      });
    }
    
    // Route Problems
    if (this.results.routeProblems.length > 0) {

      this.results.routeProblems.forEach((problem, index) => {
        const icon = problem.severity === 'critical' ? '🚨' : problem.severity === 'high' ? '⚠️' : 'ℹ️';

      });
    }
    
    // Recommendations
    if (this.results.recommendations.length > 0) {

      this.results.recommendations.forEach(rec => {

      });
    }

  }
}

// Run diagnosis
const diagnostic = new Diagnostic404();
diagnostic.runDiagnosis().catch(console.error);

export default Diagnostic404;
