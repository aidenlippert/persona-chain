/**
 * DID Manager Component - Production DID Creation and Management Interface
 *
 * Features:
 * - Real Ed25519 DID generation using did:key method
 * - Secure private key management
 * - W3C DID Document display
 * - Cryptographic signing and verification
 * - DID storage and retrieval
 */

import React, { useState } from "react";
import { useDID } from "../hooks/useDID";

interface DIDDisplayProps {
  did: string;
  document: any;
}

const DIDDisplay: React.FC<DIDDisplayProps> = ({ did, document }) => {
  const [showDocument, setShowDocument] = useState(false);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.1)",
        padding: "20px",
        borderRadius: "15px",
        marginBottom: "20px",
        border: "2px solid rgba(76, 175, 80, 0.3)",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "15px" }}
      >
        <span style={{ fontSize: "2rem", marginRight: "15px" }}>🆔</span>
        <div>
          <h3 style={{ margin: "0 0 5px 0", color: "#4CAF50" }}>
            Active DID Generated
          </h3>
          <p style={{ margin: 0, fontSize: "14px", opacity: 0.9 }}>
            W3C Compliant • Ed25519 Cryptography • Production Ready
          </p>
        </div>
      </div>

      <div
        style={{
          background: "rgba(0,0,0,0.2)",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "15px",
          fontFamily: "monospace",
          fontSize: "12px",
          wordBreak: "break-all",
        }}
      >
        <strong>DID:</strong>
        <br />
        {did}
      </div>

      <button
        onClick={() => setShowDocument(!showDocument)}
        style={{
          padding: "8px 15px",
          background: showDocument ? "#f44336" : "#2196F3",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          marginRight: "10px",
        }}
      >
        {showDocument ? "Hide" : "Show"} DID Document
      </button>

      <button
        onClick={() => navigator.clipboard.writeText(did)}
        style={{
          padding: "8px 15px",
          background: "#FF9800",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        📋 Copy DID
      </button>

      {showDocument && (
        <div
          style={{
            background: "rgba(0,0,0,0.3)",
            padding: "15px",
            borderRadius: "8px",
            marginTop: "15px",
            fontFamily: "monospace",
            fontSize: "11px",
            maxHeight: "300px",
            overflow: "auto",
          }}
        >
          <strong>W3C DID Document:</strong>
          <pre style={{ margin: "10px 0 0 0", whiteSpace: "pre-wrap" }}>
            {JSON.stringify(document, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export const DIDManager: React.FC = () => {
  const {
    currentDID,
    storedDIDs,
    isGenerating,
    error,
    generateNewDID,
    generateDIDFromSeed,
    loadDID,
    saveDID,
    deleteDID,
    signData,
    verifySignature,
    clearError,
  } = useDID();

  const [seedInput, setSeedInput] = useState("");
  const [aliasInput, setAliasInput] = useState("");
  const [signDataInput, setSignDataInput] = useState("");
  const [signatureResult, setSignatureResult] = useState("");
  const [verifyDataInput, setVerifyDataInput] = useState("");
  const [verifySignatureInput, setVerifySignatureInput] = useState("");
  const [verificationResult, setVerificationResult] = useState<boolean | null>(
    null,
  );

  const handleGenerateNewDID = async () => {
    const result = await generateNewDID();
    if (result) {
      setSignatureResult("");
      setVerificationResult(null);
    }
  };

  const handleGenerateFromSeed = async () => {
    if (!seedInput.trim()) {
      return;
    }
    const result = await generateDIDFromSeed(seedInput);
    if (result) {
      setSeedInput("");
      setSignatureResult("");
      setVerificationResult(null);
    }
  };

  const handleSaveDID = async () => {
    if (!aliasInput.trim() || !currentDID) {
      return;
    }
    await saveDID(aliasInput);
    setAliasInput("");
  };

  const handleSignData = async () => {
    if (!signDataInput.trim()) {
      return;
    }
    const signature = await signData(signDataInput);
    if (signature) {
      setSignatureResult(signature);
    }
  };

  const handleVerifySignature = async () => {
    if (!verifyDataInput.trim() || !verifySignatureInput.trim()) {
      return;
    }
    const result = await verifySignature(verifySignatureInput, verifyDataInput);
    setVerificationResult(result);
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <h1
          style={{ fontSize: "2.5rem", margin: "0 0 10px 0", color: "white" }}
        >
          🆔 DID Manager
        </h1>
        <p style={{ fontSize: "1.1rem", opacity: 0.9, margin: 0 }}>
          Production Ed25519 DID Creation & Management
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            background: "rgba(244, 67, 54, 0.2)",
            border: "1px solid rgba(244, 67, 54, 0.5)",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px",
            color: "#f44336",
          }}
        >
          ❌ {error}
          <button
            onClick={clearError}
            style={{
              marginLeft: "10px",
              padding: "5px 10px",
              background: "transparent",
              border: "1px solid #f44336",
              color: "#f44336",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Current DID Display */}
      {currentDID && (
        <DIDDisplay did={currentDID.did} document={currentDID.document} />
      )}

      {/* DID Generation Section */}
      <div
        style={{
          background: "rgba(255,255,255,0.1)",
          padding: "25px",
          borderRadius: "15px",
          marginBottom: "20px",
        }}
      >
        <h3
          style={{
            margin: "0 0 20px 0",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span style={{ marginRight: "10px" }}>🔐</span>
          Generate New DID
        </h3>

        <div style={{ display: "grid", gap: "15px" }}>
          {/* Random Generation */}
          <div>
            <button
              onClick={handleGenerateNewDID}
              disabled={isGenerating}
              style={{
                width: "100%",
                padding: "15px",
                background: isGenerating ? "#ccc" : "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: isGenerating ? "not-allowed" : "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              {isGenerating ? "🔄 Generating..." : "🎲 Generate Random DID"}
            </button>
            <p style={{ margin: "8px 0 0 0", fontSize: "14px", opacity: 0.8 }}>
              Creates a new DID with cryptographically secure random Ed25519
              keys
            </p>
          </div>

          {/* Deterministic Generation */}
          <div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
              <input
                type="text"
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="Enter seed phrase for deterministic generation..."
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(0,0,0,0.2)",
                  color: "white",
                  fontSize: "14px",
                }}
              />
              <button
                onClick={handleGenerateFromSeed}
                disabled={!seedInput.trim() || isGenerating}
                style={{
                  padding: "12px 20px",
                  background:
                    !seedInput.trim() || isGenerating ? "#666" : "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor:
                    !seedInput.trim() || isGenerating
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                🌱 Generate
              </button>
            </div>
            <p style={{ margin: 0, fontSize: "14px", opacity: 0.8 }}>
              Creates deterministic DID from seed (same seed = same DID)
            </p>
          </div>
        </div>
      </div>

      {/* DID Storage Section */}
      {currentDID && (
        <div
          style={{
            background: "rgba(255,255,255,0.1)",
            padding: "25px",
            borderRadius: "15px",
            marginBottom: "20px",
          }}
        >
          <h3
            style={{
              margin: "0 0 20px 0",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span style={{ marginRight: "10px" }}>💾</span>
            Save Current DID
          </h3>

          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              placeholder="Enter alias for this DID..."
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(0,0,0,0.2)",
                color: "white",
                fontSize: "14px",
              }}
            />
            <button
              onClick={handleSaveDID}
              disabled={!aliasInput.trim()}
              style={{
                padding: "12px 20px",
                background: !aliasInput.trim() ? "#666" : "#FF9800",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: !aliasInput.trim() ? "not-allowed" : "pointer",
              }}
            >
              💾 Save
            </button>
          </div>
        </div>
      )}

      {/* Stored DIDs Section */}
      {storedDIDs.length > 0 && (
        <div
          style={{
            background: "rgba(255,255,255,0.1)",
            padding: "25px",
            borderRadius: "15px",
            marginBottom: "20px",
          }}
        >
          <h3
            style={{
              margin: "0 0 20px 0",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span style={{ marginRight: "10px" }}>📁</span>
            Stored DIDs ({storedDIDs.length})
          </h3>

          <div style={{ display: "grid", gap: "10px" }}>
            {storedDIDs.map((alias) => (
              <div
                key={alias}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(0,0,0,0.2)",
                  padding: "12px",
                  borderRadius: "6px",
                }}
              >
                <span style={{ fontWeight: "bold" }}>{alias}</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => loadDID(alias)}
                    style={{
                      padding: "6px 12px",
                      background: "#2196F3",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    📂 Load
                  </button>
                  <button
                    onClick={() => deleteDID(alias)}
                    style={{
                      padding: "6px 12px",
                      background: "#f44336",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cryptographic Operations */}
      {currentDID && (
        <div
          style={{
            background: "rgba(255,255,255,0.1)",
            padding: "25px",
            borderRadius: "15px",
            marginBottom: "20px",
          }}
        >
          <h3
            style={{
              margin: "0 0 20px 0",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span style={{ marginRight: "10px" }}>🔏</span>
            Cryptographic Operations
          </h3>

          {/* Signing */}
          <div style={{ marginBottom: "25px" }}>
            <h4 style={{ margin: "0 0 10px 0" }}>Sign Data</h4>
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <input
                type="text"
                value={signDataInput}
                onChange={(e) => setSignDataInput(e.target.value)}
                placeholder="Enter data to sign..."
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "5px",
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(0,0,0,0.2)",
                  color: "white",
                  fontSize: "14px",
                }}
              />
              <button
                onClick={handleSignData}
                disabled={!signDataInput.trim()}
                style={{
                  padding: "10px 15px",
                  background: !signDataInput.trim() ? "#666" : "#9C27B0",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: !signDataInput.trim() ? "not-allowed" : "pointer",
                }}
              >
                ✍️ Sign
              </button>
            </div>
            {signatureResult && (
              <div
                style={{
                  background: "rgba(0,0,0,0.3)",
                  padding: "10px",
                  borderRadius: "5px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  wordBreak: "break-all",
                }}
              >
                <strong>Signature:</strong>
                <br />
                {signatureResult}
                <button
                  onClick={() => navigator.clipboard.writeText(signatureResult)}
                  style={{
                    marginLeft: "10px",
                    padding: "3px 8px",
                    background: "#FF9800",
                    color: "white",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontSize: "10px",
                  }}
                >
                  📋
                </button>
              </div>
            )}
          </div>

          {/* Verification */}
          <div>
            <h4 style={{ margin: "0 0 10px 0" }}>Verify Signature</h4>
            <div style={{ display: "grid", gap: "10px", marginBottom: "10px" }}>
              <input
                type="text"
                value={verifyDataInput}
                onChange={(e) => setVerifyDataInput(e.target.value)}
                placeholder="Original data..."
                style={{
                  padding: "10px",
                  borderRadius: "5px",
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(0,0,0,0.2)",
                  color: "white",
                  fontSize: "14px",
                }}
              />
              <input
                type="text"
                value={verifySignatureInput}
                onChange={(e) => setVerifySignatureInput(e.target.value)}
                placeholder="Signature to verify..."
                style={{
                  padding: "10px",
                  borderRadius: "5px",
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(0,0,0,0.2)",
                  color: "white",
                  fontSize: "14px",
                }}
              />
              <button
                onClick={handleVerifySignature}
                disabled={
                  !verifyDataInput.trim() || !verifySignatureInput.trim()
                }
                style={{
                  padding: "10px 15px",
                  background:
                    !verifyDataInput.trim() || !verifySignatureInput.trim()
                      ? "#666"
                      : "#E91E63",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor:
                    !verifyDataInput.trim() || !verifySignatureInput.trim()
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                🔍 Verify
              </button>
            </div>
            {verificationResult !== null && (
              <div
                style={{
                  background: verificationResult
                    ? "rgba(76, 175, 80, 0.2)"
                    : "rgba(244, 67, 54, 0.2)",
                  border: `1px solid ${verificationResult ? "rgba(76, 175, 80, 0.5)" : "rgba(244, 67, 54, 0.5)"}`,
                  padding: "10px",
                  borderRadius: "5px",
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              >
                {verificationResult
                  ? "✅ SIGNATURE VALID"
                  : "❌ SIGNATURE INVALID"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Technical Details */}
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          padding: "20px",
          borderRadius: "10px",
          fontSize: "14px",
          opacity: 0.8,
        }}
      >
        <h4 style={{ margin: "0 0 15px 0" }}>🔬 Technical Implementation</h4>
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
          <li>
            <strong>Cryptography:</strong> Ed25519 elliptic curve signatures
          </li>
          <li>
            <strong>DID Method:</strong> did:key specification compliance
          </li>
          <li>
            <strong>Encoding:</strong> Multibase with base58btc encoding
          </li>
          <li>
            <strong>Standards:</strong> W3C DID Core, Ed25519VerificationKey2020
          </li>
          <li>
            <strong>Security:</strong> Cryptographically secure random number
            generation
          </li>
          <li>
            <strong>Storage:</strong> Browser localStorage (encrypted in
            production)
          </li>
        </ul>
      </div>
    </div>
  );
};
