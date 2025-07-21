// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title PERS Token - Persona Token for Identity Verification Rewards
 * @author PersonaPass Team
 * @notice ERC-20 token with staking, rewards, and governance features
 */
contract PERSToken is ERC20, ERC20Burnable, ERC20Snapshot, Ownable, Pausable, ReentrancyGuard {
    // Token distribution constants
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion PERS
    uint256 public constant CREDENTIAL_REWARDS_POOL = 300_000_000 * 10**18; // 30%
    uint256 public constant STAKING_REWARDS_POOL = 200_000_000 * 10**18; // 20%
    uint256 public constant ECOSYSTEM_FUND = 150_000_000 * 10**18; // 15%
    uint256 public constant TEAM_ALLOCATION = 150_000_000 * 10**18; // 15%
    uint256 public constant PUBLIC_SALE = 100_000_000 * 10**18; // 10%
    uint256 public constant LIQUIDITY_POOL = 100_000_000 * 10**18; // 10%

    // Wallet addresses for token distribution
    address public credentialRewardsWallet;
    address public stakingRewardsWallet;
    address public ecosystemWallet;
    address public teamWallet;
    address public liquidityWallet;

    // Vesting schedule for team tokens
    uint256 public constant TEAM_VESTING_DURATION = 365 days * 3; // 3 years
    uint256 public constant TEAM_CLIFF_DURATION = 365 days; // 1 year cliff
    uint256 public teamVestingStart;
    uint256 public teamTokensClaimed;

    // Anti-whale protection
    uint256 public constant MAX_TRANSFER_PERCENTAGE = 1; // 1% of total supply
    uint256 public maxTransferAmount;
    
    // Transaction fee for buyback and burn
    uint256 public constant TRANSACTION_FEE_RATE = 10; // 0.1%
    uint256 public totalFeesCollected;
    uint256 public totalBurned;

    // Events
    event TokensAllocated(address indexed wallet, uint256 amount, string allocation);
    event RewardsClaimed(address indexed user, uint256 amount, string credentialType);
    event FeesCollected(uint256 amount);
    event BuybackAndBurn(uint256 amount);
    event TeamTokensVested(uint256 amount);

    constructor() ERC20("Persona Token", "PERS") {
        // Mint total supply to contract
        _mint(address(this), TOTAL_SUPPLY);
        
        // Set max transfer amount (anti-whale)
        maxTransferAmount = (TOTAL_SUPPLY * MAX_TRANSFER_PERCENTAGE) / 100;
        
        // Set team vesting start time
        teamVestingStart = block.timestamp;
    }

    /**
     * @notice Initialize token distribution wallets
     * @dev Can only be called once by owner
     */
    function initializeWallets(
        address _credentialRewards,
        address _stakingRewards,
        address _ecosystem,
        address _team,
        address _liquidity
    ) external onlyOwner {
        require(credentialRewardsWallet == address(0), "Already initialized");
        require(_credentialRewards != address(0), "Invalid address");
        require(_stakingRewards != address(0), "Invalid address");
        require(_ecosystem != address(0), "Invalid address");
        require(_team != address(0), "Invalid address");
        require(_liquidity != address(0), "Invalid address");

        credentialRewardsWallet = _credentialRewards;
        stakingRewardsWallet = _stakingRewards;
        ecosystemWallet = _ecosystem;
        teamWallet = _team;
        liquidityWallet = _liquidity;

        // Transfer tokens to respective wallets
        _transfer(address(this), credentialRewardsWallet, CREDENTIAL_REWARDS_POOL);
        _transfer(address(this), stakingRewardsWallet, STAKING_REWARDS_POOL);
        _transfer(address(this), ecosystemWallet, ECOSYSTEM_FUND);
        _transfer(address(this), liquidityWallet, LIQUIDITY_POOL);
        // Team tokens remain in contract for vesting

        emit TokensAllocated(credentialRewardsWallet, CREDENTIAL_REWARDS_POOL, "Credential Rewards");
        emit TokensAllocated(stakingRewardsWallet, STAKING_REWARDS_POOL, "Staking Rewards");
        emit TokensAllocated(ecosystemWallet, ECOSYSTEM_FUND, "Ecosystem Fund");
        emit TokensAllocated(liquidityWallet, LIQUIDITY_POOL, "Liquidity Pool");
    }

    /**
     * @notice Claim vested team tokens
     * @dev Linear vesting after cliff period
     */
    function claimTeamTokens() external {
        require(msg.sender == teamWallet, "Not team wallet");
        require(block.timestamp >= teamVestingStart + TEAM_CLIFF_DURATION, "Still in cliff period");

        uint256 totalVested = _calculateVestedAmount();
        uint256 claimable = totalVested - teamTokensClaimed;
        
        require(claimable > 0, "No tokens to claim");

        teamTokensClaimed += claimable;
        _transfer(address(this), teamWallet, claimable);
        
        emit TeamTokensVested(claimable);
    }

    /**
     * @notice Calculate vested team tokens
     */
    function _calculateVestedAmount() private view returns (uint256) {
        if (block.timestamp < teamVestingStart + TEAM_CLIFF_DURATION) {
            return 0;
        }

        uint256 timeElapsed = block.timestamp - teamVestingStart;
        if (timeElapsed >= TEAM_VESTING_DURATION) {
            return TEAM_ALLOCATION;
        }

        return (TEAM_ALLOCATION * timeElapsed) / TEAM_VESTING_DURATION;
    }

    /**
     * @notice Override transfer to implement fees and anti-whale protection
     */
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        // Anti-whale protection (exclude system wallets)
        if (from != address(this) && to != address(this) && 
            from != owner() && to != owner()) {
            require(amount <= maxTransferAmount, "Transfer exceeds max amount");
        }

        // Calculate transaction fee
        uint256 fee = 0;
        if (from != address(this) && to != address(this) && 
            from != owner() && to != owner()) {
            fee = (amount * TRANSACTION_FEE_RATE) / 10000;
            totalFeesCollected += fee;
        }

        uint256 transferAmount = amount - fee;
        
        super._transfer(from, to, transferAmount);
        
        if (fee > 0) {
            super._transfer(from, address(this), fee);
            emit FeesCollected(fee);
        }
    }

    /**
     * @notice Execute buyback and burn with collected fees
     * @dev This would typically interact with a DEX
     */
    function executeBuybackAndBurn() external onlyOwner nonReentrant {
        uint256 contractBalance = balanceOf(address(this)) - (TEAM_ALLOCATION - teamTokensClaimed);
        require(contractBalance > 0, "No fees to burn");

        _burn(address(this), contractBalance);
        totalBurned += contractBalance;
        
        emit BuybackAndBurn(contractBalance);
    }

    /**
     * @notice Create a snapshot for governance voting
     */
    function snapshot() external onlyOwner returns (uint256) {
        return _snapshot();
    }

    /**
     * @notice Pause token transfers in case of emergency
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause token transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Get claimable team tokens
     */
    function getClaimableTeamTokens() external view returns (uint256) {
        uint256 totalVested = _calculateVestedAmount();
        return totalVested > teamTokensClaimed ? totalVested - teamTokensClaimed : 0;
    }

    /**
     * @notice Required overrides for multiple inheritance
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Snapshot) {
        super._beforeTokenTransfer(from, to, amount);
    }
}