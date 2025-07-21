package did

import (
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	// capabilitytypes removed - deprecated in IBC-Go v8
	channeltypes "github.com/cosmos/ibc-go/v8/modules/core/04-channel/types"
	porttypes "github.com/cosmos/ibc-go/v8/modules/core/05-port/types"
	host "github.com/cosmos/ibc-go/v8/modules/core/24-host"
	ibcexported "github.com/cosmos/ibc-go/v8/modules/core/exported"

	"github.com/persona-chain/persona-chain/x/did/keeper"
	"github.com/persona-chain/persona-chain/x/did/types"
)

var (
	_ porttypes.IBCModule = IBCModule{}
)

// IBCModule implements the ICS26 interface for did module
type IBCModule struct {
	keeper keeper.Keeper
}

// NewIBCModule creates a new IBCModule given the keeper
func NewIBCModule(k keeper.Keeper) IBCModule {
	return IBCModule{
		keeper: k,
	}
}

// OnChanOpenInit implements the IBCModule interface
func (im IBCModule) OnChanOpenInit(
	ctx sdk.Context,
	order channeltypes.Order,
	connectionHops []string,
	portID string,
	channelID string,
	chanCap interface{} // Capability removed,
	counterparty channeltypes.Counterparty,
	version string,
) (string, error) {
	// Require ordered channels for DID updates to ensure consistency
	if order != channeltypes.ORDERED {
		return "", sdkerrors.Wrapf(channeltypes.ErrInvalidChannelOrdering, "expected %s channel, got %s ", channeltypes.ORDERED, order)
	}

	// Validate the version
	if version != types.Version {
		return "", sdkerrors.Wrapf(types.ErrInvalidVersion, "expected %s, got %s", types.Version, version)
	}

	return version, nil
}

// OnChanOpenTry implements the IBCModule interface
func (im IBCModule) OnChanOpenTry(
	ctx sdk.Context,
	order channeltypes.Order,
	connectionHops []string,
	portID,
	channelID string,
	chanCap interface{} // Capability removed,
	counterparty channeltypes.Counterparty,
	counterpartyVersion string,
) (string, error) {
	// Require ordered channels
	if order != channeltypes.ORDERED {
		return "", sdkerrors.Wrapf(channeltypes.ErrInvalidChannelOrdering, "expected %s channel, got %s ", channeltypes.ORDERED, order)
	}

	// Validate the version
	if counterpartyVersion != types.Version {
		return "", sdkerrors.Wrapf(types.ErrInvalidVersion, "expected %s, got %s", types.Version, counterpartyVersion)
	}

	return types.Version, nil
}

// OnChanOpenAck implements the IBCModule interface
func (im IBCModule) OnChanOpenAck(
	ctx sdk.Context,
	portID,
	channelID string,
	counterpartyChannelID string,
	counterpartyVersion string,
) error {
	if counterpartyVersion != types.Version {
		return sdkerrors.Wrapf(types.ErrInvalidVersion, "expected %s, got %s", types.Version, counterpartyVersion)
	}
	return nil
}

// OnChanOpenConfirm implements the IBCModule interface
func (im IBCModule) OnChanOpenConfirm(
	ctx sdk.Context,
	portID,
	channelID string,
) error {
	return nil
}

// OnChanCloseInit implements the IBCModule interface
func (im IBCModule) OnChanCloseInit(
	ctx sdk.Context,
	portID,
	channelID string,
) error {
	// Disallow user-initiated channel closing for DID channels
	return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "user cannot close channel")
}

// OnChanCloseConfirm implements the IBCModule interface
func (im IBCModule) OnChanCloseConfirm(
	ctx sdk.Context,
	portID,
	channelID string,
) error {
	return nil
}

// OnRecvPacket implements the IBCModule interface
func (im IBCModule) OnRecvPacket(
	ctx sdk.Context,
	packet channeltypes.Packet,
	relayer sdk.AccAddress,
) ibcexported.Acknowledgement {
	var data types.DidPacketData
	if err := types.ModuleCdc.UnmarshalJSON(packet.GetData(), &data); err != nil {
		return channeltypes.NewErrorAcknowledgement(fmt.Errorf("cannot unmarshal IBC packet data: %w", err))
	}

	var ack ibcexported.Acknowledgement
	switch packet := data.Packet.(type) {
	case *types.DidPacketData_DidUpdatePacketData:
		ack = im.onRecvDidUpdatePacket(ctx, packet.DidUpdatePacketData)
	case *types.DidPacketData_DidSyncPacketData:
		ack = im.onRecvDidSyncPacket(ctx, packet.DidSyncPacketData)
	default:
		ack = channeltypes.NewErrorAcknowledgement(fmt.Errorf("unknown packet type: %T", packet))
	}

	// Emit events
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypePacket,
			sdk.NewAttribute(sdk.AttributeKeyModule, types.ModuleName),
			sdk.NewAttribute(types.AttributeKeyAckSuccess, fmt.Sprintf("%t", !ack.Success())),
		),
	)

	return ack
}

func (im IBCModule) onRecvDidUpdatePacket(ctx sdk.Context, data *types.DidUpdatePacketData) ibcexported.Acknowledgement {
	// Process DID update from another chain
	ack := types.DidUpdatePacketAck{
		Success: true,
	}

	// Check if DID already exists
	existingDid, found := im.keeper.GetDidDocument(ctx, data.DidId)
	if found {
		// Update existing DID if the update is newer
		if data.UpdatedAt > existingDid.UpdatedAt {
			updatedDid := types.DidDocument{
				Id:          data.DidId,
				DidDocument: data.DidDocument,
				Creator:     data.Controller,
				Active:      data.Active,
				CreatedAt:   existingDid.CreatedAt,
				UpdatedAt:   data.UpdatedAt,
			}
			im.keeper.SetDidDocument(ctx, updatedDid)
		}
	} else {
		// Create new DID document
		newDid := types.DidDocument{
			Id:          data.DidId,
			DidDocument: data.DidDocument,
			Creator:     data.Controller,
			Active:      data.Active,
			CreatedAt:   data.UpdatedAt,
			UpdatedAt:   data.UpdatedAt,
		}
		im.keeper.SetDidDocument(ctx, newDid)
	}

	return channeltypes.NewResultAcknowledgement(types.ModuleCdc.MustMarshalJSON(&ack))
}

func (im IBCModule) onRecvDidSyncPacket(ctx sdk.Context, data *types.DidSyncPacketData) ibcexported.Acknowledgement {
	ack := types.DidSyncPacketAck{
		DidDocuments: []types.DidUpdatePacketData{},
	}

	// Retrieve requested DIDs
	for _, didId := range data.DidIds {
		if didDoc, found := im.keeper.GetDidDocument(ctx, didId); found {
			updateData := types.DidUpdatePacketData{
				DidId:       didDoc.Id,
				DidDocument: didDoc.DidDocument,
				Controller:  didDoc.Creator,
				Active:      didDoc.Active,
				UpdatedAt:   didDoc.UpdatedAt,
			}
			ack.DidDocuments = append(ack.DidDocuments, updateData)
		}
	}

	return channeltypes.NewResultAcknowledgement(types.ModuleCdc.MustMarshalJSON(&ack))
}

// OnAcknowledgementPacket implements the IBCModule interface
func (im IBCModule) OnAcknowledgementPacket(
	ctx sdk.Context,
	packet channeltypes.Packet,
	acknowledgement []byte,
	relayer sdk.AccAddress,
) error {
	var ack channeltypes.Acknowledgement
	if err := types.ModuleCdc.UnmarshalJSON(acknowledgement, &ack); err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrUnknownRequest, "cannot unmarshal packet acknowledgement: %v", err)
	}

	var data types.DidPacketData
	if err := types.ModuleCdc.UnmarshalJSON(packet.GetData(), &data); err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrUnknownRequest, "cannot unmarshal packet data: %v", err)
	}

	switch packet := data.Packet.(type) {
	case *types.DidPacketData_DidUpdatePacketData:
		return im.onAckDidUpdatePacket(ctx, packet.DidUpdatePacketData, ack)
	case *types.DidPacketData_DidSyncPacketData:
		return im.onAckDidSyncPacket(ctx, packet.DidSyncPacketData, ack)
	default:
		return fmt.Errorf("unknown packet type: %T", packet)
	}
}

func (im IBCModule) onAckDidUpdatePacket(ctx sdk.Context, data *types.DidUpdatePacketData, ack channeltypes.Acknowledgement) error {
	switch resp := ack.Response.(type) {
	case *channeltypes.Acknowledgement_Result:
		var ackData types.DidUpdatePacketAck
		if err := types.ModuleCdc.UnmarshalJSON(resp.Result, &ackData); err != nil {
			return err
		}

		ctx.EventManager().EmitEvent(
			sdk.NewEvent(
				types.EventTypeDidUpdate,
				sdk.NewAttribute(types.AttributeKeyDidId, data.DidId),
				sdk.NewAttribute(types.AttributeKeySuccess, fmt.Sprintf("%t", ackData.Success)),
			),
		)
	case *channeltypes.Acknowledgement_Error:
		ctx.EventManager().EmitEvent(
			sdk.NewEvent(
				types.EventTypeDidUpdate,
				sdk.NewAttribute(types.AttributeKeyDidId, data.DidId),
				sdk.NewAttribute(types.AttributeKeySuccess, "false"),
				sdk.NewAttribute(types.AttributeKeyError, resp.Error),
			),
		)
	}

	return nil
}

func (im IBCModule) onAckDidSyncPacket(ctx sdk.Context, data *types.DidSyncPacketData, ack channeltypes.Acknowledgement) error {
	switch resp := ack.Response.(type) {
	case *channeltypes.Acknowledgement_Result:
		var ackData types.DidSyncPacketAck
		if err := types.ModuleCdc.UnmarshalJSON(resp.Result, &ackData); err != nil {
			return err
		}

		// Process synchronized DID documents
		for _, didDoc := range ackData.DidDocuments {
			// Update local DID if newer
			existingDid, found := im.keeper.GetDidDocument(ctx, didDoc.DidId)
			if !found || didDoc.UpdatedAt > existingDid.UpdatedAt {
				updatedDid := types.DidDocument{
					Id:          didDoc.DidId,
					DidDocument: didDoc.DidDocument,
					Creator:     didDoc.Controller,
					Active:      didDoc.Active,
					CreatedAt:   existingDid.CreatedAt,
					UpdatedAt:   didDoc.UpdatedAt,
				}
				if !found {
					updatedDid.CreatedAt = didDoc.UpdatedAt
				}
				im.keeper.SetDidDocument(ctx, updatedDid)
			}
		}

		ctx.EventManager().EmitEvent(
			sdk.NewEvent(
				types.EventTypeDidSync,
				sdk.NewAttribute(types.AttributeKeySyncedCount, fmt.Sprintf("%d", len(ackData.DidDocuments))),
			),
		)
	case *channeltypes.Acknowledgement_Error:
		ctx.EventManager().EmitEvent(
			sdk.NewEvent(
				types.EventTypeDidSync,
				sdk.NewAttribute(types.AttributeKeySuccess, "false"),
				sdk.NewAttribute(types.AttributeKeyError, resp.Error),
			),
		)
	}

	return nil
}

// OnTimeoutPacket implements the IBCModule interface
func (im IBCModule) OnTimeoutPacket(
	ctx sdk.Context,
	packet channeltypes.Packet,
	relayer sdk.AccAddress,
) error {
	var data types.DidPacketData
	if err := types.ModuleCdc.UnmarshalJSON(packet.GetData(), &data); err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrUnknownRequest, "cannot unmarshal packet data: %v", err)
	}

	switch packet := data.Packet.(type) {
	case *types.DidPacketData_DidUpdatePacketData:
		return im.onTimeoutDidUpdatePacket(ctx, packet.DidUpdatePacketData)
	case *types.DidPacketData_DidSyncPacketData:
		return im.onTimeoutDidSyncPacket(ctx, packet.DidSyncPacketData)
	default:
		return fmt.Errorf("unknown packet type: %T", packet)
	}
}

func (im IBCModule) onTimeoutDidUpdatePacket(ctx sdk.Context, data *types.DidUpdatePacketData) error {
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeTimeout,
			sdk.NewAttribute(types.AttributeKeyDidId, data.DidId),
		),
	)
	return nil
}

func (im IBCModule) onTimeoutDidSyncPacket(ctx sdk.Context, data *types.DidSyncPacketData) error {
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeTimeout,
			sdk.NewAttribute(types.AttributeKeyRequestedCount, fmt.Sprintf("%d", len(data.DidIds))),
		),
	)
	return nil
}