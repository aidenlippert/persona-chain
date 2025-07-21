import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWalletStore } from "../store/walletStore";
import { motion } from "framer-motion";
import { FaCheckCircle, FaExclamationCircle, FaSpinner } from "react-icons/fa";
import { errorService } from "@/services/errorService";

export const CredentialsCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addCredential, addNotification } = useWalletStore();
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing",
  );
  const [message, setMessage] = useState("Processing your credential...");

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Check for direct callback from OAuth provider (new flow)
      const sessionId = searchParams.get("sessionId");
      const status = searchParams.get("status");
      const platform = searchParams.get("platform");
      const error = searchParams.get("error");

      if (error) {
        throw new Error(decodeURIComponent(error));
      }

      if (status === "success" && sessionId && platform) {
        // New flow: Get credential result from backend
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/connectors/${platform}/result/${sessionId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer test-token-demo-user`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to retrieve credential");
        }

        const credentialData = await response.json();

        // Store credential
        await addCredential({
          ...credentialData.credential,
          zkCommitment: credentialData.zkCommitment,
          platform: credentialData.platform,
        });

        setStatus("success");
        setMessage("Credential imported successfully!");
        addNotification({
          type: "success",
          title: "Credential Imported",
          message: `${platform} credential imported successfully`,
        });

        // Redirect after success
        setTimeout(() => {
          navigate("/credentials");
        }, 2000);
        return;
      }

      // Legacy flow for direct API calls
      const code = searchParams.get("code");
      const state = searchParams.get("state");

      if (!code || !state) {
        throw new Error("Invalid callback parameters");
      }

      // Get stored session
      const sessionData = sessionStorage.getItem("connector_session");
      if (!sessionData) {
        throw new Error("Session expired");
      }

      const session = JSON.parse(sessionData);

      // Exchange code for credential
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/connectors/${session.connector}/callback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer test-token-demo-user`,
          },
          body: JSON.stringify({
            code,
            state,
            sessionId: session.sessionId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to process credential");
      }

      const { credential, zkCommitment } = await response.json();

      // Store credential
      await addCredential({
        ...credential,
        zkCommitment,
        platform: session.connector,
      });

      // Clean up session
      sessionStorage.removeItem("connector_session");

      setStatus("success");
      setMessage("Credential imported successfully!");
      addNotification({
        type: "success",
        title: "Credential Imported",
        message: `${session.connector} credential imported successfully`,
      });

      // Redirect after success
      setTimeout(() => {
        navigate("/credentials");
      }, 2000);
    } catch (error: any) {
      errorService.logError("Callback error:", error);
      setStatus("error");
      setMessage(error.message || "Failed to import credential");
      addNotification({
        type: "error",
        title: "Import Failed",
        message: "Failed to import credential",
      });

      // Redirect after error
      setTimeout(() => {
        navigate("/credentials");
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full"
      >
        <div className="text-center">
          {status === "processing" && (
            <>
              <div className="mx-auto w-16 h-16 mb-4">
                <FaSpinner className="w-full h-full text-purple-600 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Processing Credential
              </h2>
              <p className="text-gray-600 dark:text-gray-300">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="mx-auto w-16 h-16 mb-4"
              >
                <FaCheckCircle className="w-full h-full text-green-500" />
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Success!
              </h2>
              <p className="text-gray-600 dark:text-gray-300">{message}</p>
            </>
          )}

          {status === "error" && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="mx-auto w-16 h-16 mb-4"
              >
                <FaExclamationCircle className="w-full h-full text-red-500" />
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Error
              </h2>
              <p className="text-gray-600 dark:text-gray-300">{message}</p>
            </>
          )}

          <div className="mt-6">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: status === "processing" ? "60%" : "100%" }}
                transition={{ duration: status === "processing" ? 10 : 0.5 }}
                className={`h-full ${
                  status === "success"
                    ? "bg-green-500"
                    : status === "error"
                      ? "bg-red-500"
                      : "bg-purple-600"
                }`}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
