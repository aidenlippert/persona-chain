// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title PersonaPass Token (PSA)
 * @dev ERC-20 token for PersonaPass Identity Wallet ecosystem
 * Features:
 * - Credit card purchases via payment providers
 * - Crypto swaps via DEX integration
 * - Staking and rewards
 * - Governance voting
 * - Cross-chain bridging
 */
contract PersonaToken is ERC20, ERC20Permit, Ownable, ReentrancyGuard {
    // Token Economics
    uint256 private constant INITIAL_SUPPLY = 1_000_000_000 * 10**18; // 1B tokens
    uint256 private constant MAX_SUPPLY = 10_000_000_000 * 10**18; // 10B tokens max
    
    // Pricing and Purchase
    uint256 public tokenPrice = 0.001 ether; // 0.001 ETH per PSA
    uint256 public minPurchase = 1 * 10**18; // 1 PSA minimum
    uint256 public maxPurchase = 1_000_000 * 10**18; // 1M PSA maximum
    
    // Payment Gateway Integration
    mapping(address => bool) public authorizedPaymentGateways;
    mapping(bytes32 => bool) public processedPayments;
    
    // Events
    event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost, string paymentMethod);
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    event PaymentGatewayUpdated(address indexed gateway, bool authorized);
    event CrossChainBridge(address indexed from, uint256 amount, uint256 targetChain);
    
    constructor() ERC20("PersonaPass Token", "PSA") ERC20Permit("PersonaPass Token") {
        _mint(msg.sender, INITIAL_SUPPLY);
        
        // Authorize initial payment gateways
        authorizedPaymentGateways[msg.sender] = true;
    }
    
    /**
     * @dev Purchase PSA tokens with ETH
     */
    function purchaseWithETH() external payable nonReentrant {
        require(msg.value > 0, "Must send ETH to purchase");
        
        uint256 tokenAmount = (msg.value * 10**18) / tokenPrice;
        require(tokenAmount >= minPurchase, "Below minimum purchase");
        require(tokenAmount <= maxPurchase, "Above maximum purchase");
        require(totalSupply() + tokenAmount <= MAX_SUPPLY, "Exceeds max supply");
        
        _mint(msg.sender, tokenAmount);
        emit TokensPurchased(msg.sender, tokenAmount, msg.value, "ETH");
    }
    
    /**
     * @dev Purchase PSA tokens via payment gateway (credit card, etc.)
     */
    function purchaseWithPaymentGateway(
        address buyer,
        uint256 tokenAmount,
        bytes32 paymentId,
        string calldata paymentMethod
    ) external nonReentrant {
        require(authorizedPaymentGateways[msg.sender], "Unauthorized payment gateway");
        require(!processedPayments[paymentId], "Payment already processed");
        require(tokenAmount >= minPurchase, "Below minimum purchase");
        require(tokenAmount <= maxPurchase, "Above maximum purchase");
        require(totalSupply() + tokenAmount <= MAX_SUPPLY, "Exceeds max supply");
        
        processedPayments[paymentId] = true;
        _mint(buyer, tokenAmount);
        
        emit TokensPurchased(buyer, tokenAmount, 0, paymentMethod);
    }
    
    /**
     * @dev Swap other tokens for PSA (DEX integration)
     */
    function swapForPSA(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external nonReentrant {
        require(tokenIn != address(this), "Cannot swap PSA for PSA");
        require(amountIn > 0, "Invalid input amount");
        
        // Transfer input tokens from user
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Calculate PSA amount based on market price
        uint256 psaAmount = calculateSwapAmount(tokenIn, amountIn);
        require(psaAmount >= minAmountOut, "Insufficient output amount");
        require(totalSupply() + psaAmount <= MAX_SUPPLY, "Exceeds max supply");
        
        _mint(recipient, psaAmount);
        emit TokensPurchased(recipient, psaAmount, amountIn, "SWAP");
    }
    
    /**
     * @dev Bridge PSA tokens to another chain
     */
    function bridgeToChain(uint256 amount, uint256 targetChain) external nonReentrant {
        require(amount > 0, "Invalid amount");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        _burn(msg.sender, amount);
        emit CrossChainBridge(msg.sender, amount, targetChain);
    }
    
    /**
     * @dev Calculate swap amount for different tokens
     */
    function calculateSwapAmount(address tokenIn, uint256 amountIn) public view returns (uint256) {
        // Simplified pricing - in production, use Chainlink oracles
        if (tokenIn == address(0)) return 0;
        
        // Example: 1 token = 1000 PSA (adjust based on real market data)
        return amountIn * 1000;
    }
    
    /**
     * @dev Update token price (only owner)
     */
    function updatePrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Invalid price");
        uint256 oldPrice = tokenPrice;
        tokenPrice = newPrice;
        emit PriceUpdated(oldPrice, newPrice);
    }
    
    /**
     * @dev Update payment gateway authorization
     */
    function updatePaymentGateway(address gateway, bool authorized) external onlyOwner {
        authorizedPaymentGateways[gateway] = authorized;
        emit PaymentGatewayUpdated(gateway, authorized);
    }
    
    /**
     * @dev Mint new tokens (only owner, respects max supply)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }
    
    /**
     * @dev Withdraw ETH from contract (only owner)
     */
    function withdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @dev Get current token price in ETH
     */
    function getCurrentPrice() external view returns (uint256) {
        return tokenPrice;
    }
    
    /**
     * @dev Get purchase limits
     */
    function getPurchaseLimits() external view returns (uint256 min, uint256 max) {
        return (minPurchase, maxPurchase);
    }
}