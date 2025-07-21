/**
 * ZKP Proof Generator Component
 * Generate zero-knowledge proofs from selected templates
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Shield,
  Eye,
  EyeOff,
  Download,
  Share2,
  Copy,
  Info,
  Loader2
} from 'lucide-react';
import { zkpTemplateService } from '../../services/zkpTemplateService';
import { storageService } from '../../services/storageService';
import { didService } from '../../services/didService';
import type { ZKPTemplate, ProofGenerationRequest, ProofGenerationResult } from '../../services/zkpTemplateService';
import type { WalletCredential } from '../../types/wallet';
import { errorService } from "@/services/errorService";

interface ZKPProofGeneratorProps {
  template: ZKPTemplate;
  onBack: () => void;
  onProofGenerated: (result: ProofGenerationResult) => void;
}

interface FormData {
  [key: string]: any;
}

interface ValidationError {
  field: string;
  message: string;
}

const privacyLevels = [
  { value: 'minimal', label: 'Minimal Privacy', description: 'Some metadata may be visible' },
  { value: 'balanced', label: 'Balanced Privacy', description: 'Optimal balance of privacy and functionality' },
  { value: 'maximum', label: 'Maximum Privacy', description: 'Maximum privacy protection' },
];

const verificationTypes = [
  { value: 'self', label: 'Self-Verification', description: 'Verify using your own credentials' },
  { value: 'third_party', label: 'Third-Party Verification', description: 'Verified by trusted third party' },
  { value: 'public', label: 'Public Verification', description: 'Publicly verifiable proof' },
];

export const ZKPProofGenerator: React.FC<ZKPProofGeneratorProps> = ({
  template,
  onBack,
  onProofGenerated,
}) => {
  const [formData, setFormData] = useState<FormData>({});
  const [selectedCredentials, setSelectedCredentials] = useState<string[]>([]);
  const [availableCredentials, setAvailableCredentials] = useState<WalletCredential[]>([]);
  const [privacyLevel, setPrivacyLevel] = useState<'minimal' | 'balanced' | 'maximum'>('balanced');
  const [verificationType, setVerificationType] = useState<'self' | 'third_party' | 'public'>('self');
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProof, setGeneratedProof] = useState<ProofGenerationResult | null>(null);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);

  useEffect(() => {
    loadAvailableCredentials();
    calculateEstimatedTime();
  }, [template]);

  const loadAvailableCredentials = async () => {
    try {
      const credentials = await storageService.getAllCredentials();
      // Filter credentials that match template requirements
      const matchingCredentials = credentials.filter(cred => 
        template.requirements.credentials.some(req => 
          cred.type === req.type || 
          (cred.credential && cred.credential.type.includes(req.type))
        )
      );
      setAvailableCredentials(matchingCredentials);
    } catch (error) {
      errorService.logError('Failed to load credentials:', error);
    }
  };

  const calculateEstimatedTime = () => {
    let baseTime = template.estimatedTime;
    
    // Adjust for privacy level
    if (privacyLevel === 'maximum') baseTime *= 1.5;
    else if (privacyLevel === 'minimal') baseTime *= 0.8;
    
    // Adjust for verification type
    if (verificationType === 'public') baseTime *= 1.2;
    
    setEstimatedTime(Math.round(baseTime));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation errors for this field
    setValidationErrors(prev => prev.filter(error => error.field !== field));
  };

  const handleCredentialToggle = (credentialId: string) => {
    setSelectedCredentials(prev => 
      prev.includes(credentialId)
        ? prev.filter(id => id !== credentialId)
        : [...prev, credentialId]
    );
  };

  const validateForm = (): boolean => {
    const errors: ValidationError[] = [];

    // Validate required inputs
    template.requirements.inputs.forEach(input => {
      if (input.required && !formData[input.name]) {
        errors.push({
          field: input.name,
          message: `${input.name} is required`,
        });
      }

      if (formData[input.name] && input.validation) {
        const value = formData[input.name];
        
        if (input.validation.min !== undefined && value < input.validation.min) {
          errors.push({
            field: input.name,
            message: `${input.name} must be at least ${input.validation.min}`,
          });
        }

        if (input.validation.max !== undefined && value > input.validation.max) {
          errors.push({
            field: input.name,
            message: `${input.name} must be at most ${input.validation.max}`,
          });
        }

        if (input.validation.pattern && !new RegExp(input.validation.pattern).test(value)) {
          errors.push({
            field: input.name,
            message: `${input.name} format is invalid`,
          });
        }
      }
    });

    // Validate required credentials
    const requiredCredentials = template.requirements.credentials.filter(req => req.required);
    requiredCredentials.forEach(req => {
      const hasRequired = selectedCredentials.some(credId => {
        const credential = availableCredentials.find(cred => cred.id === credId);
        return credential && (
          credential.type === req.type || 
          (credential.credential && credential.credential.type.includes(req.type))
        );
      });

      if (!hasRequired) {
        errors.push({
          field: 'credentials',
          message: `${req.type} credential is required`,
        });
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleGenerateProof = async () => {
    if (!validateForm()) {
      return;
    }

    setIsGenerating(true);
    try {
      const userDID = await didService.getOrCreateDID();
      const request: ProofGenerationRequest = {
        templateId: template.id,
        inputs: formData,
        credentials: selectedCredentials,
        options: {
          privacy: privacyLevel,
          verification: verificationType,
          expiration: expirationDate ? new Date(expirationDate).getTime() : undefined,
          metadata: {
            templateName: template.name,
            generatedAt: new Date().toISOString(),
          },
        },
      };

      const result = await zkpTemplateService.generateProofFromTemplate(request);
      setGeneratedProof(result);
      onProofGenerated(result);
    } catch (error) {
      errorService.logError('Failed to generate proof:', error);
      setValidationErrors([{
        field: 'general',
        message: error instanceof Error ? error.message : 'Failed to generate proof',
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyProof = async () => {
    if (generatedProof) {
      try {
        await navigator.clipboard.writeText(generatedProof.shareableProof);
        // Show success message
      } catch (error) {
        errorService.logError('Failed to copy proof:', error);
      }
    }
  };

  const handleDownloadProof = () => {
    if (generatedProof) {
      const blob = new Blob([JSON.stringify(generatedProof, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proof-${template.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatEstimatedTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const getFieldError = (field: string): string | undefined => {
    return validationErrors.find(error => error.field === field)?.message;
  };

  if (generatedProof) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Proof Generated Successfully!</h1>
          <p className="text-gray-600">
            Your zero-knowledge proof has been generated and stored securely.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Proof Details</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyProof}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </button>
              <button
                onClick={handleDownloadProof}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Proof ID</label>
                <p className="text-sm text-gray-600 font-mono">{generatedProof.metadata.proofId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Template Used</label>
                <p className="text-sm text-gray-600">{generatedProof.metadata.templateUsed}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Created At</label>
                <p className="text-sm text-gray-600">
                  {new Date(generatedProof.metadata.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Privacy Level</label>
                <p className="text-sm text-gray-600 capitalize">{generatedProof.metadata.privacyLevel}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Verification URL</label>
                <a
                  href={generatedProof.verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 break-all"
                >
                  {generatedProof.verificationUrl}
                </a>
              </div>
              {generatedProof.metadata.expiresAt && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Expires At</label>
                  <p className="text-sm text-gray-600">
                    {new Date(generatedProof.metadata.expiresAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Shareable Proof</label>
              <button
                onClick={() => setShowSensitiveData(!showSensitiveData)}
                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
              >
                {showSensitiveData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showSensitiveData ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            {showSensitiveData ? (
              <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-x-auto">
                {generatedProof.shareableProof}
              </pre>
            ) : (
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-sm text-gray-500">Click "Show" to reveal the shareable proof</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center space-x-4">
          <button
            onClick={onBack}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Generate Another Proof
          </button>
          <button
            onClick={() => window.location.href = '/credentials'}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View All Credentials
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Template</span>
        </button>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Est. {formatEstimatedTime(estimatedTime)}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Shield className="w-4 h-4" />
            <span className="capitalize">{privacyLevel} Privacy</span>
          </div>
        </div>
      </div>

      {/* Template Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Generate Proof: {template.name}</h1>
        <p className="text-gray-600">{template.description}</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
        {/* General Errors */}
        {validationErrors.filter(error => error.field === 'general').map((error, index) => (
          <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-800">{error.message}</span>
            </div>
          </div>
        ))}

        {/* Input Parameters */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Input Parameters</h3>
          <div className="space-y-4">
            {template.requirements.inputs.map((input, index) => (
              <div key={index}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {input.name}
                  {input.required && <span className="text-red-600 ml-1">*</span>}
                </label>
                <div className="space-y-1">
                  {input.type === 'boolean' ? (
                    <select
                      value={formData[input.name] || ''}
                      onChange={(e) => handleInputChange(input.name, e.target.value === 'true')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : input.type === 'number' ? (
                    <input
                      type="number"
                      value={formData[input.name] || ''}
                      onChange={(e) => handleInputChange(input.name, parseFloat(e.target.value) || 0)}
                      min={input.validation?.min}
                      max={input.validation?.max}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : input.type === 'date' ? (
                    <input
                      type="date"
                      value={formData[input.name] || ''}
                      onChange={(e) => handleInputChange(input.name, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData[input.name] || ''}
                      onChange={(e) => handleInputChange(input.name, e.target.value)}
                      placeholder={input.description}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                  <p className="text-xs text-gray-500">{input.description}</p>
                  {getFieldError(input.name) && (
                    <p className="text-sm text-red-600">{getFieldError(input.name)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Credential Selection */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Select Credentials</h3>
          {availableCredentials.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No compatible credentials found</p>
              <p className="text-sm text-gray-500 mt-1">
                You'll need to add credentials that match this template's requirements
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableCredentials.map((credential) => (
                <div
                  key={credential.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedCredentials.includes(credential.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleCredentialToggle(credential.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedCredentials.includes(credential.id)}
                        onChange={() => handleCredentialToggle(credential.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{credential.metadata.name}</p>
                        <p className="text-sm text-gray-600">{credential.metadata.description}</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{credential.type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {getFieldError('credentials') && (
            <p className="text-sm text-red-600 mt-2">{getFieldError('credentials')}</p>
          )}
        </div>

        {/* Privacy & Verification Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy Level</h3>
            <div className="space-y-3">
              {privacyLevels.map((level) => (
                <label key={level.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="privacy"
                    value={level.value}
                    checked={privacyLevel === level.value}
                    onChange={(e) => setPrivacyLevel(e.target.value as any)}
                    className="mt-1 border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{level.label}</p>
                    <p className="text-sm text-gray-600">{level.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Verification Type</h3>
            <div className="space-y-3">
              {verificationTypes.map((type) => (
                <label key={type.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="verification"
                    value={type.value}
                    checked={verificationType === type.value}
                    onChange={(e) => setVerificationType(e.target.value as any)}
                    className="mt-1 border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{type.label}</p>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Expiration */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Expiration (Optional)</h3>
          <input
            type="datetime-local"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 mt-1">
            Leave empty for no expiration. Setting an expiration date can improve privacy.
          </p>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center">
          <button
            onClick={handleGenerateProof}
            disabled={isGenerating}
            className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Proof...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Generate Proof</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ZKPProofGenerator;