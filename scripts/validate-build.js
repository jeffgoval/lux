#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Build validation utility for SPA deployment
 */
class BuildValidator {
  constructor() {
    this.issues = [];
    this.recommendations = [];
  }

  /**
   * Run complete build validation
   */
  async validateBuild() {
    console.log('🔍 Validating build configuration for SPA deployment...\n');
    
    this.validateViteConfig();
    this.validateBuildOutput();
    this.validateAssetPaths();
    this.validateIndexHtml();
    this.checkSPARequirements();
    
    this.printReport();
    return this.issues.length === 0;
  }

  /**
   * Validate Vite configuration for SPA
   */
  validateViteConfig() {
    console.log('⚙️  Validating Vite configuration...');
    
    const viteConfigPath = path.join(projectRoot, 'vite.config.ts');
    
    if (!fs.existsSync(viteConfigPath)) {
      this.addIssue('critical', 'vite.config.ts not found');
      return;
    }
    
    const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
    
    // Check for base path configuration
    if (!viteConfig.includes('base:') && !process.env.VITE_BASE_PATH) {
      this.addRecommendation('Consider adding base path configuration if deploying to subdirectory');
    }
    
    // Check for build target
    if (!viteConfig.includes('target:')) {
      this.addRecommendation('Consider specifying build target for better browser compatibility');
    }
    
    // Check for preview configuration
    if (!viteConfig.includes('preview:')) {
      this.addIssue('medium', 'Missing preview configuration for local testing');
    }
    
    // Check for proper asset handling
    if (!viteConfig.includes('assetsDir')) {
      this.addRecommendation('Consider configuring assetsDir for better asset organization');
    }
    
    console.log('✅ Vite configuration analyzed');
  }

  /**
   * Validate build output structure
   */
  validateBuildOutput() {
    console.log('📦 Validating build output...');
    
    const distPath = path.join(projectRoot, 'dist');
    
    if (!fs.existsSync(distPath)) {
      this.addIssue('critical', 'Build output (dist) folder not found. Run "npm run build"');
      return;
    }
    
    const requiredFiles = ['index.html'];
    const requiredDirs = ['assets'];
    
    for (const file of requiredFiles) {
      const filePath = path.join(distPath, file);
      if (!fs.existsSync(filePath)) {
        this.addIssue('critical', `Required file missing: ${file}`);
      }
    }
    
    for (const dir of requiredDirs) {
      const dirPath = path.join(distPath, dir);
      if (!fs.existsSync(dirPath)) {
        this.addIssue('high', `Required directory missing: ${dir}`);
      }
    }
    
    console.log('✅ Build output structure validated');
  }

  /**
   * Validate asset paths and references
   */
  validateAssetPaths() {
    console.log('🎨 Validating asset paths...');
    
    const indexPath = path.join(projectRoot, 'dist', 'index.html');
    
    if (!fs.existsSync(indexPath)) {
      return; // Already reported in validateBuildOutput
    }
    
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Check for relative asset paths
    const scriptTags = indexContent.match(/<script[^>]*src="([^"]*)"[^>]*>/g) || [];
    const linkTags = indexContent.match(/<link[^>]*href="([^"]*)"[^>]*>/g) || [];
    
    const allAssetRefs = [...scriptTags, ...linkTags];
    
    for (const tag of allAssetRefs) {
      const srcMatch = tag.match(/(?:src|href)="([^"]*)"/);
      if (srcMatch) {
        const assetPath = srcMatch[1];
        
        // Check for absolute paths that might cause issues
        if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
          this.addRecommendation(`External asset reference found: ${assetPath}`);
        }
        
        // Check for proper relative paths
        if (assetPath.startsWith('./assets/') || assetPath.startsWith('/assets/')) {
          const fullPath = path.join(projectRoot, 'dist', assetPath.replace(/^\.?\//, ''));
          if (!fs.existsSync(fullPath)) {
            this.addIssue('high', `Referenced asset not found: ${assetPath}`);
          }
        }
      }
    }
    
    console.log('✅ Asset paths validated');
  }

  /**
   * Validate index.html for SPA requirements
   */
  validateIndexHtml() {
    console.log('📄 Validating index.html for SPA...');
    
    const indexPath = path.join(projectRoot, 'dist', 'index.html');
    
    if (!fs.existsSync(indexPath)) {
      return; // Already reported
    }
    
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Check for React root element
    if (!indexContent.includes('id="root"')) {
      this.addIssue('critical', 'React root element (#root) not found in index.html');
    }
    
    // Check for proper DOCTYPE (case insensitive)
    if (!indexContent.toLowerCase().includes('<!doctype html>')) {
      this.addIssue('medium', 'Missing DOCTYPE declaration');
    }
    
    // Check for viewport meta tag
    if (!indexContent.includes('name="viewport"')) {
      this.addIssue('medium', 'Missing viewport meta tag for mobile compatibility');
    }
    
    // Check for charset declaration
    if (!indexContent.includes('charset=')) {
      this.addIssue('medium', 'Missing charset declaration');
    }
    
    // Check for script tags
    const scriptTags = indexContent.match(/<script[^>]*>/g) || [];
    if (scriptTags.length === 0) {
      this.addIssue('critical', 'No script tags found - JavaScript bundle not included');
    }
    
    console.log('✅ index.html validated for SPA requirements');
  }

  /**
   * Check SPA-specific requirements
   */
  checkSPARequirements() {
    console.log('🌐 Checking SPA-specific requirements...');
    
    // Check for proper routing setup
    const appPath = path.join(projectRoot, 'src', 'App.tsx');
    if (fs.existsSync(appPath)) {
      const appContent = fs.readFileSync(appPath, 'utf8');
      
      if (!appContent.includes('BrowserRouter')) {
        this.addIssue('high', 'BrowserRouter not found - required for SPA routing');
      }
      
      if (!appContent.includes('Routes') || !appContent.includes('Route')) {
        this.addIssue('high', 'React Router Routes/Route components not found');
      }
      
      // Check for catch-all route
      if (!appContent.includes('path="*"')) {
        this.addRecommendation('Add catch-all route (path="*") for proper 404 handling');
      }
    }
    
    // Check server configuration
    const vercelConfigPath = path.join(projectRoot, 'vercel.json');
    if (fs.existsSync(vercelConfigPath)) {
      const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
      
      const hasRewriteRule = vercelConfig.rewrites && 
        vercelConfig.rewrites.some(rule => 
          rule.destination === '/index.html'
        );
      
      if (!hasRewriteRule) {
        this.addIssue('critical', 'Missing SPA rewrite rule in vercel.json');
      }
    } else {
      this.addIssue('high', 'No server configuration found (vercel.json, netlify.toml, etc.)');
    }
    
    console.log('✅ SPA requirements checked');
  }

  /**
   * Add an issue to the report
   */
  addIssue(severity, message) {
    this.issues.push({ severity, message });
  }

  /**
   * Add a recommendation to the report
   */
  addRecommendation(message) {
    this.recommendations.push(message);
  }

  /**
   * Print validation report
   */
  printReport() {
    console.log('\n📊 BUILD VALIDATION REPORT');
    console.log('='.repeat(50));
    
    if (this.issues.length === 0) {
      console.log('✅ No critical issues found!');
    } else {
      console.log('\n⚠️  ISSUES FOUND:');
      
      const critical = this.issues.filter(i => i.severity === 'critical');
      const high = this.issues.filter(i => i.severity === 'high');
      const medium = this.issues.filter(i => i.severity === 'medium');
      
      if (critical.length > 0) {
        console.log('\n🚨 CRITICAL:');
        critical.forEach((issue, i) => {
          console.log(`   ${i + 1}. ${issue.message}`);
        });
      }
      
      if (high.length > 0) {
        console.log('\n⚠️  HIGH:');
        high.forEach((issue, i) => {
          console.log(`   ${i + 1}. ${issue.message}`);
        });
      }
      
      if (medium.length > 0) {
        console.log('\n📋 MEDIUM:');
        medium.forEach((issue, i) => {
          console.log(`   ${i + 1}. ${issue.message}`);
        });
      }
    }
    
    if (this.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      this.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (this.issues.filter(i => i.severity === 'critical').length > 0) {
      console.log('❌ Build validation failed - fix critical issues before deployment');
      return false;
    } else {
      console.log('✅ Build validation passed!');
      return true;
    }
  }
}

// Run validation
const validator = new BuildValidator();
validator.validateBuild().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});