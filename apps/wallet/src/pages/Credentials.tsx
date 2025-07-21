import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

// Icon components (inline SVGs)
const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4v16m8-8H4"
    />
  </svg>
);

const EyeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const ShareIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
    />
  </svg>
);

const QrCodeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
    />
  </svg>
);

const FilterIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
    />
  </svg>
);

const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

interface Credential {
  id: string;
  type: string;
  issuer: string;
  issuedDate: string;
  expiryDate?: string;
  status: "active" | "expired" | "revoked" | "pending";
  verified: boolean;
  category:
    | "identity"
    | "education"
    | "professional"
    | "government"
    | "health"
    | "financial";
  description?: string;
  metadata?: {
    privacy_level: "minimal" | "selective" | "zero_knowledge";
    usage_count: number;
    last_used?: string;
  };
}

interface CredentialConnector {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  status: "available" | "connected" | "setup_required";
  verificationTypes: string[];
}

export default function Credentials() {
  const [activeTab, setActiveTab] = useState<
    | "all"
    | "identity"
    | "education"
    | "professional"
    | "government"
    | "health"
    | "financial"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const credentials: Credential[] = [
    {
      id: "1",
      type: "Government ID",
      issuer: "US Department of State",
      issuedDate: "2024-01-15",
      expiryDate: "2034-01-15",
      status: "active",
      verified: true,
      category: "government",
      description: "Official government-issued identification document",
      metadata: {
        privacy_level: "selective",
        usage_count: 15,
        last_used: "2024-01-16T10:30:00Z",
      },
    },
    {
      id: "2",
      type: "Professional License",
      issuer: "California Bar Association",
      issuedDate: "2023-12-08",
      expiryDate: "2026-12-08",
      status: "active",
      verified: true,
      category: "professional",
      description: "Licensed attorney in the state of California",
      metadata: {
        privacy_level: "minimal",
        usage_count: 8,
        last_used: "2024-01-14T14:20:00Z",
      },
    },
    {
      id: "3",
      type: "Educational Credential",
      issuer: "Stanford University",
      issuedDate: "2023-05-20",
      status: "active",
      verified: true,
      category: "education",
      description: "Master of Computer Science",
      metadata: {
        privacy_level: "zero_knowledge",
        usage_count: 3,
        last_used: "2024-01-10T09:15:00Z",
      },
    },
    {
      id: "4",
      type: "Health Insurance",
      issuer: "Blue Cross Blue Shield",
      issuedDate: "2024-01-01",
      expiryDate: "2024-12-31",
      status: "active",
      verified: true,
      category: "health",
      description: "Health insurance verification",
      metadata: {
        privacy_level: "selective",
        usage_count: 2,
        last_used: "2024-01-12T11:45:00Z",
      },
    },
    {
      id: "5",
      type: "Bank Account Verification",
      issuer: "Chase Bank",
      issuedDate: "2023-11-15",
      status: "active",
      verified: true,
      category: "financial",
      description: "Bank account ownership verification",
      metadata: {
        privacy_level: "zero_knowledge",
        usage_count: 7,
        last_used: "2024-01-15T16:20:00Z",
      },
    },
  ];

  const connectors: CredentialConnector[] = [
    {
      id: "github",
      name: "GitHub",
      description: "Verify your GitHub profile and contributions",
      icon: "🐙",
      category: "professional",
      status: "available",
      verificationTypes: [
        "Developer Profile",
        "Repository Ownership",
        "Contribution History",
      ],
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      description: "Professional profile and work experience verification",
      icon: "💼",
      category: "professional",
      status: "connected",
      verificationTypes: [
        "Professional Profile",
        "Work Experience",
        "Skills Endorsements",
      ],
    },
    {
      id: "university",
      name: "University Portal",
      description: "Connect to university systems for degree verification",
      icon: "🎓",
      category: "education",
      status: "setup_required",
      verificationTypes: [
        "Degree Verification",
        "Academic Transcripts",
        "Enrollment Status",
      ],
    },
    {
      id: "government",
      name: "Government ID",
      description: "Government-issued identification verification",
      icon: "🏛️",
      category: "government",
      status: "available",
      verificationTypes: ["Driver License", "Passport", "National ID"],
    },
    {
      id: "healthcare",
      name: "Healthcare Provider",
      description: "Medical credentials and insurance verification",
      icon: "⚕️",
      category: "health",
      status: "available",
      verificationTypes: [
        "Medical License",
        "Insurance Coverage",
        "Health Records",
      ],
    },
    {
      id: "financial",
      name: "Financial Institution",
      description: "Bank account and financial status verification",
      icon: "🏦",
      category: "financial",
      status: "available",
      verificationTypes: [
        "Bank Account",
        "Credit Score",
        "Income Verification",
      ],
    },
  ];

  const filteredCredentials = credentials.filter((credential) => {
    const matchesTab = activeTab === "all" || credential.category === activeTab;
    const matchesSearch =
      !searchQuery ||
      credential.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      credential.issuer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-500";
      case "expired":
        return "text-yellow-500";
      case "revoked":
        return "text-red-500";
      case "pending":
        return "text-blue-500";
      default:
        return "text-gray-500";
    }
  };

  const getPrivacyLevelColor = (level: string) => {
    switch (level) {
      case "minimal":
        return "bg-green-100 text-green-800";
      case "selective":
        return "bg-blue-100 text-blue-800";
      case "zero_knowledge":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "identity":
        return "👤";
      case "education":
        return "🎓";
      case "professional":
        return "💼";
      case "government":
        return "🏛️";
      case "health":
        return "⚕️";
      case "financial":
        return "🏦";
      default:
        return "📄";
    }
  };

  const handleAddCredential = () => {
    // TODO: Implement add credential modal
    console.log("Add credential clicked");
  };

  const handleUseCredential = (credentialId: string) => {
    console.log("Using credential:", credentialId);
    // Implement credential usage logic
  };

  const handleShareCredential = (credentialId: string) => {
    console.log("Sharing credential:", credentialId);
    // Implement credential sharing logic
  };

  const handleConnectService = (connectorId: string) => {
    console.log("Connecting service:", connectorId);
    setLoading(true);
    // Simulate connection process
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

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
                to="/dashboard"
                className="text-secondary hover:text-primary micro-bounce"
              >
                Dashboard
              </Link>
              <Link to="/credentials" className="text-accent holographic">
                Credentials
              </Link>
              <Link
                to="/activity"
                className="text-secondary hover:text-primary micro-bounce"
              >
                Activity
              </Link>
              <Link
                to="/settings"
                className="text-secondary hover:text-primary micro-bounce"
              >
                Settings
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <div className="trust-signal">
                <div className="trust-signal-icon">🟢</div>
                <span className="text-accent text-sm">Secure</span>
              </div>
              <div className="w-8 h-8 bg-gradient-3d-primary rounded-full flex items-center justify-center neon-glow floating-3d">
                <span className="text-primary font-bold text-sm">U</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="cosmic-bg particles">
        <div className="container py-8">
          {/* Header Section */}
          <div className="mb-8">
            <motion.div
              className="inline-block mb-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
            >
              <div className="trust-signal micro-bounce">
                <div className="trust-signal-icon neon-glow">🎫</div>
                <span className="text-primary text-sm font-medium">
                  Identity Vault
                </span>
              </div>
            </motion.div>

            <h1 className="text-heading-1 text-primary mb-2 floating-3d">
              Your <span className="holographic">Credentials</span>
            </h1>
            <p className="text-body-large text-secondary mb-6">
              Manage your verified credentials and connect new identity
              providers.
            </p>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="data-viz card-3d neon-glow">
                <div className="text-heading-3 text-primary mb-2 holographic floating-3d">
                  {credentials.length}
                </div>
                <div className="text-body text-secondary mb-1">
                  Total Credentials
                </div>
                <div className="trust-signal">
                  <div className="trust-signal-icon">✅</div>
                  <span className="text-accent text-body-small">
                    All Verified
                  </span>
                </div>
              </div>
              <div className="data-viz card-3d neon-glow">
                <div className="text-heading-3 text-primary mb-2 holographic floating-3d">
                  {
                    credentials.filter((c) => c.metadata?.usage_count || 0 > 0)
                      .length
                  }
                </div>
                <div className="text-body text-secondary mb-1">
                  Recently Used
                </div>
                <div className="trust-signal">
                  <div className="trust-signal-icon">📊</div>
                  <span className="text-accent text-body-small">
                    This Month
                  </span>
                </div>
              </div>
              <div className="data-viz card-3d neon-glow">
                <div className="text-heading-3 text-primary mb-2 holographic floating-3d">
                  {
                    credentials.filter(
                      (c) => c.metadata?.privacy_level === "zero_knowledge",
                    ).length
                  }
                </div>
                <div className="text-body text-secondary mb-1">
                  Zero-Knowledge
                </div>
                <div className="trust-signal">
                  <div className="trust-signal-icon">🔐</div>
                  <span className="text-accent text-body-small">
                    Max Privacy
                  </span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex gap-3">
                <button
                  onClick={handleAddCredential}
                  className="btn-web3 micro-bounce"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Add Credential
                </button>
                <button className="glass-immersive px-4 py-2 text-primary font-medium rounded-lg micro-wiggle">
                  <QrCodeIcon className="w-5 h-5 mr-2" />
                  Scan QR
                </button>
              </div>

              <div className="flex gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search credentials..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="glass-immersive pl-10 pr-4 py-2 rounded-lg text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <SearchIcon className="w-5 h-5 text-secondary absolute left-3 top-2.5" />
                </div>
                <button className="glass-immersive px-4 py-2 text-primary rounded-lg micro-bounce">
                  <FilterIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="mb-8">
            <div className="glass-immersive flex flex-wrap gap-2 rounded-lg p-1">
              {(
                [
                  "all",
                  "identity",
                  "education",
                  "professional",
                  "government",
                  "health",
                  "financial",
                ] as const
              ).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-md text-body-small font-medium transition-all micro-bounce ${
                    activeTab === tab
                      ? "bg-gradient-3d-primary text-primary neon-glow"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  {tab === "all"
                    ? "🌟 All"
                    : `${getCategoryIcon(tab)} ${tab.charAt(0).toUpperCase() + tab.slice(1)}`}
                </button>
              ))}
            </div>
          </div>

          {/* Credentials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {filteredCredentials.map((credential, index) => (
              <motion.div
                key={credential.id}
                className="feature-card-3d neon-glow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-3d-primary rounded-lg flex items-center justify-center floating-3d">
                    <span className="text-2xl">
                      {getCategoryIcon(credential.category)}
                    </span>
                  </div>
                  <div className="trust-signal">
                    <div className="trust-signal-icon">
                      {credential.verified ? "✓" : "⏳"}
                    </div>
                    <span
                      className={`text-body-small ${getStatusColor(credential.status)}`}
                    >
                      {credential.status}
                    </span>
                  </div>
                </div>

                <h3 className="text-heading-4 text-primary mb-2 holographic">
                  {credential.type}
                </h3>
                <p className="text-body-small text-secondary mb-2">
                  {credential.issuer}
                </p>
                <p className="text-caption text-tertiary mb-4">
                  Issued: {new Date(credential.issuedDate).toLocaleDateString()}
                  {credential.expiryDate && (
                    <span className="block">
                      Expires:{" "}
                      {new Date(credential.expiryDate).toLocaleDateString()}
                    </span>
                  )}
                </p>

                {credential.metadata && (
                  <div className="mb-4">
                    <div
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPrivacyLevelColor(
                        credential.metadata.privacy_level,
                      )}`}
                    >
                      {credential.metadata.privacy_level.replace("_", " ")}
                    </div>
                    <div className="text-caption text-tertiary mt-1">
                      Used {credential.metadata.usage_count} times
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleUseCredential(credential.id)}
                    className="flex-1 glass-immersive px-3 py-2 text-primary font-medium rounded-lg micro-bounce"
                  >
                    <EyeIcon className="w-4 h-4 mr-1" />
                    Use
                  </button>
                  <button
                    onClick={() => handleShareCredential(credential.id)}
                    className="flex-1 glass-immersive px-3 py-2 text-primary font-medium rounded-lg micro-wiggle"
                  >
                    <ShareIcon className="w-4 h-4 mr-1" />
                    Share
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Available Connectors */}
          <div className="mb-8">
            <div className="text-center mb-8">
              <h2 className="text-heading-2 text-primary mb-4 floating-3d">
                Connect More <span className="holographic">Services</span>
              </h2>
              <p className="text-body-large text-secondary max-w-2xl mx-auto">
                Add new credentials by connecting to trusted identity providers
                and verification services.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {connectors.map((connector, index) => (
                <motion.div
                  key={connector.id}
                  className="data-viz card-3d neon-glow"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-3d-primary rounded-lg flex items-center justify-center floating-3d">
                      <span className="text-2xl">{connector.icon}</span>
                    </div>
                    <div className="trust-signal">
                      <div className="trust-signal-icon">
                        {connector.status === "connected"
                          ? "✅"
                          : connector.status === "setup_required"
                            ? "⚙️"
                            : "🔗"}
                      </div>
                      <span className="text-accent text-body-small">
                        {connector.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-heading-4 text-primary mb-2 holographic">
                    {connector.name}
                  </h3>
                  <p className="text-body-small text-secondary mb-4">
                    {connector.description}
                  </p>

                  <div className="mb-4">
                    <div className="text-caption text-tertiary mb-2">
                      Verification Types:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {connector.verificationTypes.map((type, typeIndex) => (
                        <span
                          key={typeIndex}
                          className="px-2 py-1 bg-gradient-3d-primary text-primary text-xs rounded-full"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleConnectService(connector.id)}
                    disabled={loading || connector.status === "connected"}
                    className={`w-full font-medium rounded-lg micro-bounce ${
                      connector.status === "connected"
                        ? "glass-immersive px-4 py-2 text-accent"
                        : "btn-web3 py-3"
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                        Connecting...
                      </span>
                    ) : connector.status === "connected" ? (
                      "Connected"
                    ) : (
                      "Connect"
                    )}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
