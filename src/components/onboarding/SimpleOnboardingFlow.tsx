/**
 * Simplified Onboarding Flow with Basic Keplr Integration
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { errorService } from "@/services/errorService";

export const SimpleOnboardingFlow = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [walletAddress, setWalletAddress] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [secretPhrase, setSecretPhrase] = useState<string[]>([]);
  const [did, setDid] = useState("");

  const handleConnectKeplr = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      // Check if Keplr is available
      if (typeof window === 'undefined' || !window.keplr) {
        throw new Error("Please install Keplr wallet extension");
      }

      // Enable Keplr for PersonaChain
      await window.keplr.enable("cosmoshub-4"); // Use cosmoshub for testing
      
      // Get account
      const offlineSigner = window.keplr.getOfflineSigner("cosmoshub-4");
      const accounts = await offlineSigner.getAccounts();
      
      if (accounts.length > 0) {
        setWalletAddress(accounts[0].address);
        setStep(2); // Skip to DID creation
      }
    } catch (err) {
      errorService.logError("Keplr connection error:", err);
      setError(err.message || "Failed to connect to Keplr");
    } finally {
      setIsLoading(false);
    }
  };

  const generateSecretPhrase = () => {
    // Proper BIP39 wordlist (first 256 words for demo)
    const bip39Words = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
      'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
      'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
      'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
      'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
      'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
      'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone',
      'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among',
      'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry',
      'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
      'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april',
      'arch', 'arctic', 'area', 'arena', 'argue', 'arm', 'armed', 'armor',
      'army', 'around', 'arrange', 'arrest', 'arrive', 'arrow', 'art', 'artefact',
      'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset', 'assist', 'assume',
      'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction',
      'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado',
      'avoid', 'awake', 'aware', 'away', 'awesome', 'awful', 'awkward', 'axis',
      'baby', 'bachelor', 'bacon', 'badge', 'bag', 'balance', 'balcony', 'ball',
      'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain', 'barrel', 'base',
      'basic', 'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become',
      'beef', 'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt',
      'bench', 'benefit', 'best', 'betray', 'better', 'between', 'beyond', 'bicycle',
      'bid', 'bike', 'bind', 'biology', 'bird', 'birth', 'bitter', 'black',
      'blade', 'blame', 'blanket', 'blast', 'bleak', 'bless', 'blind', 'blood',
      'blossom', 'blouse', 'blue', 'blur', 'blush', 'board', 'boat', 'body',
      'boil', 'bomb', 'bone', 'bonus', 'book', 'boost', 'border', 'boring',
      'borrow', 'boss', 'bottom', 'bounce', 'box', 'boy', 'bracket', 'brain',
      'brand', 'brass', 'brave', 'bread', 'breeze', 'brick', 'bridge', 'brief',
      'bright', 'bring', 'brisk', 'broccoli', 'broken', 'bronze', 'broom', 'brother',
      'brown', 'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb',
      'bulk', 'bullet', 'bundle', 'bunker', 'burden', 'burger', 'burst', 'bus',
      'business', 'busy', 'butter', 'buyer', 'buzz', 'cabbage', 'cabin', 'cable'
    ];
    
    // Generate cryptographically secure random indices
    const phrase = [];
    const crypto = window.crypto || window.msCrypto;
    const array = new Uint32Array(12);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < 12; i++) {
      const index = array[i] % bip39Words.length;
      phrase.push(bip39Words[index]);
    }
    
    return phrase;
  };

  const handleCreateDID = async () => {
    setIsLoading(true);
    
    try {
      // Generate secret phrase
      const phrase = generateSecretPhrase();
      setSecretPhrase(phrase);
      
      // Generate DID from wallet address
      const generatedDid = `did:persona:${walletAddress.slice(0, 10)}${Date.now()}`;
      setDid(generatedDid);
      
      // Move to secret phrase display step
      setStep(3);
      setIsLoading(false);
    } catch (err) {
      setError("Failed to create DID");
      setIsLoading(false);
    }
  };

  const handleConfirmBackup = () => {
    // Store everything
    localStorage.setItem('wallet_address', walletAddress);
    localStorage.setItem('did', did);
    localStorage.setItem('secret_phrase_backed_up', 'true');
    localStorage.setItem('onboarding_completed', 'true');
    
    // Navigate to dashboard
    navigate('/dashboard');
  };

  const steps = [
    {
      title: "Welcome to PersonaPass",
      description: "Your gateway to decentralized identity",
      content: (
        <button
          onClick={() => setStep(1)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
        >
          Get Started
        </button>
      )
    },
    {
      title: "Connect Your Wallet",
      description: "We'll use Keplr to secure your identity",
      content: (
        <>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}
          <button
            onClick={handleConnectKeplr}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? "Connecting..." : "Connect Keplr"}
          </button>
        </>
      )
    },
    {
      title: "Create Your Identity",
      description: walletAddress ? `Connected: ${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}` : "Ready to create your DID",
      content: (
        <button
          onClick={handleCreateDID}
          disabled={isLoading || !walletAddress}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isLoading ? "Creating..." : "Create DID"}
        </button>
      )
    },
    {
      title: "Your Secret Recovery Phrase",
      description: "Write down these 12 words in order. Keep them safe!",
      content: (
        <>
          {secretPhrase.length > 0 && (
            <>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800 text-sm font-medium mb-2">⚠️ Important Security Notice</p>
                <p className="text-yellow-700 text-sm">Never share your secret phrase with anyone. Write it down and store it securely.</p>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
                {secretPhrase.map((word, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="text-gray-500 text-sm">{index + 1}.</span>
                    <span className="font-mono font-medium text-gray-900">{word}</span>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 text-sm">
                  <strong>Your DID:</strong><br />
                  <span className="font-mono text-xs">{did}</span>
                </p>
              </div>

              <button
                onClick={handleConfirmBackup}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors w-full"
              >
                I've Saved My Secret Phrase
              </button>
            </>
          )}
        </>
      )
    }
  ];

  const currentStep = steps[step];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{currentStep.title}</h1>
          <p className="text-gray-600">{currentStep.description}</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center space-x-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i <= step ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        <div className="text-center">
          {currentStep.content}
        </div>

        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="w-full mt-4 text-gray-600 hover:text-gray-800"
          >
            Back
          </button>
        )}
      </motion.div>
    </div>
  );
};

// Add Keplr types
declare global {
  interface Window {
    keplr?: any;
  }
}