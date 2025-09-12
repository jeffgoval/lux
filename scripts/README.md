# 404 Error Diagnostic Tools

This directory contains diagnostic tools to help identify and resolve HTTP 404 errors in the React SPA.

## Available Tools

### 1. diagnose-404.js
Comprehensive diagnostic tool that analyzes:
- Build output (dist folder, index.html, assets)
- Server configuration (vercel.json)
- Route configuration (App.tsx)
- Provides recommendations for fixes

**Usage:**
```bash
npm run diagnose
```

### 2. test-routes.js
Route testing utility that validates all application routes:
- Tests route accessibility
- Identifies which routes return 404 errors
- Can test against local preview server or deployed site

**Usage:**
```bash
# Test against running server
npm run test:routes

# Test with local preview server (starts server automatically)
npm run test:routes:preview

# Test against specific URL
node scripts/test-routes.js https://your-deployed-site.com
```

## Common Issues and Solutions

### 1. Missing dist folder
**Symptom:** "Dist folder does not exist" error
**Solution:** Run `npm run build` to generate the build output

### 2. Missing SPA rewrite rules
**Symptom:** Routes return 404 in production but work locally
**Solution:** Ensure vercel.json has proper rewrite rule:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 3. Build configuration issues
**Symptom:** Assets not loading or incorrect paths
**Solution:** Check vite.config.ts for proper base path and build settings

### 4. Route configuration problems
**Symptom:** Specific routes not working
**Solution:** Verify routes are properly defined in App.tsx with React Router

## Troubleshooting Workflow

1. **Run Diagnosis:** `npm run diagnose`
2. **Fix Critical Issues:** Address any critical configuration problems
3. **Test Locally:** `npm run test:routes:preview`
4. **Build and Deploy:** `npm run build` then deploy
5. **Test Production:** `npm run test:routes https://your-site.com`

## Output Examples

### Successful Diagnosis
```
🔍 Starting 404 Error Diagnosis...
✅ Dist folder exists with 6 items
✅ index.html exists (2098 bytes)
✅ Found 5 assets (4 JS, 1 CSS)
✅ Vercel SPA rewrite rule found
✅ Found 16 routes configured
```

### Route Test Results
```
🧪 Testing routes on http://localhost:8080...
✅ / (200)
✅ /landing (200)
✅ /auth (200)
❌ /agendamento (404)
```

## Integration with Development Workflow

These tools can be integrated into your CI/CD pipeline:
- Run diagnosis before deployment
- Test routes after deployment
- Monitor route health in production

For more information, see the main project documentation.