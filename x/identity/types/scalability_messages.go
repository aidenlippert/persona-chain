package types

import (
	"time"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

// Enterprise scalability message types for PersonaChain Identity Platform
// Provides comprehensive API for managing multi-tenancy, scaling, and performance

// ==================== TENANT MANAGEMENT MESSAGES ====================

// MsgCreateTenant creates a new tenant with resource quotas
type MsgCreateTenant struct {
	Creator           string                 `json:"creator"`
	TenantID          string                 `json:"tenant_id"`
	Name              string                 `json:"name"`
	OrganizationType  string                 `json:"organization_type"`
	SubscriptionTier  SubscriptionTier       `json:"subscription_tier"`
	ResourceQuotas    *ResourceQuotas        `json:"resource_quotas,omitempty"`
	SecurityProfile   *SecurityProfile       `json:"security_profile,omitempty"`
	ComplianceProfile *ComplianceProfile     `json:"compliance_profile,omitempty"`
	RegionPreference  string                 `json:"region_preference,omitempty"`
	Metadata          map[string]interface{} `json:"metadata,omitempty"`
}

func NewMsgCreateTenant(creator, tenantID, name string, tier SubscriptionTier) *MsgCreateTenant {
	return &MsgCreateTenant{
		Creator:          creator,
		TenantID:         tenantID,
		Name:             name,
		SubscriptionTier: tier,
	}
}

func (msg *MsgCreateTenant) Route() string { return RouterKey }
func (msg *MsgCreateTenant) Type() string  { return "create_tenant" }
func (msg *MsgCreateTenant) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgCreateTenant) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgCreateTenant) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address: %s", err)
	}

	if len(msg.TenantID) == 0 {
		return sdkerrors.Wrap(ErrInvalidConfiguration, "tenant ID cannot be empty")
	}

	if len(msg.Name) == 0 {
		return sdkerrors.Wrap(ErrInvalidConfiguration, "tenant name cannot be empty")
	}

	if msg.SubscriptionTier == "" {
		return sdkerrors.Wrap(ErrInvalidConfiguration, "subscription tier cannot be empty")
	}

	return nil
}

type MsgCreateTenantResponse struct {
	TenantID  string `json:"tenant_id"`
	ShardKey  string `json:"shard_key"`
	CreatedAt string `json:"created_at"`
}

// MsgUpdateTenant updates tenant configuration
type MsgUpdateTenant struct {
	Creator           string                 `json:"creator"`
	TenantID          string                 `json:"tenant_id"`
	Name              string                 `json:"name,omitempty"`
	SubscriptionTier  SubscriptionTier       `json:"subscription_tier,omitempty"`
	ResourceQuotas    *ResourceQuotas        `json:"resource_quotas,omitempty"`
	SecurityProfile   *SecurityProfile       `json:"security_profile,omitempty"`
	ComplianceProfile *ComplianceProfile     `json:"compliance_profile,omitempty"`
	Status            TenantStatus           `json:"status,omitempty"`
	Metadata          map[string]interface{} `json:"metadata,omitempty"`
}

func (msg *MsgUpdateTenant) Route() string { return RouterKey }
func (msg *MsgUpdateTenant) Type() string  { return "update_tenant" }
func (msg *MsgUpdateTenant) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgUpdateTenant) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgUpdateTenant) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address: %s", err)
	}

	if len(msg.TenantID) == 0 {
		return sdkerrors.Wrap(ErrInvalidConfiguration, "tenant ID cannot be empty")
	}

	return nil
}

type MsgUpdateTenantResponse struct {
	TenantID  string `json:"tenant_id"`
	UpdatedAt string `json:"updated_at"`
}

// ==================== SCALING MANAGEMENT MESSAGES ====================

// MsgScaleHorizontally triggers horizontal scaling
type MsgScaleHorizontally struct {
	Creator         string `json:"creator"`
	TargetInstances int    `json:"target_instances"`
	ScalingReason   string `json:"scaling_reason,omitempty"`
	Force           bool   `json:"force,omitempty"`
}

func (msg *MsgScaleHorizontally) Route() string { return RouterKey }
func (msg *MsgScaleHorizontally) Type() string  { return "scale_horizontally" }
func (msg *MsgScaleHorizontally) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgScaleHorizontally) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgScaleHorizontally) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address: %s", err)
	}

	if msg.TargetInstances < 1 {
		return sdkerrors.Wrap(ErrInvalidConfiguration, "target instances must be at least 1")
	}

	if msg.TargetInstances > 1000 {
		return sdkerrors.Wrap(ErrInvalidConfiguration, "target instances cannot exceed 1000")
	}

	return nil
}

type MsgScaleHorizontallyResponse struct {
	CurrentInstances int    `json:"current_instances"`
	TargetInstances  int    `json:"target_instances"`
	ScalingStarted   bool   `json:"scaling_started"`
	EstimatedTime    string `json:"estimated_time"`
}

// MsgUpdateScalingPolicy updates auto-scaling configuration
type MsgUpdateScalingPolicy struct {
	Creator                string                    `json:"creator"`
	HorizontalScaling      *HorizontalScalingPolicy  `json:"horizontal_scaling,omitempty"`
	VerticalScaling        *VerticalScalingPolicy    `json:"vertical_scaling,omitempty"`
	ScalingTriggers        []*ScalingTrigger         `json:"scaling_triggers,omitempty"`
	CooldownPeriod         *time.Duration            `json:"cooldown_period,omitempty"`
	PredictiveScaling      *PredictiveScaling        `json:"predictive_scaling,omitempty"`
	EnableAutoScaling      bool                      `json:"enable_auto_scaling"`
}

func (msg *MsgUpdateScalingPolicy) Route() string { return RouterKey }
func (msg *MsgUpdateScalingPolicy) Type() string  { return "update_scaling_policy" }
func (msg *MsgUpdateScalingPolicy) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgUpdateScalingPolicy) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgUpdateScalingPolicy) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address: %s", err)
	}

	if msg.HorizontalScaling != nil {
		if msg.HorizontalScaling.MinInstances < 1 {
			return sdkerrors.Wrap(ErrInvalidConfiguration, "minimum instances must be at least 1")
		}
		if msg.HorizontalScaling.MaxInstances < msg.HorizontalScaling.MinInstances {
			return sdkerrors.Wrap(ErrInvalidConfiguration, "maximum instances must be greater than minimum")
		}
	}

	return nil
}

type MsgUpdateScalingPolicyResponse struct {
	PolicyUpdated bool   `json:"policy_updated"`
	UpdatedAt     string `json:"updated_at"`
}

// ==================== PERFORMANCE OPTIMIZATION MESSAGES ====================

// MsgOptimizePerformance triggers performance optimization
type MsgOptimizePerformance struct {
	Creator              string   `json:"creator"`
	OptimizationTargets  []string `json:"optimization_targets"`
	PerformanceLevel     string   `json:"performance_level"`
	ScheduleOptimization bool     `json:"schedule_optimization,omitempty"`
}

func (msg *MsgOptimizePerformance) Route() string { return RouterKey }
func (msg *MsgOptimizePerformance) Type() string  { return "optimize_performance" }
func (msg *MsgOptimizePerformance) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgOptimizePerformance) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgOptimizePerformance) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address: %s", err)
	}

	validLevels := map[string]bool{
		"basic":        true,
		"standard":     true,
		"aggressive":   true,
		"comprehensive": true,
	}

	if !validLevels[msg.PerformanceLevel] {
		return sdkerrors.Wrap(ErrInvalidConfiguration, "invalid performance level")
	}

	return nil
}

type MsgOptimizePerformanceResponse struct {
	OptimizationStarted bool              `json:"optimization_started"`
	EstimatedTime       string            `json:"estimated_time"`
	OptimizationID      string            `json:"optimization_id"`
	TargetsProcessed    []string          `json:"targets_processed"`
}

// ==================== CACHE MANAGEMENT MESSAGES ====================

// MsgInvalidateCache invalidates cached data
type MsgInvalidateCache struct {
	Creator        string      `json:"creator"`
	CachePattern   string      `json:"cache_pattern"`
	CacheLayers    []CacheType `json:"cache_layers,omitempty"`
	TenantID       string      `json:"tenant_id,omitempty"`
	ForceInvalidate bool       `json:"force_invalidate,omitempty"`
}

func (msg *MsgInvalidateCache) Route() string { return RouterKey }
func (msg *MsgInvalidateCache) Type() string  { return "invalidate_cache" }
func (msg *MsgInvalidateCache) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgInvalidateCache) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgInvalidateCache) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address: %s", err)
	}

	if len(msg.CachePattern) == 0 {
		return sdkerrors.Wrap(ErrInvalidConfiguration, "cache pattern cannot be empty")
	}

	return nil
}

type MsgInvalidateCacheResponse struct {
	InvalidatedKeys   int    `json:"invalidated_keys"`
	CacheLayers       []string `json:"cache_layers"`
	InvalidationTime  string `json:"invalidation_time"`
}

// ==================== RATE LIMITING MESSAGES ====================

// MsgUpdateRateLimits updates rate limiting configuration
type MsgUpdateRateLimits struct {
	Creator       string                      `json:"creator"`
	TenantID      string                      `json:"tenant_id,omitempty"`
	GlobalLimits  *RateLimits                 `json:"global_limits,omitempty"`
	TenantLimits  map[string]*RateLimits      `json:"tenant_limits,omitempty"`
	EndpointLimits map[string]*RateLimits     `json:"endpoint_limits,omitempty"`
	Algorithm     RateLimitAlgorithm          `json:"algorithm,omitempty"`
	TimeWindow    int                         `json:"time_window_seconds,omitempty"`
	BurstAllowance int                        `json:"burst_allowance,omitempty"`
}

func (msg *MsgUpdateRateLimits) Route() string { return RouterKey }
func (msg *MsgUpdateRateLimits) Type() string  { return "update_rate_limits" }
func (msg *MsgUpdateRateLimits) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgUpdateRateLimits) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgUpdateRateLimits) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address: %s", err)
	}

	// Validate rate limits
	if msg.GlobalLimits != nil {
		if err := validateRateLimits(msg.GlobalLimits); err != nil {
			return err
		}
	}

	for tenantID, limits := range msg.TenantLimits {
		if len(tenantID) == 0 {
			return sdkerrors.Wrap(ErrInvalidConfiguration, "tenant ID cannot be empty")
		}
		if err := validateRateLimits(limits); err != nil {
			return err
		}
	}

	return nil
}

type MsgUpdateRateLimitsResponse struct {
	UpdatedLimits     []string `json:"updated_limits"`
	EffectiveTime     string   `json:"effective_time"`
	TenantsAffected   int      `json:"tenants_affected"`
}

// ==================== MONITORING MESSAGES ====================

// MsgCreateAlert creates a new monitoring alert
type MsgCreateAlert struct {
	Creator     string         `json:"creator"`
	AlertRule   *AlertingRule  `json:"alert_rule"`
	TenantID    string         `json:"tenant_id,omitempty"`
	Enabled     bool           `json:"enabled"`
}

func (msg *MsgCreateAlert) Route() string { return RouterKey }
func (msg *MsgCreateAlert) Type() string  { return "create_alert" }
func (msg *MsgCreateAlert) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgCreateAlert) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgCreateAlert) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address: %s", err)
	}

	if msg.AlertRule == nil {
		return sdkerrors.Wrap(ErrInvalidConfiguration, "alert rule cannot be nil")
	}

	if len(msg.AlertRule.Name) == 0 {
		return sdkerrors.Wrap(ErrInvalidConfiguration, "alert rule name cannot be empty")
	}

	if len(msg.AlertRule.Condition) == 0 {
		return sdkerrors.Wrap(ErrInvalidConfiguration, "alert rule condition cannot be empty")
	}

	return nil
}

type MsgCreateAlertResponse struct {
	AlertID   string `json:"alert_id"`
	CreatedAt string `json:"created_at"`
	Enabled   bool   `json:"enabled"`
}

// MsgTriggerAlert manually triggers an alert
type MsgTriggerAlert struct {
	Creator     string                 `json:"creator"`
	AlertName   string                 `json:"alert_name"`
	Severity    AlertSeverity          `json:"severity"`
	Context     map[string]interface{} `json:"context,omitempty"`
	TenantID    string                 `json:"tenant_id,omitempty"`
	Message     string                 `json:"message,omitempty"`
}

func (msg *MsgTriggerAlert) Route() string { return RouterKey }
func (msg *MsgTriggerAlert) Type() string  { return "trigger_alert" }
func (msg *MsgTriggerAlert) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgTriggerAlert) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgTriggerAlert) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address: %s", err)
	}

	if len(msg.AlertName) == 0 {
		return sdkerrors.Wrap(ErrInvalidConfiguration, "alert name cannot be empty")
	}

	if msg.Severity == "" {
		return sdkerrors.Wrap(ErrInvalidConfiguration, "alert severity cannot be empty")
	}

	return nil
}

type MsgTriggerAlertResponse struct {
	AlertTriggered bool   `json:"alert_triggered"`
	AlertID        string `json:"alert_id"`
	TriggeredAt    string `json:"triggered_at"`
	NotificationsSent int `json:"notifications_sent"`
}

// ==================== QUERY TYPES ====================

// QueryTenantRequest queries tenant information
type QueryTenantRequest struct {
	TenantID string `json:"tenant_id"`
}

type QueryTenantResponse struct {
	Tenant *Tenant `json:"tenant"`
}

// QueryTenantsRequest queries multiple tenants
type QueryTenantsRequest struct {
	Pagination   *query.PageRequest     `json:"pagination,omitempty"`
	Filters      map[string]interface{} `json:"filters,omitempty"`
	Status       TenantStatus           `json:"status,omitempty"`
	Tier         SubscriptionTier       `json:"tier,omitempty"`
}

type QueryTenantsResponse struct {
	Tenants    []*Tenant              `json:"tenants"`
	Pagination *query.PageResponse    `json:"pagination,omitempty"`
	Total      int64                  `json:"total"`
}

// QueryScalingStatusRequest queries scaling status
type QueryScalingStatusRequest struct {
	TenantID string `json:"tenant_id,omitempty"`
}

type QueryScalingStatusResponse struct {
	Status *ScalingStatus `json:"status"`
}

// QueryCacheStatsRequest queries cache performance stats
type QueryCacheStatsRequest struct {
	CacheLayer CacheType `json:"cache_layer,omitempty"`
	TenantID   string    `json:"tenant_id,omitempty"`
}

type QueryCacheStatsResponse struct {
	Stats *CacheStats `json:"stats"`
}

// QueryRateLimitStatusRequest queries rate limiting status
type QueryRateLimitStatusRequest struct {
	TenantID   string `json:"tenant_id,omitempty"`
	Identifier string `json:"identifier,omitempty"`
}

type QueryRateLimitStatusResponse struct {
	Status      *RateLimitResult `json:"status"`
	CurrentUsage *UsageStats     `json:"current_usage"`
}

// QueryHealthStatusRequest queries system health
type QueryHealthStatusRequest struct {
	Component string `json:"component,omitempty"`
	TenantID  string `json:"tenant_id,omitempty"`
}

type QueryHealthStatusResponse struct {
	Health *HealthStatus `json:"health"`
}

// QueryMetricsRequest queries performance metrics
type QueryMetricsRequest struct {
	MetricType  string                 `json:"metric_type,omitempty"`
	TenantID    string                 `json:"tenant_id,omitempty"`
	TimeRange   *TimeRange             `json:"time_range,omitempty"`
	Aggregation string                 `json:"aggregation,omitempty"`
	Filters     map[string]interface{} `json:"filters,omitempty"`
}

type QueryMetricsResponse struct {
	Metrics []*Metric `json:"metrics"`
	Summary *MetricsSummary `json:"summary,omitempty"`
}

// QueryResourceUsageRequest queries tenant resource usage
type QueryResourceUsageRequest struct {
	TenantID   string     `json:"tenant_id"`
	TimeRange  *TimeRange `json:"time_range,omitempty"`
}

type QueryResourceUsageResponse struct {
	Usage    *TenantUsage    `json:"usage"`
	Quotas   *ResourceQuotas `json:"quotas"`
	Utilization map[string]float64 `json:"utilization"`
}

// ==================== HELPER FUNCTIONS ====================

func validateRateLimits(limits *RateLimits) error {
	if limits.RequestsPerSecond < 0 {
		return sdkerrors.Wrap(ErrInvalidConfiguration, "requests per second cannot be negative")
	}
	if limits.RequestsPerMinute < 0 {
		return sdkerrors.Wrap(ErrInvalidConfiguration, "requests per minute cannot be negative")
	}
	if limits.RequestsPerHour < 0 {
		return sdkerrors.Wrap(ErrInvalidConfiguration, "requests per hour cannot be negative")
	}
	if limits.ConcurrentConnections < 0 {
		return sdkerrors.Wrap(ErrInvalidConfiguration, "concurrent connections cannot be negative")
	}
	return nil
}

// Supporting types
type TimeRange struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}

type MetricsSummary struct {
	TotalMetrics     int                    `json:"total_metrics"`
	AverageValue     float64                `json:"average_value"`
	MinValue         float64                `json:"min_value"`
	MaxValue         float64                `json:"max_value"`
	Aggregations     map[string]interface{} `json:"aggregations"`
}

type TenantUsage struct {
	TenantID        string    `json:"tenant_id"`
	IdentityCount   int64     `json:"identity_count"`
	CredentialCount int64     `json:"credential_count"`
	APICallsToday   int64     `json:"api_calls_today"`
	StorageUsedGB   float64   `json:"storage_used_gb"`
	LastUpdated     time.Time `json:"last_updated"`
}

// HealthStatus represents system health information
type HealthStatus struct {
	Overall    string                 `json:"overall"`
	Timestamp  time.Time              `json:"timestamp"`
	Components map[string]interface{} `json:"components"`
	Issues     []string               `json:"issues,omitempty"`
}

// Additional error types for scalability
var (
	ErrTenantAlreadyExists    = sdkerrors.Register(ModuleName, 2001, "tenant already exists")
	ErrTenantNotFound        = sdkerrors.Register(ModuleName, 2002, "tenant not found")
	ErrQuotaExceeded         = sdkerrors.Register(ModuleName, 2003, "resource quota exceeded")
	ErrScalingInProgress     = sdkerrors.Register(ModuleName, 2004, "scaling operation in progress")
	ErrCacheOperationFailed  = sdkerrors.Register(ModuleName, 2005, "cache operation failed")
	ErrRateLimitExceeded     = sdkerrors.Register(ModuleName, 2006, "rate limit exceeded")
	ErrMonitoringFailed      = sdkerrors.Register(ModuleName, 2007, "monitoring operation failed")
)