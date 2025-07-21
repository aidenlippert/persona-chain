// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title PERS Rewards Distribution Contract
 * @notice Manages credential verification rewards
 */
contract PERSRewards is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    IERC20 public immutable persToken;
    address public rewardWallet;
    
    // Reward configuration
    struct RewardConfig {
        uint256 baseReward;
        uint256 zkProofBonus;
        uint256 crossChainBonus;
        bool isActive;
    }
    
    // Credential types and their rewards
    mapping(string => RewardConfig) public rewardConfigs;
    
    // User reward tracking
    struct UserRewards {
        uint256 totalEarned;
        uint256 totalClaimed;
        uint256 pendingRewards;
        uint256 lastClaimTime;
        mapping(string => uint256) credentialRewards;
    }
    
    mapping(address => UserRewards) public userRewards;
    
    // Daily reward limits
    mapping(address => mapping(uint256 => uint256)) public dailyRewardsClaimed;
    uint256 public constant DAILY_REWARD_LIMIT = 1000 * 10**18; // 1000 PERS per day
    
    // Cooldown periods
    mapping(address => mapping(string => uint256)) public lastVerificationTime;
    uint256 public constant VERIFICATION_COOLDOWN = 24 hours;
    
    // Statistics
    uint256 public totalRewardsDistributed;
    uint256 public totalVerifications;
    mapping(string => uint256) public verificationsByType;
    
    // Events
    event RewardConfigured(string credentialType, uint256 baseReward, bool isActive);
    event RewardEarned(address indexed user, string credentialType, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event VerificationRecorded(address indexed user, string credentialType, bool withZkProof);
    
    constructor(address _persToken, address _rewardWallet) {
        require(_persToken != address(0), "Invalid token address");
        require(_rewardWallet != address(0), "Invalid reward wallet");
        
        persToken = IERC20(_persToken);
        rewardWallet = _rewardWallet;
        
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(OPERATOR_ROLE, msg.sender);
        
        // Initialize default reward configs
        _initializeRewardConfigs();
    }
    
    /**
     * @notice Initialize default reward configurations
     */
    function _initializeRewardConfigs() private {
        // Basic credentials
        rewardConfigs["github_basic"] = RewardConfig({
            baseReward: 10 * 10**18,
            zkProofBonus: 5 * 10**18,
            crossChainBonus: 3 * 10**18,
            isActive: true
        });
        
        rewardConfigs["linkedin_professional"] = RewardConfig({
            baseReward: 15 * 10**18,
            zkProofBonus: 7 * 10**18,
            crossChainBonus: 5 * 10**18,
            isActive: true
        });
        
        // Financial credentials
        rewardConfigs["plaid_income"] = RewardConfig({
            baseReward: 25 * 10**18,
            zkProofBonus: 10 * 10**18,
            crossChainBonus: 8 * 10**18,
            isActive: true
        });
        
        rewardConfigs["bank_account"] = RewardConfig({
            baseReward: 20 * 10**18,
            zkProofBonus: 8 * 10**18,
            crossChainBonus: 6 * 10**18,
            isActive: true
        });
        
        // Advanced credentials
        rewardConfigs["education_degree"] = RewardConfig({
            baseReward: 30 * 10**18,
            zkProofBonus: 15 * 10**18,
            crossChainBonus: 10 * 10**18,
            isActive: true
        });
        
        rewardConfigs["employment_history"] = RewardConfig({
            baseReward: 35 * 10**18,
            zkProofBonus: 15 * 10**18,
            crossChainBonus: 12 * 10**18,
            isActive: true
        });
        
        // Web3 credentials
        rewardConfigs["discord_verified"] = RewardConfig({
            baseReward: 8 * 10**18,
            zkProofBonus: 4 * 10**18,
            crossChainBonus: 3 * 10**18,
            isActive: true
        });
        
        rewardConfigs["twitter_verified"] = RewardConfig({
            baseReward: 12 * 10**18,
            zkProofBonus: 6 * 10**18,
            crossChainBonus: 4 * 10**18,
            isActive: true
        });
    }
    
    /**
     * @notice Record a credential verification and distribute rewards
     * @param user User address
     * @param credentialType Type of credential verified
     * @param withZkProof Whether verification includes ZK proof
     * @param isCrossChain Whether verification is cross-chain
     */
    function recordVerification(
        address user,
        string calldata credentialType,
        bool withZkProof,
        bool isCrossChain
    ) external onlyRole(VERIFIER_ROLE) nonReentrant whenNotPaused {
        require(user != address(0), "Invalid user address");
        require(rewardConfigs[credentialType].isActive, "Credential type not active");
        
        // Check cooldown
        require(
            block.timestamp >= lastVerificationTime[user][credentialType] + VERIFICATION_COOLDOWN,
            "Verification on cooldown"
        );
        
        // Calculate reward
        uint256 reward = _calculateReward(credentialType, withZkProof, isCrossChain);
        
        // Check daily limit
        uint256 today = block.timestamp / 1 days;
        require(
            dailyRewardsClaimed[user][today] + reward <= DAILY_REWARD_LIMIT,
            "Daily reward limit exceeded"
        );
        
        // Update user rewards
        userRewards[user].pendingRewards += reward;
        userRewards[user].totalEarned += reward;
        userRewards[user].credentialRewards[credentialType] += reward;
        
        // Update tracking
        dailyRewardsClaimed[user][today] += reward;
        lastVerificationTime[user][credentialType] = block.timestamp;
        
        // Update statistics
        totalVerifications++;
        verificationsByType[credentialType]++;
        
        emit RewardEarned(user, credentialType, reward);
        emit VerificationRecorded(user, credentialType, withZkProof);
    }
    
    /**
     * @notice Calculate reward amount
     */
    function _calculateReward(
        string memory credentialType,
        bool withZkProof,
        bool isCrossChain
    ) private view returns (uint256) {
        RewardConfig memory config = rewardConfigs[credentialType];
        uint256 reward = config.baseReward;
        
        if (withZkProof) {
            reward += config.zkProofBonus;
        }
        
        if (isCrossChain) {
            reward += config.crossChainBonus;
        }
        
        return reward;
    }
    
    /**
     * @notice Claim pending rewards
     */
    function claimRewards() external nonReentrant {
        UserRewards storage userReward = userRewards[msg.sender];
        uint256 claimable = userReward.pendingRewards;
        
        require(claimable > 0, "No rewards to claim");
        
        // Update user data
        userReward.pendingRewards = 0;
        userReward.totalClaimed += claimable;
        userReward.lastClaimTime = block.timestamp;
        
        // Update global statistics
        totalRewardsDistributed += claimable;
        
        // Transfer rewards
        require(
            persToken.transferFrom(rewardWallet, msg.sender, claimable),
            "Reward transfer failed"
        );
        
        emit RewardsClaimed(msg.sender, claimable);
    }
    
    /**
     * @notice Configure reward for a credential type
     */
    function configureReward(
        string calldata credentialType,
        uint256 baseReward,
        uint256 zkProofBonus,
        uint256 crossChainBonus,
        bool isActive
    ) external onlyRole(OPERATOR_ROLE) {
        rewardConfigs[credentialType] = RewardConfig({
            baseReward: baseReward,
            zkProofBonus: zkProofBonus,
            crossChainBonus: crossChainBonus,
            isActive: isActive
        });
        
        emit RewardConfigured(credentialType, baseReward, isActive);
    }
    
    /**
     * @notice Get user's pending rewards
     */
    function getPendingRewards(address user) external view returns (uint256) {
        return userRewards[user].pendingRewards;
    }
    
    /**
     * @notice Get user's total earned rewards
     */
    function getTotalEarned(address user) external view returns (uint256) {
        return userRewards[user].totalEarned;
    }
    
    /**
     * @notice Get user's rewards for specific credential type
     */
    function getCredentialRewards(
        address user,
        string calldata credentialType
    ) external view returns (uint256) {
        return userRewards[user].credentialRewards[credentialType];
    }
    
    /**
     * @notice Get daily rewards claimed by user
     */
    function getDailyRewardsClaimed(address user) external view returns (uint256) {
        uint256 today = block.timestamp / 1 days;
        return dailyRewardsClaimed[user][today];
    }
    
    /**
     * @notice Check if user can verify credential type
     */
    function canVerifyCredential(
        address user,
        string calldata credentialType
    ) external view returns (bool) {
        if (!rewardConfigs[credentialType].isActive) return false;
        
        // Check cooldown
        if (block.timestamp < lastVerificationTime[user][credentialType] + VERIFICATION_COOLDOWN) {
            return false;
        }
        
        // Check daily limit
        uint256 today = block.timestamp / 1 days;
        uint256 potentialReward = rewardConfigs[credentialType].baseReward;
        if (dailyRewardsClaimed[user][today] + potentialReward > DAILY_REWARD_LIMIT) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @notice Update reward wallet
     */
    function updateRewardWallet(address newWallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newWallet != address(0), "Invalid wallet address");
        rewardWallet = newWallet;
    }
    
    /**
     * @notice Pause reward distribution
     */
    function pause() external onlyRole(OPERATOR_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause reward distribution
     */
    function unpause() external onlyRole(OPERATOR_ROLE) {
        _unpause();
    }
}