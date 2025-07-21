/**
 * 🔗 API Connection Flow Component
 * Guides users through connecting to RapidAPI services
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowRightIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import { rapidAPIService } from '../../services/rapidAPIService';

interface APIConnectionFlowProps {
  apiId: string;
  apiName: string;
  provider: string;
  onComplete: (credential: any) => void;
  onCancel: () => void;
}

interface ConnectionStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

export const APIConnectionFlow: React.FC<APIConnectionFlowProps> = ({
  apiId,
  apiName,
  provider,
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionData, setConnectionData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [steps, setSteps] = useState<ConnectionStep[]>([
    {
      id: 'setup',
      title: 'Setup Connection',
      description: 'Prepare API connection parameters',
      status: 'active'
    },
    {
      id: 'authenticate',
      title: 'Authenticate',
      description: 'Verify your identity with the service',
      status: 'pending'
    },
    {
      id: 'fetch-data',
      title: 'Fetch Data',
      description: 'Retrieve verification data from API',
      status: 'pending'
    },
    {
      id: 'create-credential',
      title: 'Create Credential',
      description: 'Generate verifiable credential',
      status: 'pending'
    }
  ]);

  // Form data based on API type
  const [formData, setFormData] = useState<any>({});

  const getFormFields = () => {
    switch (apiId) {
      case 'trulioo-identity-verification':
        return [
          { name: 'firstName', label: 'First Name', type: 'text', required: true },
          { name: 'lastName', label: 'Last Name', type: 'text', required: true },
          { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
          { name: 'address', label: 'Address', type: 'text', required: true },
          { name: 'documentType', label: 'Document Type', type: 'select', required: true, options: ['Passport', 'Driver License', 'National ID'] },
          { name: 'documentNumber', label: 'Document Number', type: 'text', required: true }
        ];
      case 'hunter-email-verification':
        return [
          { name: 'email', label: 'Email Address', type: 'email', required: true }
        ];
      case 'abstract-phone-validation':
        return [
          { name: 'phoneNumber', label: 'Phone Number', type: 'tel', required: true }
        ];
      case 'clearbit-company-data':
        return [
          { name: 'email', label: 'Professional Email', type: 'email', required: true }
        ];
      case 'student-clearinghouse':
        return [
          { name: 'studentId', label: 'Student ID', type: 'text', required: true },
          { name: 'institution', label: 'Institution', type: 'text', required: true },
          { name: 'degree', label: 'Degree', type: 'text', required: true },
          { name: 'graduationYear', label: 'Graduation Year', type: 'number', required: true }
        ];
      default:
        return [
          { name: 'identifier', label: 'Identifier', type: 'text', required: true }
        ];
    }
  };

  const updateStep = (index: number, status: ConnectionStep['status']) => {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, status } : step
    ));
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Step 1: Setup Connection
      updateStep(0, 'completed');
      updateStep(1, 'active');
      setCurrentStep(1);

      // Step 2: Authenticate (simulate delay)
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep(1, 'completed');
      updateStep(2, 'active');
      setCurrentStep(2);

      // Step 3: Fetch Data
      let credential;
      switch (apiId) {
        case 'trulioo-identity-verification':
          credential = await rapidAPIService.verifyIdentity(formData);
          break;
        case 'hunter-email-verification':
          credential = await rapidAPIService.verifyEmail(formData.email);
          break;
        case 'abstract-phone-validation':
          credential = await rapidAPIService.verifyPhone(formData.phoneNumber);
          break;
        case 'clearbit-company-data':
          credential = await rapidAPIService.verifyProfessional(formData.email);
          break;
        case 'student-clearinghouse':
          credential = await rapidAPIService.verifyEducation(formData);
          break;
        default:
          throw new Error('API not implemented yet');
      }

      if (!credential) {
        throw new Error('Failed to create credential from API response');
      }

      updateStep(2, 'completed');
      updateStep(3, 'active');
      setCurrentStep(3);

      // Step 4: Create Credential
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep(3, 'completed');
      setCurrentStep(4);

      setConnectionData(credential);
      onComplete(credential);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      updateStep(currentStep, 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const renderFormFields = () => {
    const fields = getFormFields();
    
    return (
      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {field.label} {field.required && <span className="text-red-400">*</span>}
            </label>
            {field.type === 'select' ? (
              <select
                value={formData[field.name] || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required={field.required}
              >
                <option value="">Select {field.label}</option>
                {field.options?.map((option: string) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : (
              <input
                type={field.type}
                value={formData[field.name] || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required={field.required}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderStepStatus = (step: ConnectionStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
      case 'active':
        return <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />;
      default:
        return <div className="w-5 h-5 border-2 border-gray-600 rounded-full" />;
    }
  };

  if (currentStep === 4 && connectionData) {
    // Success state
    return (
      <div className="text-center py-8">
        <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">Connection Successful!</h3>
        <p className="text-gray-300 mb-6">
          Your {apiName} credential has been created and stored securely.
        </p>
        
        <div className="bg-gray-800 rounded-lg p-4 mb-6 text-left">
          <h4 className="font-semibold text-white mb-2">Credential Details:</h4>
          <div className="text-sm text-gray-300 space-y-1">
            <div>Type: {connectionData.type.join(', ')}</div>
            <div>Issuer: {connectionData.issuer}</div>
            <div>Created: {new Date(connectionData.issuanceDate).toLocaleDateString()}</div>
          </div>
        </div>

        <button
          onClick={() => onComplete(connectionData)}
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-6 py-3 rounded-xl font-semibold transition-all"
        >
          Continue to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Connect to {apiName}</h2>
        <p className="text-gray-400">Provider: {provider}</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step.status === 'completed' ? 'bg-green-400 border-green-400' :
                step.status === 'active' ? 'border-orange-400' :
                step.status === 'error' ? 'border-red-400' :
                'border-gray-600'
              }`}>
                {renderStepStatus(step)}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-2 ${
                  step.status === 'completed' ? 'bg-green-400' : 'bg-gray-600'
                }`} />
              )}
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <h3 className="font-medium text-white">{steps[currentStep]?.title}</h3>
          <p className="text-sm text-gray-400">{steps[currentStep]?.description}</p>
        </div>
      </div>

      {/* Form or Connection Status */}
      {currentStep === 0 && (
        <div className="space-y-6">
          {/* Information */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-300">
                <strong>How it works:</strong> PersonaPass will use your RapidAPI key to connect to {apiName} 
                and create a verifiable credential with the returned data. All credentials are encrypted and stored securely.
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h4 className="font-semibold text-white mb-4">Connection Details</h4>
            {renderFormFields()}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={isConnecting || !getFormFields().every(field => !field.required || formData[field.name])}
              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-gray-600 disabled:to-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:cursor-not-allowed"
            >
              {isConnecting ? 'Connecting...' : 'Connect API'}
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-400">Connection Failed</h4>
              <p className="text-sm text-red-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Connection in Progress */}
      {isConnecting && currentStep > 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Connecting to {apiName}...</p>
          <p className="text-sm text-gray-400 mt-1">This may take a few moments</p>
        </div>
      )}
    </div>
  );
};