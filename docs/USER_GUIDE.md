# PersonaPass User Guide 👤

> **Your complete guide to using PersonaPass Identity Wallet** - Learn how to manage your digital identity, store credentials, and control your privacy with the most advanced identity wallet available.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Setting Up Your Wallet](#setting-up-your-wallet)
- [Managing Credentials](#managing-credentials)
- [Sharing Information](#sharing-information)
- [Privacy & Security](#privacy--security)
- [Mobile Features](#mobile-features)
- [Troubleshooting](#troubleshooting)
- [Advanced Features](#advanced-features)

## 🚀 Getting Started

PersonaPass is your **digital identity wallet** that puts you in control of your personal information. Unlike traditional systems where companies store your data, PersonaPass lets you store and share your credentials directly from your device.

### 💡 What You Can Do
- **Store Digital Credentials**: ID cards, licenses, certificates, and more
- **Control Your Privacy**: Choose exactly what information to share
- **Prove Your Identity**: Verify yourself without revealing unnecessary details
- **Access Services**: Use your credentials with trusted organizations
- **Stay Secure**: Advanced biometric and zero-knowledge protection

### 🌐 How to Access PersonaPass

| Platform | Access Method | Features |
|----------|---------------|----------|
| **🌐 Web** | [wallet.personapass.id](https://wallet.personapass.id) | Full functionality |
| **📱 Android** | Google Play Store | Native integrations |
| **🍎 iOS** | App Store | Coming Q1 2025 |
| **💻 Desktop** | PWA Install | Offline capabilities |

## 🛠️ Setting Up Your Wallet

### 📱 First-Time Setup

#### Step 1: Create Your Account
1. **Visit** [wallet.personapass.id](https://wallet.personapass.id)
2. **Click** "Create New Wallet"
3. **Enter** your email address
4. **Choose** a strong password
5. **Verify** your email

#### Step 2: Set Up Biometric Authentication
PersonaPass uses advanced biometric authentication for security:

```
🔐 Biometric Setup Process
├── 👆 Fingerprint (if available)
├── 👤 Face recognition 
├── 🗣️ Voice recognition
└── 📱 Device-based authentication
```

1. **Choose** your preferred biometric method
2. **Follow** the enrollment prompts
3. **Complete** the liveness check
4. **Confirm** successful enrollment

> **🛡️ Privacy Note**: Your biometric data never leaves your device and is protected using zero-knowledge proofs.

#### Step 3: Create Your Digital Identity (DID)
Your DID is your unique digital identifier:

1. **Select** DID method (recommended: `did:key`)
2. **Generate** your cryptographic keys
3. **Review** your DID document
4. **Confirm** and save securely

```
Your DID looks like:
did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
```

#### Step 4: Backup Your Wallet
Create a secure backup to protect your identity:

1. **Navigate** to Settings → Backup
2. **Choose** backup method:
   - 🔐 **Encrypted backup file** (recommended)
   - 👥 **Guardian recovery** (social recovery)
   - ☁️ **Cloud backup** (encrypted)
3. **Follow** backup instructions
4. **Test** recovery process

### ⚙️ Basic Settings

#### Privacy Settings
Configure your privacy preferences:

- **Default Sharing Level**: Minimal, Selective, or Full
- **Biometric Requirements**: When to require biometric confirmation
- **Zero-Knowledge Proofs**: Enable privacy-preserving proofs
- **Audit Logging**: Track your credential usage

#### Security Settings
Enhance your wallet security:

- **Auto-Lock**: Set timeout for automatic locking
- **Multi-Factor Authentication**: Add additional security layers
- **Device Registration**: Manage trusted devices
- **Session Management**: Control active sessions

#### Accessibility Settings
Customize for your needs:

- **Screen Reader Support**: Enhanced accessibility
- **High Contrast Mode**: Improved visibility
- **Large Text**: Increased font sizes
- **Voice Navigation**: Audio-based navigation

## 📋 Managing Credentials

### 📥 Receiving Credentials

#### From QR Code
1. **Open** PersonaPass wallet
2. **Tap** the QR scanner
3. **Scan** the credential offer QR code
4. **Review** credential details
5. **Accept** or decline the credential

#### From Link or Email
1. **Click** the credential offer link
2. **PersonaPass opens** automatically
3. **Review** the credential preview
4. **Choose** acceptance options:
   - ✅ **Accept and store**
   - 🔒 **Accept with conditions**
   - ❌ **Decline offer**

#### From Mobile App Integration
On Android devices with Digital Credentials API:

1. **Issuer app** initiates credential offer
2. **System prompt** appears
3. **Choose** PersonaPass as your wallet
4. **Complete** the issuance flow

### 📚 Organizing Your Credentials

#### Credential Categories
PersonaPass automatically organizes credentials:

| Category | Examples | Icon |
|----------|----------|------|
| **🆔 Identity** | Driver's license, passport, ID card | 🆔 |
| **🎓 Education** | Diplomas, certificates, transcripts | 🎓 |
| **💼 Professional** | Licenses, certifications, employment | 💼 |
| **🏥 Health** | Vaccination records, medical certificates | 🏥 |
| **💰 Financial** | Credit reports, income verification | 💰 |
| **🏛️ Government** | Permits, registrations, clearances | 🏛️ |

#### Custom Organization
- **📁 Create folders** for custom grouping
- **🏷️ Add tags** for easy searching
- **⭐ Mark favorites** for quick access
- **📝 Add notes** for personal reference

#### Credential Details View
For each credential, you can see:

```
📄 Credential Information
├── 📋 Basic Details (name, type, issuer)
├── 🔍 Full Content (all fields and values)
├── 🛡️ Security Info (signatures, proofs)
├── 📅 Validity (issue date, expiration)
├── 🔗 Verification (issuer verification)
└── 📊 Usage History (when/where shared)
```

### ✏️ Managing Credential Lifecycle

#### Updating Credentials
When credentials need updates:

1. **Receive** update notification
2. **Review** changes highlighted
3. **Accept** or request clarification
4. **Old version** automatically archived

#### Credential Expiration
Before credentials expire:

- **📅 30-day warning** notification
- **🔄 Renewal options** displayed
- **📧 Auto-contact** issuer (if enabled)
- **⚠️ Grace period** handling

#### Deleting Credentials
To remove credentials:

1. **Select** credential to delete
2. **Choose** deletion type:
   - 🗑️ **Soft delete** (hide but keep)
   - 💥 **Permanent delete** (completely remove)
3. **Confirm** deletion
4. **Backup** created automatically

## 🔄 Sharing Information

### 🎯 Understanding Presentation Requests

When someone wants to verify your identity, they send a **presentation request**:

```
📨 Presentation Request Flow
├── 🔍 Request received (QR, link, or app)
├── 📋 Requirements displayed
├── ✅ Your matching credentials shown
├── 🔒 Privacy options presented
└── 📤 Share or decline decision
```

#### Types of Requests
- **🆔 Identity Verification**: Prove who you are
- **📅 Age Verification**: Prove you meet age requirements
- **🎓 Qualification Proof**: Show education or skills
- **💼 Employment Verification**: Confirm job status
- **🏥 Health Status**: Share medical information
- **💰 Financial Standing**: Prove income or credit

### 🔐 Privacy-First Sharing

#### Selective Disclosure
Choose exactly what to share:

```
📊 Example: Age Verification Request
┌─────────────────────────────────┐
│ Verifier: Online Liquor Store   │
│ Purpose: Age verification       │
│ Required: Proof you're 21+      │
├─────────────────────────────────┤
│ Your Options:                   │
│ ✅ Share age only (recommended) │
│ ⚠️ Share birthdate             │
│ ❌ Share full ID details       │
└─────────────────────────────────┘
```

#### Zero-Knowledge Proofs
Prove facts without revealing data:

- **Age Verification**: Prove you're over 21 without showing birthdate
- **Income Proof**: Prove income level without exact amount
- **Location Proof**: Prove residency without full address
- **Membership Proof**: Prove membership without details

#### Biometric Binding
Add extra security to important shares:

1. **Biometric verification** required for sensitive data
2. **Liveness detection** prevents spoofing
3. **Device attestation** confirms legitimate device
4. **Audit trail** tracks all biometric usage

### 📱 Sharing Methods

#### QR Code Scanning
Most common method for in-person verification:

1. **Verifier shows** QR code
2. **You scan** with PersonaPass
3. **Review** what's being requested
4. **Approve** with biometric confirmation
5. **Information shared** securely

#### Deep Links
For mobile and web applications:

1. **Click** verification link
2. **PersonaPass opens** automatically
3. **Review** request details
4. **Complete** sharing process

#### NFC/Bluetooth (Android)
For contactless sharing:

1. **Enable** NFC in settings
2. **Tap** devices together
3. **Confirm** sharing request
4. **Complete** with biometrics

### 🕐 Sharing History

Track all your credential usage:

```
📊 Sharing History View
├── 📅 Date and time
├── 🏢 Verifier organization
├── 📋 Information shared
├── 🔐 Privacy level used
├── ✅ Verification result
└── 🗑️ Delete history option
```

#### Privacy Controls
- **📝 Add notes** about sharing context
- **🚫 Block verifiers** if needed
- **⏰ Set sharing expiration** times
- **📧 Request data deletion** from verifiers

## 🛡️ Privacy & Security

### 🔐 Advanced Security Features

#### Zero-Knowledge Authentication
PersonaPass uses cutting-edge cryptography:

- **No password storage**: Your password never leaves your device
- **Biometric privacy**: Templates protected with ZK proofs
- **Selective disclosure**: Share only necessary information
- **Unlinkable presentations**: Different shares can't be connected

#### Multi-Layer Protection

```
🛡️ Security Layers
├── 🔐 Device Security (hardware TEE)
├── 🔑 Cryptographic Keys (Ed25519)
├── 👤 Biometric Protection (zero-knowledge)
├── 🌐 Network Security (TLS 1.3)
├── 📱 App Security (code signing)
└── 🏛️ Blockchain Integrity (consensus)
```

#### Guardian Recovery System
Social recovery without seed phrases:

1. **Choose trusted guardians** (friends, family, services)
2. **Set recovery threshold** (e.g., 3 of 5 guardians)
3. **If needed**, guardians can help recover access
4. **Your data stays private** during recovery

### 🔍 Privacy Dashboard

#### Data Usage Monitoring
Track how your data is being used:

- **📊 Usage statistics** by verifier
- **🕐 Sharing frequency** analysis
- **🌍 Geographic distribution** of requests
- **📋 Credential popularity** metrics

#### Privacy Audit Log
Complete audit trail of all activities:

```
📋 Audit Log Entry
├── 🕐 Timestamp: 2024-01-15 10:30:00
├── 👤 Action: Credential shared
├── 🏢 Verifier: City DMV Office
├── 📋 Data: Driver's license number only
├── 🔐 Privacy Level: Selective disclosure
├── ✅ Status: Successfully verified
└── 📝 Notes: Renewal appointment
```

#### Data Subject Rights
Exercise your privacy rights:

- **📖 Data portability**: Export all your data
- **🗑️ Right to erasure**: Request deletion
- **✏️ Rectification**: Update incorrect information
- **🚫 Object to processing**: Withdraw consent
- **📞 Contact issuers**: Direct communication tools

### 🔒 Security Best Practices

#### Strong Authentication
- **Use biometrics** when available
- **Enable auto-lock** with short timeout
- **Regular password updates** recommended
- **Multi-device syncing** with caution

#### Safe Sharing Habits
- **Verify verifier identity** before sharing
- **Use minimal disclosure** when possible
- **Check request authenticity** (look for verified badges)
- **Review sharing history** regularly

#### Device Security
- **Keep apps updated** to latest versions
- **Use device lock screens** with PIN/password
- **Avoid public WiFi** for sensitive operations
- **Enable device encryption** if available

## 📱 Mobile Features

### 🤖 Android Integration

#### Digital Credentials API
Native Android integration:

- **System-level security**: Uses Android's secure hardware
- **Seamless UX**: No app switching required
- **Offline capability**: Works without internet
- **Battery optimization**: Efficient credential access

#### Setup on Android
1. **Install** PersonaPass from Play Store
2. **Set as default** credential provider
3. **Enable** Digital Credentials in Android Settings
4. **Import** credentials from web wallet

#### Using Android Features
- **📱 Quick access**: Pull down notification for credential tiles
- **🔒 Secure storage**: Hardware-backed key storage
- **🌐 Cross-app sharing**: Use credentials in any app
- **📷 Camera integration**: Built-in QR code scanning

### 🍎 iOS Features (Coming Soon)

Planned iOS features for Q1 2025:

- **🔐 Keychain integration**: Secure credential storage
- **📱 Shortcuts support**: Siri voice commands
- **📲 Share Sheet**: Easy credential sharing
- **🎯 Focus Modes**: Privacy-aware notifications

### 💻 Desktop Experience

#### Progressive Web App (PWA)
Install PersonaPass as a desktop app:

1. **Visit** wallet.personapass.id in Chrome/Edge
2. **Click** install icon in address bar
3. **Confirm** installation
4. **Launch** from desktop or start menu

#### Desktop Features
- **⌨️ Keyboard shortcuts**: Efficient navigation
- **🖥️ Multiple windows**: Side-by-side credential management
- **📁 File integration**: Drag-and-drop credential imports
- **🖨️ Print support**: Physical credential backups

## 🔧 Troubleshooting

### 🚨 Common Issues

#### Can't Access Wallet
**Problem**: Forgot password or biometric not working

**Solutions**:
1. **Use alternative authentication** method
2. **Contact guardians** for recovery assistance
3. **Restore from backup** if available
4. **Contact support** for account recovery

#### Credential Not Accepted
**Problem**: Verifier won't accept your credential

**Solutions**:
1. **Check credential expiration** date
2. **Verify issuer trust** status
3. **Update credential** if needed
4. **Contact verifier** for requirements

#### Slow Performance
**Problem**: App is running slowly

**Solutions**:
1. **Close other apps** to free memory
2. **Clear cache** in settings
3. **Update app** to latest version
4. **Restart device** if needed

#### QR Code Won't Scan
**Problem**: Camera can't read QR codes

**Solutions**:
1. **Clean camera lens** thoroughly
2. **Ensure good lighting** conditions
3. **Hold steady** at proper distance
4. **Manual entry** if QR doesn't work

### 📞 Getting Help

#### In-App Support
- **💬 Live chat**: Available 24/7
- **📧 Email support**: Response within 24 hours
- **📱 Video calls**: For complex issues
- **📖 Help center**: Searchable knowledge base

#### Community Support
- **💬 Discord**: Real-time community help
- **📱 Forums**: Detailed discussions
- **📺 YouTube**: Video tutorials
- **📖 Blog**: Tips and best practices

#### Emergency Support
For urgent issues:

- **🆘 Emergency access**: Special recovery procedures
- **🔐 Security incidents**: Immediate response team
- **🏥 Medical emergencies**: Health credential access
- **⚖️ Legal requests**: Compliance assistance

## 🎯 Advanced Features

### 🧮 Zero-Knowledge Proofs

#### Understanding ZK Proofs
Zero-knowledge proofs let you prove facts without revealing data:

```
🔍 Example: Age Verification
┌─────────────────────────────────┐
│ Traditional: "I'm 25 years old" │
│ Reveals: Exact age              │
├─────────────────────────────────┤
│ ZK Proof: "I'm over 21"        │
│ Reveals: Only the fact needed   │
└─────────────────────────────────┘
```

#### Available ZK Circuits
- **📅 Age verification**: Prove age ranges
- **💰 Income brackets**: Prove income levels
- **🏠 Location zones**: Prove general location
- **🎓 Qualification levels**: Prove skill levels
- **👥 Group membership**: Prove membership status

### 🔗 Cross-Chain Identity

#### Multi-Blockchain Support
Your identity works across different blockchains:

- **🌟 Cosmos ecosystem**: Native PersonaChain support
- **🔗 Ethereum**: Via IBC bridge
- **⚡ Bitcoin**: Lightning Network integration
- **🔥 Solana**: High-speed transactions
- **🌐 Polkadot**: Cross-chain interoperability

#### Cross-Chain Operations
- **💱 Identity portability**: Use same DID everywhere
- **🔄 Credential synchronization**: Keep data consistent
- **✅ Cross-chain verification**: Verify from any chain
- **🌉 Bridge transactions**: Move identity data safely

### 🏭 Enterprise Features

#### Organization Management
For business users:

- **👥 Team wallets**: Shared organizational credentials
- **🔐 Role-based access**: Granular permissions
- **📊 Usage analytics**: Team activity monitoring
- **🛡️ Compliance reporting**: Regulatory requirements

#### Integration APIs
Connect with enterprise systems:

- **🔌 SSO integration**: Single sign-on systems
- **📊 LDAP synchronization**: Directory services
- **🔐 SAML support**: Enterprise authentication
- **📈 Analytics APIs**: Usage data export

### 🔬 Developer Features

#### Custom Schemas
Create your own credential types:

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://your-org.com/contexts/employee-v1"
  ],
  "type": ["VerifiableCredential", "EmployeeCredential"],
  "credentialSubject": {
    "employeeId": "EMP-12345",
    "department": "Engineering",
    "clearanceLevel": "Secret",
    "skills": ["JavaScript", "Cryptography"]
  }
}
```

#### Webhook Notifications
Get real-time updates:

- **📨 Credential received**: New credential alerts
- **✅ Verification completed**: Share confirmations
- **⚠️ Security events**: Unusual activity alerts
- **🔄 System updates**: Platform notifications

#### SDK Integration
Build custom applications:

```typescript
import { PersonaPassWallet } from '@personapass/sdk';

const wallet = new PersonaPassWallet({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Get all credentials
const credentials = await wallet.getCredentials();

// Create presentation
const presentation = await wallet.createPresentation({
  credentials: ['driver-license'],
  purpose: 'Age verification'
});
```

---

<div align="center">

**👤 Your guide to sovereign digital identity**

[📖 Back to Documentation](README.md) | [🛠️ Developer Guide](DEVELOPER_GUIDE.md) | [🆘 Get Support](https://support.personapass.id)

*Take control of your digital identity* 🚀

</div>