// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title PERS Staking Contract
 * @notice Stake PERS tokens to earn rewards and boost trust score
 */
contract PERSStaking is ReentrancyGuard, Ownable, Pausable {
    IERC20 public immutable persToken;
    
    // Staking tiers
    uint256 public constant BRONZE_TIER = 100 * 10**18;      // 100 PERS
    uint256 public constant SILVER_TIER = 1_000 * 10**18;    // 1,000 PERS
    uint256 public constant GOLD_TIER = 10_000 * 10**18;     // 10,000 PERS
    uint256 public constant PLATINUM_TIER = 100_000 * 10**18; // 100,000 PERS
    
    // APY rates (in basis points, 100 = 1%)
    uint256 public constant BRONZE_APY = 1200;    // 12%
    uint256 public constant SILVER_APY = 1500;    // 15%
    uint256 public constant GOLD_APY = 2000;      // 20%
    uint256 public constant PLATINUM_APY = 2500;  // 25%
    
    // Lock period constraints
    uint256 public constant MIN_LOCK_PERIOD = 90 days;
    uint256 public constant MAX_LOCK_PERIOD = 1095 days; // 3 years
    
    struct StakeInfo {
        uint256 amount;
        uint256 startTime;
        uint256 lockPeriod;
        uint256 lastRewardClaim;
        uint256 accumulatedRewards;
        uint8 tier; // 0: None, 1: Bronze, 2: Silver, 3: Gold, 4: Platinum
    }
    
    // User stakes
    mapping(address => StakeInfo) public stakes;
    
    // Trust score components
    mapping(address => uint256) public trustScores;
    
    // Total staked across all users
    uint256 public totalStaked;
    
    // Reward distribution
    address public rewardWallet;
    uint256 public rewardPool;
    uint256 public totalRewardsDistributed;
    
    // Emergency withdrawal fee (2%)
    uint256 public constant EMERGENCY_WITHDRAWAL_FEE = 200;
    
    // Events
    event Staked(address indexed user, uint256 amount, uint256 lockPeriod, uint8 tier);
    event Unstaked(address indexed user, uint256 amount, uint256 rewards);
    event RewardsClaimed(address indexed user, uint256 rewards);
    event EmergencyWithdrawal(address indexed user, uint256 amount, uint256 fee);
    event TrustScoreUpdated(address indexed user, uint256 newScore);
    event RewardPoolFunded(uint256 amount);
    
    constructor(address _persToken, address _rewardWallet) {
        require(_persToken != address(0), "Invalid token address");
        require(_rewardWallet != address(0), "Invalid reward wallet");
        
        persToken = IERC20(_persToken);
        rewardWallet = _rewardWallet;
    }
    
    /**
     * @notice Stake PERS tokens
     * @param amount Amount to stake
     * @param lockPeriod Lock period in seconds
     */
    function stake(uint256 amount, uint256 lockPeriod) external nonReentrant whenNotPaused {
        require(amount >= BRONZE_TIER, "Amount below minimum tier");
        require(lockPeriod >= MIN_LOCK_PERIOD, "Lock period too short");
        require(lockPeriod <= MAX_LOCK_PERIOD, "Lock period too long");
        require(stakes[msg.sender].amount == 0, "Already staking");
        
        // Transfer tokens to contract
        require(persToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // Determine tier
        uint8 tier = _calculateTier(amount);
        
        // Create stake
        stakes[msg.sender] = StakeInfo({
            amount: amount,
            startTime: block.timestamp,
            lockPeriod: lockPeriod,
            lastRewardClaim: block.timestamp,
            accumulatedRewards: 0,
            tier: tier
        });
        
        totalStaked += amount;
        
        // Update trust score
        _updateTrustScore(msg.sender);
        
        emit Staked(msg.sender, amount, lockPeriod, tier);
    }
    
    /**
     * @notice Unstake tokens after lock period
     */
    function unstake() external nonReentrant {
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.amount > 0, "No active stake");
        require(
            block.timestamp >= userStake.startTime + userStake.lockPeriod,
            "Still in lock period"
        );
        
        uint256 amount = userStake.amount;
        uint256 rewards = _calculateRewards(msg.sender);
        uint256 totalAmount = amount + rewards;
        
        // Reset stake
        totalStaked -= amount;
        delete stakes[msg.sender];
        
        // Reset trust score
        trustScores[msg.sender] = 0;
        
        // Transfer tokens and rewards
        require(persToken.transfer(msg.sender, amount), "Transfer failed");
        if (rewards > 0 && rewardPool >= rewards) {
            require(persToken.transferFrom(rewardWallet, msg.sender, rewards), "Reward transfer failed");
            rewardPool -= rewards;
            totalRewardsDistributed += rewards;
        }
        
        emit Unstaked(msg.sender, amount, rewards);
        emit TrustScoreUpdated(msg.sender, 0);
    }
    
    /**
     * @notice Claim accumulated rewards without unstaking
     */
    function claimRewards() external nonReentrant {
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.amount > 0, "No active stake");
        
        uint256 rewards = _calculateRewards(msg.sender);
        require(rewards > 0, "No rewards to claim");
        require(rewardPool >= rewards, "Insufficient reward pool");
        
        userStake.lastRewardClaim = block.timestamp;
        userStake.accumulatedRewards = 0;
        
        // Transfer rewards
        require(persToken.transferFrom(rewardWallet, msg.sender, rewards), "Reward transfer failed");
        rewardPool -= rewards;
        totalRewardsDistributed += rewards;
        
        emit RewardsClaimed(msg.sender, rewards);
    }
    
    /**
     * @notice Emergency withdrawal with fee
     */
    function emergencyWithdraw() external nonReentrant {
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.amount > 0, "No active stake");
        
        uint256 amount = userStake.amount;
        uint256 fee = (amount * EMERGENCY_WITHDRAWAL_FEE) / 10000;
        uint256 withdrawAmount = amount - fee;
        
        // Reset stake
        totalStaked -= amount;
        delete stakes[msg.sender];
        trustScores[msg.sender] = 0;
        
        // Transfer tokens minus fee
        require(persToken.transfer(msg.sender, withdrawAmount), "Transfer failed");
        require(persToken.transfer(rewardWallet, fee), "Fee transfer failed");
        
        emit EmergencyWithdrawal(msg.sender, withdrawAmount, fee);
        emit TrustScoreUpdated(msg.sender, 0);
    }
    
    /**
     * @notice Calculate tier based on staked amount
     */
    function _calculateTier(uint256 amount) private pure returns (uint8) {
        if (amount >= PLATINUM_TIER) return 4;
        if (amount >= GOLD_TIER) return 3;
        if (amount >= SILVER_TIER) return 2;
        if (amount >= BRONZE_TIER) return 1;
        return 0;
    }
    
    /**
     * @notice Calculate pending rewards
     */
    function _calculateRewards(address user) private view returns (uint256) {
        StakeInfo memory userStake = stakes[user];
        if (userStake.amount == 0) return 0;
        
        uint256 timeElapsed = block.timestamp - userStake.lastRewardClaim;
        uint256 apy = _getAPYForTier(userStake.tier);
        
        // Calculate rewards: (amount * apy * timeElapsed) / (365 days * 10000)
        uint256 rewards = (userStake.amount * apy * timeElapsed) / (365 days * 10000);
        
        return rewards + userStake.accumulatedRewards;
    }
    
    /**
     * @notice Get APY for tier
     */
    function _getAPYForTier(uint8 tier) private pure returns (uint256) {
        if (tier == 4) return PLATINUM_APY;
        if (tier == 3) return GOLD_APY;
        if (tier == 2) return SILVER_APY;
        if (tier == 1) return BRONZE_APY;
        return 0;
    }
    
    /**
     * @notice Update trust score based on stake
     */
    function _updateTrustScore(address user) private {
        StakeInfo memory userStake = stakes[user];
        
        // Base score from tier (0-40 points)
        uint256 tierScore = userStake.tier * 10;
        
        // Lock period bonus (0-30 points)
        uint256 lockBonus = (userStake.lockPeriod * 30) / MAX_LOCK_PERIOD;
        
        // Amount bonus (0-30 points)
        uint256 amountBonus = 0;
        if (userStake.amount >= PLATINUM_TIER * 2) {
            amountBonus = 30;
        } else if (userStake.amount >= PLATINUM_TIER) {
            amountBonus = 25;
        } else if (userStake.amount >= GOLD_TIER) {
            amountBonus = 20;
        } else if (userStake.amount >= SILVER_TIER) {
            amountBonus = 10;
        } else if (userStake.amount >= BRONZE_TIER) {
            amountBonus = 5;
        }
        
        uint256 totalScore = tierScore + lockBonus + amountBonus;
        trustScores[user] = totalScore;
        
        emit TrustScoreUpdated(user, totalScore);
    }
    
    /**
     * @notice Get user's pending rewards
     */
    function getPendingRewards(address user) external view returns (uint256) {
        return _calculateRewards(user);
    }
    
    /**
     * @notice Get user's current tier
     */
    function getUserTier(address user) external view returns (uint8) {
        return stakes[user].tier;
    }
    
    /**
     * @notice Get time until unlock
     */
    function getTimeUntilUnlock(address user) external view returns (uint256) {
        StakeInfo memory userStake = stakes[user];
        if (userStake.amount == 0) return 0;
        
        uint256 unlockTime = userStake.startTime + userStake.lockPeriod;
        if (block.timestamp >= unlockTime) return 0;
        
        return unlockTime - block.timestamp;
    }
    
    /**
     * @notice Fund reward pool
     */
    function fundRewardPool(uint256 amount) external onlyOwner {
        require(persToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        rewardPool += amount;
        emit RewardPoolFunded(amount);
    }
    
    /**
     * @notice Pause staking in case of emergency
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause staking
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}