package keeper

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/cosmos/cosmos-sdk/store/prefix"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/query"

	"github.com/persona-chain/x/identity/types"
)

// ScalabilityKeeper implements enterprise-grade scalability features
// Handles multi-tenancy, horizontal scaling, caching, rate limiting, and monitoring
type ScalabilityKeeper struct {
	storeKey      storetypes.StoreKey
	cdc           codec.BinaryCodec
	paramstore    paramtypes.Subspace
	bankKeeper    types.BankKeeper
	accountKeeper types.AccountKeeper

	// In-memory caches and managers
	tenantCache     *sync.Map // thread-safe tenant cache
	rateLimiters    *sync.Map // per-tenant rate limiters
	metricCollector *MetricCollector
	cacheManager    *CacheManager
	loadBalancer    *LoadBalancer
	autoScaler      *AutoScaler

	// Configuration
	config *types.EnterpriseScalabilityConfig
	mu     sync.RWMutex
}

// NewScalabilityKeeper creates a new instance of the scalability keeper
func NewScalabilityKeeper(
	cdc codec.BinaryCodec,
	storeKey storetypes.StoreKey,
	ps paramtypes.Subspace,
	bankKeeper types.BankKeeper,
	accountKeeper types.AccountKeeper,
) *ScalabilityKeeper {
	
	// Initialize default configuration
	defaultConfig := &types.EnterpriseScalabilityConfig{
		MultiTenancy: &types.TenantConfiguration{
			MaxTenants: 10000,
			DefaultQuotas: &types.ResourceQuotas{
				MaxIdentities:             1000,
				MaxCredentialsPerIdentity: 100,
				MaxZKProofsPerMonth:       10000,
				MaxAPICallsPerSecond:      100,
				MaxStorageGB:              10,
				MaxBandwidthMbps:          100,
				MaxActiveUsers:            1000,
				MaxConnectedApplications:  10,
			},
			IsolationStrategy: "strict",
		},
		HorizontalScaling: &types.ShardingConfiguration{
			TotalShards:       16,
			ReplicationFactor: 3,
			ShardingStrategy:  types.ShardingStrategyTenantBased,
			ConsistencyLevel:  types.ConsistencyLevelStrong,
		},
		Caching: &types.CacheConfiguration{
			L1Cache: &types.CacheLayer{
				Type:           types.CacheTypeInMemory,
				TTLSeconds:     300,
				MaxSizeGB:      2,
				EvictionPolicy: types.EvictionPolicyLRU,
			},
			L2Cache: &types.CacheLayer{
				Type:           types.CacheTypeRedis,
				TTLSeconds:     3600,
				MaxSizeGB:      20,
				EvictionPolicy: types.EvictionPolicyLRU,
			},
			CacheStrategy: types.CacheStrategyWriteThrough,
		},
		RateLimiting: &types.RateLimitConfiguration{
			GlobalLimits: &types.RateLimits{
				RequestsPerSecond:     1000,
				RequestsPerMinute:     50000,
				RequestsPerHour:       1000000,
				ConcurrentConnections: 10000,
			},
			Algorithm:         types.RateLimitAlgorithmTokenBucket,
			TimeWindowSeconds: 60,
			BurstAllowance:   100,
		},
		AutoScaling: &types.AutoScalingConfiguration{
			HorizontalScaling: &types.HorizontalScalingPolicy{
				MinInstances:        2,
				MaxInstances:        100,
				TargetCPUPercent:    70.0,
				TargetMemoryPercent: 80.0,
				ScaleUpCooldown:     5 * time.Minute,
				ScaleDownCooldown:   10 * time.Minute,
			},
			CooldownPeriod: 5 * time.Minute,
		},
	}

	keeper := &ScalabilityKeeper{
		storeKey:        storeKey,
		cdc:             cdc,
		paramstore:      ps,
		bankKeeper:      bankKeeper,
		accountKeeper:   accountKeeper,
		tenantCache:     &sync.Map{},
		rateLimiters:    &sync.Map{},
		config:          defaultConfig,
	}

	// Initialize subsystems
	keeper.metricCollector = NewMetricCollector(keeper)
	keeper.cacheManager = NewCacheManager(keeper)
	keeper.loadBalancer = NewLoadBalancer(keeper)
	keeper.autoScaler = NewAutoScaler(keeper)

	return keeper
}

// ==================== MULTI-TENANCY MANAGEMENT ====================

// CreateTenant creates a new tenant with isolation and resource quotas
func (k *ScalabilityKeeper) CreateTenant(ctx sdk.Context, tenant *types.Tenant) error {
	k.mu.Lock()
	defer k.mu.Unlock()

	// Validate tenant doesn't already exist
	if k.tenantExists(ctx, tenant.ID) {
		return types.ErrTenantAlreadyExists
	}

	// Apply default quotas if not specified
	if tenant.ResourceQuotas == nil {
		tenant.ResourceQuotas = k.config.MultiTenancy.DefaultQuotas
	}

	// Set creation metadata
	tenant.CreatedAt = time.Now()
	tenant.UpdatedAt = time.Now()
	tenant.Status = types.TenantStatusActive

	// Generate shard key for data distribution
	tenant.ShardKey = k.generateShardKey(tenant.ID)

	// Store tenant in blockchain state
	store := ctx.KVStore(k.storeKey)
	tenantBytes, err := k.cdc.Marshal(tenant)
	if err != nil {
		return fmt.Errorf("failed to marshal tenant: %w", err)
	}

	store.Set(types.GetTenantKey(tenant.ID), tenantBytes)

	// Cache tenant for fast access
	k.tenantCache.Store(tenant.ID, tenant)

	// Initialize tenant-specific rate limiter
	k.initializeTenantRateLimiter(tenant.ID, tenant.ResourceQuotas)

	// Record metrics
	k.metricCollector.RecordTenantCreation(tenant.ID, tenant.SubscriptionTier)

	return nil
}

// GetTenant retrieves a tenant by ID with caching
func (k *ScalabilityKeeper) GetTenant(ctx sdk.Context, tenantID string) (*types.Tenant, error) {
	// Check cache first
	if cached, ok := k.tenantCache.Load(tenantID); ok {
		return cached.(*types.Tenant), nil
	}

	// Load from store
	store := ctx.KVStore(k.storeKey)
	tenantBytes := store.Get(types.GetTenantKey(tenantID))
	if tenantBytes == nil {
		return nil, types.ErrTenantNotFound
	}

	var tenant types.Tenant
	if err := k.cdc.Unmarshal(tenantBytes, &tenant); err != nil {
		return nil, fmt.Errorf("failed to unmarshal tenant: %w", err)
	}

	// Cache for future access
	k.tenantCache.Store(tenantID, &tenant)

	return &tenant, nil
}

// UpdateTenant updates tenant configuration and quotas
func (k *ScalabilityKeeper) UpdateTenant(ctx sdk.Context, tenant *types.Tenant) error {
	k.mu.Lock()
	defer k.mu.Unlock()

	// Validate tenant exists
	existing, err := k.GetTenant(ctx, tenant.ID)
	if err != nil {
		return err
	}

	// Update metadata
	tenant.CreatedAt = existing.CreatedAt
	tenant.UpdatedAt = time.Now()

	// Store updated tenant
	store := ctx.KVStore(k.storeKey)
	tenantBytes, err := k.cdc.Marshal(tenant)
	if err != nil {
		return fmt.Errorf("failed to marshal tenant: %w", err)
	}

	store.Set(types.GetTenantKey(tenant.ID), tenantBytes)

	// Update cache
	k.tenantCache.Store(tenant.ID, tenant)

	// Update rate limiter if quotas changed
	if existing.ResourceQuotas != tenant.ResourceQuotas {
		k.updateTenantRateLimiter(tenant.ID, tenant.ResourceQuotas)
	}

	return nil
}

// ValidateTenantIsolation ensures tenant isolation is maintained
func (k *ScalabilityKeeper) ValidateTenantIsolation(ctx sdk.Context, tenantID string, operation string) error {
	tenant, err := k.GetTenant(ctx, tenantID)
	if err != nil {
		return err
	}

	if tenant.Status != types.TenantStatusActive {
		return types.ErrTenantIsolationViolation
	}

	// Check resource quotas
	if err := k.checkResourceQuotas(ctx, tenantID, operation); err != nil {
		return err
	}

	// Verify shard isolation
	if err := k.validateShardIsolation(ctx, tenantID); err != nil {
		return err
	}

	return nil
}

// ==================== HORIZONTAL SCALING ====================

// ScaleHorizontally adjusts the number of instances based on load
func (k *ScalabilityKeeper) ScaleHorizontally(ctx sdk.Context, targetInstances int) error {
	k.mu.Lock()
	defer k.mu.Unlock()

	currentStatus := k.getScalingStatus(ctx)
	
	if currentStatus.ScalingInProgress {
		return fmt.Errorf("scaling already in progress")
	}

	// Validate scaling limits
	if targetInstances < k.config.AutoScaling.HorizontalScaling.MinInstances {
		targetInstances = k.config.AutoScaling.HorizontalScaling.MinInstances
	}
	if targetInstances > k.config.AutoScaling.HorizontalScaling.MaxInstances {
		targetInstances = k.config.AutoScaling.HorizontalScaling.MaxInstances
	}

	// Record scaling event
	scalingEvent := &types.ScalingEvent{
		Timestamp:     time.Now(),
		PreviousCount: currentStatus.CurrentInstances,
		NewCount:      targetInstances,
		Trigger:       "manual",
	}

	if targetInstances > currentStatus.CurrentInstances {
		scalingEvent.Action = types.ScalingActionScaleUp
		return k.scaleUp(ctx, targetInstances, scalingEvent)
	} else if targetInstances < currentStatus.CurrentInstances {
		scalingEvent.Action = types.ScalingActionScaleDown
		return k.scaleDown(ctx, targetInstances, scalingEvent)
	}

	return nil // No scaling needed
}

// GetScalingStatus returns current scaling status
func (k *ScalabilityKeeper) GetScalingStatus(ctx sdk.Context) (*types.ScalingStatus, error) {
	return k.getScalingStatus(ctx), nil
}

// ==================== CACHING LAYER ====================

// GetCached retrieves data from the multi-layer cache
func (k *ScalabilityKeeper) GetCached(ctx sdk.Context, key string, layer types.CacheType) (interface{}, error) {
	return k.cacheManager.Get(ctx, key, layer)
}

// SetCached stores data in the multi-layer cache
func (k *ScalabilityKeeper) SetCached(ctx sdk.Context, key string, value interface{}, ttl time.Duration, layer types.CacheType) error {
	return k.cacheManager.Set(ctx, key, value, ttl, layer)
}

// InvalidateCache invalidates cached data by pattern
func (k *ScalabilityKeeper) InvalidateCache(ctx sdk.Context, pattern string) error {
	return k.cacheManager.InvalidatePattern(ctx, pattern)
}

// GetCacheStats returns cache performance statistics
func (k *ScalabilityKeeper) GetCacheStats(ctx sdk.Context) (*types.CacheStats, error) {
	return k.cacheManager.GetCacheStats(ctx)
}

// ==================== RATE LIMITING ====================

// CheckRateLimit validates if operation is within rate limits
func (k *ScalabilityKeeper) CheckRateLimit(ctx sdk.Context, tenantID string, operation string) (*types.RateLimitResult, error) {
	rateLimiter, ok := k.rateLimiters.Load(tenantID)
	if !ok {
		// Initialize rate limiter for new tenant
		tenant, err := k.GetTenant(ctx, tenantID)
		if err != nil {
			return nil, err
		}
		k.initializeTenantRateLimiter(tenantID, tenant.ResourceQuotas)
		rateLimiter, _ = k.rateLimiters.Load(tenantID)
	}

	limiter := rateLimiter.(*TenantRateLimiter)
	return limiter.CheckLimit(operation)
}

// UpdateRateLimits modifies rate limits for a tenant
func (k *ScalabilityKeeper) UpdateRateLimits(ctx sdk.Context, tenantID string, limits *types.RateLimits) error {
	k.updateTenantRateLimiter(tenantID, &types.ResourceQuotas{
		MaxAPICallsPerSecond: limits.RequestsPerSecond,
		MaxZKProofsPerMonth:  limits.ZKProofGenerationLimits,
	})
	return nil
}

// ==================== MONITORING AND METRICS ====================

// RecordMetric records a performance metric
func (k *ScalabilityKeeper) RecordMetric(ctx sdk.Context, metric *types.Metric) error {
	return k.metricCollector.RecordMetric(metric)
}

// GetMetrics retrieves metrics based on query
func (k *ScalabilityKeeper) GetMetrics(ctx sdk.Context, query *types.MetricQuery) ([]*types.Metric, error) {
	return k.metricCollector.GetMetrics(query)
}

// GetHealthStatus returns overall system health
func (k *ScalabilityKeeper) GetHealthStatus(ctx sdk.Context) (*types.HealthStatus, error) {
	// Collect health from all subsystems
	healthStatus := &types.HealthStatus{
		Overall:   "healthy",
		Timestamp: time.Now(),
		Components: map[string]interface{}{
			"database":     k.checkDatabaseHealth(ctx),
			"cache":        k.cacheManager.GetHealth(),
			"rate_limiter": k.checkRateLimiterHealth(),
			"scaling":      k.autoScaler.GetHealth(),
		},
	}

	// Determine overall health
	for component, status := range healthStatus.Components {
		if health, ok := status.(map[string]interface{}); ok {
			if health["status"] != "healthy" {
				healthStatus.Overall = "degraded"
				healthStatus.Issues = append(healthStatus.Issues, fmt.Sprintf("%s: %v", component, health["status"]))
			}
		}
	}

	return healthStatus, nil
}

// ==================== PERFORMANCE OPTIMIZATION ====================

// OptimizePerformance triggers performance optimization routines
func (k *ScalabilityKeeper) OptimizePerformance(ctx sdk.Context) error {
	k.mu.Lock()
	defer k.mu.Unlock()

	// Optimize database queries
	if err := k.optimizeDatabase(ctx); err != nil {
		return fmt.Errorf("database optimization failed: %w", err)
	}

	// Optimize cache performance
	if err := k.cacheManager.OptimizeCache(ctx); err != nil {
		return fmt.Errorf("cache optimization failed: %w", err)
	}

	// Optimize ZK proof generation
	if err := k.optimizeZKProofs(ctx); err != nil {
		return fmt.Errorf("ZK proof optimization failed: %w", err)
	}

	// Trigger garbage collection for memory optimization
	k.optimizeMemory()

	return nil
}

// ==================== PRIVATE HELPER METHODS ====================

func (k *ScalabilityKeeper) tenantExists(ctx sdk.Context, tenantID string) bool {
	store := ctx.KVStore(k.storeKey)
	return store.Has(types.GetTenantKey(tenantID))
}

func (k *ScalabilityKeeper) generateShardKey(tenantID string) string {
	// Use consistent hashing to distribute tenants across shards
	hash := sdk.Hash([]byte(tenantID))
	shardIndex := int(hash[0]) % k.config.HorizontalScaling.TotalShards
	return fmt.Sprintf("shard_%d", shardIndex)
}

func (k *ScalabilityKeeper) initializeTenantRateLimiter(tenantID string, quotas *types.ResourceQuotas) {
	limiter := NewTenantRateLimiter(tenantID, quotas, k.config.RateLimiting)
	k.rateLimiters.Store(tenantID, limiter)
}

func (k *ScalabilityKeeper) updateTenantRateLimiter(tenantID string, quotas *types.ResourceQuotas) {
	if limiter, ok := k.rateLimiters.Load(tenantID); ok {
		limiter.(*TenantRateLimiter).UpdateQuotas(quotas)
	} else {
		k.initializeTenantRateLimiter(tenantID, quotas)
	}
}

func (k *ScalabilityKeeper) checkResourceQuotas(ctx sdk.Context, tenantID string, operation string) error {
	// Implementation for checking if operation exceeds tenant quotas
	tenant, err := k.GetTenant(ctx, tenantID)
	if err != nil {
		return err
	}

	// Check current usage against quotas
	usage := k.getCurrentUsage(ctx, tenantID)
	quotas := tenant.ResourceQuotas

	if usage.IdentityCount >= quotas.MaxIdentities {
		return types.ErrQuotaExceeded
	}

	return nil
}

func (k *ScalabilityKeeper) validateShardIsolation(ctx sdk.Context, tenantID string) error {
	// Validate that tenant operations stay within assigned shard
	tenant, err := k.GetTenant(ctx, tenantID)
	if err != nil {
		return err
	}

	expectedShard := k.generateShardKey(tenantID)
	if tenant.ShardKey != expectedShard {
		return types.ErrTenantIsolationViolation
	}

	return nil
}

func (k *ScalabilityKeeper) getScalingStatus(ctx sdk.Context) *types.ScalingStatus {
	// Get current scaling status from store or auto-scaler
	return k.autoScaler.GetCurrentStatus()
}

func (k *ScalabilityKeeper) scaleUp(ctx sdk.Context, targetInstances int, event *types.ScalingEvent) error {
	// Implementation for horizontal scale-up
	event.Timestamp = time.Now()
	
	// Record the scaling event
	k.autoScaler.RecordScalingEvent(event)
	
	// Trigger actual scaling (would integrate with container orchestration)
	return k.autoScaler.ScaleUp(targetInstances)
}

func (k *ScalabilityKeeper) scaleDown(ctx sdk.Context, targetInstances int, event *types.ScalingEvent) error {
	// Implementation for horizontal scale-down
	event.Timestamp = time.Now()
	
	// Record the scaling event
	k.autoScaler.RecordScalingEvent(event)
	
	// Trigger actual scaling (would integrate with container orchestration)
	return k.autoScaler.ScaleDown(targetInstances)
}

func (k *ScalabilityKeeper) getCurrentUsage(ctx sdk.Context, tenantID string) *TenantUsage {
	// Calculate current resource usage for tenant
	store := prefix.NewStore(ctx.KVStore(k.storeKey), types.UniversalIdentityKey)
	
	identityCount := int64(0)
	credentialCount := int64(0)
	
	// Count identities for this tenant
	iterator := store.Iterator(nil, nil)
	defer iterator.Close()
	
	for ; iterator.Valid(); iterator.Next() {
		var identity types.UniversalIdentity
		if err := k.cdc.Unmarshal(iterator.Value(), &identity); err == nil {
			// Assuming tenant ID is stored in identity metadata
			if tenantIDFromIdentity, ok := identity.Metadata["tenant_id"].(string); ok && tenantIDFromIdentity == tenantID {
				identityCount++
				credentialCount += int64(len(identity.Credentials))
			}
		}
	}
	
	return &TenantUsage{
		TenantID:        tenantID,
		IdentityCount:   identityCount,
		CredentialCount: credentialCount,
		LastUpdated:     time.Now(),
	}
}

func (k *ScalabilityKeeper) checkDatabaseHealth(ctx sdk.Context) map[string]interface{} {
	// Check database connectivity and performance
	start := time.Now()
	
	// Simple health check - try to read a small piece of data
	store := ctx.KVStore(k.storeKey)
	_ = store.Get([]byte("health_check"))
	
	responseTime := time.Since(start)
	
	status := "healthy"
	if responseTime > 100*time.Millisecond {
		status = "slow"
	}
	if responseTime > 1*time.Second {
		status = "unhealthy"
	}
	
	return map[string]interface{}{
		"status":         status,
		"response_time":  responseTime.String(),
		"last_checked":   time.Now(),
	}
}

func (k *ScalabilityKeeper) checkRateLimiterHealth() map[string]interface{} {
	// Check rate limiter subsystem health
	activeLimiters := 0
	k.rateLimiters.Range(func(key, value interface{}) bool {
		activeLimiters++
		return true
	})
	
	return map[string]interface{}{
		"status":          "healthy",
		"active_limiters": activeLimiters,
		"last_checked":    time.Now(),
	}
}

func (k *ScalabilityKeeper) optimizeDatabase(ctx sdk.Context) error {
	// Database optimization routines
	// In a real implementation, this would:
	// - Analyze query patterns
	// - Update index strategies
	// - Optimize connection pools
	// - Clean up expired data
	return nil
}

func (k *ScalabilityKeeper) optimizeZKProofs(ctx sdk.Context) error {
	// ZK proof optimization routines
	// In a real implementation, this would:
	// - Analyze proof generation patterns
	// - Optimize circuit compilation
	// - Manage proof caching
	// - Balance GPU/CPU usage
	return nil
}

func (k *ScalabilityKeeper) optimizeMemory() {
	// Memory optimization routines
	// Clear expired cache entries
	k.cacheManager.ClearExpired()
	
	// Clean up tenant cache
	k.cleanupTenantCache()
}

func (k *ScalabilityKeeper) cleanupTenantCache() {
	// Remove inactive tenants from cache
	k.tenantCache.Range(func(key, value interface{}) bool {
		tenant := value.(*types.Tenant)
		if tenant.Status == types.TenantStatusTerminated {
			k.tenantCache.Delete(key)
		}
		return true
	})
}

// ==================== SUPPORTING TYPES ====================

type TenantUsage struct {
	TenantID        string    `json:"tenant_id"`
	IdentityCount   int64     `json:"identity_count"`
	CredentialCount int64     `json:"credential_count"`
	APICallsToday   int64     `json:"api_calls_today"`
	StorageUsedGB   float64   `json:"storage_used_gb"`
	LastUpdated     time.Time `json:"last_updated"`
}

// Placeholder implementations for supporting components
type MetricCollector struct {
	keeper *ScalabilityKeeper
}

func NewMetricCollector(keeper *ScalabilityKeeper) *MetricCollector {
	return &MetricCollector{keeper: keeper}
}

func (mc *MetricCollector) RecordTenantCreation(tenantID string, tier types.SubscriptionTier) {}
func (mc *MetricCollector) RecordMetric(metric *types.Metric) error                         { return nil }
func (mc *MetricCollector) GetMetrics(query *types.MetricQuery) ([]*types.Metric, error)   { return nil, nil }

type CacheManager struct {
	keeper *ScalabilityKeeper
}

func NewCacheManager(keeper *ScalabilityKeeper) *CacheManager {
	return &CacheManager{keeper: keeper}
}

func (cm *CacheManager) Get(ctx context.Context, key string, layer types.CacheType) (interface{}, error) { return nil, nil }
func (cm *CacheManager) Set(ctx context.Context, key string, value interface{}, ttl time.Duration, layer types.CacheType) error { return nil }
func (cm *CacheManager) InvalidatePattern(ctx context.Context, pattern string) error { return nil }
func (cm *CacheManager) GetCacheStats(ctx context.Context) (*types.CacheStats, error) { return nil, nil }
func (cm *CacheManager) OptimizeCache(ctx context.Context) error { return nil }
func (cm *CacheManager) GetHealth() map[string]interface{} { return map[string]interface{}{"status": "healthy"} }
func (cm *CacheManager) ClearExpired() {}

type LoadBalancer struct {
	keeper *ScalabilityKeeper
}

func NewLoadBalancer(keeper *ScalabilityKeeper) *LoadBalancer {
	return &LoadBalancer{keeper: keeper}
}

type AutoScaler struct {
	keeper *ScalabilityKeeper
	status *types.ScalingStatus
	mu     sync.RWMutex
}

func NewAutoScaler(keeper *ScalabilityKeeper) *AutoScaler {
	return &AutoScaler{
		keeper: keeper,
		status: &types.ScalingStatus{
			CurrentInstances:  2,
			TargetInstances:   2,
			ScalingInProgress: false,
		},
	}
}

func (as *AutoScaler) GetCurrentStatus() *types.ScalingStatus {
	as.mu.RLock()
	defer as.mu.RUnlock()
	return as.status
}

func (as *AutoScaler) RecordScalingEvent(event *types.ScalingEvent) {
	as.mu.Lock()
	defer as.mu.Unlock()
	as.status.ScalingHistory = append(as.status.ScalingHistory, event)
	as.status.LastScalingAction = event.Timestamp
}

func (as *AutoScaler) ScaleUp(targetInstances int) error {
	as.mu.Lock()
	defer as.mu.Unlock()
	as.status.ScalingInProgress = true
	as.status.TargetInstances = targetInstances
	
	// Simulate scaling operation
	go func() {
		time.Sleep(30 * time.Second) // Simulate scaling time
		as.mu.Lock()
		as.status.CurrentInstances = targetInstances
		as.status.ScalingInProgress = false
		as.mu.Unlock()
	}()
	
	return nil
}

func (as *AutoScaler) ScaleDown(targetInstances int) error {
	as.mu.Lock()
	defer as.mu.Unlock()
	as.status.ScalingInProgress = true
	as.status.TargetInstances = targetInstances
	
	// Simulate scaling operation
	go func() {
		time.Sleep(60 * time.Second) // Scale down takes longer
		as.mu.Lock()
		as.status.CurrentInstances = targetInstances
		as.status.ScalingInProgress = false
		as.mu.Unlock()
	}()
	
	return nil
}

func (as *AutoScaler) GetHealth() map[string]interface{} {
	as.mu.RLock()
	defer as.mu.RUnlock()
	
	status := "healthy"
	if as.status.ScalingInProgress {
		status = "scaling"
	}
	
	return map[string]interface{}{
		"status":           status,
		"current_instances": as.status.CurrentInstances,
		"target_instances":  as.status.TargetInstances,
		"last_checked":      time.Now(),
	}
}

type TenantRateLimiter struct {
	tenantID string
	quotas   *types.ResourceQuotas
	config   *types.RateLimitConfiguration
	counters map[string]*Counter
	mu       sync.RWMutex
}

func NewTenantRateLimiter(tenantID string, quotas *types.ResourceQuotas, config *types.RateLimitConfiguration) *TenantRateLimiter {
	return &TenantRateLimiter{
		tenantID: tenantID,
		quotas:   quotas,
		config:   config,
		counters: make(map[string]*Counter),
	}
}

func (trl *TenantRateLimiter) CheckLimit(operation string) (*types.RateLimitResult, error) {
	trl.mu.Lock()
	defer trl.mu.Unlock()
	
	// Simple token bucket implementation
	counter, exists := trl.counters[operation]
	if !exists {
		counter = NewCounter(int(trl.quotas.MaxAPICallsPerSecond))
		trl.counters[operation] = counter
	}
	
	if counter.CanProceed() {
		counter.Consume()
		return &types.RateLimitResult{
			Allowed:           true,
			RemainingRequests: int64(counter.Remaining()),
			ResetTime:         counter.ResetTime(),
		}, nil
	}
	
	return &types.RateLimitResult{
		Allowed:           false,
		RemainingRequests: 0,
		RetryAfter:        time.Until(counter.ResetTime()),
	}, nil
}

func (trl *TenantRateLimiter) UpdateQuotas(quotas *types.ResourceQuotas) {
	trl.mu.Lock()
	defer trl.mu.Unlock()
	trl.quotas = quotas
	
	// Update existing counters
	for _, counter := range trl.counters {
		counter.UpdateLimit(int(quotas.MaxAPICallsPerSecond))
	}
}

type Counter struct {
	limit     int
	tokens    int
	resetTime time.Time
	mu        sync.Mutex
}

func NewCounter(limit int) *Counter {
	return &Counter{
		limit:     limit,
		tokens:    limit,
		resetTime: time.Now().Add(time.Minute),
	}
}

func (c *Counter) CanProceed() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	
	// Reset if time window passed
	if time.Now().After(c.resetTime) {
		c.tokens = c.limit
		c.resetTime = time.Now().Add(time.Minute)
	}
	
	return c.tokens > 0
}

func (c *Counter) Consume() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.tokens > 0 {
		c.tokens--
	}
}

func (c *Counter) Remaining() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.tokens
}

func (c *Counter) ResetTime() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.resetTime
}

func (c *Counter) UpdateLimit(newLimit int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.limit = newLimit
}