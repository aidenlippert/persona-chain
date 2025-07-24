/**
 * Login Page with Keplr Wallet Connection
 */

import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
// Removed unused personaChainService import
import { crossDeviceAuthService } from "../../services/crossDeviceAuthService";
const EliteWeb3Button = lazy(() => import("../ui/EliteWeb3Button").then(m => ({ default: m.EliteWeb3Button })));
import { errorService } from "@/services/errorService";

export const LoginPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showUserNotFound, setShowUserNotFound] = useState(false);

  // Simulate being a returning user for testing
  const handleSimulateReturningUser = () => {
    console.log("[MASK] Simulating returning user...");
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('persona_onboarding_complete', 'true');
    localStorage.setItem('persona_user_profile', JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      completed: true
    }));
    setError("[SUCCESS] Returning user data simulated! Click 'Login with Keplr' now.");
  };

  const handleKeplrLogin = async () => {
    setIsLoading(true);
    setError("");
    setShowUserNotFound(false);

    try {
      console.log("[CROSS-DEVICE] Starting cross-device authentication...");
      
      // Use the new cross-device authentication service
      const authResult = await crossDeviceAuthService.authenticateWithKeplr();
      
      if (authResult.success && authResult.profile) {
        console.log(`[SUCCESS] Authentication successful for DID: ${authResult.profile.did}`);
        
        if (authResult.isNewUser) {
          console.log("[NEW-USER] New user created, redirecting to dashboard...");
          navigate('/dashboard');
        } else {
          console.log("[RETURNING-USER] Existing user authenticated, redirecting to dashboard...");
          navigate('/dashboard');
        }
        
        setError("");
        return;
      }

      // Authentication failed
      if (authResult.error) {
        if (authResult.error.includes('No accounts found') || authResult.error.includes('not found')) {
          setShowUserNotFound(true);
          setError("");
        } else {
          setError(authResult.error);
          setShowUserNotFound(false);
        }
      } else {
        setError("Authentication failed. Please try again.");
        setShowUserNotFound(false);
      }

    } catch (error) {
      console.error("[ERROR] Cross-device login failed:", error);
      setError(error instanceof Error ? error.message : "Login failed");
      setShowUserNotFound(false);
      
      // Track the error
      errorService.logError("Cross-device login failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        {/* Login Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Welcome Back
            </h1>
            <p className="text-slate-400">
              Sign in with your wallet to access your existing identity
            </p>
          </div>

          {/* Keplr Login Button */}
          <Suspense fallback={<div className="animate-pulse bg-slate-700 h-12 rounded-lg mb-4"></div>}>
            <EliteWeb3Button
              onClick={handleKeplrLogin}
              disabled={isLoading}
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              className="mb-4"
            >
              {isLoading ? "Connecting..." : "Login with Keplr"}
            </EliteWeb3Button>

            {/* Test Button for Simulating Returning User */}
            <EliteWeb3Button
              onClick={handleSimulateReturningUser}
              variant="secondary"
              size="sm"
              fullWidth
              className="mb-4"
            >
              [MASK] Simulate Returning User (Test)
            </EliteWeb3Button>
          </Suspense>

          {/* User Not Found Message */}
          {showUserNotFound && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-orange-500/20 border border-orange-500/30 rounded-lg backdrop-blur-sm"
            >
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-orange-300 font-medium text-sm mb-2">Account Not Found</p>
                  <p className="text-orange-400 text-sm mb-3">
                    No PersonaPass identity found for this wallet address. You'll need to create an account first.
                  </p>
                  <Suspense fallback={<div className="animate-pulse bg-orange-500/20 h-8 rounded"></div>}>
                    <EliteWeb3Button
                      onClick={() => navigate('/onboarding')}
                      variant="secondary"
                      size="sm"
                      className="bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/50 text-orange-300"
                    >
                      Create Account
                    </EliteWeb3Button>
                  </Suspense>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm"
            >
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Features */}
          <div className="mt-8 space-y-3">
            <div className="flex items-center space-x-3 text-slate-300">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm">Query your DID from blockchain</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-300">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm">Load all attached credentials</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-300">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm">Access your verifiable data</span>
            </div>
          </div>

          {/* Create Account Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Don't have an identity yet?{" "}
              <button
                onClick={() => navigate('/onboarding')}
                className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
              >
                Create one
              </button>
            </p>
          </div>
        </div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg p-4"
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-sm text-slate-300">
              <p className="font-medium text-white mb-1">Blockchain-Powered Login</p>
              <p>
                Your identity is stored on PersonaChain. When you login, we query the blockchain
                to retrieve your DID and all associated verifiable credentials.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};