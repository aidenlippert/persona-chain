// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

/**
 * @title PERS Token - PersonaPass Utility Token
 * @notice Production-ready ERC20 token for PersonaPass ecosystem
 * @dev Implements voting, burning, snapshot, and permit functionality
 */
contract PERSToken is ERC20, ERC20Burnable, ERC20Snapshot, Ownable, Pausable, ERC20Permit, ERC20Votes {
    // Token economics
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10**18; // 100 million initial

    // Fee structure
    uint256 public constant CREDENTIAL_ISSUANCE_FEE = 10 * 10**18; // 10 PERS
    uint256 public constant ZK_PROOF_GENERATION_FEE = 5 * 10**18; // 5 PERS
    uint256 public constant API_ACCESS_FEE = 1 * 10**18; // 1 PERS per call

    // Staking rewards
    uint256 public rewardRate = 100; // 1% per period
    uint256 public rewardPeriod = 7 days;

    // Events
    event CredentialPurchase(address indexed user, uint256 amount);
    event ZKProofPurchase(address indexed user, uint256 amount);
    event APIAccessPurchase(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);

    // Mappings
    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public stakingTimestamp;
    mapping(address => uint256) public rewards;
    mapping(address => bool) public isVerifiedIssuer;

    constructor() 
        ERC20("PersonaPass Token", "PERS") 
        ERC20Permit("PersonaPass Token")
    {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /**
     * @notice Purchase credential issuance credits
     * @param amount Number of credits to purchase
     */
    function purchaseCredentialCredits(uint256 amount) external whenNotPaused {
        uint256 cost = amount * CREDENTIAL_ISSUANCE_FEE;
        require(balanceOf(msg.sender) >= cost, "Insufficient PERS balance");
        
        _burn(msg.sender, cost);
        emit CredentialPurchase(msg.sender, amount);
    }

    /**
     * @notice Purchase ZK proof generation credits
     * @param amount Number of credits to purchase
     */
    function purchaseZKProofCredits(uint256 amount) external whenNotPaused {
        uint256 cost = amount * ZK_PROOF_GENERATION_FEE;
        require(balanceOf(msg.sender) >= cost, "Insufficient PERS balance");
        
        _burn(msg.sender, cost);
        emit ZKProofPurchase(msg.sender, amount);
    }

    /**
     * @notice Purchase API access credits
     * @param amount Number of API calls to purchase
     */
    function purchaseAPICredits(uint256 amount) external whenNotPaused {
        uint256 cost = amount * API_ACCESS_FEE;
        require(balanceOf(msg.sender) >= cost, "Insufficient PERS balance");
        
        _burn(msg.sender, cost);
        emit APIAccessPurchase(msg.sender, amount);
    }

    /**
     * @notice Stake tokens for rewards
     * @param amount Amount to stake
     */
    function stake(uint256 amount) external whenNotPaused {
        require(amount > 0, "Cannot stake 0 tokens");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        // Calculate pending rewards before staking
        if (stakedBalance[msg.sender] > 0) {
            uint256 pendingReward = calculateReward(msg.sender);
            rewards[msg.sender] += pendingReward;
        }

        _transfer(msg.sender, address(this), amount);
        stakedBalance[msg.sender] += amount;
        stakingTimestamp[msg.sender] = block.timestamp;
    }

    /**
     * @notice Unstake tokens
     * @param amount Amount to unstake
     */
    function unstake(uint256 amount) external {
        require(amount > 0, "Cannot unstake 0 tokens");
        require(stakedBalance[msg.sender] >= amount, "Insufficient staked balance");

        // Calculate and add pending rewards
        uint256 pendingReward = calculateReward(msg.sender);
        rewards[msg.sender] += pendingReward;

        stakedBalance[msg.sender] -= amount;
        stakingTimestamp[msg.sender] = block.timestamp;
        
        _transfer(address(this), msg.sender, amount);
    }

    /**
     * @notice Claim staking rewards
     */
    function claimRewards() external {
        uint256 pendingReward = calculateReward(msg.sender);
        uint256 totalReward = rewards[msg.sender] + pendingReward;
        
        require(totalReward > 0, "No rewards to claim");
        require(totalSupply() + totalReward <= MAX_SUPPLY, "Max supply exceeded");

        rewards[msg.sender] = 0;
        stakingTimestamp[msg.sender] = block.timestamp;
        
        _mint(msg.sender, totalReward);
        emit RewardsClaimed(msg.sender, totalReward);
    }

    /**
     * @notice Calculate pending rewards for a user
     * @param user Address to calculate rewards for
     * @return Pending reward amount
     */
    function calculateReward(address user) public view returns (uint256) {
        if (stakedBalance[user] == 0) return 0;
        
        uint256 stakingDuration = block.timestamp - stakingTimestamp[user];
        uint256 periods = stakingDuration / rewardPeriod;
        
        return (stakedBalance[user] * rewardRate * periods) / 10000;
    }

    /**
     * @notice Add verified issuer (only owner)
     * @param issuer Address to verify
     */
    function addVerifiedIssuer(address issuer) external onlyOwner {
        isVerifiedIssuer[issuer] = true;
    }

    /**
     * @notice Remove verified issuer (only owner)
     * @param issuer Address to remove
     */
    function removeVerifiedIssuer(address issuer) external onlyOwner {
        isVerifiedIssuer[issuer] = false;
    }

    /**
     * @notice Create a snapshot (only owner)
     * @return Snapshot ID
     */
    function snapshot() external onlyOwner returns (uint256) {
        return _snapshot();
    }

    /**
     * @notice Pause token transfers (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause token transfers (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // Override required functions
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        override(ERC20, ERC20Snapshot)
    {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }
}