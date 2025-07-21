package did

import (
	"context"
	"fmt"
	"encoding/json"
	"time"

	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	// capabilitytypes removed - deprecated in IBC-Go v8
	
	clienttypes "github.com/cosmos/ibc-go/v8/modules/core/02-client/types"
	channeltypes "github.com/cosmos/ibc-go/v8/modules/core/04-channel/types"
	porttypes "github.com/cosmos/ibc-go/v8/modules/core/05-port/types"
	host "github.com/cosmos/ibc-go/v8/modules/core/24-host"
	ibcexported "github.com/cosmos/ibc-go/v8/modules/core/exported"
	
	"github.com/persona-chain/persona-chain/x/did/keeper"
	"github.com/persona-chain/persona-chain/x/did/types"
)

var (
	_ porttypes.IBCModule = IBCModule{}
	_ porttypes.Middleware = IBCModule{}
)

// IBCModule implements the ICS26 interface for interchain DID operations
type IBCModule struct {
	keeper        keeper.Keeper
	app           porttypes.IBCModule
	cdc           codec.Codec
}

// NewIBCModule creates a new IBCModule given the keeper and underlying application
func NewIBCModule(k keeper.Keeper, app porttypes.IBCModule, cdc codec.Codec) IBCModule {
	return IBCModule{
		keeper:        k,
		app:           app,
		cdc:           cdc,
	}
}

// OnChanOpenInit implements the IBCModule interface
func (im IBCModule) OnChanOpenInit(
	ctx sdk.Context,
	order channeltypes.Order,
	connectionHops []string,
	portID string,
	channelID string,
	channelCap interface{}, // capability removed in IBC-Go v8
	counterparty channeltypes.Counterparty,
	version string,
) (string, error) {
	// Validate channel parameters for DID operations
	if err := im.validateChannelParams(order, connectionHops, portID); err != nil {
		return "", err
	}

	// Enhanced version negotiation for DID-specific features
	negotiatedVersion, err := im.negotiateVersion(version)
	if err != nil {
		return "", err
	}

	// Capability claiming removed in IBC-Go v8
	// if err := im.keeper.ClaimCapability(ctx, channelCap, host.ChannelCapabilityPath(portID, channelID)); err != nil {
	//	return "", err
	// }

	// Log channel opening for audit
	im.keeper.LogAuditEvent(ctx, "ibc_channel_open_init", map[string]interface{}{
		"channel_id":   channelID,
		"port_id":      portID,
		"counterparty": counterparty.String(),
		"version":      negotiatedVersion,
	})

	return negotiatedVersion, nil
}

// OnChanOpenTry implements the IBCModule interface
func (im IBCModule) OnChanOpenTry(
	ctx sdk.Context,
	order channeltypes.Order,
	connectionHops []string,
	portID,
	channelID string,
	channelCap interface{}, // capability removed in IBC-Go v8
	counterparty channeltypes.Counterparty,
	counterpartyVersion string,
) (string, error) {
	// Validate channel parameters
	if err := im.validateChannelParams(order, connectionHops, portID); err != nil {
		return "", err
	}

	// Negotiate version with counterparty
	negotiatedVersion, err := im.negotiateVersion(counterpartyVersion)
	if err != nil {
		return "", err
	}

	// Capability claiming removed in IBC-Go v8
	// if err := im.keeper.ClaimCapability(ctx, channelCap, host.ChannelCapabilityPath(portID, channelID)); err != nil {
	//	return "", err
	// }

	// Log channel opening attempt
	im.keeper.LogAuditEvent(ctx, "ibc_channel_open_try", map[string]interface{}{
		"channel_id":           channelID,
		"port_id":              portID,
		"counterparty":         counterparty.String(),
		"counterparty_version": counterpartyVersion,
		"negotiated_version":   negotiatedVersion,
	})

	return negotiatedVersion, nil
}

// OnChanOpenAck implements the IBCModule interface
func (im IBCModule) OnChanOpenAck(
	ctx sdk.Context,
	portID,
	channelID string,
	counterpartyChannelID string,
	counterpartyVersion string,
) error {
	// Validate counterparty version
	if err := im.validateVersion(counterpartyVersion); err != nil {
		return err
	}

	// Store channel information for future use
	im.keeper.SetChannelInfo(ctx, channelID, types.ChannelInfo{
		PortID:                portID,
		ChannelID:             channelID,
		CounterpartyChannelID: counterpartyChannelID,
		Version:               counterpartyVersion,
		State:                 types.ChannelStateOpen,
		CreatedAt:             ctx.BlockTime(),
	})

	// Log successful channel opening
	im.keeper.LogAuditEvent(ctx, "ibc_channel_open_ack", map[string]interface{}{
		"channel_id":              channelID,
		"counterparty_channel_id": counterpartyChannelID,
		"counterparty_version":    counterpartyVersion,
	})

	return nil
}

// OnChanOpenConfirm implements the IBCModule interface
func (im IBCModule) OnChanOpenConfirm(
	ctx sdk.Context,
	portID,
	channelID string,
) error {
	// Update channel state to confirmed
	channelInfo, found := im.keeper.GetChannelInfo(ctx, channelID)
	if !found {
		return sdkerrors.Wrapf(types.ErrChannelNotFound, "channel %s not found", channelID)
	}

	channelInfo.State = types.ChannelStateConfirmed
	channelInfo.ConfirmedAt = &ctx.BlockTime()
	im.keeper.SetChannelInfo(ctx, channelID, channelInfo)

	// Log channel confirmation
	im.keeper.LogAuditEvent(ctx, "ibc_channel_open_confirm", map[string]interface{}{
		"channel_id": channelID,
		"port_id":    portID,
	})

	return nil
}

// OnChanCloseInit implements the IBCModule interface
func (im IBCModule) OnChanCloseInit(
	ctx sdk.Context,
	portID,
	channelID string,
) error {
	// Update channel state to closing
	channelInfo, found := im.keeper.GetChannelInfo(ctx, channelID)
	if !found {
		return sdkerrors.Wrapf(types.ErrChannelNotFound, "channel %s not found", channelID)
	}

	channelInfo.State = types.ChannelStateClosing
	im.keeper.SetChannelInfo(ctx, channelID, channelInfo)

	// Log channel closure initiation
	im.keeper.LogAuditEvent(ctx, "ibc_channel_close_init", map[string]interface{}{
		"channel_id": channelID,
		"port_id":    portID,
	})

	return nil
}

// OnChanCloseConfirm implements the IBCModule interface
func (im IBCModule) OnChanCloseConfirm(
	ctx sdk.Context,
	portID,
	channelID string,
) error {
	// Update channel state to closed
	channelInfo, found := im.keeper.GetChannelInfo(ctx, channelID)
	if !found {
		return sdkerrors.Wrapf(types.ErrChannelNotFound, "channel %s not found", channelID)
	}

	channelInfo.State = types.ChannelStateClosed
	channelInfo.ClosedAt = &ctx.BlockTime()
	im.keeper.SetChannelInfo(ctx, channelID, channelInfo)

	// Log channel closure confirmation
	im.keeper.LogAuditEvent(ctx, "ibc_channel_close_confirm", map[string]interface{}{
		"channel_id": channelID,
		"port_id":    portID,
	})

	return nil
}

// OnRecvPacket implements the IBCModule interface
func (im IBCModule) OnRecvPacket(
	ctx sdk.Context,
	packet channeltypes.Packet,
	relayer sdk.AccAddress,
) ibcexported.Acknowledgement {
	// Parse the packet data
	var data types.IBCPacketData
	if err := json.Unmarshal(packet.GetData(), &data); err != nil {
		return channeltypes.NewErrorAcknowledgement(fmt.Errorf("failed to unmarshal packet data: %w", err))
	}

	// Validate packet data
	if err := im.validatePacketData(data); err != nil {
		return channeltypes.NewErrorAcknowledgement(err)
	}

	// Log packet receipt
	im.keeper.LogAuditEvent(ctx, "ibc_packet_received", map[string]interface{}{
		"packet_sequence": packet.Sequence,
		"source_channel":  packet.SourceChannel,
		"dest_channel":    packet.DestinationChannel,
		"packet_type":     data.Type,
		"relayer":         relayer.String(),
	})

	// Process packet based on type
	switch data.Type {
	case types.PacketTypeDIDResolution:
		return im.handleDIDResolution(ctx, packet, data)
	case types.PacketTypeVCVerification:
		return im.handleVCVerification(ctx, packet, data)
	case types.PacketTypeCrossChainProof:
		return im.handleCrossChainProof(ctx, packet, data)
	case types.PacketTypeGovernanceProposal:
		return im.handleGovernanceProposal(ctx, packet, data)
	default:
		return channeltypes.NewErrorAcknowledgement(fmt.Errorf("unknown packet type: %s", data.Type))
	}
}

// OnAcknowledgementPacket implements the IBCModule interface
func (im IBCModule) OnAcknowledgementPacket(
	ctx sdk.Context,
	packet channeltypes.Packet,
	acknowledgement []byte,
	relayer sdk.AccAddress,
) error {
	// Parse acknowledgement
	var ack channeltypes.Acknowledgement
	if err := json.Unmarshal(acknowledgement, &ack); err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidRequest, "failed to unmarshal acknowledgement: %v", err)
	}

	// Log acknowledgement
	im.keeper.LogAuditEvent(ctx, "ibc_packet_acknowledgement", map[string]interface{}{
		"packet_sequence": packet.Sequence,
		"source_channel":  packet.SourceChannel,
		"dest_channel":    packet.DestinationChannel,
		"success":         ack.Success(),
		"relayer":         relayer.String(),
	})

	// Process acknowledgement based on result
	if ack.Success() {
		return im.handleSuccessfulAck(ctx, packet, ack.GetResult())
	} else {
		return im.handleFailedAck(ctx, packet, ack.GetError())
	}
}

// OnTimeoutPacket implements the IBCModule interface
func (im IBCModule) OnTimeoutPacket(
	ctx sdk.Context,
	packet channeltypes.Packet,
	relayer sdk.AccAddress,
) error {
	// Log timeout
	im.keeper.LogAuditEvent(ctx, "ibc_packet_timeout", map[string]interface{}{
		"packet_sequence": packet.Sequence,
		"source_channel":  packet.SourceChannel,
		"dest_channel":    packet.DestinationChannel,
		"timeout_height":  packet.TimeoutHeight,
		"timeout_timestamp": packet.TimeoutTimestamp,
		"relayer":         relayer.String(),
	})

	// Handle timeout based on packet type
	var data types.IBCPacketData
	if err := json.Unmarshal(packet.GetData(), &data); err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidRequest, "failed to unmarshal packet data: %v", err)
	}

	return im.handlePacketTimeout(ctx, packet, data)
}

// Enterprise-specific packet handlers

// handleDIDResolution processes cross-chain DID resolution requests
func (im IBCModule) handleDIDResolution(ctx sdk.Context, packet channeltypes.Packet, data types.IBCPacketData) ibcexported.Acknowledgement {
	var req types.DIDResolutionRequest
	if err := json.Unmarshal(data.Data, &req); err != nil {
		return channeltypes.NewErrorAcknowledgement(fmt.Errorf("failed to unmarshal DID resolution request: %w", err))
	}

	// Resolve DID
	didDoc, found := im.keeper.GetDIDDocument(ctx, req.DID)
	if !found {
		return channeltypes.NewErrorAcknowledgement(fmt.Errorf("DID not found: %s", req.DID))
	}

	// Create response
	response := types.DIDResolutionResponse{
		DID:       req.DID,
		Document:  didDoc,
		Timestamp: ctx.BlockTime(),
		ChainID:   ctx.ChainID(),
	}

	responseData, err := json.Marshal(response)
	if err != nil {
		return channeltypes.NewErrorAcknowledgement(fmt.Errorf("failed to marshal response: %w", err))
	}

	// Log successful resolution
	im.keeper.LogAuditEvent(ctx, "cross_chain_did_resolution", map[string]interface{}{
		"did":            req.DID,
		"source_chain":   packet.SourceChannel,
		"success":        true,
	})

	return channeltypes.NewResultAcknowledgement(responseData)
}

// handleVCVerification processes cross-chain VC verification requests
func (im IBCModule) handleVCVerification(ctx sdk.Context, packet channeltypes.Packet, data types.IBCPacketData) ibcexported.Acknowledgement {
	var req types.VCVerificationRequest
	if err := json.Unmarshal(data.Data, &req); err != nil {
		return channeltypes.NewErrorAcknowledgement(fmt.Errorf("failed to unmarshal VC verification request: %w", err))
	}

	// Verify credential
	isValid, err := im.keeper.VerifyCredential(ctx, req.Credential)
	if err != nil {
		return channeltypes.NewErrorAcknowledgement(fmt.Errorf("failed to verify credential: %w", err))
	}

	// Create response
	response := types.VCVerificationResponse{
		CredentialID: req.Credential.ID,
		IsValid:      isValid,
		Timestamp:    ctx.BlockTime(),
		ChainID:      ctx.ChainID(),
	}

	responseData, err := json.Marshal(response)
	if err != nil {
		return channeltypes.NewErrorAcknowledgement(fmt.Errorf("failed to marshal response: %w", err))
	}

	// Log verification
	im.keeper.LogAuditEvent(ctx, "cross_chain_vc_verification", map[string]interface{}{
		"credential_id": req.Credential.ID,
		"is_valid":      isValid,
		"source_chain":  packet.SourceChannel,
	})

	return channeltypes.NewResultAcknowledgement(responseData)
}

// handleCrossChainProof processes cross-chain ZK proof verification
func (im IBCModule) handleCrossChainProof(ctx sdk.Context, packet channeltypes.Packet, data types.IBCPacketData) ibcexported.Acknowledgement {
	var req types.CrossChainProofRequest
	if err := json.Unmarshal(data.Data, &req); err != nil {
		return channeltypes.NewErrorAcknowledgement(fmt.Errorf("failed to unmarshal proof request: %w", err))
	}

	// Verify ZK proof
	isValid, err := im.keeper.VerifyZKProof(ctx, req.CircuitID, req.PublicInputs, req.Proof)
	if err != nil {
		return channeltypes.NewErrorAcknowledgement(fmt.Errorf("failed to verify ZK proof: %w", err))
	}

	// Create response
	response := types.CrossChainProofResponse{
		ProofID:   req.ProofID,
		IsValid:   isValid,
		Timestamp: ctx.BlockTime(),
		ChainID:   ctx.ChainID(),
	}

	responseData, err := json.Marshal(response)
	if err != nil {
		return channeltypes.NewErrorAcknowledgement(fmt.Errorf("failed to marshal response: %w", err))
	}

	// Log proof verification
	im.keeper.LogAuditEvent(ctx, "cross_chain_proof_verification", map[string]interface{}{
		"proof_id":     req.ProofID,
		"circuit_id":   req.CircuitID,
		"is_valid":     isValid,
		"source_chain": packet.SourceChannel,
	})

	return channeltypes.NewResultAcknowledgement(responseData)
}

// handleGovernanceProposal processes cross-chain governance proposals
func (im IBCModule) handleGovernanceProposal(ctx sdk.Context, packet channeltypes.Packet, data types.IBCPacketData) ibcexported.Acknowledgement {
	var req types.GovernanceProposalRequest
	if err := json.Unmarshal(data.Data, &req); err != nil {
		return channeltypes.NewErrorAcknowledgement(fmt.Errorf("failed to unmarshal governance request: %w", err))
	}

	// Validate proposal
	if err := im.keeper.ValidateGovernanceProposal(ctx, req.Proposal); err != nil {
		return channeltypes.NewErrorAcknowledgement(fmt.Errorf("invalid governance proposal: %w", err))
	}

	// Submit proposal
	proposalID, err := im.keeper.SubmitGovernanceProposal(ctx, req.Proposal)
	if err != nil {
		return channeltypes.NewErrorAcknowledgement(fmt.Errorf("failed to submit proposal: %w", err))
	}

	// Create response
	response := types.GovernanceProposalResponse{
		ProposalID: proposalID,
		Status:     "submitted",
		Timestamp:  ctx.BlockTime(),
		ChainID:    ctx.ChainID(),
	}

	responseData, err := json.Marshal(response)
	if err != nil {
		return channeltypes.NewErrorAcknowledgement(fmt.Errorf("failed to marshal response: %w", err))
	}

	// Log proposal submission
	im.keeper.LogAuditEvent(ctx, "cross_chain_governance_proposal", map[string]interface{}{
		"proposal_id":  proposalID,
		"proposal_type": req.Proposal.Type,
		"source_chain": packet.SourceChannel,
	})

	return channeltypes.NewResultAcknowledgement(responseData)
}

// Utility functions

// validateChannelParams validates channel opening parameters
func (im IBCModule) validateChannelParams(order channeltypes.Order, connectionHops []string, portID string) error {
	// Validate port ID
	if portID != types.PortID {
		return sdkerrors.Wrapf(types.ErrInvalidPort, "expected port %s, got %s", types.PortID, portID)
	}

	// Validate order (must be ORDERED for DID operations)
	if order != channeltypes.ORDERED {
		return sdkerrors.Wrapf(types.ErrInvalidChannelOrder, "expected ORDERED channel, got %s", order)
	}

	// Validate connection hops
	if len(connectionHops) != 1 {
		return sdkerrors.Wrapf(types.ErrInvalidConnectionHops, "expected 1 connection hop, got %d", len(connectionHops))
	}

	return nil
}

// negotiateVersion negotiates the IBC version for DID operations
func (im IBCModule) negotiateVersion(version string) (string, error) {
	supportedVersions := []string{
		types.IBCVersion1,
		types.IBCVersion2,
	}

	// If no version specified, use latest
	if version == "" {
		return types.IBCVersion2, nil
	}

	// Check if version is supported
	for _, supported := range supportedVersions {
		if version == supported {
			return version, nil
		}
	}

	return "", sdkerrors.Wrapf(types.ErrUnsupportedVersion, "unsupported version: %s", version)
}

// validateVersion validates IBC version
func (im IBCModule) validateVersion(version string) error {
	_, err := im.negotiateVersion(version)
	return err
}

// validatePacketData validates incoming packet data
func (im IBCModule) validatePacketData(data types.IBCPacketData) error {
	// Validate packet type
	validTypes := []string{
		types.PacketTypeDIDResolution,
		types.PacketTypeVCVerification,
		types.PacketTypeCrossChainProof,
		types.PacketTypeGovernanceProposal,
	}

	typeValid := false
	for _, validType := range validTypes {
		if data.Type == validType {
			typeValid = true
			break
		}
	}

	if !typeValid {
		return sdkerrors.Wrapf(types.ErrInvalidPacketType, "invalid packet type: %s", data.Type)
	}

	// Validate data length
	if len(data.Data) == 0 {
		return sdkerrors.Wrap(types.ErrEmptyPacketData, "packet data cannot be empty")
	}

	if len(data.Data) > types.MaxPacketDataSize {
		return sdkerrors.Wrapf(types.ErrPacketDataTooLarge, "packet data exceeds maximum size: %d", len(data.Data))
	}

	return nil
}

// handleSuccessfulAck handles successful packet acknowledgements
func (im IBCModule) handleSuccessfulAck(ctx sdk.Context, packet channeltypes.Packet, result []byte) error {
	// Parse packet data to determine type
	var data types.IBCPacketData
	if err := json.Unmarshal(packet.GetData(), &data); err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidRequest, "failed to unmarshal packet data: %v", err)
	}

	// Handle based on packet type
	switch data.Type {
	case types.PacketTypeDIDResolution:
		return im.handleDIDResolutionAck(ctx, packet, result)
	case types.PacketTypeVCVerification:
		return im.handleVCVerificationAck(ctx, packet, result)
	case types.PacketTypeCrossChainProof:
		return im.handleCrossChainProofAck(ctx, packet, result)
	case types.PacketTypeGovernanceProposal:
		return im.handleGovernanceProposalAck(ctx, packet, result)
	default:
		return sdkerrors.Wrapf(types.ErrInvalidPacketType, "unknown packet type: %s", data.Type)
	}
}

// handleFailedAck handles failed packet acknowledgements
func (im IBCModule) handleFailedAck(ctx sdk.Context, packet channeltypes.Packet, errorMsg string) error {
	// Log failed acknowledgement
	im.keeper.LogAuditEvent(ctx, "ibc_packet_failed", map[string]interface{}{
		"packet_sequence": packet.Sequence,
		"source_channel":  packet.SourceChannel,
		"dest_channel":    packet.DestinationChannel,
		"error":           errorMsg,
	})

	// Handle based on packet type
	var data types.IBCPacketData
	if err := json.Unmarshal(packet.GetData(), &data); err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidRequest, "failed to unmarshal packet data: %v", err)
	}

	// Trigger appropriate error handling based on packet type
	switch data.Type {
	case types.PacketTypeDIDResolution:
		return im.handleDIDResolutionError(ctx, packet, errorMsg)
	case types.PacketTypeVCVerification:
		return im.handleVCVerificationError(ctx, packet, errorMsg)
	case types.PacketTypeCrossChainProof:
		return im.handleCrossChainProofError(ctx, packet, errorMsg)
	case types.PacketTypeGovernanceProposal:
		return im.handleGovernanceProposalError(ctx, packet, errorMsg)
	default:
		return nil
	}
}

// handlePacketTimeout handles packet timeouts
func (im IBCModule) handlePacketTimeout(ctx sdk.Context, packet channeltypes.Packet, data types.IBCPacketData) error {
	// Log timeout
	im.keeper.LogAuditEvent(ctx, "ibc_packet_timeout_handled", map[string]interface{}{
		"packet_sequence": packet.Sequence,
		"packet_type":     data.Type,
		"source_channel":  packet.SourceChannel,
	})

	// Handle based on packet type
	switch data.Type {
	case types.PacketTypeDIDResolution:
		return im.handleDIDResolutionTimeout(ctx, packet, data)
	case types.PacketTypeVCVerification:
		return im.handleVCVerificationTimeout(ctx, packet, data)
	case types.PacketTypeCrossChainProof:
		return im.handleCrossChainProofTimeout(ctx, packet, data)
	case types.PacketTypeGovernanceProposal:
		return im.handleGovernanceProposalTimeout(ctx, packet, data)
	default:
		return nil
	}
}

// Specific acknowledgement handlers (simplified implementations)
func (im IBCModule) handleDIDResolutionAck(ctx sdk.Context, packet channeltypes.Packet, result []byte) error {
	// Handle DID resolution acknowledgement
	return nil
}

func (im IBCModule) handleVCVerificationAck(ctx sdk.Context, packet channeltypes.Packet, result []byte) error {
	// Handle VC verification acknowledgement
	return nil
}

func (im IBCModule) handleCrossChainProofAck(ctx sdk.Context, packet channeltypes.Packet, result []byte) error {
	// Handle cross-chain proof acknowledgement
	return nil
}

func (im IBCModule) handleGovernanceProposalAck(ctx sdk.Context, packet channeltypes.Packet, result []byte) error {
	// Handle governance proposal acknowledgement
	return nil
}

// Error handlers
func (im IBCModule) handleDIDResolutionError(ctx sdk.Context, packet channeltypes.Packet, errorMsg string) error {
	// Handle DID resolution error
	return nil
}

func (im IBCModule) handleVCVerificationError(ctx sdk.Context, packet channeltypes.Packet, errorMsg string) error {
	// Handle VC verification error
	return nil
}

func (im IBCModule) handleCrossChainProofError(ctx sdk.Context, packet channeltypes.Packet, errorMsg string) error {
	// Handle cross-chain proof error
	return nil
}

func (im IBCModule) handleGovernanceProposalError(ctx sdk.Context, packet channeltypes.Packet, errorMsg string) error {
	// Handle governance proposal error
	return nil
}

// Timeout handlers
func (im IBCModule) handleDIDResolutionTimeout(ctx sdk.Context, packet channeltypes.Packet, data types.IBCPacketData) error {
	// Handle DID resolution timeout
	return nil
}

func (im IBCModule) handleVCVerificationTimeout(ctx sdk.Context, packet channeltypes.Packet, data types.IBCPacketData) error {
	// Handle VC verification timeout
	return nil
}

func (im IBCModule) handleCrossChainProofTimeout(ctx sdk.Context, packet channeltypes.Packet, data types.IBCPacketData) error {
	// Handle cross-chain proof timeout
	return nil
}

func (im IBCModule) handleGovernanceProposalTimeout(ctx sdk.Context, packet channeltypes.Packet, data types.IBCPacketData) error {
	// Handle governance proposal timeout
	return nil
}