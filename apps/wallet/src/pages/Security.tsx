import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function Security() {
  const securityFeatures = [
    {
      title: "Hardware Security Modules (HSM)",
      description:
        "Your private keys are protected by Google Cloud HSM, providing hardware-level security that's tamper-resistant and FIPS 140-2 Level 3 certified.",
      icon: (
        <svg
          className="w-6 h-6 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
    {
      title: "Zero-Knowledge Architecture",
      description:
        "Prove your identity without revealing personal information. Our ZK-SNARK implementation ensures mathematical verification while maintaining complete privacy.",
      icon: (
        <svg
          className="w-6 h-6 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.11 8.11m1.768 1.768l4.242 4.242M8.11 8.11l5.657-5.657m0 0L16.5 5.19m-2.733-2.733L16.5 5.19m-2.733-2.733L11.034 4.2M19.5 7.5l-7.5 7.5"
          />
        </svg>
      ),
    },
    {
      title: "Biometric Authentication",
      description:
        "WebAuthn-compliant biometric authentication using fingerprint, Face ID, or hardware security keys. Passwordless and secure.",
      icon: (
        <svg
          className="w-6 h-6 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          />
        </svg>
      ),
    },
    {
      title: "End-to-End Encryption",
      description:
        "All data is encrypted in transit and at rest using AES-256 encryption. Only you have access to your personal information.",
      icon: (
        <svg
          className="w-6 h-6 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      ),
    },
    {
      title: "Blockchain Security",
      description:
        "Immutable identity records on Ethereum and Polygon networks. Decentralized verification without central points of failure.",
      icon: (
        <svg
          className="w-6 h-6 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
    {
      title: "Continuous Monitoring",
      description:
        "24/7 security monitoring with real-time threat detection. Automated incident response and comprehensive audit logs.",
      icon: (
        <svg
          className="w-6 h-6 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
  ];

  const certifications = [
    {
      name: "SOC 2 Type II",
      description: "Security, availability, and confidentiality compliance",
      status: "Certified",
    },
    {
      name: "GDPR Compliant",
      description: "European data protection regulation compliance",
      status: "Compliant",
    },
    {
      name: "ISO 27001",
      description: "Information security management standard",
      status: "In Progress",
    },
    {
      name: "CCPA Compliant",
      description: "California consumer privacy act compliance",
      status: "Compliant",
    },
  ];

  const auditResults = [
    {
      firm: "Halborn Security",
      type: "Smart Contract Audit",
      date: "2024-01-10",
      findings: "0 Critical, 0 High, 2 Medium, 3 Low",
      status: "Passed",
    },
    {
      firm: "ConsenSys Diligence",
      type: "Protocol Security Review",
      date: "2023-12-15",
      findings: "0 Critical, 1 High (Fixed), 1 Medium, 2 Low",
      status: "Passed",
    },
    {
      firm: "Trail of Bits",
      type: "Cryptographic Implementation",
      date: "2023-11-20",
      findings: "0 Critical, 0 High, 1 Medium, 1 Low",
      status: "Passed",
    },
  ];

  return (
    <div className="min-h-screen bg-primary">
      {/* Cyberpunk Header */}
      <nav className="glass-immersive border-b border-primary">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center">
              <div className="w-8 h-8 bg-gradient-3d-primary rounded-lg flex items-center justify-center neon-glow">
                <span className="text-primary font-bold text-sm">P</span>
              </div>
              <span className="ml-2 text-heading-4 text-primary">Persona</span>
            </Link>

            <div className="hidden md:flex items-center space-x-8">
              <Link
                to="/features"
                className="text-secondary hover:text-primary micro-bounce"
              >
                Features
              </Link>
              <Link to="/security" className="text-accent holographic">
                Security
              </Link>
              <Link
                to="/developers"
                className="text-secondary hover:text-primary micro-bounce"
              >
                Developers
              </Link>
              <Link
                to="/about"
                className="text-secondary hover:text-primary micro-bounce"
              >
                About
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="glass-immersive px-4 py-2 text-primary font-medium rounded-lg"
              >
                Sign In
              </Link>
              <Link to="/onboarding" className="btn-web3">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Cyberpunk Hero Section */}
      <section className="py-20 cosmic-bg cyber-grid particles">
        <div className="container text-center">
          <motion.div
            className="inline-block mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className="trust-signal micro-bounce">
              <div className="trust-signal-icon neon-glow">🛡️</div>
              <span className="text-primary text-sm font-medium">
                Fort Knox Level Security
              </span>
            </div>
          </motion.div>

          <motion.h1
            className="text-display-1 text-primary mb-6 floating-3d"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Enterprise-Grade <span className="holographic">Security</span>
          </motion.h1>

          <motion.p
            className="text-body-large text-secondary mb-8 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Your digital identity is protected by military-grade security,
            advanced cryptography, and hardware security modules. Privacy by
            design, security by default.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Link to="/onboarding" className="btn-web3 btn-lg micro-bounce">
              Start Secure Journey
            </Link>
            <Link
              to="/security-policy"
              className="glass-immersive btn-lg px-8 py-4 text-primary font-semibold micro-wiggle"
            >
              View Security Policy
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-20 bg-secondary particles">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-heading-1 text-primary mb-4">
              Multi-Layer Security Architecture
            </h2>
            <p className="text-body-large text-secondary max-w-3xl mx-auto">
              Every layer of our system is designed with security-first
              principles. From hardware security modules to zero-knowledge
              proofs, your identity is protected at every level.
            </p>
          </div>

          <div className="feature-grid-3d">
            {securityFeatures.map((feature, index) => (
              <motion.div
                key={index}
                className="feature-card-3d neon-glow"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="w-12 h-12 bg-gradient-3d-primary rounded-lg flex items-center justify-center mb-4 floating-3d">
                  {feature.icon}
                </div>
                <h3 className="text-heading-4 text-primary mb-2">
                  {feature.title}
                </h3>
                <p className="text-secondary">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="py-20 bg-primary cyber-grid">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-heading-1 text-primary mb-4">
              Compliance & Certifications
            </h2>
            <p className="text-body-large text-secondary max-w-2xl mx-auto">
              We maintain the highest standards of compliance and undergo
              regular audits to ensure your data is protected according to
              global regulations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {certifications.map((cert, index) => (
              <motion.div
                key={index}
                className="data-viz card-3d text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="w-16 h-16 bg-gradient-3d-primary rounded-full flex items-center justify-center mx-auto mb-4 neon-glow floating-3d">
                  <svg
                    className="w-8 h-8 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-heading-4 text-primary mb-2">
                  {cert.name}
                </h3>
                <p className="text-body-small text-secondary mb-3">
                  {cert.description}
                </p>
                <div className="text-body-small text-accent holographic">
                  {cert.status}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Audit Results */}
      <section className="py-20 bg-secondary particles">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-heading-1 text-primary mb-4">
              Security Audit Results
            </h2>
            <p className="text-body-large text-secondary max-w-2xl mx-auto">
              Independent security audits by leading firms validate our security
              architecture and implementation. Transparency in security through
              public audit reports.
            </p>
          </div>

          <div className="space-y-6">
            {auditResults.map((audit, index) => (
              <motion.div
                key={index}
                className="block-immersive card-3d"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-3d-primary rounded-lg flex items-center justify-center neon-glow floating-3d">
                      <svg
                        className="w-6 h-6 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-heading-4 text-primary">
                        {audit.firm}
                      </h3>
                      <p className="text-body-small text-secondary">
                        {audit.type}
                      </p>
                      <p className="text-caption text-tertiary">
                        {new Date(audit.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-body-small text-secondary mb-1">
                      {audit.findings}
                    </div>
                    <div className="trust-signal">
                      <div className="trust-signal-icon">✓</div>
                      <span className="text-accent font-medium">
                        {audit.status}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-mesh-1 cosmic-bg">
        <div className="container text-center">
          <h2 className="text-heading-1 text-primary mb-4 holographic">
            Ready to Secure Your Digital Identity?
          </h2>
          <p className="text-body-large text-primary mb-8 max-w-2xl mx-auto">
            Join thousands of users who trust Persona for enterprise-grade
            security and privacy protection.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/onboarding" className="btn-web3 btn-lg micro-bounce">
              Get Started Free
            </Link>
            <Link
              to="/contact"
              className="glass-immersive btn-lg px-8 py-4 text-primary font-semibold micro-wiggle"
            >
              Contact Security Team
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
