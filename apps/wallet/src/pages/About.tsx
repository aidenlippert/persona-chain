import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function About() {
  const team = [
    {
      name: "Alex Chen",
      role: "CEO & Co-Founder",
      bio: "Former Stanford researcher in zero-knowledge cryptography. Led privacy initiatives at major tech companies.",
      image: "AC",
    },
    {
      name: "Dr. Sarah Rodriguez",
      role: "CTO & Co-Founder",
      bio: "PhD in Cryptography from MIT. Former principal engineer at blockchain security firms.",
      image: "SR",
    },
    {
      name: "Michael Thompson",
      role: "Head of Security",
      bio: "15+ years in cybersecurity. Former security architect at Fortune 500 companies.",
      image: "MT",
    },
    {
      name: "Jennifer Park",
      role: "Head of Product",
      bio: "Product leader with expertise in privacy-focused consumer applications.",
      image: "JP",
    },
  ];

  const values = [
    {
      title: "Privacy by Design",
      description:
        "Privacy isn't an afterthought—it's built into every line of code we write. We never see or store your personal information.",
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
      title: "User Control",
      description:
        "You own your identity. You decide what to share, when to share it, and with whom. Complete control, always.",
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
      title: "Security First",
      description:
        "Military-grade encryption, hardware security modules, and continuous monitoring protect your digital identity.",
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
      title: "Open Standards",
      description:
        "Built on W3C standards and open protocols. No vendor lock-in, just interoperable identity solutions.",
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
    },
  ];

  const timeline = [
    {
      year: "2022",
      title: "Foundation",
      description:
        "Persona founded with vision of privacy-preserving digital identity",
    },
    {
      year: "2023",
      title: "Technology Development",
      description:
        "Core zero-knowledge proof system and HSM integration developed",
    },
    {
      year: "2024",
      title: "Security Audits",
      description:
        "Comprehensive security audits by leading firms, SOC 2 certification",
    },
    {
      year: "2024",
      title: "Public Launch",
      description:
        "Full platform launch with enterprise partnerships and developer tools",
    },
  ];

  const stats = [
    { number: "2.3M", label: "Identities Protected" },
    { number: "500+", label: "Enterprise Partners" },
    { number: "99.9%", label: "Uptime Achieved" },
    { number: "15ms", label: "Avg Response Time" },
  ];

  return (
    <div className="min-h-screen bg-primary">
      {/* Web3 Header */}
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
              <Link
                to="/developers"
                className="text-secondary hover:text-primary micro-bounce"
              >
                Developers
              </Link>
              <Link to="/about" className="text-accent holographic">
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

      {/* Hero Section */}
      <section className="py-20 cosmic-bg particles">
        <div className="container text-center">
          <motion.h1
            className="text-display-1 text-primary mb-6 floating-3d"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Building the Future of{" "}
            <span className="holographic">Digital Identity</span>
          </motion.h1>

          <motion.p
            className="text-body-large text-secondary mb-8 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            We're on a mission to give everyone control over their digital
            identity. Privacy-preserving, secure, and user-owned identity
            solutions for the modern world.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Link to="/onboarding" className="btn btn-primary btn-lg">
              Join Our Mission
            </Link>
            <Link to="/careers" className="btn btn-secondary btn-lg">
              View Open Positions
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-gradient-mesh-2">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="data-viz card-3d text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="text-heading-1 text-primary mb-2 neon-glow">
                  {stat.number}
                </div>
                <div className="text-body text-secondary">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 bg-secondary particles">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-heading-1 text-primary mb-4">Our Values</h2>
            <p className="text-body-large text-secondary max-w-2xl mx-auto">
              These principles guide everything we do—from the code we write to
              the partnerships we form.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                className="feature-card-3d"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-3d-primary rounded-lg flex items-center justify-center flex-shrink-0 floating-3d">
                    {value.icon}
                  </div>
                  <div>
                    <h3 className="text-heading-4 text-primary mb-2">
                      {value.title}
                    </h3>
                    <p className="text-secondary">{value.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-primary cyber-grid">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-heading-1 text-primary mb-4">Our Journey</h2>
            <p className="text-body-large text-secondary max-w-2xl mx-auto">
              From concept to launch—the key milestones in building the future
              of digital identity.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {timeline.map((item, index) => (
                <motion.div
                  key={index}
                  className="flex items-start space-x-6"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="flex-shrink-0 w-16 h-16 bg-gradient-3d-primary rounded-full flex items-center justify-center neon-glow floating-3d">
                    <span className="text-primary font-bold">{item.year}</span>
                  </div>
                  <div className="flex-1 block-immersive">
                    <h3 className="text-heading-4 text-primary mb-2">
                      {item.title}
                    </h3>
                    <p className="text-secondary">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-secondary particles">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-heading-1 text-primary mb-4">Meet Our Team</h2>
            <p className="text-body-large text-secondary max-w-2xl mx-auto">
              World-class experts in cryptography, security, and privacy
              technology, united by a common mission to protect digital
              identity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <motion.div
                key={index}
                className="feature-card-3d text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="w-20 h-20 bg-gradient-3d-primary rounded-full flex items-center justify-center mx-auto mb-4 neon-glow floating-3d">
                  <span className="text-primary font-bold text-xl">
                    {member.image}
                  </span>
                </div>
                <h3 className="text-heading-4 text-primary mb-1">
                  {member.name}
                </h3>
                <p className="text-body-small text-accent mb-3 holographic">
                  {member.role}
                </p>
                <p className="text-secondary text-body-small">{member.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-20 bg-primary cosmic-bg">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h2
              className="text-heading-1 text-primary mb-6 floating-3d"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              Our Mission
            </motion.h2>

            <motion.div
              className="block-immersive card-3d"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <blockquote className="text-body-large text-secondary italic">
                "To create a world where everyone has complete control over
                their digital identity— where privacy is preserved, security is
                guaranteed, and individuals decide how their personal
                information is shared. We believe that digital identity should
                be user-owned, privacy-preserving, and universally accessible."
              </blockquote>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-mesh-1 particles">
        <div className="container text-center">
          <h2 className="text-heading-1 text-primary mb-4 holographic">
            Join the Identity Revolution
          </h2>
          <p className="text-body-large text-primary mb-8 max-w-2xl mx-auto">
            Be part of the future of digital identity. Whether you're a
            developer, enterprise, or individual user—we're building this for
            you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/onboarding" className="btn-web3 btn-lg micro-bounce">
              Get Started Today
            </Link>
            <Link
              to="/contact"
              className="glass-immersive btn-lg px-8 py-4 text-primary font-semibold micro-wiggle"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
