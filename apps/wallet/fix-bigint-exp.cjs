/**
 * Script to fix BigInt exponentiation issues
 */

const fs = require('fs');

const filesToFix = [
  'src/components/token/StakingInterface.tsx',
  'src/components/token/RewardsClaimInterface.tsx', 
  'src/services/credentialMarketplaceService.ts'
];

const DECIMALS_18 = "BigInt('1000000000000000000')"; // 10^18

function fixBigIntInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Add constants if needed
    if (content.includes('BigInt(10) ** BigInt(18)') && !content.includes('DECIMALS_18')) {
      const firstImport = content.indexOf('import ');
      if (firstImport !== -1) {
        const endOfImports = content.lastIndexOf('import ') + content.substring(content.lastIndexOf('import ')).indexOf(';') + 1;
        const beforeImports = content.substring(0, endOfImports);
        const afterImports = content.substring(endOfImports);
        
        content = beforeImports + '\n\n// Safe BigInt constants\nconst DECIMALS_18 = BigInt(\'1000000000000000000\'); // 10^18\n' + afterImports;
        modified = true;
      }
    }

    // Replace exponentiation patterns
    const patterns = [
      { 
        pattern: /BigInt\(10\) \*\* BigInt\(18\)/g, 
        replacement: 'DECIMALS_18' 
      },
      { 
        pattern: /BigInt\(([^)]+)\) \* BigInt\(10\) \*\* BigInt\(18\)/g, 
        replacement: 'BigInt($1) * DECIMALS_18' 
      }
    ];

    for (const { pattern, replacement } of patterns) {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed BigInt exponentiation in: ${filePath}`);
      return true;
    } else {
      console.log(`⚪ No BigInt issues in: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing BigInt exponentiation issues...\n');
  
  let fixedFiles = 0;
  
  for (const filePath of filesToFix) {
    if (fixBigIntInFile(filePath)) {
      fixedFiles++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`✅ Fixed ${fixedFiles}/${filesToFix.length} files`);
  console.log(`🎉 BigInt exponentiation issues resolved!`);
}

main();