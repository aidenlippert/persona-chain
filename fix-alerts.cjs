/**
 * Script to automatically replace all alert() calls with modern notifications
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/pages/ProofsPage.tsx',
  'src/pages/EnhancedProofsPage.tsx',
  'src/components/automation/AutomationDashboard.tsx',
  'src/components/dashboard/DIDManager.tsx',
  'src/components/dashboard/RealDashboard.tsx',
  'src/components/dashboard/IdentityOverview.tsx',
  'src/components/dashboard/ZKProofManager.tsx',
  'src/components/dashboard/CredentialManager.tsx',
  'src/components/credentials/CredentialsManager.tsx',
  'src/components/credentials/EnhancedCredentialsManager.tsx',
  'src/components/credentials/RealCredentialsManager.tsx',
  'src/components/mobile/MobilePWADashboard.tsx'
];

function fixAlertsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Add import if not present
    if (!content.includes('import { notify }') && content.includes('alert(')) {
      const importMatch = content.match(/import React[^;]*;/);
      if (importMatch) {
        const insertPoint = content.indexOf(importMatch[0]) + importMatch[0].length;
        content = content.slice(0, insertPoint) + '\nimport { notify } from \'../../utils/notifications\';' + content.slice(insertPoint);
        modified = true;
      }
    }

    // Replace different alert patterns
    const alertPatterns = [
      // Success messages
      { pattern: /alert\(([^)]*success[^)]*)\)/gi, replacement: 'notify.success($1)' },
      { pattern: /alert\(([^)]*Success[^)]*)\)/gi, replacement: 'notify.success($1)' },
      { pattern: /alert\(([^)]*verified[^)]*)\)/gi, replacement: 'notify.success($1)' },
      { pattern: /alert\(([^)]*Verified[^)]*)\)/gi, replacement: 'notify.success($1)' },
      { pattern: /alert\(([^)]*created[^)]*)\)/gi, replacement: 'notify.success($1)' },
      { pattern: /alert\(([^)]*Created[^)]*)\)/gi, replacement: 'notify.success($1)' },
      { pattern: /alert\(([^)]*complete[^)]*)\)/gi, replacement: 'notify.success($1)' },
      { pattern: /alert\(([^)]*Complete[^)]*)\)/gi, replacement: 'notify.success($1)' },
      
      // Error messages
      { pattern: /alert\(([^)]*failed[^)]*)\)/gi, replacement: 'notify.error($1)' },
      { pattern: /alert\(([^)]*Failed[^)]*)\)/gi, replacement: 'notify.error($1)' },
      { pattern: /alert\(([^)]*error[^)]*)\)/gi, replacement: 'notify.error($1)' },
      { pattern: /alert\(([^)]*Error[^)]*)\)/gi, replacement: 'notify.error($1)' },
      { pattern: /alert\(([^)]*unable[^)]*)\)/gi, replacement: 'notify.error($1)' },
      { pattern: /alert\(([^)]*Unable[^)]*)\)/gi, replacement: 'notify.error($1)' },
      
      // Warning/Info messages (catch-all)
      { pattern: /alert\(([^)]*)\)/g, replacement: 'notify.info($1)' }
    ];

    for (const { pattern, replacement } of alertPatterns) {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed alerts in: ${filePath}`);
      return true;
    } else {
      console.log(`⚪ No alerts found in: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing alert() usage across the application...\n');
  
  let fixedFiles = 0;
  let totalFiles = 0;

  for (const filePath of filesToFix) {
    totalFiles++;
    if (fixAlertsInFile(filePath)) {
      fixedFiles++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`✅ Fixed ${fixedFiles}/${totalFiles} files`);
  console.log(`🎉 Alert() calls have been replaced with modern notifications!`);
}

main();