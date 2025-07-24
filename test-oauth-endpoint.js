#!/usr/bin/env node
/**
 * Test script to replicate the frontend's OAuth request
 */

console.log('🧪 Testing GitHub OAuth endpoint...');

fetch('https://api.personapass.xyz/oauth/github/init', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'https://personapass.xyz',
    'User-Agent': 'PersonaPass-Test/1.0'
  },
})
  .then(response => {
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    return response.json();
  })
  .then(data => {
    console.log('📊 Response Data:', data);
    if (data.authUrl) {
      console.log('✅ OAuth URL received successfully!');
    } else {
      console.log('❌ No OAuth URL in response');
    }
  })
  .catch(error => {
    console.error('❌ Error:', error);
  });