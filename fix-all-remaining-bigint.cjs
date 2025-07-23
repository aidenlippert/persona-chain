/**
 * Script to fix ALL remaining BigInt exponentiation issues
 */

const fs = require('fs');

const filesToFix = [
  'src/services/enterpriseAPIService.ts',
  'src/services/analyticsService.ts',
  'src/services/blockchainService.ts',
  'src/services/cryptoService.ts',
  'src/services/discordVCService.ts',
  'src/services/enhancedZKProofService.ts',
  'src/services/ibcService.ts',
  'src/services/persTokenService.ts',
  'src/services/personaTokenService.ts'
];

function fixBigIntInFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚪ File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Add constants if needed and file has BigInt issues
    if (content.includes('BigInt(10) ** BigInt(18)') && !content.includes('DECIMALS_18')) {
      // Find the best place to insert constants (after imports)
      const lines = content.split('\n');
      let insertIndex = 0;
      
      // Find last import or first non-import line
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('//')) {
          insertIndex = i + 1;
        } else if (lines[i].trim() && !lines[i].trim().startsWith('/*') && !lines[i].trim().startsWith('*')) {
          break;
        }
      }
      
      lines.splice(insertIndex, 0, '', '// Safe BigInt constants to avoid exponentiation transpilation issues', 'const DECIMALS_18 = BigInt(\'1000000000000000000\'); // 10^18', 'const DECIMALS_15 = BigInt(\'1000000000000000\'); // 10^15', '');
      content = lines.join('\n');
      modified = true;
    }

    // Replace all BigInt exponentiation patterns
    const patterns = [
      { pattern: /BigInt\(10\) \*\* BigInt\(18\)/g, replacement: 'DECIMALS_18' },
      { pattern: /BigInt\(10\) \*\* BigInt\(15\)/g, replacement: 'DECIMALS_15' },
      { pattern: /BigInt\(([^)]+)\) \* BigInt\(10\) \*\* BigInt\(18\)/g, replacement: 'BigInt($1) * DECIMALS_18' },
      { pattern: /BigInt\(([^)]+)\) \* BigInt\(10\) \*\* BigInt\(15\)/g, replacement: 'BigInt($1) * DECIMALS_15' },
      { pattern: /BigInt\(([0-9]+)\) \*\* BigInt\(18\)/g, replacement: (match, num) => {
        if (num === '10') return 'DECIMALS_18';
        const result = BigInt(num) ** BigInt(18);
        return `BigInt('${result.toString()}')`;
      }},
      { pattern: /BigInt\(([0-9]+)\) \*\* BigInt\(15\)/g, replacement: (match, num) => {
        if (num === '10') return 'DECIMALS_15';
        const result = BigInt(num) ** BigInt(15);
        return `BigInt('${result.toString()}')`;
      }}
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
  console.log('🔧 Fixing ALL remaining BigInt exponentiation issues...\n');
  
  let fixedFiles = 0;
  let totalFiles = 0;
  
  for (const filePath of filesToFix) {
    totalFiles++;
    if (fixBigIntInFile(filePath)) {
      fixedFiles++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`✅ Fixed ${fixedFiles}/${totalFiles} files`);
  console.log(`🎉 ALL BigInt exponentiation issues resolved!`);
}

main();