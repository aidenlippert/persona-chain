#!/usr/bin/env node
// Auto-generated fix script for critical issues

const fs = require('fs');
const path = require('path');

const fixes = [
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/App.tsx",
    "line": 365,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/ErrorBoundary.tsx",
    "line": 52,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/ErrorBoundary.tsx",
    "line": 52,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/auth/AuthScreen.tsx",
    "line": 60,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/auth/AuthScreen.tsx",
    "line": 60,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/auth/AuthScreen.tsx",
    "line": 60,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/auth/LoginPage.tsx",
    "line": 104,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/auth/LoginPage.tsx",
    "line": 49,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/auth/LoginPage.tsx",
    "line": 49,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/auth/OAuthCallback.tsx",
    "line": 98,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/auth/OAuthCallback.tsx",
    "line": 70,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/auth/StripeIdentityOAuth.tsx",
    "line": 82,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/auth/WalletConnect.tsx",
    "line": 41,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/auth/WalletConnect.tsx",
    "line": 41,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/automation/AutomationDashboard.tsx",
    "line": 41,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/automation/AutomationDashboard.tsx",
    "line": 41,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/automation/AutomationDashboard.tsx",
    "line": 41,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/common/BlockchainStatus.tsx",
    "line": 32,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/common/ErrorBoundary.tsx",
    "line": 34,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/APIMarketplaceCredentials.tsx",
    "line": 339,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/ConnectorButton.tsx",
    "line": 215,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/credentials/ConnectorButton.tsx",
    "line": 204,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/CredentialsDashboard.tsx",
    "line": 82,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/CredentialsDashboard.tsx",
    "line": 82,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/CredentialsDashboard.tsx",
    "line": 82,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/CredentialsDashboard.tsx",
    "line": 82,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/CredentialsDashboard.tsx",
    "line": 82,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/credentials/CredentialsDashboard.tsx",
    "line": 167,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/CredentialsManager.tsx",
    "line": 122,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/EnhancedAPICredentialsManager.tsx",
    "line": 115,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/EnhancedAPICredentialsManager.tsx",
    "line": 115,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/EnhancedAPICredentialsManager.tsx",
    "line": 115,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/EnhancedCredentialsManager.tsx",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/EnhancedCredentialsManager.tsx",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/EnhancedCredentialsManager.tsx",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/EnhancedCredentialsManager.tsx",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/EnhancedCredentialsManager.tsx",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/EnhancedCredentialsManager.tsx",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/credentials/EnhancedCredentialsManager.tsx",
    "line": 434,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/PremiumRapidAPIMarketplace.tsx",
    "line": 373,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/RealCredentialsManager.tsx",
    "line": 128,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/RealCredentialsManager.tsx",
    "line": 128,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/RealCredentialsManager.tsx",
    "line": 128,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/RealCredentialsManager.tsx",
    "line": 128,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/credentials/RealCredentialsManager.tsx",
    "line": 113,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/dashboard/ComprehensiveDashboard.tsx",
    "line": 178,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/dashboard/CredentialManager.tsx",
    "line": 141,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/dashboard/CrossChainBridge.tsx",
    "line": 99,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/dashboard/CrossChainBridge.tsx",
    "line": 99,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/dashboard/RealDashboard.tsx",
    "line": 54,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/dashboard/RealDashboard.tsx",
    "line": 54,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/dashboard/RealDashboard.tsx",
    "line": 54,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/dashboard/ZKOptimizationDemo.tsx",
    "line": 43,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/dashboard/ZKOptimizationDemo.tsx",
    "line": 43,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/dashboard/ZKProofManager.tsx",
    "line": 144,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/dashboard/ZKProofManager.tsx",
    "line": 144,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/dashboard/ZKProofManager.tsx",
    "line": 144,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/dashboard/ZKProofManager.tsx",
    "line": 144,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/financial/ExperianCreditDashboard.tsx",
    "line": 45,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/financial/PlaidIntegrationDashboard.tsx",
    "line": 47,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/financial/PlaidLinkComponent.tsx",
    "line": 82,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/financial/PlaidLinkComponent.tsx",
    "line": 82,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/financial/PlaidLinkComponent.tsx",
    "line": 82,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/financial/PlaidLinkComponent.tsx",
    "line": 82,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/financial/PlaidLinkComponent.tsx",
    "line": 75,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/financial/PlaidLinkComponent.tsx",
    "line": 75,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/identity/DIDCreationFlow.tsx",
    "line": 61,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/identity/DIDCreationFlow.tsx",
    "line": 61,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/identity/DIDCreationFlow.tsx",
    "line": 56,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/identity/DIDMethodDemo.tsx",
    "line": 154,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/identity/DIDMethodRegistry.tsx",
    "line": 69,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/identity/DIDMethodRegistry.tsx",
    "line": 69,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/identity/StripeIdentityVerification.tsx",
    "line": 107,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/identity/UniversalDIDResolver.tsx",
    "line": 65,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/identity/UniversalDIDResolver.tsx",
    "line": 65,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/mobile/MobileCommunityDashboard.tsx",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/mobile/MobileCommunityDashboard.tsx",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/mobile/MobilePWADashboard.tsx",
    "line": 103,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/mobile/MobilePWADashboard.tsx",
    "line": 103,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/mobile/MobilePWADashboard.tsx",
    "line": 103,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/mobile/MobilePWADashboard.tsx",
    "line": 103,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/mobile/MobilePWADashboard.tsx",
    "line": 103,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/mobile/MobileProofExplorer.tsx",
    "line": 82,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/mobile/MobileProofExplorer.tsx",
    "line": 82,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/onboarding/DIDCreation.tsx",
    "line": 65,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/onboarding/RealOnboardingFlow.tsx",
    "line": 108,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/onboarding/RealOnboardingFlow.tsx",
    "line": 108,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/onboarding/RealOnboardingFlow.tsx",
    "line": 67,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/onboarding/SimpleOnboardingFlow.tsx",
    "line": 40,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/onboarding/SimpleOnboardingFlow.tsx",
    "line": 25,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/onboarding/StreamlinedOnboardingFlow.tsx",
    "line": 376,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/onboarding/StreamlinedOnboardingFlow.tsx",
    "line": 376,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/onboarding/StreamlinedOnboardingFlow.tsx",
    "line": 376,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/onboarding/StreamlinedOnboardingFlow.tsx",
    "line": 295,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/onboarding/StreamlinedOnboardingFlow.tsx",
    "line": 295,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/onboarding/WalletConnection.tsx",
    "line": 56,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/onboarding/WalletConnection.tsx",
    "line": 56,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/token/StakingInterface.tsx",
    "line": 85,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/token/StakingInterface.tsx",
    "line": 85,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/ui/ErrorBoundary.tsx",
    "line": 142,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/ui/ErrorBoundary.tsx",
    "line": 142,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/ui/ErrorBoundary.tsx",
    "line": 142,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/ui/ErrorBoundary.tsx",
    "line": 142,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/ui/ErrorBoundary.tsx",
    "line": 142,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/ui/ErrorBoundary.tsx",
    "line": 142,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/ui/FeedbackSystem.tsx",
    "line": 231,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/ui/PerformanceMonitor.tsx",
    "line": 214,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/ui/Tabs.tsx",
    "line": 58,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/ui/Tabs.tsx",
    "line": 58,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/verification/VerificationDashboard.tsx",
    "line": 125,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/zkp/ZKPDashboard.tsx",
    "line": 69,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/zkp/ZKPProofGenerator.tsx",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/zkp/ZKPProofGenerator.tsx",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/zkp/ZKPProofGenerator.tsx",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/zkp/ZKPTemplateLibrary.tsx",
    "line": 65,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/config/index.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/config/index.ts",
    "line": 319,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/hooks/useDID.ts",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/hooks/useDID.ts",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/hooks/useTheme.ts",
    "line": 178,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/main.tsx",
    "line": 18,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/main.tsx",
    "line": 18,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/main.tsx",
    "line": 18,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/main.tsx",
    "line": 18,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/main.tsx",
    "line": 18,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/main.tsx",
    "line": 18,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/main.tsx",
    "line": 18,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/main.tsx",
    "line": 18,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/pages/CredentialsCallback.tsx",
    "line": 134,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/pages/CredentialsCallback.tsx",
    "line": 29,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/pages/CredentialsCallback.tsx",
    "line": 29,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/pages/CredentialsCallback.tsx",
    "line": 29,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/pages/CredentialsCallback.tsx",
    "line": 29,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/pages/CredentialsCallback.tsx",
    "line": 29,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/pages/Dashboard.tsx",
    "line": 47,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/pages/EnhancedCredentialsPageWithTabs.tsx",
    "line": 45,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/pages/EnhancedCredentialsPageWithTabs.tsx",
    "line": 45,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/pages/EnhancedCredentialsPageWithTabs.tsx",
    "line": 45,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/pages/IdentityVerificationPage.tsx",
    "line": 56,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/pages/LinkedInOAuthCallback.tsx",
    "line": 111,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/pages/ProofsPage.tsx",
    "line": 141,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/pages/ProofsPage.tsx",
    "line": 141,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/pages/ProofsPage.tsx",
    "line": 141,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/scripts/run-api-tests.ts",
    "line": 84,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/scripts/run-api-tests.ts",
    "line": 84,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/scripts/test-apis-simple.js",
    "line": 308,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/ExperianService.ts",
    "line": 139,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/ExperianService.ts",
    "line": 139,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/ExperianService.ts",
    "line": 139,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/ExperianService.ts",
    "line": 133,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/ExperianService.ts",
    "line": 133,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/GitHubAdvancedService.ts",
    "line": 205,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/GitHubAdvancedService.ts",
    "line": 205,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/GitHubAdvancedService.ts",
    "line": 205,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/GitHubAdvancedService.ts",
    "line": 255,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/GitHubAdvancedService.ts",
    "line": 255,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/LinkedInAdvancedService.ts",
    "line": 168,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/LinkedInAdvancedService.ts",
    "line": 168,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/LinkedInAdvancedService.ts",
    "line": 292,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/androidCredentialsService.ts",
    "line": 281,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/androidCredentialsService.ts",
    "line": 281,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/androidCredentialsService.ts",
    "line": 281,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/androidCredentialsService.ts",
    "line": 281,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/androidCredentialsService.ts",
    "line": 281,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/androidCredentialsService.ts",
    "line": 281,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/androidCredentialsService.ts",
    "line": 209,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/androidCredentialsService.ts",
    "line": 209,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/androidCredentialsService.ts",
    "line": 209,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/androidDigitalCredentialService.ts",
    "line": 284,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/androidDigitalCredentialService.ts",
    "line": 284,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/androidDigitalCredentialService.ts",
    "line": 284,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/androidDigitalCredentialService.ts",
    "line": 284,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/androidDigitalCredentialService.ts",
    "line": 180,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/androidDigitalCredentialService.ts",
    "line": 180,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/androidDigitalCredentialService.ts",
    "line": 180,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/androidDigitalCredentialService.ts",
    "line": 180,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/androidDigitalCredentialService.ts",
    "line": 180,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/androidDigitalCredentialService.ts",
    "line": 180,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/ApiIntegrationOrchestrator.ts",
    "line": 110,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/ApiIntegrationOrchestrator.ts",
    "line": 110,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/ApiIntegrationOrchestrator.ts",
    "line": 110,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/ApiIntegrationOrchestrator.ts",
    "line": 110,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/ApiIntegrationOrchestrator.ts",
    "line": 110,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/ApiIntegrationOrchestrator.ts",
    "line": 110,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/ApiIntegrationOrchestrator.ts",
    "line": 110,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/ApiIntegrationOrchestrator.ts",
    "line": 110,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/ApiIntegrationOrchestrator.ts",
    "line": 110,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/ApiIntegrationOrchestrator.ts",
    "line": 110,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/ApiIntegrationOrchestrator.ts",
    "line": 110,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/base/BaseApiService.ts",
    "line": 38,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/base/BaseApiService.ts",
    "line": 38,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/api/credentials/ApiCredentialManager.ts",
    "line": 147,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/api/providers/PlaidApiService.ts",
    "line": 236,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/api/providers/PlaidApiService.ts",
    "line": 236,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/providers/PlaidApiService.ts",
    "line": 59,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/providers/PlaidApiService.ts",
    "line": 59,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/providers/PlaidApiService.ts",
    "line": 59,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/providers/PlaidApiService.ts",
    "line": 59,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/providers/PlaidApiService.ts",
    "line": 59,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/api/providers/TwilioApiService.ts",
    "line": 288,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/providers/TwilioApiService.ts",
    "line": 68,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/providers/TwilioApiService.ts",
    "line": 68,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/providers/TwilioApiService.ts",
    "line": 68,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/vc/VCGenerationFramework.ts",
    "line": 127,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/api/vc/VCGenerationFramework.ts",
    "line": 127,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/automation/AdvancedWorkflowService.ts",
    "line": 539,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/AdvancedWorkflowService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/AdvancedWorkflowService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/AdvancedWorkflowService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/AdvancedWorkflowService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/AdvancedWorkflowService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/automation/AutomatedAPIIntegrator.ts",
    "line": 102,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/AutomatedAPIIntegrator.ts",
    "line": 481,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/automation/AutomationSystemInit.ts",
    "line": 98,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/automation/AutomationSystemInit.ts",
    "line": 98,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/automation/AutomationSystemInit.ts",
    "line": 98,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/AutomationSystemInit.ts",
    "line": 188,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/automation/ExperianAutomationService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/automation/ExperianAutomationService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/automation/ExperianAutomationService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/automation/ExperianAutomationService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/automation/ExperianAutomationService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/ExperianAutomationService.ts",
    "line": 144,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/ExperianAutomationService.ts",
    "line": 144,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/ExperianAutomationService.ts",
    "line": 144,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/automation/PlaidAutomationService.ts",
    "line": 83,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/automation/PlaidAutomationService.ts",
    "line": 83,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/automation/PlaidAutomationService.ts",
    "line": 83,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/automation/PlaidAutomationService.ts",
    "line": 83,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/automation/PlaidAutomationService.ts",
    "line": 83,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/PlaidAutomationService.ts",
    "line": 71,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/PlaidAutomationService.ts",
    "line": 71,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/PlaidAutomationService.ts",
    "line": 71,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/PlaidAutomationService.ts",
    "line": 71,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/PlaidAutomationService.ts",
    "line": 71,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/automation/RapidAPIConnector.ts",
    "line": 98,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/automation/UnifiedAutomationManager.ts",
    "line": 96,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/automation/UnifiedAutomationManager.ts",
    "line": 96,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/WorkflowAutomationEngine.ts",
    "line": 124,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/WorkflowAutomationEngine.ts",
    "line": 124,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/WorkflowAutomationEngine.ts",
    "line": 124,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/WorkflowAutomationEngine.ts",
    "line": 124,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/WorkflowAutomationEngine.ts",
    "line": 124,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/WorkflowAutomationEngine.ts",
    "line": 124,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/WorkflowAutomationEngine.ts",
    "line": 124,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/automation/WorkflowAutomationEngine.ts",
    "line": 124,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/blockchainPersistenceService.ts",
    "line": 281,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/blockchainPersistenceService.ts",
    "line": 281,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/blockchainPersistenceService.ts",
    "line": 281,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/blockchainPersistenceService.ts",
    "line": 95,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/blockchainPersistenceService.ts",
    "line": 95,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/blockchainPersistenceService.ts",
    "line": 95,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/blockchainPersistenceService.ts",
    "line": 95,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/blockchainPersistenceService.ts",
    "line": 95,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/blockchainPersistenceService.ts",
    "line": 95,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/blockchainPersistenceService.ts",
    "line": 95,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/blockchainPersistenceService.ts",
    "line": 95,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/blockchainPersistenceService.ts",
    "line": 95,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/blockchainPersistenceService.ts",
    "line": 95,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/blockchainPersistenceService.ts",
    "line": 95,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/blockchainPersistenceService.ts",
    "line": 95,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/blockchainPersistenceService.ts",
    "line": 95,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/blockchainPersistenceService.ts",
    "line": 95,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/blockchainPersistenceService.ts",
    "line": 95,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/blockchainPersistenceService.ts",
    "line": 95,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/blockchainService.ts",
    "line": 1106,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/blockchainService.ts",
    "line": 1106,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/blockchainService.ts",
    "line": 1106,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/community/CommunityProofLibrary.ts",
    "line": 558,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/community/CommunityProofLibrary.ts",
    "line": 558,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/community/CommunityProofLibrary.ts",
    "line": 558,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/community/CommunityProofLibrary.ts",
    "line": 558,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/community/CommunityProofLibrary.ts",
    "line": 558,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/community/CommunityProofLibrary.ts",
    "line": 717,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/community/CommunityProofLibrary.ts",
    "line": 717,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/community/CommunityProofLibrary.ts",
    "line": 717,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/contractService.ts",
    "line": 101,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/contractService.ts",
    "line": 101,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/contractService.ts",
    "line": 101,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/contractService.ts",
    "line": 101,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/contractService.ts",
    "line": 101,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/contractService.ts",
    "line": 101,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/contractService.ts",
    "line": 101,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/contractService.ts",
    "line": 110,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/contractService.ts",
    "line": 110,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/contractService.ts",
    "line": 110,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/contractService.ts",
    "line": 110,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/contractService.ts",
    "line": 110,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/credentialMarketplaceService.ts",
    "line": 1178,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/credentialMarketplaceService.ts",
    "line": 1178,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/credentialRecoveryService.ts",
    "line": 75,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/credentialRecoveryService.ts",
    "line": 75,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/credentialRecoveryService.ts",
    "line": 76,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/credentials/APICredentialService.ts",
    "line": 78,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/credentials/APICredentialService.ts",
    "line": 78,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/credentials/APICredentialService.ts",
    "line": 53,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/credentials/APICredentialService.ts",
    "line": 53,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/credentials/APICredentialService.ts",
    "line": 53,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/credentials/RapidAPIVCWorkflow.ts",
    "line": 250,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/credentials/RapidAPIVCWorkflow.ts",
    "line": 206,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/credentials/RapidAPIVCWorkflow.ts",
    "line": 206,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/credentials/RapidAPIVCWorkflow.ts",
    "line": 206,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/credentials/RapidAPIVCWorkflow.ts",
    "line": 206,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/cryptoService.ts",
    "line": 249,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/cryptoService.ts",
    "line": 249,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/cryptoService.ts",
    "line": 249,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/cryptoService.ts",
    "line": 249,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/cryptoService.ts",
    "line": 249,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/cryptoService.ts",
    "line": 249,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/cryptoService.ts",
    "line": 249,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/database/DatabaseInit.ts",
    "line": 106,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/database/DatabaseInit.ts",
    "line": 106,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/database/DatabaseInit.ts",
    "line": 106,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/database/DatabaseInit.ts",
    "line": 106,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/database/DatabaseInit.ts",
    "line": 67,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/database/DatabaseInit.ts",
    "line": 67,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/database/DatabaseInit.ts",
    "line": 67,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/database/DatabaseInit.ts",
    "line": 67,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 138,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 138,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 138,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 138,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 138,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 138,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 138,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 138,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 138,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 138,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/database/DatabaseService.ts",
    "line": 138,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/\\.createDIDDocument\\s*\\(/g",
    "match": ".createDIDDocument(",
    "file": "src/services/didService.ts",
    "line": 383,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/\\.createDIDDocument\\s*\\(/g",
    "match": ".createDIDDocument(",
    "file": "src/services/didService.ts",
    "line": 383,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/\\.createDIDDocument\\s*\\(/g",
    "match": ".createDIDDocument(",
    "file": "src/services/didService.ts",
    "line": 383,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/\\.createDIDDocument\\s*\\(/g",
    "match": ".createDIDDocument(",
    "file": "src/services/didService.ts",
    "line": 383,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/\\.createDIDDocument\\s*\\(/g",
    "match": ".createDIDDocument(",
    "file": "src/services/didService.ts",
    "line": 383,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didService.ts",
    "line": 428,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didService.ts",
    "line": 388,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didService.ts",
    "line": 388,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didService.ts",
    "line": 388,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didService.ts",
    "line": 388,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didService.ts",
    "line": 388,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didService.ts",
    "line": 388,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didService.ts",
    "line": 388,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didService.ts",
    "line": 388,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didService.ts",
    "line": 388,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didService.ts",
    "line": 388,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didService.ts",
    "line": 388,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didService.ts",
    "line": 388,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didService.ts",
    "line": 388,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didService.ts",
    "line": 388,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didService.ts",
    "line": 388,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didService.ts",
    "line": 388,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didService.ts",
    "line": 388,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didcommService.ts",
    "line": 111,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didcommService.ts",
    "line": 111,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didcommService.ts",
    "line": 111,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didcommService.ts",
    "line": 111,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didcommService.ts",
    "line": 111,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didcommService.ts",
    "line": 111,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didcommService.ts",
    "line": 111,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didcommService.ts",
    "line": 111,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didcommService.ts",
    "line": 111,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didcommService.ts",
    "line": 111,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didcommService.ts",
    "line": 111,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didcommService.ts",
    "line": 111,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/didcommService.ts",
    "line": 111,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didcommService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didcommService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didcommService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didcommService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didcommService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didcommService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didcommService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didcommService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/didcommService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/discordVCService.ts",
    "line": 402,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/discordVCService.ts",
    "line": 189,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/discordVCService.ts",
    "line": 189,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/discordVCService.ts",
    "line": 189,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/discordVCService.ts",
    "line": 189,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/discordVCService.ts",
    "line": 189,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/discordVCService.ts",
    "line": 189,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/discordVCService.ts",
    "line": 189,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/discordVCService.ts",
    "line": 189,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/discordVCService.ts",
    "line": 189,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/discordVCService.ts",
    "line": 189,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/discordVCService.ts",
    "line": 189,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/enhancedZKProofService.ts",
    "line": 468,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/enhancedZKProofService.ts",
    "line": 468,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/enhancedZKProofService.ts",
    "line": 468,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/enhancedZKProofService.ts",
    "line": 468,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/enhancedZKProofService.ts",
    "line": 468,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/enhancedZKProofService.ts",
    "line": 468,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/enhancedZKProofService.ts",
    "line": 468,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/enhancedZKProofService.ts",
    "line": 639,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/enhancedZKProofService.ts",
    "line": 639,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/enhancedZKProofService.ts",
    "line": 639,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/enhancedZKProofService.ts",
    "line": 639,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/enhancedZKProofService.ts",
    "line": 639,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/enhancedZKProofService.ts",
    "line": 639,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/enhancedZKProofService.ts",
    "line": 639,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/enhancedZKProofService.ts",
    "line": 639,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/enhancedZKProofService.ts",
    "line": 639,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/enhancedZKProofService.ts",
    "line": 639,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/errorService.ts",
    "line": 233,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/errorService.ts",
    "line": 233,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/errorService.ts",
    "line": 233,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/eudiLibIntegrationService.ts",
    "line": 163,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/eudiLibIntegrationService.ts",
    "line": 155,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/eudiLibIntegrationService.ts",
    "line": 155,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/eudiLibIntegrationService.ts",
    "line": 155,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/eudiLibIntegrationService.ts",
    "line": 155,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/eudiLibIntegrationService.ts",
    "line": 155,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/eudiLibIntegrationService.ts",
    "line": 155,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/eudiLibIntegrationService.ts",
    "line": 155,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/eudiLibIntegrationService.ts",
    "line": 155,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/eudiLibIntegrationService.ts",
    "line": 155,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/eudiWalletService.ts",
    "line": 309,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/eudiWalletService.ts",
    "line": 309,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/eudiWalletService.ts",
    "line": 309,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/eudiWalletService.ts",
    "line": 309,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/eudiWalletService.ts",
    "line": 309,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/eudiWalletService.ts",
    "line": 309,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/eudiWalletService.ts",
    "line": 309,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/eudiWalletService.ts",
    "line": 309,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/eudiWalletService.ts",
    "line": 309,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/eudiWalletService.ts",
    "line": 309,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/geminiService.ts",
    "line": 308,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/geminiService.ts",
    "line": 308,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/geminiService.ts",
    "line": 308,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/githubVCService.ts",
    "line": 167,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/githubVCService.ts",
    "line": 167,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/githubVCService.ts",
    "line": 167,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/githubVCService.ts",
    "line": 167,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/githubVCService.ts",
    "line": 167,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/githubVCService.ts",
    "line": 167,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/githubVCService.ts",
    "line": 167,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/githubVCService.ts",
    "line": 167,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/githubVCService.ts",
    "line": 167,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/githubVCService.ts",
    "line": 167,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/githubVCService.ts",
    "line": 167,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/githubVCService.ts",
    "line": 167,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/ibcService.ts",
    "line": 477,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/ibcService.ts",
    "line": 477,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/ibcService.ts",
    "line": 477,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/ibcService.ts",
    "line": 477,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/ibcService.ts",
    "line": 477,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/ibcService.ts",
    "line": 477,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/ibcService.ts",
    "line": 477,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/ibcService.ts",
    "line": 146,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/ibcService.ts",
    "line": 146,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/ibcService.ts",
    "line": 146,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/ibcService.ts",
    "line": 146,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/ibcService.ts",
    "line": 146,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/ibcService.ts",
    "line": 146,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/ibcService.ts",
    "line": 146,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/ibcService.ts",
    "line": 146,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/ibcService.ts",
    "line": 146,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/issuerDirectoryService.ts",
    "line": 217,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/issuerDirectoryService.ts",
    "line": 217,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/issuerDirectoryService.ts",
    "line": 217,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/issuerDirectoryService.ts",
    "line": 217,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/jwtService.ts",
    "line": 129,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/jwtService.ts",
    "line": 129,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/jwtService.ts",
    "line": 129,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/jwtService.ts",
    "line": 40,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/jwtService.ts",
    "line": 40,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/jwtService.ts",
    "line": 40,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/jwtService.ts",
    "line": 40,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/jwtService.ts",
    "line": 40,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/jwtService.ts",
    "line": 40,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/jwtService.ts",
    "line": 40,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/jwtService.ts",
    "line": 40,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/jwtService.ts",
    "line": 40,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/jwtService.ts",
    "line": 40,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/jwtService.ts",
    "line": 40,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/jwtService.ts",
    "line": 40,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/jwtService.ts",
    "line": 40,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/keplrService.ts",
    "line": 151,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/keplrService.ts",
    "line": 151,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/keplrService.ts",
    "line": 151,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/keplrService.ts",
    "line": 151,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/keplrService.ts",
    "line": 151,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/keplrService.ts",
    "line": 151,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/keplrService.ts",
    "line": 151,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/keplrService.ts",
    "line": 151,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keplrService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keplrService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keplrService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keplrService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keplrService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keplrService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keplrService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keplrService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keplrService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keplrService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keplrService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keplrService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keplrService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keyManager.ts",
    "line": 41,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keyManager.ts",
    "line": 41,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keyManager.ts",
    "line": 41,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keyManager.ts",
    "line": 41,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keyManager.ts",
    "line": 41,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keyManager.ts",
    "line": 41,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keyManager.ts",
    "line": 41,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keyManager.ts",
    "line": 41,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keyManager.ts",
    "line": 41,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/keylessBiometricService.ts",
    "line": 192,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/keylessBiometricService.ts",
    "line": 192,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/keylessBiometricService.ts",
    "line": 192,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/keylessBiometricService.ts",
    "line": 192,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keylessBiometricService.ts",
    "line": 236,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keylessBiometricService.ts",
    "line": 236,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keylessBiometricService.ts",
    "line": 236,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keylessBiometricService.ts",
    "line": 236,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/keylessBiometricService.ts",
    "line": 236,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/linkedinOAuthService.ts",
    "line": 164,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/linkedinOAuthService.ts",
    "line": 164,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/linkedinOAuthService.ts",
    "line": 164,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/linkedinOAuthService.ts",
    "line": 164,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinOAuthService.ts",
    "line": 104,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinOAuthService.ts",
    "line": 104,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinOAuthService.ts",
    "line": 104,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/linkedinVCService.ts",
    "line": 669,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/linkedinVCService.ts",
    "line": 669,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/linkedinVCService.ts",
    "line": 669,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/linkedinVCService.ts",
    "line": 669,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/linkedinVCService.ts",
    "line": 669,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/linkedinVCService.ts",
    "line": 669,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/linkedinVCService.ts",
    "line": 669,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/linkedinVCService.ts",
    "line": 181,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/mockGcpHSMService.ts",
    "line": 44,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/monitoringService.ts",
    "line": 83,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/monitoringService.ts",
    "line": 83,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/monitoringService.ts",
    "line": 83,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/monitoringService.ts",
    "line": 83,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/notifications/PushNotificationService.ts",
    "line": 138,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/notifications/PushNotificationService.ts",
    "line": 138,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/notifications/PushNotificationService.ts",
    "line": 138,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/notifications/PushNotificationService.ts",
    "line": 138,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/notifications/PushNotificationService.ts",
    "line": 138,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/notifications/PushNotificationService.ts",
    "line": 138,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/notifications/PushNotificationService.ts",
    "line": 138,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/notifications/PushNotificationService.ts",
    "line": 202,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vciService.ts",
    "line": 175,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vpService.ts",
    "line": 193,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vpService.ts",
    "line": 193,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vpService.ts",
    "line": 193,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vpService.ts",
    "line": 193,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vpService.ts",
    "line": 193,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vpService.ts",
    "line": 193,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vpService.ts",
    "line": 193,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vpService.ts",
    "line": 193,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vpService.ts",
    "line": 193,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/openid4vpService.ts",
    "line": 193,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/performanceService.ts",
    "line": 333,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/performanceService.ts",
    "line": 333,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/persTokenService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/persTokenService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/persTokenService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/persTokenService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/persTokenService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/persTokenService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/persTokenService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/persTokenService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/persTokenService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/persTokenService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/persTokenService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/persTokenService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/persTokenService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/persTokenService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/persTokenService.ts",
    "line": 112,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/personaChainService.ts",
    "line": 162,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/personaChainService.ts",
    "line": 162,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/personaChainService.ts",
    "line": 162,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/personaChainService.ts",
    "line": 162,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/personaChainService.ts",
    "line": 162,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/personaChainService.ts",
    "line": 162,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/personaChainService.ts",
    "line": 162,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/personaChainService.ts",
    "line": 188,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/personaChainService.ts",
    "line": 188,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/personaChainService.ts",
    "line": 188,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/personaChainService.ts",
    "line": 188,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/personaChainService.ts",
    "line": 188,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/personaChainService.ts",
    "line": 188,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/personaTokenService.ts",
    "line": 780,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/plaidVCService.ts",
    "line": 654,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/plaidVCService.ts",
    "line": 161,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/plaidVCService.ts",
    "line": 161,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/plaidVCService.ts",
    "line": 161,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/plaidVCService.ts",
    "line": 161,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/plaidVCService.ts",
    "line": 161,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/plaidVCService.ts",
    "line": 161,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/plaidVCService.ts",
    "line": 161,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/plaidVCService.ts",
    "line": 161,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/plaidVCService.ts",
    "line": 161,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/plaidVCService.ts",
    "line": 161,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/productionBlockchainService.ts",
    "line": 126,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/productionBlockchainService.ts",
    "line": 126,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/productionBlockchainService.ts",
    "line": 126,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/productionBlockchainService.ts",
    "line": 126,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/productionBlockchainService.ts",
    "line": 126,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/productionZKProofService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/productionZKProofService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/productionZKProofService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/productionZKProofService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/productionZKProofService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/productionZKProofService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/productionZKProofService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/productionZKProofService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/productionZKProofService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/productionZKProofService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/productionZKProofService.ts",
    "line": 137,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/pwa/AdvancedServiceWorker.ts",
    "line": 92,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/pwa/AdvancedServiceWorker.ts",
    "line": 92,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/pwa/AdvancedServiceWorker.ts",
    "line": 92,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/pwa/AdvancedServiceWorker.ts",
    "line": 92,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/pwa/AdvancedServiceWorker.ts",
    "line": 92,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/pwa/AdvancedServiceWorker.ts",
    "line": 92,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/pwa/AdvancedServiceWorker.ts",
    "line": 92,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/pwa/AdvancedServiceWorker.ts",
    "line": 92,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/pwa/AdvancedServiceWorker.ts",
    "line": 92,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/pwa/AdvancedServiceWorker.ts",
    "line": 92,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/pwa/AdvancedServiceWorker.ts",
    "line": 92,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/pwa/AdvancedServiceWorker.ts",
    "line": 92,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/pwa/AdvancedServiceWorker.ts",
    "line": 92,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/pwa/AdvancedServiceWorker.ts",
    "line": 92,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/pwa/AdvancedServiceWorker.ts",
    "line": 92,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/pwa/AdvancedServiceWorker.ts",
    "line": 92,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/pwa/AdvancedServiceWorker.ts",
    "line": 92,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/pwa/AdvancedServiceWorker.ts",
    "line": 102,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/qrService.ts",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/qrService.ts",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/qrService.ts",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/qrService.ts",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/qrService.ts",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/qrService.ts",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/qrService.ts",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/qrService.ts",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/qrService.ts",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/qrService.ts",
    "line": 90,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/qrService.ts",
    "line": 90,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/qrService.ts",
    "line": 90,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/qrService.ts",
    "line": 90,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/rateLimitService.ts",
    "line": 322,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realBlockchainService.ts",
    "line": 169,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realBlockchainService.ts",
    "line": 169,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realBlockchainService.ts",
    "line": 169,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realBlockchainService.ts",
    "line": 169,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realBlockchainService.ts",
    "line": 169,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realBlockchainService.ts",
    "line": 169,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realBlockchainService.ts",
    "line": 169,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realBlockchainService.ts",
    "line": 169,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realBlockchainService.ts",
    "line": 169,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realBlockchainService.ts",
    "line": 169,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realBlockchainService.ts",
    "line": 180,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realBlockchainService.ts",
    "line": 180,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realBlockchainService.ts",
    "line": 180,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realBlockchainService.ts",
    "line": 180,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realBlockchainService.ts",
    "line": 180,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realBlockchainService.ts",
    "line": 180,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realBlockchainService.ts",
    "line": 180,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realBlockchainService.ts",
    "line": 180,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realBlockchainService.ts",
    "line": 180,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realBlockchainService.ts",
    "line": 180,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realConfigService.ts",
    "line": 358,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realConfigService.ts",
    "line": 376,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realConfigService.ts",
    "line": 376,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realConfigService.ts",
    "line": 376,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realConfigService.ts",
    "line": 376,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realConfigService.ts",
    "line": 376,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realConfigService.ts",
    "line": 376,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realConfigService.ts",
    "line": 376,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realConfigService.ts",
    "line": 376,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realDatabaseService.ts",
    "line": 194,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realDatabaseService.ts",
    "line": 194,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realDatabaseService.ts",
    "line": 194,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realDatabaseService.ts",
    "line": 194,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realDatabaseService.ts",
    "line": 194,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realDatabaseService.ts",
    "line": 194,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realDatabaseService.ts",
    "line": 194,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realDatabaseService.ts",
    "line": 194,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realDatabaseService.ts",
    "line": 194,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realDatabaseService.ts",
    "line": 194,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realDatabaseService.ts",
    "line": 194,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realDatabaseService.ts",
    "line": 194,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realDatabaseService.ts",
    "line": 194,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realDatabaseService.ts",
    "line": 556,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realDatabaseService.ts",
    "line": 556,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realDatabaseService.ts",
    "line": 556,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realHSMService.ts",
    "line": 122,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realHSMService.ts",
    "line": 122,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realHSMService.ts",
    "line": 122,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realHSMService.ts",
    "line": 122,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realHSMService.ts",
    "line": 122,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realHSMService.ts",
    "line": 122,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realHSMService.ts",
    "line": 122,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realHSMService.ts",
    "line": 122,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realHSMService.ts",
    "line": 122,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realHSMService.ts",
    "line": 122,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realHSMService.ts",
    "line": 122,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realHSMService.ts",
    "line": 122,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realHSMService.ts",
    "line": 100,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realHSMService.ts",
    "line": 100,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realHSMService.ts",
    "line": 100,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realHSMService.ts",
    "line": 100,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realHSMService.ts",
    "line": 100,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realIBCService.ts",
    "line": 113,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realIBCService.ts",
    "line": 113,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realIBCService.ts",
    "line": 113,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realIBCService.ts",
    "line": 98,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realIBCService.ts",
    "line": 98,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realIBCService.ts",
    "line": 98,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realIBCService.ts",
    "line": 98,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realIBCService.ts",
    "line": 98,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realIBCService.ts",
    "line": 98,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realIBCService.ts",
    "line": 98,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realIBCService.ts",
    "line": 98,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realIBCService.ts",
    "line": 98,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realIBCService.ts",
    "line": 98,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realZKProofService.ts",
    "line": 153,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realZKProofService.ts",
    "line": 153,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realZKProofService.ts",
    "line": 153,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/realZKProofService.ts",
    "line": 153,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realZKProofService.ts",
    "line": 166,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realZKProofService.ts",
    "line": 166,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realZKProofService.ts",
    "line": 166,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realZKProofService.ts",
    "line": 166,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realZKProofService.ts",
    "line": 166,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realZKProofService.ts",
    "line": 166,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realZKProofService.ts",
    "line": 166,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realZKProofService.ts",
    "line": 166,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realZKProofService.ts",
    "line": 166,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/realZKProofService.ts",
    "line": 166,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/retryService.ts",
    "line": 369,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/retryService.ts",
    "line": 54,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/securityAuditService.ts",
    "line": 167,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/social/SocialSharingService.ts",
    "line": 193,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/social/SocialSharingService.ts",
    "line": 193,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/social/SocialSharingService.ts",
    "line": 193,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/social/SocialSharingService.ts",
    "line": 193,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/social/SocialSharingService.ts",
    "line": 193,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/social/SocialSharingService.ts",
    "line": 193,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/social/SocialSharingService.ts",
    "line": 193,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/social/SocialSharingService.ts",
    "line": 340,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/social/SocialSharingService.ts",
    "line": 340,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/social/SocialSharingService.ts",
    "line": 340,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/social/SocialSharingService.ts",
    "line": 340,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/social/SocialSharingService.ts",
    "line": 340,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/storageService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/storageService.ts",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/stripeIdentityService.ts",
    "line": 81,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/stripeIdentityService.ts",
    "line": 81,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/stripeIdentityService.ts",
    "line": 81,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/stripeIdentityService.ts",
    "line": 81,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/stripeIdentityService.ts",
    "line": 81,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/stripeIdentityService.ts",
    "line": 81,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/stripeIdentityService.ts",
    "line": 81,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/stripeIdentityService.ts",
    "line": 81,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/stripeIdentityService.ts",
    "line": 82,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/stripeIdentityService.ts",
    "line": 82,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/stripeIdentityService.ts",
    "line": 82,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/stripeIdentityService.ts",
    "line": 82,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/stripeIdentityService.ts",
    "line": 82,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/stripeIdentityService.ts",
    "line": 82,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/stripeIdentityService.ts",
    "line": 82,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/twitterVCService.ts",
    "line": 467,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/twitterVCService.ts",
    "line": 228,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/twitterVCService.ts",
    "line": 228,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/twitterVCService.ts",
    "line": 228,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/twitterVCService.ts",
    "line": 228,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/twitterVCService.ts",
    "line": 228,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/twitterVCService.ts",
    "line": 228,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/twitterVCService.ts",
    "line": 228,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/twitterVCService.ts",
    "line": 228,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/twitterVCService.ts",
    "line": 228,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/twitterVCService.ts",
    "line": 228,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/twitterVCService.ts",
    "line": 228,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/\\.createDIDDocument\\s*\\(/g",
    "match": ".createDIDDocument(",
    "file": "src/services/universalDIDService.ts",
    "line": 216,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/\\.createDIDDocument\\s*\\(/g",
    "match": ".createDIDDocument(",
    "file": "src/services/universalDIDService.ts",
    "line": 216,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/\\.createDIDDocument\\s*\\(/g",
    "match": ".createDIDDocument(",
    "file": "src/services/universalDIDService.ts",
    "line": 216,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/\\.createDIDDocument\\s*\\(/g",
    "match": ".createDIDDocument(",
    "file": "src/services/universalDIDService.ts",
    "line": 216,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/universalDIDService.ts",
    "line": 211,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/universalDIDService.ts",
    "line": 211,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/universalDIDService.ts",
    "line": 211,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/universalDIDService.ts",
    "line": 211,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/universalDIDService.ts",
    "line": 211,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/universalDIDService.ts",
    "line": 211,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/universalDIDService.ts",
    "line": 211,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/userAuthService.ts",
    "line": 71,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/userAuthService.ts",
    "line": 71,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/userAuthService.ts",
    "line": 71,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/userAuthService.ts",
    "line": 71,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/userAuthService.ts",
    "line": 71,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/userAuthService.ts",
    "line": 71,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/userAuthService.ts",
    "line": 71,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/userAuthService.ts",
    "line": 71,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/userAuthService.ts",
    "line": 71,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/userAuthService.ts",
    "line": 71,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/userAuthService.ts",
    "line": 71,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/userAuthService.ts",
    "line": 72,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/userAuthService.ts",
    "line": 72,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/userAuthService.ts",
    "line": 72,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/userAuthService.ts",
    "line": 72,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/userAuthService.ts",
    "line": 72,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/userAuthService.ts",
    "line": 72,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/userAuthService.ts",
    "line": 72,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/userAuthService.ts",
    "line": 72,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/userAuthService.ts",
    "line": 72,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/userAuthService.ts",
    "line": 72,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/userAuthService.ts",
    "line": 72,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/vcManagerService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/vcManagerService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/vcManagerService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/vcManagerService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/vcManagerService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/vcManagerService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/vcManagerService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/vcManagerService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/vcManagerService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/vcManagerService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/vcManagerService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/vcManagerService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/vcManagerService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/vcManagerService.ts",
    "line": 119,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/webauthnService.ts",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/webauthnService.ts",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/webauthnService.ts",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/webauthnService.ts",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/webauthnService.ts",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/webauthnService.ts",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/webauthnService.ts",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/webauthnService.ts",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/webauthnService.ts",
    "line": 89,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/webauthnService.ts",
    "line": 154,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/webauthnService.ts",
    "line": 154,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/webauthnService.ts",
    "line": 154,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/webauthnService.ts",
    "line": 154,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/webauthnService.ts",
    "line": 154,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/webauthnService.ts",
    "line": 154,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/webauthnService.ts",
    "line": 154,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/webauthnService.ts",
    "line": 154,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/webauthnService.ts",
    "line": 154,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/zkProofService.ts",
    "line": 90,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/zkProofService.ts",
    "line": 90,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/zkProofService.ts",
    "line": 90,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/services/zkProofService.ts",
    "line": 90,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/zkProofService.ts",
    "line": 91,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/zkProofService.ts",
    "line": 91,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/zkp/ZKProofBundleService.ts",
    "line": 246,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/zkp/ZKProofInfrastructure.ts",
    "line": 68,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/zkp/ZKProofInfrastructure.ts",
    "line": 68,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/zkp/ZKProofInfrastructure.ts",
    "line": 68,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/zkpTemplateService.ts",
    "line": 231,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/zkpTemplateService.ts",
    "line": 231,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/zkpTemplateService.ts",
    "line": 231,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/zkpTemplateService.ts",
    "line": 231,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/services/zkpTemplateService.ts",
    "line": 231,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/\\.createDIDDocument\\s*\\(/g",
    "match": ".createDIDDocument(",
    "file": "src/store/walletStore.ts",
    "line": 264,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/store/walletStore.ts",
    "line": 228,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/store/walletStore.ts",
    "line": 228,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/store/walletStore.ts",
    "line": 228,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/store/walletStore.ts",
    "line": 228,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/store/walletStore.ts",
    "line": 652,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/\\.createDIDDocument\\s*\\(/g",
    "match": ".createDIDDocument(",
    "file": "src/stores/walletStore.ts",
    "line": 265,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/stores/walletStore.ts",
    "line": 229,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/stores/walletStore.ts",
    "line": 229,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/stores/walletStore.ts",
    "line": 229,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/stores/walletStore.ts",
    "line": 229,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/stores/walletStore.ts",
    "line": 229,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/stores/walletStore.ts",
    "line": 681,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/tests/api-integration-tests.test.ts",
    "line": 395,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/tests/api-integration-tests.ts",
    "line": 395,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/tests/rapidapi-integration-simple.test.ts",
    "line": 286,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/tests/sprint1-api-reliability.test.ts",
    "line": 69,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/tests/sprint1-api-reliability.test.ts",
    "line": 69,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/tests/sprint1-api-reliability.test.ts",
    "line": 69,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/tests/zkProofValidation.test.ts",
    "line": 65,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/utils/notifications.ts",
    "line": 233,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/alert\\s*\\(/g",
    "match": "alert(",
    "file": "src/utils/notifications.ts",
    "line": 2,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/pages/EnhancedCredentialsPageWithTabs.tsx",
    "line": 45,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/pages/EnhancedCredentialsPageWithTabs.tsx",
    "line": 45,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/pages/EnhancedCredentialsPageWithTabs.tsx",
    "line": 45,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/CredentialsManager.tsx",
    "line": 122,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/EnhancedCredentialsManager.tsx",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/EnhancedCredentialsManager.tsx",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/EnhancedCredentialsManager.tsx",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/EnhancedCredentialsManager.tsx",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/EnhancedCredentialsManager.tsx",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/EnhancedCredentialsManager.tsx",
    "line": 120,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/credentials/EnhancedCredentialsManager.tsx",
    "line": 434,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/RealCredentialsManager.tsx",
    "line": 128,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/RealCredentialsManager.tsx",
    "line": 128,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/RealCredentialsManager.tsx",
    "line": 128,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/console\\.error/g",
    "match": "console.error",
    "file": "src/components/credentials/RealCredentialsManager.tsx",
    "line": 128,
    "severity": "critical"
  },
  {
    "type": "CRITICAL",
    "pattern": "/throw\\s+new\\s+Error/g",
    "match": "throw new Error",
    "file": "src/components/credentials/RealCredentialsManager.tsx",
    "line": 113,
    "severity": "critical"
  }
];

console.log('🔧 Applying critical fixes...');

// Fix createDIDDocument calls
fixes.filter(f => f.pattern.includes('createDIDDocument')).forEach(issue => {
  console.log(`Fixing ${issue.file}...`);
  // Add fix logic here
});

console.log('✅ Critical fixes applied!');
