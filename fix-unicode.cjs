#!/usr/bin/env node
/**
 * Unicode Character Replacement Script
 * Systematically replaces all Unicode emoji characters with ASCII alternatives
 */

const fs = require('fs');
const path = require('path');

// Common Unicode emoji patterns and their ASCII replacements
const unicodeReplacements = {
  // Status and alerts
  '✅': '[SUCCESS]',
  '❌': '[ERROR]',
  '⚠️': '[WARNING]',
  '🚨': '[ALERT]',
  'ℹ️': '[INFO]',
  '🛡️': '[SHIELD]',
  
  // Actions and processes
  '🔄': '[LOADING]',
  '💾': '[SAVE]',
  '🔗': '[LINK]',
  '🎯': '[TARGET]',
  '🎉': '[SUCCESS]',
  
  // UI elements
  '🔐': '[LOCK]',
  '😕': '[ERROR]',
  '💼': '[WORK]',
  '💰': '[MONEY]',
  '🎂': '[AGE]',
  '🎓': '[EDUCATION]',
  '🐙': '[GITHUB]',
  
  // Technical
  '🔧': '[TOOL]',
  '⚡': '[FAST]',
  '🏗️': '[BUILD]',
  '📦': '[PACKAGE]',
  '🌐': '[WEB]',
  '📱': '[MOBILE]',
  
  // Additional patterns
  '🎨': '[DESIGN]',
  '🔍': '[SEARCH]',
  '📊': '[CHART]',
  '💡': '[IDEA]',
  '🚀': '[LAUNCH]',
  '🧹': '[CLEANUP]',
  '📄': '[DOC]',
  '🔑': '[KEY]',
  '🔒': '[SECURE]',
  '✨': '[SPARKLE]',
  '📋': '[CLIPBOARD]',
  '🎭': '[MASK]',
  
  // Error boundary specific
  '⚠️': '[WARNING]',
};

// Critical files to process first
const criticalFiles = [
  'src/main.tsx',
  'src/App.tsx',
  'src/components/ErrorBoundary.tsx',
  'src/components/ui/ErrorBoundary.tsx',
  'src/services/credentialRecoveryService.ts',
  'src/services/errorService.ts',
  'src/pages/EnhancedCredentialsPageWithTabs.tsx',
  'src/pages/EnhancedProofsPage.tsx',
  'src/components/credentials/EnhancedAPICredentialsManager.tsx',
  'src/services/retryService.ts',
  'src/services/analyticsService.ts',
  'src/services/didService.ts',
  'src/components/auth/LoginPage.tsx',
  'src/components/onboarding/StreamlinedOnboardingFlow.tsx',
];

function replaceUnicodeInFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`[SKIP] File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let replacementCount = 0;

    // Apply all replacements
    Object.entries(unicodeReplacements).forEach(([unicode, ascii]) => {
      const regex = new RegExp(unicode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(regex);
      if (matches) {
        content = content.replace(regex, ascii);
        modified = true;
        replacementCount += matches.length;
        console.log(`  Replaced ${matches.length}x "${unicode}" → "${ascii}"`);
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[SUCCESS] Fixed ${replacementCount} Unicode characters in ${filePath}`);
      return true;
    } else {
      console.log(`[OK] No Unicode characters found in ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`[ERROR] Failed to process ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('[INFO] Starting Unicode character replacement...');
  console.log(`[INFO] Processing ${criticalFiles.length} critical files`);
  
  let totalFilesModified = 0;
  
  criticalFiles.forEach(file => {
    console.log(`\n[PROCESSING] ${file}`);
    const fullPath = path.join(process.cwd(), file);
    if (replaceUnicodeInFile(fullPath)) {
      totalFilesModified++;
    }
  });
  
  console.log(`\n[COMPLETE] Modified ${totalFilesModified} files`);
  console.log('[INFO] Run "npm run build" to rebuild with fixes');
}

if (require.main === module) {
  main();
}

module.exports = { replaceUnicodeInFile, unicodeReplacements };