/**
 * Experian Credit Verification Dashboard
 * Complete UI for credit score verification and credential management
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { experianAutomationService, AutomatedCreditVerificationResult, CreditVerificationStep } from '../../services/automation/ExperianAutomationService';
import { CreditScoreRequest } from '../../services/ExperianService';
import { errorService } from "@/services/errorService";

interface CreditVerificationState {
  isVerifying: boolean;
  showForm: boolean;
  result: AutomatedCreditVerificationResult | null;
  error: string | null;
  steps: CreditVerificationStep[];
  currentStep: string | null;
  formData: Partial<CreditScoreRequest>;
}

export const ExperianCreditDashboard: React.FC = () => {
  const [state, setState] = useState<CreditVerificationState>({
    isVerifying: false,
    showForm: false,
    result: null,
    error: null,
    steps: [],
    currentStep: null,
    formData: {}
  });

  const userDid = 'did:persona:user:123'; // TODO: Get from auth context

  useEffect(() => {
    // Load any cached verification results on mount
    loadCachedResults();
  }, []);

  const loadCachedResults = useCallback(async () => {
    try {
      // Check if we have any recent verification results
      const config = experianAutomationService.getConfig();
      console.log('📋 Loaded Experian automation config:', config);
    } catch (error) {
      errorService.logError('❌ Failed to load cached results:', error);
    }
  }, []);

  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateFormData(state.formData)) {
      setState(prev => ({ 
        ...prev, 
        error: 'Please fill in all required fields' 
      }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isVerifying: true, 
      error: null, 
      result: null,
      steps: [],
      currentStep: null
    }));

    try {
      const request = state.formData as CreditScoreRequest;
      
      const result = await experianAutomationService.executeStepByCreditVerification(
        request,
        userDid,
        (step) => {
          setState(prev => ({
            ...prev,
            steps: prev.steps.map(s => s.id === step.id ? step : s).length > 0 
              ? prev.steps.map(s => s.id === step.id ? step : s)
              : [...prev.steps, step],
            currentStep: step.id
          }));
        }
      );

      setState(prev => ({ 
        ...prev, 
        result, 
        isVerifying: false,
        showForm: false,
        error: result.success ? null : result.error || 'Verification failed'
      }));

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isVerifying: false, 
        error: error instanceof Error ? error.message : 'Verification failed' 
      }));
    }
  }, [state.formData, userDid]);

  const validateFormData = (data: Partial<CreditScoreRequest>): data is CreditScoreRequest => {
    return !!(data.firstName && data.lastName && data.dateOfBirth && data.ssn && 
             data.streetAddress && data.city && data.state && data.zipCode);
  };

  const updateFormData = useCallback((field: keyof CreditScoreRequest, value: string) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, [field]: value }
    }));
  }, []);

  const getCreditScoreColor = (score: number) => {
    if (score >= 800) return 'text-green-600 bg-green-100';
    if (score >= 740) return 'text-blue-600 bg-blue-100';
    if (score >= 670) return 'text-yellow-600 bg-yellow-100';
    if (score >= 580) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getRiskGradeColor = (grade: string) => {
    switch (grade) {
      case 'EXCELLENT': return 'text-green-700 bg-green-50 border-green-200';
      case 'VERY_GOOD': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'GOOD': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'FAIR': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'POOR': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          🏦 Experian Credit Verification
        </h2>
        <p className="text-gray-600">
          Get verified credit score and generate secure credentials
        </p>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="bg-white rounded-xl p-6 shadow-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Verification Status</p>
              <p className="text-2xl font-bold text-gray-900">
                {state.result ? (state.result.success ? 'Verified' : 'Failed') : 'Pending'}
              </p>
            </div>
            <div className="text-3xl">
              {state.result ? (state.result.success ? '✅' : '❌') : '⏳'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Credit Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {state.result?.creditScore || '---'}
              </p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Risk Grade</p>
              <p className="text-2xl font-bold text-gray-900">
                {state.result?.riskGrade || '---'}
              </p>
            </div>
            <div className="text-3xl">🎯</div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Form/Results */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          {!state.showForm && !state.result && !state.isVerifying && (
            <div className="bg-white rounded-xl p-8 shadow-lg border text-center">
              <div className="text-6xl mb-4">🏦</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Start Credit Verification
              </h3>
              <p className="text-gray-600 mb-6">
                Verify your credit score with Experian and generate a secure credential
              </p>
              <button
                onClick={() => setState(prev => ({ ...prev, showForm: true }))}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-all shadow-lg"
              >
                Begin Verification
              </button>
            </div>
          )}

          {state.showForm && (
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Personal Information
              </h3>
              
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={state.formData.firstName || ''}
                      onChange={(e) => updateFormData('firstName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter first name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={state.formData.lastName || ''}
                      onChange={(e) => updateFormData('lastName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter last name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={state.formData.dateOfBirth || ''}
                    onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SSN (Last 4 digits) *
                  </label>
                  <input
                    type="text"
                    value={state.formData.ssn || ''}
                    onChange={(e) => updateFormData('ssn', e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1234"
                    maxLength={4}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={state.formData.streetAddress || ''}
                    onChange={(e) => updateFormData('streetAddress', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123 Main St"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={state.formData.city || ''}
                      onChange={(e) => updateFormData('city', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="City"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      value={state.formData.state || ''}
                      onChange={(e) => updateFormData('state', e.target.value.toUpperCase().slice(0, 2))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="CA"
                      maxLength={2}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      value={state.formData.zipCode || ''}
                      onChange={(e) => updateFormData('zipCode', e.target.value.replace(/\D/g, '').slice(0, 5))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="12345"
                      maxLength={5}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setState(prev => ({ ...prev, showForm: false }))}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!validateFormData(state.formData)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 px-6 rounded-lg font-medium transition-all shadow-lg disabled:cursor-not-allowed"
                  >
                    Verify Credit
                  </button>
                </div>
              </form>
            </div>
          )}

          {state.result && state.result.success && (
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Credit Verification Complete
                </h3>
                <p className="text-gray-600">
                  Your credit score has been verified and credential generated
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Credit Score</p>
                      <p className={`text-3xl font-bold ${getCreditScoreColor(state.result.creditScore!)}`}>
                        {state.result.creditScore}
                      </p>
                    </div>
                    <div className={`px-4 py-2 rounded-full border ${getRiskGradeColor(state.result.riskGrade!)}`}>
                      <span className="font-medium text-sm">{state.result.riskGrade}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Verification Level</p>
                    <p className="font-bold text-gray-900">{state.result.verificationLevel}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Cached Result</p>
                    <p className="font-bold text-gray-900">
                      {state.result.fromCache ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="text-green-600 text-xl">🏆</div>
                    <div>
                      <p className="font-medium text-green-800">Credential Generated</p>
                      <p className="text-sm text-green-600">
                        Your credit verification credential is now available in your wallet
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setState(prev => ({ 
                    ...prev, 
                    result: null, 
                    showForm: false, 
                    formData: {} 
                  }))}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-all shadow-lg"
                >
                  Verify Again
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Right Column - Process Steps */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-lg border"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Verification Process
          </h3>

          {state.isVerifying && (
            <div className="space-y-4">
              {state.steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    step.status === 'in_progress' ? 'bg-blue-50 border-blue-200' :
                    step.status === 'completed' ? 'bg-green-50 border-green-200' :
                    step.status === 'failed' ? 'bg-red-50 border-red-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="text-2xl">
                    {getStepIcon(step.status)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{step.name}</h4>
                    <p className="text-sm text-gray-600">{step.description}</p>
                    {step.error && (
                      <p className="text-sm text-red-600 mt-1">{step.error}</p>
                    )}
                  </div>
                </motion.div>
              ))}

              {state.steps.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🔄</div>
                  <p className="text-gray-600">Initializing verification process...</p>
                </div>
              )}
            </div>
          )}

          {!state.isVerifying && state.steps.length === 0 && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📋</div>
              <h4 className="font-medium text-gray-900 mb-2">Process Steps</h4>
              <p className="text-gray-600 text-sm">
                The verification process will show here when you begin
              </p>
            </div>
          )}

          {!state.isVerifying && state.steps.length > 0 && (
            <div className="space-y-4">
              {state.steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    step.status === 'completed' ? 'bg-green-50 border-green-200' :
                    step.status === 'failed' ? 'bg-red-50 border-red-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="text-2xl">
                    {getStepIcon(step.status)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{step.name}</h4>
                    <p className="text-sm text-gray-600">{step.description}</p>
                    {step.error && (
                      <p className="text-sm text-red-600 mt-1">{step.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <div className="text-red-600 text-xl">❌</div>
              <div>
                <h4 className="font-medium text-red-800">Verification Failed</h4>
                <p className="text-sm text-red-600">{state.error}</p>
              </div>
              <button
                onClick={() => setState(prev => ({ ...prev, error: null }))}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {state.isVerifying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center"
            >
              <div className="text-6xl mb-4">🏦</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Verifying Credit Score
              </h3>
              <p className="text-gray-600 mb-6">
                Connecting to Experian and processing your credit information...
              </p>
              <div className="flex justify-center space-x-2">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                    className="w-3 h-3 bg-blue-500 rounded-full"
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};