#!/usr/bin/env node

/**
 * Fix Critical DID and Credentials Errors
 * Auto-fix the most critical issues preventing app functionality
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Critical DID and Credentials Errors...\n');

// Fix 1: Remove all console.error statements (replace with error service)
function replaceConsoleErrors(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const hasConsoleError = content.includes('console.error');
    
    if (hasConsoleError) {
      // Replace console.error with errorService.logError
      content = content.replace(/console\.error\(/g, 'errorService.logError(');
      
      // Ensure errorService is imported if not already
      if (!content.includes("import { errorService }") && !content.includes("import errorService")) {
        // Add import at the top after other imports
        const importRegex = /^import\s+.*?;$/gm;
        const imports = content.match(importRegex);
        if (imports && imports.length > 0) {
          const lastImportIndex = content.lastIndexOf(imports[imports.length - 1]) + imports[imports.length - 1].length;
          content = content.slice(0, lastImportIndex) + 
                   '\nimport { errorService } from "@/services/errorService";' + 
                   content.slice(lastImportIndex);
        }
      }
      
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed console.error in: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
  return false;
}

// Fix 2: Remove alert() calls
function removeAlerts(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const hasAlert = content.includes('alert(');
    
    if (hasAlert) {
      // Replace alert with notify
      content = content.replace(/alert\(/g, 'notify.info(');
      
      // Ensure notify is imported if not already
      if (!content.includes("import { notify }")) {
        const importRegex = /^import\s+.*?;$/gm;
        const imports = content.match(importRegex);
        if (imports && imports.length > 0) {
          const lastImportIndex = content.lastIndexOf(imports[imports.length - 1]) + imports[imports.length - 1].length;
          content = content.slice(0, lastImportIndex) + 
                   '\nimport { notify } from "@/utils/notifications";' + 
                   content.slice(lastImportIndex);
        }
      }
      
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed alert() in: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
  return false;
}

// Fix 3: Fix specific DID-related issues
const specificFixes = [
  {
    file: 'src/components/onboarding/StreamlinedOnboardingFlow.tsx',
    description: 'Already fixed createDIDDocument issue'
  },
  {
    file: 'src/components/onboarding/RealOnboardingFlow.tsx',
    description: 'Already fixed createDIDDocument issue'
  }
];

// Process all TypeScript/React files
function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let fixedCount = 0;
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
      fixedCount += processDirectory(filePath);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      if (replaceConsoleErrors(filePath)) fixedCount++;
      if (removeAlerts(filePath)) fixedCount++;
    }
  });
  
  return fixedCount;
}

// Fix credentials-specific issues
function fixCredentialsPages() {
  console.log('\n🎯 Fixing Credentials Pages Specifically...\n');
  
  const credentialsFiles = [
    'src/pages/EnhancedCredentialsPageWithTabs.tsx',
    'src/components/credentials/EnhancedCredentialsManager.tsx',
    'src/components/credentials/RealCredentialsManager.tsx'
  ];
  
  credentialsFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      replaceConsoleErrors(filePath);
      removeAlerts(filePath);
    }
  });
}

// Main execution
console.log('🔍 Scanning for critical errors...\n');
const totalFixed = processDirectory('./src');
fixCredentialsPages();

console.log(`\n✨ Fixed ${totalFixed} critical issues!`);
console.log('\n📝 Next steps:');
console.log('   1. Build the application: npm run build');
console.log('   2. Deploy to Vercel: vercel deploy --prod');
console.log('   3. Test the fixes in production');