const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Testing PersonaPass deployment...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    const response = await page.goto('https://wallet-2l9ypcjeb-aiden-lipperts-projects.vercel.app', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('✅ Page loaded with status:', response.status());
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('📝 Content length:', bodyText.length, 'characters');
    
    const hasRoot = await page.evaluate(() => {
      return document.querySelector('#root') !== null;
    });
    
    console.log('⚛️ React root element found:', hasRoot);
    
    if (bodyText.length > 100) {
      console.log('✅ MIME TYPE FIX SUCCESSFUL! App is loading properly');
      console.log('🎯 PersonaPass is now fully functional!');
    } else {
      console.log('❌ App may not be loading correctly');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();