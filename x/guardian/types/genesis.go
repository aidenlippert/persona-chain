package types

// DefaultIndex is the default global index
const DefaultIndex uint64 = 1

// DefaultGenesis returns the default genesis state
func DefaultGenesis() *GenesisState {
	return &GenesisState{
		Guardians:         []Guardian{},
		RecoveryProposals: []RecoveryProposal{},
		Params:            DefaultParams(),
	}
}

// Validate performs basic genesis state validation returning an error upon any
// failure.
func (gs GenesisState) Validate() error {
	return gs.Params.Validate()
}

// Guardian represents a guardian for a DID
type Guardian struct {
	DidId           string `protobuf:"bytes,1,opt,name=did_id,json=didId,proto3" json:"did_id,omitempty"`
	GuardianAddress string `protobuf:"bytes,2,opt,name=guardian_address,json=guardianAddress,proto3" json:"guardian_address,omitempty"`
	PublicKey       string `protobuf:"bytes,3,opt,name=public_key,json=publicKey,proto3" json:"public_key,omitempty"`
	Active          bool   `protobuf:"varint,4,opt,name=active,proto3" json:"active,omitempty"`
	AddedAt         int64  `protobuf:"varint,5,opt,name=added_at,json=addedAt,proto3" json:"added_at,omitempty"`
}

// RecoveryProposal represents a recovery proposal
type RecoveryProposal struct {
	Id            string   `protobuf:"bytes,1,opt,name=id,proto3" json:"id,omitempty"`
	DidId         string   `protobuf:"bytes,2,opt,name=did_id,json=didId,proto3" json:"did_id,omitempty"`
	Proposer      string   `protobuf:"bytes,3,opt,name=proposer,proto3" json:"proposer,omitempty"`
	NewController string   `protobuf:"bytes,4,opt,name=new_controller,json=newController,proto3" json:"new_controller,omitempty"`
	Reason        string   `protobuf:"bytes,5,opt,name=reason,proto3" json:"reason,omitempty"`
	Approvals     []string `protobuf:"bytes,6,rep,name=approvals,proto3" json:"approvals,omitempty"`
	Rejections    []string `protobuf:"bytes,7,rep,name=rejections,proto3" json:"rejections,omitempty"`
	Status        string   `protobuf:"bytes,8,opt,name=status,proto3" json:"status,omitempty"`
	CreatedAt     int64    `protobuf:"varint,9,opt,name=created_at,json=createdAt,proto3" json:"created_at,omitempty"`
	ExpiresAt     int64    `protobuf:"varint,10,opt,name=expires_at,json=expiresAt,proto3" json:"expires_at,omitempty"`
	ExecutedAt    int64    `protobuf:"varint,11,opt,name=executed_at,json=executedAt,proto3" json:"executed_at,omitempty"`
}

// GenesisState defines the guardian module's genesis state.
type GenesisState struct {
	Params            Params             `protobuf:"bytes,1,opt,name=params,proto3" json:"params"`
	Guardians         []Guardian         `protobuf:"bytes,2,rep,name=guardians,proto3" json:"guardians,omitempty"`
	RecoveryProposals []RecoveryProposal `protobuf:"bytes,3,rep,name=recovery_proposals,json=recoveryProposals,proto3" json:"recovery_proposals,omitempty"`
}

// Params defines the parameters for the module.
type Params struct {
	RecoveryThreshold     uint32 `protobuf:"varint,1,opt,name=recovery_threshold,json=recoveryThreshold,proto3" json:"recovery_threshold,omitempty"`
	ProposalExpirySeconds int64  `protobuf:"varint,2,opt,name=proposal_expiry_seconds,json=proposalExpirySeconds,proto3" json:"proposal_expiry_seconds,omitempty"`
}

// DefaultParams returns a default set of parameters
func DefaultParams() Params {
	return Params{
		RecoveryThreshold:     1, // Majority required
		ProposalExpirySeconds: 86400 * 7, // 7 days
	}
}

// Validate validates the set of params
func (p Params) Validate() error {
	return nil
}