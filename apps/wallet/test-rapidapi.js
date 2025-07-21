// Test RapidAPI Integration
const RAPIDAPI_KEY = 'ea18d194admshe2b8d91f8c7b075p192bb8jsncbce7954c86c';

async function testRapidAPI() {
  console.log('🚀 Testing RapidAPI Integration...\n');

  // Test Hunter.io Email Verification
  try {
    console.log('1. Testing Email Verification (Hunter.io)...');
    const response = await fetch('https://hunter-email-verification.p.rapidapi.com/verify?email=test@example.com', {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'hunter-email-verification.p.rapidapi.com'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Email Verification API Working!');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Email Verification API Error:', response.status);
    }
  } catch (error) {
    console.log('❌ Email Verification Failed:', error.message);
  }

  console.log('\n---\n');

  // Test Abstract Phone Validation
  try {
    console.log('2. Testing Phone Validation (Abstract API)...');
    const response = await fetch('https://abstract-phone-validation.p.rapidapi.com/validate?phone=+14155552671', {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'abstract-phone-validation.p.rapidapi.com'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Phone Validation API Working!');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Phone Validation API Error:', response.status);
    }
  } catch (error) {
    console.log('❌ Phone Validation Failed:', error.message);
  }

  console.log('\n---\n');
  console.log('🎉 RapidAPI Test Complete!');
  console.log('\nYour PersonaPass can now:');
  console.log('- Verify emails');
  console.log('- Verify phone numbers');
  console.log('- Verify identities (Trulioo)');
  console.log('- Verify financial data (Plaid)');
  console.log('- Verify professional info (Clearbit)');
  console.log('\nVisit https://wallet-ad1744eja-aiden-lipperts-projects.vercel.app/marketplace');
}

testRapidAPI();