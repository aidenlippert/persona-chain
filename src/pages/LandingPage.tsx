import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface StatProps {
  number: string;
  label: string;
  sublabel?: string;
}

const Stat = ({ number, label, sublabel }: StatProps) => (
  <div className="text-center">
    <div className="text-heading-1 text-primary mb-2">{number}</div>
    <div className="text-body text-secondary">{label}</div>
    {sublabel && (
      <div className="text-caption text-tertiary mt-1">{sublabel}</div>
    )}
  </div>
);

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: boolean;
}

const Feature = ({
  icon,
  title,
  description,
  highlight = false,
}: FeatureProps) => (
  <motion.div
    className={`card ${highlight ? "card-elevated" : ""}`}
    whileHover={{ y: -5 }}
    transition={{ type: "spring", stiffness: 300 }}
  >
    <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
      {icon}
    </div>
    <h3 className="text-heading-4 text-primary mb-2">{title}</h3>
    <p className="text-secondary">{description}</p>
  </motion.div>
);

const TrustIndicator = ({
  company,
  logo,
  testimonial,
}: {
  company: string;
  logo: string;
  testimonial: string;
}) => (
  <div className="card">
    <div className="flex items-center mb-4">
      <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center">
        <span className="text-body-small text-accent">{logo}</span>
      </div>
      <span className="ml-3 text-primary font-medium">{company}</span>
    </div>
    <p className="text-secondary text-body-small italic">"{testimonial}"</p>
  </div>
);

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("privacy");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
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
      title: "Zero-Knowledge Proofs",
      description:
        "Prove your identity without revealing personal data. Our ZK-SNARK implementation ensures maximum privacy while maintaining verification integrity.",
      highlight: true,
    },
    {
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
      title: "HSM-Secured Keys",
      description:
        "Hardware Security Module protection for your private keys. Google Cloud HSM integration provides enterprise-grade security infrastructure.",
      highlight: true,
    },
    {
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
      title: "Biometric Authentication",
      description:
        "WebAuthn integration with fingerprint, face ID, and secure enclave. Passwordless authentication that's both secure and convenient.",
    },
    {
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
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
      ),
      title: "Universal Compatibility",
      description:
        "W3C standards compliance ensures compatibility across all platforms. OpenID4VP/VCI support for seamless integration.",
    },
    {
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
            d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
          />
        </svg>
      ),
      title: "Blockchain Verification",
      description:
        "Ethereum and Polygon network integration for decentralized identity verification. Immutable proof of identity without centralized control.",
    },
    {
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
            d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m4 0H5a1 1 0 00-1 1v2a1 1 0 001 1h14a1 1 0 001-1V5a1 1 0 00-1-1z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8M9 12h6"
          />
        </svg>
      ),
      title: "Enterprise Ready",
      description:
        "GDPR compliant, SOC2 audited, and production-ready. Comprehensive monitoring and 99.9% uptime guarantee.",
    },
  ];

  const privacyLevels = [
    {
      name: "Minimal",
      description: "Essential verification with basic privacy",
      features: ["Identity type", "Issuer verification", "Expiration status"],
      color: "bg-secondary",
    },
    {
      name: "Selective",
      description: "Choose exactly what to share",
      features: [
        "Custom field selection",
        "Granular permissions",
        "Audit trail",
      ],
      color: "bg-secondary",
    },
    {
      name: "Zero-Knowledge",
      description: "Prove without revealing",
      features: [
        "Mathematical proofs only",
        "Complete privacy",
        "Cryptographic verification",
      ],
      color: "bg-secondary",
    },
  ];

  const stats = [
    { number: "Open", label: "Source", sublabel: "Fully transparent" },
    { number: "Zero", label: "Knowledge", sublabel: "Privacy preserving" },
    { number: "W3C", label: "Standard", sublabel: "Interoperable" },
    { number: "Secure", label: "by Design", sublabel: "HSM protected" },
  ];

  const trustIndicators = [
    {
      company: "W3C Standards",
      logo: "W3",
      testimonial:
        "Built on open standards for maximum interoperability and trust.",
    },
    {
      company: "Zero-Knowledge Proofs",
      logo: "ZK",
      testimonial:
        "Prove your identity without revealing personal information.",
    },
    {
      company: "Blockchain Verified",
      logo: "BC",
      testimonial:
        "Decentralized identity with cryptographic security guarantees.",
    },
  ];

  return (
    <div className="min-h-screen bg-primary">
      {/* Web3 Navigation */}
      <nav className="fixed top-0 left-0 right-0 glass-immersive z-50 border-b-0">
        <div className="container">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                  <span className="text-primary font-bold text-lg">P</span>
                </div>
                <span className="ml-3 text-heading-4 text-primary font-bold">
                  Persona
                </span>
              </div>
            </div>

            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <Link
                  to="/features"
                  className="text-secondary hover:text-primary px-4 py-2 text-body-small font-medium transition-all duration-200 hover:bg-surface rounded-lg micro-bounce"
                >
                  Features
                </Link>
                <Link
                  to="/security"
                  className="text-secondary hover:text-primary px-4 py-2 text-body-small font-medium transition-all duration-200 hover:bg-surface rounded-lg micro-bounce"
                >
                  Security
                </Link>
                <Link
                  to="/developers"
                  className="text-secondary hover:text-primary px-4 py-2 text-body-small font-medium transition-all duration-200 hover:bg-surface rounded-lg micro-bounce"
                >
                  Developers
                </Link>
                <Link
                  to="/about"
                  className="text-secondary hover:text-primary px-4 py-2 text-body-small font-medium transition-all duration-200 hover:bg-surface rounded-lg micro-bounce"
                >
                  About
                </Link>
                <Link
                  to="/contact"
                  className="text-secondary hover:text-primary px-4 py-2 text-body-small font-medium transition-all duration-200 hover:bg-surface rounded-lg micro-bounce"
                >
                  Contact
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="glass-immersive px-4 py-2 text-primary font-medium rounded-lg micro-wiggle"
              >
                Sign In
              </Link>
              <Link to="/onboarding" className="btn-web3 micro-bounce">
                Get Started
                <svg
                  className="ml-2 w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Immersive Web3 Hero Section */}
      <section className="pt-32 pb-20 cosmic-bg particles cyber-grid">
        <div className="container relative z-10">
          <div className="text-center">
            <motion.div
              className="inline-block mb-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: isVisible ? 1 : 0,
                scale: isVisible ? 1 : 0.8,
              }}
              transition={{ duration: 0.8 }}
            >
              <div className="trust-signal micro-bounce">
                <div className="trust-signal-icon neon-glow">⚡</div>
                <span className="text-primary text-sm font-medium">
                  Self-Sovereign • Privacy First
                </span>
              </div>
            </motion.div>

            <motion.h1
              className="text-display-1 text-primary mb-6 leading-tight floating-3d"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Your Identity, <span className="holographic">Your Control</span>
            </motion.h1>

            <motion.p
              className="text-xl text-secondary mb-8 max-w-4xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              The world's most advanced privacy-preserving identity wallet.
              Prove who you are without revealing who you are. Built with
              zero-knowledge proofs, hardware security modules, and blockchain
              verification.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Link
                to="/onboarding"
                className="btn-web3 btn-lg px-8 py-4 text-lg font-semibold micro-bounce"
              >
                Start Your Journey
                <svg
                  className="ml-2 w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
              <button className="glass-immersive btn-lg px-8 py-4 text-lg font-semibold text-primary micro-wiggle">
                <svg
                  className="mr-2 w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Watch Demo
              </button>
            </motion.div>

            <motion.div
              className="flex flex-col sm:flex-row gap-8 justify-center items-center text-sm"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <div className="trust-signal">
                <div className="trust-signal-icon">✓</div>
                <span className="text-primary">Free forever</span>
              </div>
              <div className="trust-signal">
                <div className="trust-signal-icon">🚀</div>
                <span className="text-primary">No credit card required</span>
              </div>
              <div className="trust-signal">
                <div className="trust-signal-icon">🛡️</div>
                <span className="text-primary">Enterprise-grade security</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Immersive Stats Section */}
      <section className="py-20 bg-secondary">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="data-viz card-3d reveal-scale"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="stats-counter text-4xl md:text-5xl font-bold text-primary mb-2 neon-glow">
                  {stat.number}
                </div>
                <div className="text-lg text-secondary font-medium">
                  {stat.label}
                </div>
                {stat.sublabel && (
                  <div className="text-sm text-tertiary mt-1">
                    {stat.sublabel}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Web3 Features Section */}
      <section className="py-24 bg-secondary particles">
        <div className="container">
          <div className="text-center mb-20">
            <motion.div
              className="inline-block mb-4"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="trust-signal">
                <div className="trust-signal-icon">🔐</div>
                <span className="text-primary">Enterprise-grade security</span>
              </div>
            </motion.div>

            <motion.h2
              className="text-heading-1 text-primary mb-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Privacy Technology That{" "}
              <span className="holographic">Just Works</span>
            </motion.h2>

            <motion.p
              className="text-xl text-secondary max-w-4xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
            >
              Built on cutting-edge cryptography and blockchain technology,
              Persona delivers the security and privacy your digital identity
              deserves.
            </motion.p>
          </div>

          <div className="feature-grid-3d">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className={`feature-card-3d ${feature.highlight ? "neon-glow" : ""}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-heading-4 text-primary mb-4 font-semibold">
                  {feature.title}
                </h3>
                <p className="text-secondary leading-relaxed">
                  {feature.description}
                </p>

                {feature.highlight && (
                  <div className="mt-6 pt-6 border-t border-primary/20">
                    <div className="trust-signal">
                      <div className="trust-signal-icon">⚡</div>
                      <span className="text-accent font-medium">
                        Premium feature
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy Levels Section */}
      <section className="py-20 bg-primary cyber-grid">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-heading-1 text-primary mb-4">
              Three Levels of Privacy Protection
            </h2>
            <p className="text-body-large text-secondary max-w-3xl mx-auto">
              Choose the right level of privacy for each interaction. From basic
              verification to complete zero-knowledge proofs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {privacyLevels.map((level, index) => (
              <motion.div
                key={index}
                className={`block-immersive card-3d ${level.color}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <h3 className="text-heading-3 text-primary mb-2">
                  {level.name}
                </h3>
                <p className="mb-6 text-primary opacity-80">
                  {level.description}
                </p>
                <ul className="space-y-3">
                  {level.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <svg
                        className="w-5 h-5 mr-3 text-primary opacity-70"
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
                      <span className="text-body-small text-primary">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-20 bg-secondary">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-heading-1 text-primary mb-4">
              Trusted by Industry Leaders
            </h2>
            <p className="text-body-large text-secondary max-w-3xl mx-auto">
              Built on open standards and cutting-edge cryptography for maximum
              trust.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {trustIndicators.map((trust, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <TrustIndicator {...trust} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Immersive Web3 CTA Section */}
      <section className="py-24 cosmic-bg particles">
        <div className="container text-center relative z-10">
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
                Decentralized • Open Source
              </span>
            </div>
          </motion.div>

          <motion.h2
            className="text-heading-1 text-primary mb-6"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Ready to Take Control of{" "}
            <span className="holographic">Your Identity?</span>
          </motion.h2>

          <motion.p
            className="text-xl text-secondary mb-12 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            Create your decentralized identity with zero-knowledge proofs and
            blockchain verification. Take control of your digital identity
            today.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-6 justify-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
          >
            <Link
              to="/onboarding"
              className="btn-web3 btn-lg px-8 py-4 text-lg font-semibold micro-bounce"
            >
              Get Started Free
              <svg
                className="ml-2 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
            <Link
              to="/contact"
              className="glass-immersive btn-lg px-8 py-4 text-lg font-semibold text-primary micro-wiggle"
            >
              Contact Sales
              <svg
                className="ml-2 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </Link>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="data-viz card-3d text-center">
              <div className="text-2xl font-bold text-primary mb-2 neon-glow">
                5 min
              </div>
              <div className="text-secondary">Setup time</div>
            </div>
            <div className="data-viz card-3d text-center">
              <div className="text-2xl font-bold text-primary mb-2 neon-glow">
                99.9%
              </div>
              <div className="text-secondary">Uptime SLA</div>
            </div>
            <div className="data-viz card-3d text-center">
              <div className="text-2xl font-bold text-primary mb-2 neon-glow">
                24/7
              </div>
              <div className="text-secondary">Support</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary border-t border-primary py-16">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">P</span>
                </div>
                <span className="ml-2 text-heading-4 text-primary">
                  Persona
                </span>
              </div>
              <p className="text-secondary">
                The future of digital identity. Secure, private, and verifiable.
              </p>
            </div>

            <div>
              <h4 className="text-primary font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-secondary">
                <li>
                  <Link to="/features" className="hover:text-primary">
                    Features
                  </Link>
                </li>
                <li>
                  <Link to="/security" className="hover:text-primary">
                    Security
                  </Link>
                </li>
                <li>
                  <Link to="/developers" className="hover:text-primary">
                    Developers
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="hover:text-primary">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-primary font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-secondary">
                <li>
                  <Link to="/about" className="hover:text-primary">
                    About
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-primary">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link to="/careers" className="hover:text-primary">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="hover:text-primary">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-primary font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-secondary">
                <li>
                  <Link to="/privacy" className="hover:text-primary">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-primary">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/security-policy" className="hover:text-primary">
                    Security Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-primary mt-12 pt-8 text-center text-tertiary">
            <p>
              &copy; 2024 Persona. All rights reserved. Built with privacy by
              design.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
