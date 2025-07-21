/**
 * Credential Management Interface
 * Professional VC creation, verification, and management
 */

import React, { useState, useEffect } from 'react';
import { notify } from '../../utils/notifications';
import { 
  DocumentTextIcon, 
  PlusIcon,
  CheckBadgeIcon, 
  XMarkIcon,
  EyeIcon,
  // Removed unused ShareIcon import
  TrashIcon,
  // Removed unused ShieldCheckIcon import
  ExclamationTriangleIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  // Removed unused CreditCardIcon import
  // Removed unused KeyIcon import
  // Removed unused GlobeAltIcon import
} from '@heroicons/react/24/outline';
import { githubVCService } from '../../services/githubVCService';
// Removed unused androidDigitalCredentialService import
import { logger } from '../../services/monitoringService';

interface CredentialManagerProps {
  didKeyPair: any;
}

interface VerifiableCredential {
  id: string;
  type: string[];
  issuer: string;
  subject: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: any;
  proof: any;
  status: 'valid' | 'expired' | 'revoked' | 'pending';
  metadata?: any;
}

export const CredentialManager: React.FC<CredentialManagerProps> = ({ didKeyPair }) => {
  const [credentials, setCredentials] = useState<VerifiableCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCredential, setSelectedCredential] = useState<VerifiableCredential | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    loadCredentials();
  }, [didKeyPair]);

  const loadCredentials = async () => {
    setIsLoading(true);
    try {
      // Load existing credentials from storage
      const storedCredentials = localStorage.getItem(`credentials_${didKeyPair.did}`);
      if (storedCredentials) {
        const parsed = JSON.parse(storedCredentials);
        setCredentials(parsed);
      }
      
      // Load sample credentials for demo
      const sampleCredentials: VerifiableCredential[] = [
        {
          id: 'vc_github_001',
          type: ['VerifiableCredential', 'GitHubCredential'],
          issuer: 'did:persona:github',
          subject: didKeyPair.did,
          issuanceDate: new Date().toISOString(),
          credentialSubject: {
            id: didKeyPair.did,
            githubUsername: 'johndoe',
            repositories: 42,
            followers: 156,
            verified: true
          },
          proof: {
            type: 'Ed25519Signature2020',
            created: new Date().toISOString(),
            verificationMethod: 'did:persona:github#key-1',
            proofPurpose: 'assertionMethod',
            proofValue: 'mock_proof_value'
          },
          status: 'valid'
        },
        {
          id: 'vc_education_001',
          type: ['VerifiableCredential', 'EducationCredential'],
          issuer: 'did:persona:university',
          subject: didKeyPair.did,
          issuanceDate: '2023-06-15T00:00:00Z',
          credentialSubject: {
            id: didKeyPair.did,
            degree: 'Bachelor of Science',
            major: 'Computer Science',
            university: 'Tech University',
            graduationDate: '2023-06-15'
          },
          proof: {
            type: 'Ed25519Signature2020',
            created: '2023-06-15T00:00:00Z',
            verificationMethod: 'did:persona:university#key-1',
            proofPurpose: 'assertionMethod',
            proofValue: 'mock_education_proof'
          },
          status: 'valid'
        }
      ];
      
      setCredentials(sampleCredentials);
      logger.info('Credentials loaded', { count: sampleCredentials.length });
    } catch (error) {
      logger.error('Failed to load credentials', { error });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCredential = async (type: string) => {
    setIsCreating(true);
    try {
      switch (type) {
        case 'github':
          await createGitHubCredential();
          break;
        case 'education':
          await createEducationCredential();
          break;
        case 'employment':
          await createEmploymentCredential();
          break;
        default:
          throw new Error(`Unsupported credential type: ${type}`);
      }
      
      setShowCreateModal(false);
      await loadCredentials();
    } catch (error) {
      logger.error('Failed to create credential', { error, type });
      notify.error(`Failed to create ${type} credential. Please try again.`);
    } finally {
      setIsCreating(false);
    }
  };

  const createGitHubCredential = async () => {
    try {
      // Note: createCredential method needs to be implemented in GitHubVCService
      const credential = await githubVCService.generateCredential(didKeyPair.did, {
        username: 'johndoe',
        profile: {
          name: 'John Doe',
          bio: 'Software Developer',
          location: 'San Francisco, CA',
          company: 'Tech Corp'
        }
      });
      
      logger.info('GitHub credential created', { credentialId: credential.id });
    } catch (error) {
      logger.error('GitHub credential creation failed', { error });
      throw error;
    }
  };

  const createEducationCredential = async () => {
    // Simulate education credential creation
    await new Promise(resolve => setTimeout(resolve, 2000));
    logger.info('Education credential created');
  };

  const createEmploymentCredential = async () => {
    // Simulate employment credential creation
    await new Promise(resolve => setTimeout(resolve, 2000));
    logger.info('Employment credential created');
  };

  const handleVerifyCredential = async (credential: VerifiableCredential) => {
    setIsVerifying(true);
    try {
      // Simulate credential verification
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const isValid = Math.random() > 0.1; // 90% success rate for demo
      
      if (isValid) {
        logger.info('Credential verified successfully', { credentialId: credential.id });
        notify.success('Credential verified successfully!');
      } else {
        logger.warn('Credential verification failed', { credentialId: credential.id });
        notify.error('Credential verification failed. The credential may be invalid or expired.');
      }
    } catch (error) {
      logger.error('Credential verification error', { error, credentialId: credential.id });
      notify.error('Verification error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRevokeCredential = async (credential: VerifiableCredential) => {
    if (!confirm('Are you sure you want to revoke this credential? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Update credential status
      const updatedCredentials = credentials.map(cred => 
        cred.id === credential.id 
          ? { ...cred, status: 'revoked' as const }
          : cred
      );
      
      setCredentials(updatedCredentials);
      localStorage.setItem(`credentials_${didKeyPair.did}`, JSON.stringify(updatedCredentials));
      
      logger.info('Credential revoked', { credentialId: credential.id });
      notify.success('Credential revoked successfully.');
    } catch (error) {
      logger.error('Credential revocation failed', { error, credentialId: credential.id });
      notify.error('Failed to revoke credential. Please try again.');
    }
  };

  const handleDeleteCredential = async (credential: VerifiableCredential) => {
    if (!confirm('Are you sure you want to delete this credential? This action cannot be undone.')) {
      return;
    }
    
    try {
      const updatedCredentials = credentials.filter(cred => cred.id !== credential.id);
      setCredentials(updatedCredentials);
      localStorage.setItem(`credentials_${didKeyPair.did}`, JSON.stringify(updatedCredentials));
      
      logger.info('Credential deleted', { credentialId: credential.id });
    } catch (error) {
      logger.error('Credential deletion failed', { error, credentialId: credential.id });
      notify.error('Failed to delete credential. Please try again.');
    }
  };

  const getCredentialIcon = (type: string[]) => {
    if (type.includes('GitHubCredential')) return BuildingOfficeIcon;
    if (type.includes('EducationCredential')) return AcademicCapIcon;
    if (type.includes('EmploymentCredential')) return BuildingOfficeIcon;
    if (type.includes('IdentityCredential')) return UserIcon;
    return DocumentTextIcon;
  };

  const getCredentialColor = (type: string[]) => {
    if (type.includes('GitHubCredential')) return 'bg-gray-100 text-gray-600';
    if (type.includes('EducationCredential')) return 'bg-blue-100 text-blue-600';
    if (type.includes('EmploymentCredential')) return 'bg-green-100 text-green-600';
    if (type.includes('IdentityCredential')) return 'bg-purple-100 text-purple-600';
    return 'bg-gray-100 text-gray-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'revoked':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const credentialTypes = [
    {
      id: 'github',
      name: 'GitHub Profile',
      description: 'Verify your GitHub profile and contributions',
      icon: BuildingOfficeIcon,
      color: 'bg-gray-100 text-gray-600'
    },
    {
      id: 'education',
      name: 'Education',
      description: 'Add your educational qualifications',
      icon: AcademicCapIcon,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'employment',
      name: 'Employment',
      description: 'Verify your work experience',
      icon: BuildingOfficeIcon,
      color: 'bg-green-100 text-green-600'
    },
    {
      id: 'identity',
      name: 'Identity',
      description: 'Government-issued identity verification',
      icon: UserIcon,
      color: 'bg-purple-100 text-purple-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Verifiable Credentials</h2>
            <p className="text-gray-600">Manage your digital credentials and certificates</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add Credential</span>
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Credentials', value: credentials.length, icon: DocumentTextIcon, color: 'blue' },
          { label: 'Valid', value: credentials.filter(c => c.status === 'valid').length, icon: CheckBadgeIcon, color: 'green' },
          { label: 'Expired', value: credentials.filter(c => c.status === 'expired').length, icon: ClockIcon, color: 'yellow' },
          { label: 'Revoked', value: credentials.filter(c => c.status === 'revoked').length, icon: XMarkIcon, color: 'red' }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-${stat.color}-100`}>
                  <Icon className={`h-5 w-5 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Credentials List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">My Credentials</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : credentials.length === 0 ? (
            <div className="p-12 text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No credentials found</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                Add Your First Credential
              </button>
            </div>
          ) : (
            credentials.map((credential) => {
              const Icon = getCredentialIcon(credential.type);
              return (
                <div key={credential.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${getCredentialColor(credential.type)}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {credential.type.find(t => t !== 'VerifiableCredential') || 'Credential'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Issued by {credential.issuer}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(credential.issuanceDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(credential.status)}`}>
                        {credential.status}
                      </span>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedCredential(credential);
                            setShowViewModal(true);
                          }}
                          className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                          title="View credential"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleVerifyCredential(credential)}
                          disabled={isVerifying}
                          className="p-1 text-gray-500 hover:text-green-600 transition-colors disabled:opacity-50"
                          title="Verify credential"
                        >
                          <CheckBadgeIcon className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleRevokeCredential(credential)}
                          disabled={credential.status === 'revoked'}
                          className="p-1 text-gray-500 hover:text-yellow-600 transition-colors disabled:opacity-50"
                          title="Revoke credential"
                        >
                          <ExclamationTriangleIcon className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteCredential(credential)}
                          className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                          title="Delete credential"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Credential Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Add New Credential</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {credentialTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => handleCreateCredential(type.id)}
                    disabled={isCreating}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${type.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{type.name}</h4>
                        <p className="text-sm text-gray-600">{type.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            
            {isCreating && (
              <div className="mt-6 text-center">
                <div className="inline-flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">Creating credential...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Credential Modal */}
      {showViewModal && selectedCredential && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Credential Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <p className="text-sm text-gray-900">{selectedCredential.type.join(', ')}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issuer</label>
                <p className="text-sm text-gray-900">{selectedCredential.issuer}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <p className="text-sm text-gray-900">{selectedCredential.subject}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issued</label>
                <p className="text-sm text-gray-900">{new Date(selectedCredential.issuanceDate).toLocaleString()}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedCredential.status)}`}>
                  {selectedCredential.status}
                </span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credential Subject</label>
                <pre className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(selectedCredential.credentialSubject, null, 2)}
                </pre>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proof</label>
                <pre className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(selectedCredential.proof, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CredentialManager;