#!/usr/bin/env node
/**
 * Comprehensive Verification Test Suite
 * Tests all verification components and API endpoints
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class VerificationTester {
  constructor() {
    this.baseUrl = process.env.TARGET_URL || 'https://personapass.xyz';
    this.results = {
      apiTests: [],
      uiTests: [],
      integrationTests: [],
      errors: []
    };
  }

  async runTests() {
    console.log('🚀 Starting PersonaPass Verification Test Suite');
    console.log(`📍 Target URL: ${this.baseUrl}`);
    console.log('=' * 60);

    try {
      await this.testApiEndpoints();
      await this.testWebhooks();
      await this.testUIComponents();
      await this.testIntegrationFlows();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.results.errors.push(error.message);
    }
  }

  async testApiEndpoints() {
    console.log('🔍 Testing API Endpoints...');
    
    const endpoints = [
      { path: '/api/test', method: 'GET', expected: 200 },
      { path: '/api/plaid/webhook', method: 'GET', expected: 200 },
      { path: '/api/stripe/webhook', method: 'GET', expected: 200 },
      { path: '/api/plaid/create-link-token', method: 'GET', expected: 200 },
      { path: '/api/stripe/create-verification-session', method: 'GET', expected: 200 },
      { path: '/api/stripe/verification-status', method: 'GET', expected: 400 }, // Should fail without session_id
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint.path}`, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' }
        });

        const result = {
          path: endpoint.path,
          method: endpoint.method,
          status: response.status,
          expected: endpoint.expected,
          passed: response.status === endpoint.expected
        };

        this.results.apiTests.push(result);
        
        if (result.passed) {
          console.log(`  ✅ ${endpoint.method} ${endpoint.path} - ${response.status}`);
        } else {
          console.log(`  ❌ ${endpoint.method} ${endpoint.path} - Expected ${endpoint.expected}, got ${response.status}`);
        }
      } catch (error) {
        console.log(`  ❌ ${endpoint.method} ${endpoint.path} - ${error.message}`);
        this.results.errors.push(`${endpoint.path}: ${error.message}`);
      }
    }
  }

  async testWebhooks() {
    console.log('🔗 Testing Webhook Endpoints...');
    
    const webhookTests = [
      {
        path: '/api/plaid/webhook',
        payload: {
          webhook_type: 'TRANSACTIONS',
          webhook_code: 'SYNC_UPDATES_AVAILABLE',
          item_id: 'test_item_123'
        }
      },
      {
        path: '/api/stripe/webhook',
        payload: {
          type: 'identity.verification_session.verified',
          data: { object: { id: 'vs_test_123' } }
        }
      }
    ];

    for (const test of webhookTests) {
      try {
        const response = await fetch(`${this.baseUrl}${test.path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(test.payload)
        });

        const result = {
          path: test.path,
          status: response.status,
          passed: response.status === 200
        };

        this.results.apiTests.push(result);
        
        if (result.passed) {
          console.log(`  ✅ POST ${test.path} - ${response.status}`);
        } else {
          console.log(`  ❌ POST ${test.path} - ${response.status}`);
        }
      } catch (error) {
        console.log(`  ❌ POST ${test.path} - ${error.message}`);
        this.results.errors.push(`${test.path}: ${error.message}`);
      }
    }
  }

  async testUIComponents() {
    console.log('🖥️  Testing UI Components...');
    
    try {
      // Test if main page loads
      const response = await fetch(this.baseUrl);
      if (response.ok) {
        const html = await response.text();
        
        const uiChecks = [
          { name: 'PersonaPass title', test: html.includes('PersonaPass') },
          { name: 'Meta tags', test: html.includes('<meta') },
          { name: 'PWA manifest', test: html.includes('manifest') },
          { name: 'Favicon', test: html.includes('favicon') },
          { name: 'Viewport meta', test: html.includes('viewport') }
        ];

        for (const check of uiChecks) {
          this.results.uiTests.push(check);
          if (check.test) {
            console.log(`  ✅ ${check.name}`);
          } else {
            console.log(`  ❌ ${check.name}`);
          }
        }
      }
    } catch (error) {
      console.log(`  ❌ UI Component Test - ${error.message}`);
      this.results.errors.push(`UI Test: ${error.message}`);
    }
  }

  async testIntegrationFlows() {
    console.log('🔄 Testing Integration Flows...');
    
    const integrationTests = [
      {
        name: 'Plaid Link Token Creation',
        test: async () => {
          const response = await fetch(`${this.baseUrl}/api/plaid/create-link-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: 'test_user_123',
              client_name: 'PersonaPass',
              products: ['transactions', 'identity'],
              country_codes: ['US'],
              language: 'en'
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            return data.link_token && data.link_token.startsWith('link-sandbox-');
          }
          return false;
        }
      },
      {
        name: 'Plaid Token Exchange',
        test: async () => {
          const response = await fetch(`${this.baseUrl}/api/plaid/exchange-public-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              public_token: 'public-sandbox-test-token',
              user_id: 'test_user_123'
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            return data.access_token && data.accounts && data.identity;
          }
          return false;
        }
      },
      {
        name: 'Stripe Verification Session',
        test: async () => {
          const response = await fetch(`${this.baseUrl}/api/stripe/create-verification-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'document',
              metadata: { user_id: 'test_user_123' }
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            return data.client_secret && data.url && data.id;
          }
          return false;
        }
      }
    ];

    for (const test of integrationTests) {
      try {
        const result = await test.test();
        this.results.integrationTests.push({
          name: test.name,
          passed: result
        });
        
        if (result) {
          console.log(`  ✅ ${test.name}`);
        } else {
          console.log(`  ❌ ${test.name}`);
        }
      } catch (error) {
        console.log(`  ❌ ${test.name} - ${error.message}`);
        this.results.errors.push(`${test.name}: ${error.message}`);
      }
    }
  }

  generateReport() {
    console.log('\n📊 Test Results Summary');
    console.log('=' * 60);
    
    const apiPassed = this.results.apiTests.filter(t => t.passed).length;
    const apiTotal = this.results.apiTests.length;
    
    const uiPassed = this.results.uiTests.filter(t => t.test).length;
    const uiTotal = this.results.uiTests.length;
    
    const integrationPassed = this.results.integrationTests.filter(t => t.passed).length;
    const integrationTotal = this.results.integrationTests.length;
    
    console.log(`📡 API Tests: ${apiPassed}/${apiTotal} passed`);
    console.log(`🖥️  UI Tests: ${uiPassed}/${uiTotal} passed`);
    console.log(`🔄 Integration Tests: ${integrationPassed}/${integrationTotal} passed`);
    
    if (this.results.errors.length > 0) {
      console.log(`❌ Errors: ${this.results.errors.length}`);
      this.results.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    const totalPassed = apiPassed + uiPassed + integrationPassed;
    const totalTests = apiTotal + uiTotal + integrationTotal;
    const passRate = Math.round((totalPassed / totalTests) * 100);
    
    console.log(`\n🎯 Overall Pass Rate: ${passRate}% (${totalPassed}/${totalTests})`);
    
    if (passRate >= 80) {
      console.log('🎉 Great job! Your verification system is working well.');
    } else if (passRate >= 60) {
      console.log('⚠️  Some issues need attention.');
    } else {
      console.log('🚨 Critical issues found. Please review the errors above.');
    }
    
    // Save detailed report
    const reportPath = path.join(__dirname, '../test-results/verification-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new VerificationTester();
  tester.runTests().catch(console.error);
}

module.exports = VerificationTester;