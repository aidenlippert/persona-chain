/**
 * Share View - Simple QR Code Generation & Scanning
 * Clean interface for sharing credentials via QR codes
 */

import React, { useState } from "react";
import { QrCodeIcon, CameraIcon, ShareIcon } from "@heroicons/react/24/outline";
import { PersonaWallet } from "../../services/personaChainService";

interface ShareViewProps {
  wallet: PersonaWallet | null;
}

export const ShareView: React.FC<ShareViewProps> = ({ wallet: _wallet }) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<string>("");

  const mockCredentials = [
    { id: "drivers-license", name: "Driver's License", issuer: "DMV" },
    {
      id: "university-degree",
      name: "University Degree",
      issuer: "State University",
    },
    { id: "age-verification", name: "Age Verification", issuer: "Government" },
  ];

  const generateQRCode = async () => {
    if (!selectedCredential) return;

    setIsGenerating(true);

    // Simulate QR code generation
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock QR code data (in real app, this would be actual QR data)
    const mockQRData = `https://verify.personapass.id/present?credential=${selectedCredential}&session=${Math.random().toString(36).substring(2, 15)}`;
    setQrCode(mockQRData);
    setIsGenerating(false);
  };

  const resetQRCode = () => {
    setQrCode(null);
    setSelectedCredential("");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">
          Share Credentials
        </h1>
        <p className="text-white/70 text-lg">
          Generate secure QR codes to share your verifiable credentials
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto">
        {!qrCode ? (
          /* Credential Selection */
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                <ShareIcon className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Select Credential to Share
              </h2>
              <p className="text-white/70">
                Choose which credential you'd like to present via QR code
              </p>
            </div>

            <div className="space-y-4 mb-8">
              {mockCredentials.map((credential) => (
                <div
                  key={credential.id}
                  onClick={() => setSelectedCredential(credential.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedCredential === credential.id
                      ? "border-blue-400 bg-blue-400/10"
                      : "border-white/20 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">
                        {credential.name}
                      </h3>
                      <p className="text-white/60 text-sm">
                        Issued by {credential.issuer}
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 ${
                        selectedCredential === credential.id
                          ? "border-blue-400 bg-blue-400"
                          : "border-white/40"
                      }`}
                    >
                      {selectedCredential === credential.id && (
                        <div className="w-full h-full rounded-full bg-blue-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={generateQRCode}
              disabled={!selectedCredential || isGenerating}
              className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating QR Code...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <QrCodeIcon className="w-5 h-5" />
                  <span>Generate QR Code</span>
                </div>
              )}
            </button>
          </div>
        ) : (
          /* QR Code Display */
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
            <h2 className="text-2xl font-bold text-white mb-6">Your QR Code</h2>

            {/* QR Code Area */}
            <div className="bg-white rounded-2xl p-8 mb-6 mx-auto max-w-sm">
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-6xl">📱</div>
              </div>
            </div>

            <div className="bg-black/20 rounded-lg p-4 mb-6">
              <p className="text-white/60 text-sm mb-1">Credential</p>
              <p className="text-white font-semibold">
                {mockCredentials.find((c) => c.id === selectedCredential)?.name}
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-white/70 text-sm">
                Show this QR code to the verifier to share your credential
                securely
              </p>

              <div className="flex space-x-4">
                <button
                  onClick={resetQRCode}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Share Different Credential
                </button>
                <button className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all">
                  Download QR Code
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {[
          {
            icon: <QrCodeIcon className="w-6 h-6" />,
            title: "Generate QR",
            description: "Create QR codes for credential sharing",
            action: "Generate",
          },
          {
            icon: <CameraIcon className="w-6 h-6" />,
            title: "Scan QR",
            description: "Scan QR codes from verifiers",
            action: "Scan",
          },
          {
            icon: <ShareIcon className="w-6 h-6" />,
            title: "Quick Share",
            description: "Share your most-used credentials instantly",
            action: "Share",
          },
        ].map((action, index) => (
          <div
            key={index}
            className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <div className="text-blue-400 mb-4">{action.icon}</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {action.title}
            </h3>
            <p className="text-white/60 text-sm mb-4">{action.description}</p>
            <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
              {action.action} →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
