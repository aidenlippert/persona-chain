/**
 * ZKP Template Details Component
 * Show detailed information about a selected template
 */

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Star, 
  Clock, 
  Zap, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Info,
  Play,
  FileText,
  HelpCircle,
  Tag,
  Users,
  Award
} from 'lucide-react';
import type { ZKPTemplate } from '../../services/zkpTemplateService';

interface ZKPTemplateDetailsProps {
  template: ZKPTemplate;
  onBack: () => void;
  onStartProof: (template: ZKPTemplate) => void;
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-orange-100 text-orange-800',
  expert: 'bg-red-100 text-red-800',
};

const securityLevelColors = {
  basic: 'bg-gray-100 text-gray-800',
  enhanced: 'bg-blue-100 text-blue-800',
  enterprise: 'bg-purple-100 text-purple-800',
};

const typeColors = {
  string: 'bg-blue-50 text-blue-700',
  number: 'bg-green-50 text-green-700',
  boolean: 'bg-purple-50 text-purple-700',
  date: 'bg-orange-50 text-orange-700',
  array: 'bg-pink-50 text-pink-700',
};

export const ZKPTemplateDetails: React.FC<ZKPTemplateDetailsProps> = ({
  template,
  onBack,
  onStartProof,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'requirements' | 'examples' | 'documentation'>('overview');

  const formatEstimatedTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const formatGasEstimate = (gas: number): string => {
    if (gas >= 1000000) return `${(gas / 1000000).toFixed(1)}M`;
    if (gas >= 1000) return `${(gas / 1000).toFixed(0)}K`;
    return gas.toString();
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'requirements', label: 'Requirements', icon: CheckCircle },
    { id: 'examples', label: 'Examples', icon: Play },
    { id: 'documentation', label: 'Documentation', icon: FileText },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Templates</span>
        </button>
        <button
          onClick={() => onStartProof(template)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Play className="w-4 h-4" />
          <span>Start Proof</span>
        </button>
      </div>

      {/* Template Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
              <p className="text-gray-600 capitalize">{template.category} • {template.subcategory}</p>
            </div>
          </div>
          {template.metadata.featured && (
            <div className="flex items-center space-x-1 text-yellow-600">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-medium">Featured</span>
            </div>
          )}
        </div>

        <p className="text-gray-700 mb-6">{template.description}</p>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${difficultyColors[template.difficulty]}`}>
            {template.difficulty}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${securityLevelColors[template.metadata.securityLevel]}`}>
            {template.metadata.securityLevel}
          </span>
          {template.metadata.verified && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 inline mr-1" />
              Verified
            </span>
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Estimated Time</p>
              <p className="font-medium">{formatEstimatedTime(template.estimatedTime)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Gas Estimate</p>
              <p className="font-medium">{formatGasEstimate(template.gasEstimate)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Usage Count</p>
              <p className="font-medium">{template.metadata.usageCount.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Rating</p>
              <div className="flex items-center space-x-1">
                <span className="font-medium">{template.metadata.rating}</span>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < Math.floor(template.metadata.rating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500">({template.metadata.reviews})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Overview</h3>
                <p className="text-gray-700">{template.documentation.overview}</p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {template.metadata.tags.map((tag) => (
                    <span key={tag} className="flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      <Tag className="w-3 h-3" />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Circuit Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Constraints</p>
                    <p className="font-medium">{template.circuit.constraintCount.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Public Signals</p>
                    <p className="font-medium">{template.circuit.publicSignalCount}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Private Signals</p>
                    <p className="font-medium">{template.circuit.privateSignalCount}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'requirements' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Required Credentials</h3>
                <div className="space-y-3">
                  {template.requirements.credentials.map((credential, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-blue-900">{credential.type}</p>
                        <p className="text-sm text-blue-700">{credential.description}</p>
                        {credential.required && (
                          <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            Required
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Input Parameters</h3>
                <div className="space-y-3">
                  {template.requirements.inputs.map((input, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{input.name}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[input.type]}`}>
                            {input.type}
                          </span>
                        </div>
                        {input.required && (
                          <span className="text-red-600 text-sm">Required</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{input.description}</p>
                      {input.validation && (
                        <div className="text-xs text-gray-500">
                          {input.validation.min !== undefined && (
                            <span className="mr-4">Min: {input.validation.min}</span>
                          )}
                          {input.validation.max !== undefined && (
                            <span className="mr-4">Max: {input.validation.max}</span>
                          )}
                          {input.validation.pattern && (
                            <span>Pattern: {input.validation.pattern}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Output Parameters</h3>
                <div className="space-y-3">
                  {template.requirements.outputs.map((output, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{output.name}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[output.type]}`}>
                            {output.type}
                          </span>
                        </div>
                        {output.isPublic && (
                          <span className="text-green-600 text-sm">Public</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{output.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'examples' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Use Case Examples</h3>
                <div className="space-y-4">
                  {template.examples.map((example, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">{example.name}</h4>
                      <p className="text-sm text-gray-600 mb-3">{example.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-2">Input Example:</p>
                          <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(example.inputs, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-2">Expected Output:</p>
                          <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(example.expectedOutputs, null, 2)}
                          </pre>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Use Case:</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {example.useCase}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documentation' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Setup Instructions</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                    {template.documentation.setupInstructions}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Troubleshooting</h3>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-yellow-800">{template.documentation.troubleshooting}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Frequently Asked Questions</h3>
                <div className="space-y-3">
                  {template.documentation.faq.map((faq, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 mb-1">{faq.question}</p>
                          <p className="text-sm text-gray-600">{faq.answer}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZKPTemplateDetails;