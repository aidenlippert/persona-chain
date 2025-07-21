/**
 * Script to fix console.error in production code
 */

const fs = require('fs');

const filesToFix = [
  'src/services/productionBlockchainService.ts',
  'src/services/productionDatabaseService.ts',
  'src/services/productionZKProofService.ts'
];

function fixConsoleErrorsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace console.error with proper logging
    if (content.includes('console.error')) {
      // Add logger import if not present
      if (!content.includes('import { logger }')) {
        const firstImport = content.indexOf('import ');
        if (firstImport !== -1) {
          const endOfImports = content.lastIndexOf('import ') + content.substring(content.lastIndexOf('import ')).indexOf(';') + 1;
          const beforeImports = content.substring(0, endOfImports);
          const afterImports = content.substring(endOfImports);
          
          content = beforeImports + '\nimport { logger } from \'./logger\';' + afterImports;
          modified = true;
        }
      }

      // Replace console.error with logger.error
      const newContent = content.replace(/console\.error/g, 'logger.error');
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed console.error in: ${filePath}`);
      return true;
    } else {
      console.log(`⚪ No console.error issues in: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing console.error in production code...\n');
  
  let fixedFiles = 0;
  
  for (const filePath of filesToFix) {
    if (fixConsoleErrorsInFile(filePath)) {
      fixedFiles++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`✅ Fixed ${fixedFiles}/${filesToFix.length} files`);
  console.log(`🎉 Console.error issues resolved!`);
}

main();