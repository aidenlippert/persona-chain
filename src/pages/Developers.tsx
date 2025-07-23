import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function Developers() {
  const [activeTab, setActiveTab] = useState("overview");

  const sdkExamples = [
    {
      language: "JavaScript",
      code: `import { Persona } from '@personapass/sdk';

const personaPass = new Persona({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Generate a zero-knowledge proof
const proof = await personaPass.generateProof({
  type: 'age_verification',
  minAge: 18,
  credential: userCredential
});

// Verify the proof
const isValid = await personaPass.verifyProof(proof);`,
    },
    {
      language: "Python",
      code: `from personapass import Persona

client = Persona(
    api_key="your-api-key",
    environment="production"
)

# Generate a zero-knowledge proof
proof = client.generate_proof(
    proof_type="age_verification",
    min_age=18,
    credential=user_credential
)

# Verify the proof
is_valid = client.verify_proof(proof)`,
    },
    {
      language: "React",
      code: `import { usePersona } from '@personapass/react';

function VerificationComponent() {
  const { generateProof, verifyProof } = usePersona();
  
  const handleVerification = async () => {
    const proof = await generateProof({
      type: 'identity_verification',
      credential: userCredential
    });
    
    const result = await verifyProof(proof);
    console.log('Verification result:', result);
  };
  
  return (
    <button onClick={handleVerification}>
      Verify Identity
    </button>
  );
}`,
    },
  ];

  const apiEndpoints = [
    {
      method: "POST",
      endpoint: "/api/v1/proof/generate",
      description: "Generate a zero-knowledge proof",
      request: {
        type: "age_verification",
        credential: "credential_id",
        parameters: { min_age: 18 },
      },
      response: {
        proof: "zk_proof_data",
        proof_id: "proof_12345",
        expires_at: "2024-01-20T10:00:00Z",
      },
    },
    {
      method: "POST",
      endpoint: "/api/v1/proof/verify",
      description: "Verify a zero-knowledge proof",
      request: {
        proof: "zk_proof_data",
        proof_id: "proof_12345",
      },
      response: {
        valid: true,
        verified_at: "2024-01-16T15:30:00Z",
        issuer: "trusted_issuer_id",
      },
    },
    {
      method: "GET",
      endpoint: "/api/v1/credentials",
      description: "List user credentials",
      request: null,
      response: {
        credentials: [
          {
            id: "cred_123",
            type: "government_id",
            issuer: "us_state_dept",
            status: "active",
          },
        ],
      },
    },
  ];

  const integrationGuides = [
    {
      title: "Quick Start Integration",
      description: "Get Persona running in your app in under 5 minutes",
      time: "5 min",
      icon: "🚀",
    },
    {
      title: "React Integration",
      description: "Complete guide for React applications with hooks",
      time: "15 min",
      icon: "⚛️",
    },
    {
      title: "Node.js Backend",
      description: "Server-side integration with Express.js",
      time: "20 min",
      icon: "🟢",
    },
    {
      title: "Mobile SDK",
      description: "Native iOS and Android implementation",
      time: "30 min",
      icon: "📱",
    },
    {
      title: "Enterprise SSO",
      description: "Single sign-on integration for enterprises",
      time: "45 min",
      icon: "🏢",
    },
    {
      title: "Webhook Setup",
      description: "Real-time event notifications",
      time: "10 min",
      icon: "🔔",
    },
  ];

  const features = [
    {
      title: "Zero-Knowledge Proofs",
      description: "Generate and verify proofs without revealing personal data",
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
      title: "W3C Standards",
      description:
        "Full compliance with Verifiable Credentials and DID standards",
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
      title: "Blockchain Integration",
      description: "Ethereum and Polygon network support for DID resolution",
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
      title: "Real-time Webhooks",
      description: "Instant notifications for verification events",
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
            d="M15 17h5l-5 5v-5zM9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-primary">
      {/* Web3 Dev Header */}
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
              <Link
                to="/security"
                className="text-secondary hover:text-primary micro-bounce"
              >
                Security
              </Link>
              <Link to="/developers" className="text-accent holographic">
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

      {/* Matrix Code Hero */}
      <section className="py-20 cosmic-bg cyber-grid particles">
        <div className="container text-center">
          <motion.div
            className="inline-block mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className="trust-signal micro-bounce">
              <div className="trust-signal-icon neon-glow">⚡</div>
              <span className="text-primary text-sm font-medium">
                Production Ready APIs
              </span>
            </div>
          </motion.div>

          <motion.h1
            className="text-display-1 text-primary mb-6 floating-3d"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Built for <span className="holographic">Developers</span>
          </motion.h1>

          <motion.p
            className="text-body-large text-secondary mb-8 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Integrate privacy-preserving identity verification into your
            application with our comprehensive SDK and API. Zero-knowledge
            proofs, W3C standards, and blockchain integration made simple.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Link to="/docs" className="btn-web3 btn-lg micro-bounce">
              View Documentation
            </Link>
            <Link
              to="/api-reference"
              className="glass-immersive btn-lg px-8 py-4 text-primary font-semibold micro-wiggle"
            >
              API Reference
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features for Developers */}
      <section className="py-20 bg-secondary particles">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-heading-1 text-primary mb-4">
              Developer-First Features
            </h2>
            <p className="text-body-large text-secondary max-w-2xl mx-auto">
              Everything you need to integrate privacy-preserving identity
              verification into your application, with just a few lines of code.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="feature-card-3d text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="w-12 h-12 bg-gradient-3d-primary rounded-lg flex items-center justify-center mx-auto mb-4 floating-3d">
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

      {/* Integration Guides */}
      <section className="py-20 bg-primary cyber-grid">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-heading-1 text-primary mb-4">
              Integration Guides
            </h2>
            <p className="text-body-large text-secondary max-w-2xl mx-auto">
              Step-by-step guides to get you up and running quickly, no matter
              what technology stack you're using.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrationGuides.map((guide, index) => (
              <motion.div
                key={index}
                className="block-immersive card-3d"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start space-x-4">
                  <div className="text-2xl floating-3d">{guide.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-heading-4 text-primary mb-2">
                      {guide.title}
                    </h3>
                    <p className="text-secondary mb-3">{guide.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="trust-signal">
                        <div className="trust-signal-icon">⏱️</div>
                        <span className="text-tertiary text-sm">
                          {guide.time}
                        </span>
                      </div>
                      <Link
                        to={`/guides/${guide.title.toLowerCase().replace(/\s+/g, "-")}`}
                        className="glass-immersive px-4 py-2 text-primary font-medium rounded-lg micro-bounce"
                      >
                        Read Guide
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* API Documentation */}
      <section className="py-20 bg-secondary particles">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-heading-1 text-primary mb-4">
              API Documentation
            </h2>
            <p className="text-body-large text-secondary max-w-2xl mx-auto">
              Complete API reference with examples and live testing. RESTful
              endpoints with comprehensive error handling.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="glass-immersive flex space-x-1 rounded-lg p-1">
              {["overview", "endpoints", "sdk"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-md text-body-small font-medium transition-colors micro-bounce ${
                    activeTab === tab
                      ? "bg-gradient-3d-primary text-primary neon-glow"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="block-immersive card-3d">
            {activeTab === "overview" && (
              <div>
                <h3 className="text-heading-3 text-primary mb-6 holographic">
                  API Overview
                </h3>
                <div className="space-y-6">
                  <div className="data-viz card-3d neon-glow">
                    <h4 className="text-heading-4 text-primary mb-3 floating-3d">
                      Base URL
                    </h4>
                    <div className="block-immersive">
                      <code className="text-code holographic">
                        https://api.personapass.com/v1
                      </code>
                    </div>
                  </div>
                  <div className="data-viz card-3d neon-glow">
                    <h4 className="text-heading-4 text-primary mb-3 floating-3d">
                      Authentication
                    </h4>
                    <div className="block-immersive">
                      <code className="text-code holographic">
                        Authorization: Bearer your_api_key
                      </code>
                    </div>
                  </div>
                  <div className="data-viz card-3d neon-glow">
                    <h4 className="text-heading-4 text-primary mb-3 floating-3d">
                      Rate Limits
                    </h4>
                    <div className="trust-signal">
                      <div className="trust-signal-icon">⚡</div>
                      <span className="text-secondary">
                        1000 requests per hour for free tier, 10,000 for pro
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "endpoints" && (
              <div>
                <h3 className="text-heading-3 text-primary mb-6 holographic">
                  API Endpoints
                </h3>
                <div className="space-y-6">
                  {apiEndpoints.map((endpoint, index) => (
                    <div key={index} className="data-viz card-3d neon-glow">
                      <div className="flex items-center space-x-4 mb-4">
                        <span
                          className={`px-3 py-1 rounded-lg text-body-small font-medium floating-3d ${
                            endpoint.method === "GET"
                              ? "bg-gradient-3d-accent text-primary"
                              : "bg-gradient-3d-primary text-primary"
                          }`}
                        >
                          {endpoint.method}
                        </span>
                        <code className="text-code holographic">
                          {endpoint.endpoint}
                        </code>
                      </div>
                      <p className="text-secondary mb-4">
                        {endpoint.description}
                      </p>

                      {endpoint.request && (
                        <div className="mb-4">
                          <h5 className="text-body text-primary font-medium mb-2 floating-3d">
                            Request
                          </h5>
                          <div className="block-immersive">
                            <pre className="text-caption overflow-x-auto holographic">
                              <code>
                                {JSON.stringify(endpoint.request, null, 2)}
                              </code>
                            </pre>
                          </div>
                        </div>
                      )}

                      <div>
                        <h5 className="text-body text-primary font-medium mb-2 floating-3d">
                          Response
                        </h5>
                        <div className="block-immersive">
                          <pre className="text-caption overflow-x-auto holographic">
                            <code>
                              {JSON.stringify(endpoint.response, null, 2)}
                            </code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "sdk" && (
              <div>
                <h3 className="text-heading-3 text-primary mb-6 holographic">
                  SDK Examples
                </h3>
                <div className="space-y-8">
                  {sdkExamples.map((example, index) => (
                    <div key={index} className="data-viz card-3d neon-glow">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 bg-gradient-3d-primary rounded-lg flex items-center justify-center floating-3d">
                          <span className="text-primary text-sm font-bold">
                            {example.language.charAt(0)}
                          </span>
                        </div>
                        <h4 className="text-heading-4 text-primary holographic">
                          {example.language}
                        </h4>
                      </div>
                      <div className="block-immersive">
                        <pre className="overflow-x-auto text-caption holographic">
                          <code>{example.code}</code>
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Web3 CTA */}
      <section className="py-20 cosmic-bg particles">
        <div className="container text-center">
          <motion.div
            className="inline-block mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="trust-signal micro-bounce">
              <div className="trust-signal-icon neon-glow">🚀</div>
              <span className="text-primary text-sm font-medium">
                Ship faster with Persona
              </span>
            </div>
          </motion.div>

          <h2 className="text-heading-1 text-primary mb-4 holographic floating-3d">
            Ready to Start Building?
          </h2>
          <p className="text-body-large text-primary mb-8 max-w-2xl mx-auto">
            Get your API key and start integrating privacy-preserving identity
            verification into your application today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/onboarding" className="btn-web3 btn-lg micro-bounce">
              Get API Key
            </Link>
            <Link
              to="/contact"
              className="glass-immersive btn-lg px-8 py-4 text-primary font-semibold micro-wiggle"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
