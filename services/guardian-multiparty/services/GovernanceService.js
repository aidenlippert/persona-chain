/**
 * Governance Service
 * Democratic decision-making for credential issuance and policy changes
 * Implements voting mechanisms, proposal management, and consensus protocols
 */

import crypto from 'crypto';
import NodeCache from 'node-cache';
import winston from 'winston';

export default class GovernanceService {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger || winston.createLogger({ silent: true });
        this.cache = new NodeCache({ stdTTL: 1800 }); // 30 minute cache
        
        // Proposal storage (in production, use persistent database)
        this.proposals = new Map();
        this.votes = new Map();
        
        // Governance configuration
        this.governanceConfig = {
            votingPeriod: config.governance?.votingPeriod || 7 * 24 * 60 * 60 * 1000, // 7 days
            quorumThreshold: config.governance?.quorumThreshold || 0.6, // 60%
            approvalThreshold: config.governance?.approvalThreshold || 0.5, // 50%
            emergencyThreshold: config.governance?.emergencyThreshold || 0.8, // 80%
            gracePeriod: config.governance?.gracePeriod || 24 * 60 * 60 * 1000, // 24 hours
        };
        
        // Proposal types and their requirements
        this.proposalTypes = {
            GUARDIAN_ADDITION: {
                name: 'Guardian Addition',
                description: 'Add a new guardian to the system',
                requiredApprovals: 0.6, // 60%
                votingPeriod: this.governanceConfig.votingPeriod,
                emergencyVoting: false,
            },
            GUARDIAN_REMOVAL: {
                name: 'Guardian Removal',
                description: 'Remove a guardian from the system',
                requiredApprovals: 0.7, // 70%
                votingPeriod: this.governanceConfig.votingPeriod,
                emergencyVoting: true,
            },
            POLICY_UPDATE: {
                name: 'Policy Update',
                description: 'Update governance or security policies',
                requiredApprovals: 0.6, // 60%
                votingPeriod: this.governanceConfig.votingPeriod,
                emergencyVoting: false,
            },
            THRESHOLD_CHANGE: {
                name: 'Threshold Change',
                description: 'Change signing threshold requirements',
                requiredApprovals: 0.8, // 80%
                votingPeriod: this.governanceConfig.votingPeriod * 2, // Extended period
                emergencyVoting: false,
            },
            EMERGENCY_ACTION: {
                name: 'Emergency Action',
                description: 'Emergency governance action',
                requiredApprovals: 0.8, // 80%
                votingPeriod: 24 * 60 * 60 * 1000, // 24 hours
                emergencyVoting: true,
            },
            CREDENTIAL_POLICY: {
                name: 'Credential Policy',
                description: 'Update credential issuance policies',
                requiredApprovals: 0.5, // 50%
                votingPeriod: this.governanceConfig.votingPeriod,
                emergencyVoting: false,
            },
            SYSTEM_UPGRADE: {
                name: 'System Upgrade',
                description: 'Approve system upgrades or maintenance',
                requiredApprovals: 0.7, // 70%
                votingPeriod: this.governanceConfig.votingPeriod,
                emergencyVoting: true,
            }
        };
        
        // Vote types
        this.voteTypes = {
            APPROVE: 'approve',
            REJECT: 'reject',
            ABSTAIN: 'abstain'
        };
        
        // Proposal statuses
        this.proposalStatuses = {
            DRAFT: 'draft',
            ACTIVE: 'active',
            APPROVED: 'approved',
            REJECTED: 'rejected',
            EXPIRED: 'expired',
            EXECUTED: 'executed',
            CANCELLED: 'cancelled'
        };
        
        this.logger.info('Governance service initialized', {
            votingPeriod: this.governanceConfig.votingPeriod,
            quorumThreshold: this.governanceConfig.quorumThreshold,
            proposalTypes: Object.keys(this.proposalTypes).length
        });
    }
    
    /**
     * Create a new governance proposal
     */
    async createProposal(proposalData) {
        try {
            const {
                title,
                description,
                type,
                actions,
                metadata,
                proposer,
                timestamp
            } = proposalData;
            
            this.logger.info('Creating governance proposal', { title, type, proposer });
            
            // Validate proposal type
            if (!this.proposalTypes[type]) {
                throw new Error(`Invalid proposal type: ${type}`);
            }
            
            const proposalType = this.proposalTypes[type];
            const proposalId = crypto.randomUUID();
            
            // Calculate voting deadline
            const votingStartTime = new Date();
            const votingEndTime = new Date(votingStartTime.getTime() + proposalType.votingPeriod);
            
            // Create proposal
            const proposal = {
                id: proposalId,
                title,
                description,
                type,
                actions: this.validateAndNormalizeActions(actions, type),
                metadata: {
                    ...metadata,
                    version: '1.0',
                    chainId: this.config.chainId || 'persona-chain-1'
                },
                proposer,
                status: this.proposalStatuses.DRAFT,
                
                // Voting configuration
                voting: {
                    startTime: votingStartTime.toISOString(),
                    endTime: votingEndTime.toISOString(),
                    period: proposalType.votingPeriod,
                    quorumRequired: this.governanceConfig.quorumThreshold,
                    approvalRequired: proposalType.requiredApprovals,
                    emergencyVoting: proposalType.emergencyVoting
                },
                
                // Vote tracking
                votes: [],
                voteCount: {
                    approve: 0,
                    reject: 0,
                    abstain: 0,
                    total: 0
                },
                
                // Timestamps
                createdAt: timestamp || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                
                // Execution
                executionPlan: this.createExecutionPlan(actions, type),
                executedAt: null,
                executionResult: null
            };
            
            // Store proposal
            this.proposals.set(proposalId, proposal);
            
            // Activate proposal (move to voting)
            await this.activateProposal(proposalId);
            
            this.logger.info('Governance proposal created', {
                proposalId,
                title,
                type,
                votingEndTime: proposal.voting.endTime
            });
            
            return proposal;
            
        } catch (error) {
            this.logger.error('Failed to create proposal', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Activate proposal for voting
     */
    async activateProposal(proposalId) {
        try {
            const proposal = this.proposals.get(proposalId);
            if (!proposal) {
                throw new Error('Proposal not found');
            }
            
            if (proposal.status !== this.proposalStatuses.DRAFT) {
                throw new Error('Proposal is not in draft status');
            }
            
            // Update proposal status
            proposal.status = this.proposalStatuses.ACTIVE;
            proposal.updatedAt = new Date().toISOString();
            
            // Set up automatic expiration
            setTimeout(() => {
                this.checkProposalExpiration(proposalId);
            }, proposal.voting.period);
            
            this.logger.info('Proposal activated for voting', {
                proposalId,
                endTime: proposal.voting.endTime
            });
            
            return proposal;
            
        } catch (error) {
            this.logger.error('Failed to activate proposal', { 
                proposalId, 
                error: error.message 
            });
            throw error;
        }
    }
    
    /**
     * Record a vote on a proposal
     */
    async recordVote(proposalId, voteData) {
        try {
            const { guardianId, vote, signature, comments, timestamp } = voteData;
            
            this.logger.info('Recording vote', { proposalId, guardianId, vote });
            
            const proposal = this.proposals.get(proposalId);
            if (!proposal) {
                throw new Error('Proposal not found');
            }
            
            // Validate voting is active
            if (proposal.status !== this.proposalStatuses.ACTIVE) {
                throw new Error('Proposal is not active for voting');
            }
            
            const now = new Date();
            const endTime = new Date(proposal.voting.endTime);
            if (now > endTime) {
                throw new Error('Voting period has ended');
            }
            
            // Validate vote type
            if (!Object.values(this.voteTypes).includes(vote)) {
                throw new Error(`Invalid vote type: ${vote}`);
            }
            
            // Check if guardian already voted
            const existingVote = proposal.votes.find(v => v.guardianId === guardianId);
            if (existingVote) {
                throw new Error('Guardian has already voted on this proposal');
            }
            
            // Create vote record
            const voteRecord = {
                id: crypto.randomUUID(),
                proposalId,
                guardianId,
                vote,
                signature,
                comments,
                timestamp: timestamp || new Date().toISOString(),
                blockHeight: metadata?.blockHeight || null,
                verified: true // Signature already verified by calling function
            };
            
            // Add vote to proposal
            proposal.votes.push(voteRecord);
            
            // Update vote counts
            proposal.voteCount[vote]++;
            proposal.voteCount.total++;
            proposal.updatedAt = new Date().toISOString();
            
            // Check if proposal can be resolved
            await this.checkProposalResolution(proposalId);
            
            this.logger.info('Vote recorded successfully', {
                proposalId,
                guardianId,
                vote,
                totalVotes: proposal.voteCount.total
            });
            
            return voteRecord;
            
        } catch (error) {
            this.logger.error('Failed to record vote', { 
                proposalId, 
                error: error.message 
            });
            throw error;
        }
    }
    
    /**
     * Check if proposal can be resolved
     */
    async checkProposalResolution(proposalId) {
        try {
            const proposal = this.proposals.get(proposalId);
            if (!proposal || proposal.status !== this.proposalStatuses.ACTIVE) {
                return;
            }
            
            // Get total number of eligible guardians
            const totalGuardians = await this.getTotalActiveGuardians();
            
            // Check quorum
            const participationRate = proposal.voteCount.total / totalGuardians;
            const quorumMet = participationRate >= proposal.voting.quorumRequired;
            
            // Check if voting period ended
            const now = new Date();
            const endTime = new Date(proposal.voting.endTime);
            const votingEnded = now >= endTime;
            
            // Determine if proposal should be resolved
            const shouldResolve = votingEnded || 
                (quorumMet && this.canEarlyResolve(proposal, totalGuardians));
            
            if (shouldResolve) {
                await this.resolveProposal(proposalId, totalGuardians);
            }
            
        } catch (error) {
            this.logger.error('Failed to check proposal resolution', { 
                proposalId, 
                error: error.message 
            });
        }
    }
    
    /**
     * Resolve proposal based on votes
     */
    async resolveProposal(proposalId, totalGuardians) {
        try {
            const proposal = this.proposals.get(proposalId);
            if (!proposal) {
                throw new Error('Proposal not found');
            }
            
            this.logger.info('Resolving proposal', {
                proposalId,
                totalVotes: proposal.voteCount.total,
                totalGuardians
            });
            
            // Calculate participation and approval rates
            const participationRate = proposal.voteCount.total / totalGuardians;
            const approvalRate = proposal.voteCount.approve / proposal.voteCount.total;
            
            // Check quorum
            const quorumMet = participationRate >= proposal.voting.quorumRequired;
            
            // Determine outcome
            let newStatus;
            let resolutionReason;
            
            if (!quorumMet) {
                newStatus = this.proposalStatuses.REJECTED;
                resolutionReason = 'Insufficient participation (quorum not met)';
            } else if (approvalRate >= proposal.voting.approvalRequired) {
                newStatus = this.proposalStatuses.APPROVED;
                resolutionReason = 'Sufficient approval votes received';
            } else {
                newStatus = this.proposalStatuses.REJECTED;
                resolutionReason = 'Insufficient approval votes';
            }
            
            // Update proposal
            proposal.status = newStatus;
            proposal.resolvedAt = new Date().toISOString();
            proposal.resolution = {
                reason: resolutionReason,
                participationRate: Math.round(participationRate * 10000) / 100,
                approvalRate: Math.round(approvalRate * 10000) / 100,
                quorumMet,
                finalVoteCount: { ...proposal.voteCount }
            };
            proposal.updatedAt = new Date().toISOString();
            
            this.logger.info('Proposal resolved', {
                proposalId,
                status: newStatus,
                participationRate: proposal.resolution.participationRate,
                approvalRate: proposal.resolution.approvalRate
            });
            
            return proposal;
            
        } catch (error) {
            this.logger.error('Failed to resolve proposal', { 
                proposalId, 
                error: error.message 
            });
            throw error;
        }
    }
    
    /**
     * Get proposal by ID
     */
    async getProposal(proposalId) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal) {
            throw new Error('Proposal not found');
        }
        return proposal;
    }
    
    /**
     * Get all proposals with filters
     */
    async getProposals(filters = {}) {
        try {
            let proposals = Array.from(this.proposals.values());
            
            // Apply filters
            if (filters.status) {
                proposals = proposals.filter(p => p.status === filters.status);
            }
            
            if (filters.type) {
                proposals = proposals.filter(p => p.type === filters.type);
            }
            
            if (filters.proposer) {
                proposals = proposals.filter(p => p.proposer === filters.proposer);
            }
            
            if (filters.fromDate) {
                const fromDate = new Date(filters.fromDate);
                proposals = proposals.filter(p => new Date(p.createdAt) >= fromDate);
            }
            
            if (filters.toDate) {
                const toDate = new Date(filters.toDate);
                proposals = proposals.filter(p => new Date(p.createdAt) <= toDate);
            }
            
            // Sort by creation date (newest first)
            proposals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            // Apply pagination
            const limit = filters.limit || 50;
            const offset = filters.offset || 0;
            const paginatedProposals = proposals.slice(offset, offset + limit);
            
            return {
                proposals: paginatedProposals,
                total: proposals.length,
                limit,
                offset
            };
            
        } catch (error) {
            this.logger.error('Failed to get proposals', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Get voting statistics
     */
    async getVotingStatistics(proposalId) {
        try {
            const proposal = this.proposals.get(proposalId);
            if (!proposal) {
                throw new Error('Proposal not found');
            }
            
            const totalGuardians = await this.getTotalActiveGuardians();
            const participationRate = proposal.voteCount.total / totalGuardians;
            
            const statistics = {
                proposalId,
                totalGuardians,
                votescast: proposal.voteCount.total,
                participationRate: Math.round(participationRate * 10000) / 100,
                voteBreakdown: {
                    approve: {
                        count: proposal.voteCount.approve,
                        percentage: Math.round((proposal.voteCount.approve / proposal.voteCount.total) * 10000) / 100
                    },
                    reject: {
                        count: proposal.voteCount.reject,
                        percentage: Math.round((proposal.voteCount.reject / proposal.voteCount.total) * 10000) / 100
                    },
                    abstain: {
                        count: proposal.voteCount.abstain,
                        percentage: Math.round((proposal.voteCount.abstain / proposal.voteCount.total) * 10000) / 100
                    }
                },
                thresholds: {
                    quorum: proposal.voting.quorumRequired * 100,
                    approval: proposal.voting.approvalRequired * 100
                },
                status: {
                    quorumMet: participationRate >= proposal.voting.quorumRequired,
                    approvalMet: (proposal.voteCount.approve / proposal.voteCount.total) >= proposal.voting.approvalRequired
                },
                timeRemaining: this.calculateTimeRemaining(proposal.voting.endTime)
            };
            
            return statistics;
            
        } catch (error) {
            this.logger.error('Failed to get voting statistics', { 
                proposalId, 
                error: error.message 
            });
            throw error;
        }
    }
    
    // Utility methods
    
    validateAndNormalizeActions(actions, proposalType) {
        if (!actions || !Array.isArray(actions)) {
            throw new Error('Actions must be an array');
        }
        
        return actions.map((action, index) => ({
            id: crypto.randomUUID(),
            index,
            type: action.type,
            target: action.target,
            parameters: action.parameters || {},
            validation: this.validateAction(action, proposalType),
            executionOrder: index + 1
        }));
    }
    
    validateAction(action, proposalType) {
        // Basic action validation
        if (!action.type) {
            throw new Error('Action type is required');
        }
        
        // Proposal type specific validation
        switch (proposalType) {
            case 'GUARDIAN_ADDITION':
                if (action.type !== 'add_guardian') {
                    throw new Error('Invalid action type for guardian addition proposal');
                }
                break;
            case 'GUARDIAN_REMOVAL':
                if (action.type !== 'remove_guardian') {
                    throw new Error('Invalid action type for guardian removal proposal');
                }
                break;
            // Add more validations as needed
        }
        
        return { valid: true, validatedAt: new Date().toISOString() };
    }
    
    createExecutionPlan(actions, proposalType) {
        return {
            id: crypto.randomUUID(),
            type: proposalType,
            steps: actions.map((action, index) => ({
                stepNumber: index + 1,
                action: action.type,
                target: action.target,
                parameters: action.parameters,
                dependencies: [], // Could specify step dependencies
                estimatedDuration: this.estimateActionDuration(action.type),
                rollbackPlan: this.createRollbackPlan(action)
            })),
            estimatedTotalDuration: this.estimateTotalDuration(actions),
            requiresManualIntervention: this.requiresManualIntervention(actions),
            createdAt: new Date().toISOString()
        };
    }
    
    estimateActionDuration(actionType) {
        const durations = {
            add_guardian: 300000, // 5 minutes
            remove_guardian: 180000, // 3 minutes
            update_policy: 600000, // 10 minutes
            change_threshold: 900000, // 15 minutes
        };
        return durations[actionType] || 300000;
    }
    
    estimateTotalDuration(actions) {
        return actions.reduce((total, action) => {
            return total + this.estimateActionDuration(action.type);
        }, 0);
    }
    
    requiresManualIntervention(actions) {
        const manualActions = ['system_upgrade', 'emergency_action'];
        return actions.some(action => manualActions.includes(action.type));
    }
    
    createRollbackPlan(action) {
        return {
            type: 'automatic',
            steps: [`Reverse ${action.type}`],
            requiresApproval: false
        };
    }
    
    async getTotalActiveGuardians() {
        // Mock implementation - should get from GuardianManagementService
        return 7; // Example: 7 active guardians
    }
    
    canEarlyResolve(proposal, totalGuardians) {
        // Check if proposal can be resolved early (before voting period ends)
        const remainingVotes = totalGuardians - proposal.voteCount.total;
        const currentApprovalRate = proposal.voteCount.approve / proposal.voteCount.total;
        const maxPossibleApprovalRate = (proposal.voteCount.approve + remainingVotes) / totalGuardians;
        
        // Early approval: even if all remaining votes are reject, proposal would pass
        if (currentApprovalRate >= proposal.voting.approvalRequired && 
            proposal.voteCount.approve / totalGuardians >= proposal.voting.approvalRequired) {
            return true;
        }
        
        // Early rejection: even if all remaining votes are approve, proposal would fail
        if (maxPossibleApprovalRate < proposal.voting.approvalRequired) {
            return true;
        }
        
        return false;
    }
    
    async checkProposalExpiration(proposalId) {
        try {
            const proposal = this.proposals.get(proposalId);
            if (!proposal || proposal.status !== this.proposalStatuses.ACTIVE) {
                return;
            }
            
            const now = new Date();
            const endTime = new Date(proposal.voting.endTime);
            
            if (now >= endTime) {
                await this.resolveProposal(proposalId, await this.getTotalActiveGuardians());
            }
        } catch (error) {
            this.logger.error('Failed to check proposal expiration', { 
                proposalId, 
                error: error.message 
            });
        }
    }
    
    calculateTimeRemaining(endTime) {
        const now = new Date();
        const end = new Date(endTime);
        const remaining = Math.max(0, end.getTime() - now.getTime());
        
        if (remaining === 0) {
            return 'Voting ended';
        }
        
        const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
        const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const activeProposals = Array.from(this.proposals.values())
                .filter(p => p.status === this.proposalStatuses.ACTIVE).length;
                
            return {
                status: 'healthy',
                totalProposals: this.proposals.size,
                activeProposals,
                totalVotes: this.votes.size,
                governanceConfig: this.governanceConfig,
                lastChecked: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                lastChecked: new Date().toISOString()
            };
        }
    }
}