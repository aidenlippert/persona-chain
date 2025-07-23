import fetch from 'node-fetch';

async function analyzeBundleError() {
  try {
    const response = await fetch('https://wallet-qvobwwier-aiden-lipperts-projects.vercel.app/assets/react-CPII59be.js');
    const content = await response.text();
    
    const lines = content.split('\n');
    const problematicLine = lines[30]; // Line 31 (0-indexed)
    
    console.log('Line 31 content:');
    console.log(problematicLine);
    console.log('\nAround column 160:');
    console.log(problematicLine.substring(150, 170));
    console.log('\nCharacter at column 160:');
    console.log(`"${problematicLine.charAt(159)}" (ASCII: ${problematicLine.charCodeAt(159)})`);
    
    // Look for common syntax error patterns
    const patterns = [
      /[^\x20-\x7E]/g, // Non-printable characters
      /\u00A0/g, // Non-breaking space
      /\u2018|\u2019/g, // Smart quotes
      /\u201C|\u201D/g, // Smart double quotes
      /\u2013|\u2014/g, // En/em dashes
    ];
    
    patterns.forEach((pattern, index) => {
      const matches = problematicLine.match(pattern);
      if (matches) {
        console.log(`\nFound potential issue (pattern ${index + 1}):`, matches);
      }
    });
    
  } catch (error) {
    console.error('Failed to analyze bundle:', error);
  }
}

analyzeBundleError();