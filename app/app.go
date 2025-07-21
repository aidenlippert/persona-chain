package app

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"

	autocliv1 "cosmossdk.io/api/cosmos/autocli/v1"
	reflectionv1 "cosmossdk.io/api/cosmos/reflection/v1"
	"cosmossdk.io/client/v2/autocli"
	"cosmossdk.io/core/appmodule"
	"cosmossdk.io/log"
	storetypes "cosmossdk.io/store/types"
	// "cosmossdk.io/x/evidence" // temporarily disabled - fixing signature
	// evidencekeeper "cosmossdk.io/x/evidence/keeper" // temporarily disabled
	// evidencetypes "cosmossdk.io/x/evidence/types" // temporarily disabled
	"cosmossdk.io/x/feegrant"
	feegrantkeeper "cosmossdk.io/x/feegrant/keeper"
	feegrantmodule "cosmossdk.io/x/feegrant/module"
	"cosmossdk.io/x/upgrade"
	upgradekeeper "cosmossdk.io/x/upgrade/keeper"
	upgradetypes "cosmossdk.io/x/upgrade/types"

	"github.com/cosmos/cosmos-db"
	"github.com/cosmos/cosmos-sdk/baseapp"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/client/grpc/cmtservice"
	nodeservice "github.com/cosmos/cosmos-sdk/client/grpc/node"
	"github.com/cosmos/gogoproto/grpc"
	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/codec/address"
	"github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/cosmos/gogoproto/proto"
	"cosmossdk.io/x/tx/signing"
	"github.com/cosmos/cosmos-sdk/runtime"
	runtimeservices "github.com/cosmos/cosmos-sdk/runtime/services"
	"github.com/cosmos/cosmos-sdk/server"
	"github.com/cosmos/cosmos-sdk/server/api"
	"github.com/cosmos/cosmos-sdk/server/config"
	servertypes "github.com/cosmos/cosmos-sdk/server/types"
	"github.com/cosmos/cosmos-sdk/std"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"
	"github.com/cosmos/cosmos-sdk/version"
	"github.com/cosmos/cosmos-sdk/x/auth"
	"github.com/cosmos/cosmos-sdk/x/auth/ante"
	authcodec "github.com/cosmos/cosmos-sdk/x/auth/codec"
	authkeeper "github.com/cosmos/cosmos-sdk/x/auth/keeper"
	authsims "github.com/cosmos/cosmos-sdk/x/auth/simulation"
	authtx "github.com/cosmos/cosmos-sdk/x/auth/tx"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	// "github.com/cosmos/cosmos-sdk/x/auth/vesting" // temporarily disabled
	// vestingtypes "github.com/cosmos/cosmos-sdk/x/auth/vesting/types" // temporarily disabled
	"github.com/cosmos/cosmos-sdk/x/authz"
	authzkeeper "github.com/cosmos/cosmos-sdk/x/authz/keeper"
	authzmodule "github.com/cosmos/cosmos-sdk/x/authz/module"
	"github.com/cosmos/cosmos-sdk/x/bank"
	bankkeeper "github.com/cosmos/cosmos-sdk/x/bank/keeper"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	"github.com/cosmos/cosmos-sdk/x/consensus"
	consensusparamkeeper "github.com/cosmos/cosmos-sdk/x/consensus/keeper"
	consensusparamtypes "github.com/cosmos/cosmos-sdk/x/consensus/types"
	"github.com/cosmos/cosmos-sdk/x/crisis"
	crisiskeeper "github.com/cosmos/cosmos-sdk/x/crisis/keeper"
	crisistypes "github.com/cosmos/cosmos-sdk/x/crisis/types"
	distr "github.com/cosmos/cosmos-sdk/x/distribution"
	distrkeeper "github.com/cosmos/cosmos-sdk/x/distribution/keeper"
	distrtypes "github.com/cosmos/cosmos-sdk/x/distribution/types"
	"github.com/cosmos/cosmos-sdk/x/genutil"
	genutiltypes "github.com/cosmos/cosmos-sdk/x/genutil/types"
	"github.com/cosmos/cosmos-sdk/x/gov"
	govclient "github.com/cosmos/cosmos-sdk/x/gov/client"
	govkeeper "github.com/cosmos/cosmos-sdk/x/gov/keeper"
	govtypes "github.com/cosmos/cosmos-sdk/x/gov/types"
	govv1beta1 "github.com/cosmos/cosmos-sdk/x/gov/types/v1beta1"
	"github.com/cosmos/cosmos-sdk/x/mint"
	mintkeeper "github.com/cosmos/cosmos-sdk/x/mint/keeper"
	minttypes "github.com/cosmos/cosmos-sdk/x/mint/types"
	"github.com/cosmos/cosmos-sdk/x/params"
	paramsclient "github.com/cosmos/cosmos-sdk/x/params/client"
	paramskeeper "github.com/cosmos/cosmos-sdk/x/params/keeper"
	paramstypes "github.com/cosmos/cosmos-sdk/x/params/types"
	paramproposal "github.com/cosmos/cosmos-sdk/x/params/types/proposal"
	"github.com/cosmos/cosmos-sdk/x/slashing"
	slashingkeeper "github.com/cosmos/cosmos-sdk/x/slashing/keeper"
	slashingtypes "github.com/cosmos/cosmos-sdk/x/slashing/types"
	"github.com/cosmos/cosmos-sdk/x/staking"
	stakingkeeper "github.com/cosmos/cosmos-sdk/x/staking/keeper"
	stakingtypes "github.com/cosmos/cosmos-sdk/x/staking/types"

	// IBC imports temporarily disabled
	// ibc "github.com/cosmos/ibc-go/v8/modules/core"
	// ibcclienttypes "github.com/cosmos/ibc-go/v8/modules/core/02-client/types"
	// ibcconnectiontypes "github.com/cosmos/ibc-go/v8/modules/core/03-connection/types"
	// ibcexported "github.com/cosmos/ibc-go/v8/modules/core/exported"
	// ibckeeper "github.com/cosmos/ibc-go/v8/modules/core/keeper"
	// solomachine "github.com/cosmos/ibc-go/v8/modules/light-clients/06-solomachine"
	// ibctm "github.com/cosmos/ibc-go/v8/modules/light-clients/07-tendermint"

	// Custom modules - temporarily disabled to get basic blockchain compiling
	"github.com/persona-chain/persona-chain/x/did" // ✅ ENABLED FOR PRODUCTION
	didkeeper "github.com/persona-chain/persona-chain/x/did/keeper" // ✅ ENABLED FOR PRODUCTION
	didtypes "github.com/persona-chain/persona-chain/x/did/types" // ✅ ENABLED FOR PRODUCTION
	// "github.com/persona-chain/persona-chain/x/vc" // ✅ ENABLED FOR PRODUCTION
	// vckeeper "github.com/persona-chain/persona-chain/x/vc/keeper" // ✅ ENABLED FOR PRODUCTION
	// vctypes "github.com/persona-chain/persona-chain/x/vc/types" // ✅ ENABLED FOR PRODUCTION
	// "github.com/persona-chain/persona-chain/x/zk" // ✅ ENABLED FOR PRODUCTION
	// zkkeeper "github.com/persona-chain/persona-chain/x/zk/keeper" // ✅ ENABLED FOR PRODUCTION
	// zktypes "github.com/persona-chain/persona-chain/x/zk/types" // ✅ ENABLED FOR PRODUCTION
	"github.com/persona-chain/persona-chain/x/guardian" // ✅ ENABLED FOR PRODUCTION
	guardiankeeper "github.com/persona-chain/persona-chain/x/guardian/keeper" // ✅ ENABLED FOR PRODUCTION
	guardiantypes "github.com/persona-chain/persona-chain/x/guardian/types" // ✅ ENABLED FOR PRODUCTION

	// Additional required imports
	// ibctransfer "github.com/cosmos/ibc-go/v8/modules/apps/transfer" // temporarily disabled
	// ibctransfertypes "github.com/cosmos/ibc-go/v8/modules/apps/transfer/types" // temporarily disabled
	// ibctransferkeeper "github.com/cosmos/ibc-go/v8/modules/apps/transfer/keeper" // temporarily disabled
	abci "github.com/cometbft/cometbft/abci/types"
	"github.com/spf13/cast"
	govv1 "github.com/cosmos/cosmos-sdk/x/gov/types/v1"
)

const (
	Name = "persona-chain"
)

// GenesisState of the blockchain is represented here as a map of raw json
// messages keyed by a identifier string.
// The identifier is used to determine which module genesis information belongs
// to so it may be appropriately routed during init chain.
// Within this application default genesis information is retrieved from
// the ModuleBasicManager which populates json from each BasicModule
// object provided to it during init.
type GenesisState map[string]json.RawMessage

var (
	DefaultNodeHome string

	// module account permissions
	maccPerms = map[string][]string{
		authtypes.FeeCollectorName:     nil,
		distrtypes.ModuleName:          nil,
		minttypes.ModuleName:           {authtypes.Minter},
		stakingtypes.BondedPoolName:    {authtypes.Burner, authtypes.Staking},
		stakingtypes.NotBondedPoolName: {authtypes.Burner, authtypes.Staking},
		govtypes.ModuleName:            {authtypes.Burner},
		// ibctransfertypes.ModuleName:    {authtypes.Minter, authtypes.Burner}, // temporarily disabled
		// Custom module permissions - temporarily disabled
		// didtypes.ModuleName:      nil,
		// vctypes.ModuleName:       nil,
		// zktypes.ModuleName:       nil,
		// guardiantypes.ModuleName: nil,
	}
)

var (
	ModuleBasics = module.NewBasicManager(
		// COSMOS SDK v0.50.9 AUTO-INCLUDES STANDARD MODULES - Only custom modules needed here
		// auth.AppModuleBasic{}, // auto-included
		// genutil.NewAppModuleBasic(genutiltypes.DefaultMessageValidator), // auto-included
		// bank.AppModuleBasic{}, // auto-included
		// staking.AppModuleBasic{}, // auto-included
		// mint.AppModuleBasic{}, // auto-included
		// distr.AppModuleBasic{}, // auto-included
		// gov.NewAppModuleBasic{}, // auto-included
		// params.AppModuleBasic{}, // auto-included
		// crisis.AppModuleBasic{}, // auto-included
		// slashing.AppModuleBasic{}, // auto-included
		// feegrantmodule.AppModuleBasic{}, // auto-included
		// upgrade.AppModuleBasic{}, // auto-included
		// evidence.AppModuleBasic{}, // auto-included
		// authzmodule.AppModuleBasic{}, // auto-included
		// consensus.AppModuleBasic{}, // auto-included
		// vesting.AppModuleBasic{}, // disabled for now
		// ibc.AppModuleBasic{}, // disabled for now
		// ibctm.AppModuleBasic{}, // disabled for now
		// solomachine.AppModuleBasic{}, // disabled for now
		// Custom modules - DID enabled, others temporarily disabled
		did.AppModuleBasic{},
		// vc.AppModuleBasic{}, // TEMPORARILY DISABLED
		// zk.AppModuleBasic{}, // TEMPORARILY DISABLED  
		guardian.AppModuleBasic{},
	)
)

func init() {
	userHomeDir, err := os.UserHomeDir()
	if err != nil {
		panic(err)
	}
	DefaultNodeHome = filepath.Join(userHomeDir, "."+Name)
}

type App struct {
	*baseapp.BaseApp

	legacyAmino       *codec.LegacyAmino
	appCodec          codec.Codec
	txConfig          client.TxConfig
	interfaceRegistry types.InterfaceRegistry

	// keepers
	AccountKeeper         authkeeper.AccountKeeper
	BankKeeper            bankkeeper.Keeper
	// CapabilityKeeper removed - deprecated in IBC-Go v8
	StakingKeeper         *stakingkeeper.Keeper
	SlashingKeeper        slashingkeeper.Keeper
	MintKeeper            mintkeeper.Keeper
	DistrKeeper           distrkeeper.Keeper
	GovKeeper             govkeeper.Keeper
	CrisisKeeper          *crisiskeeper.Keeper
	UpgradeKeeper         *upgradekeeper.Keeper
	ParamsKeeper          paramskeeper.Keeper
	// IBCKeeper             *ibckeeper.Keeper // temporarily disabled
	// IBCTransferKeeper     ibctransferkeeper.Keeper // temporarily disabled
	// EvidenceKeeper        evidencekeeper.Keeper // temporarily disabled
	FeeGrantKeeper        feegrantkeeper.Keeper
	AuthzKeeper           authzkeeper.Keeper
	ConsensusParamsKeeper consensusparamkeeper.Keeper

	// store keys
	keys    map[string]*storetypes.KVStoreKey
	tkeys   map[string]*storetypes.TransientStoreKey
	memKeys map[string]*storetypes.MemoryStoreKey

	// Custom keepers - temporarily disabled
	DidKeeper      didkeeper.Keeper // ✅ ENABLED FOR PRODUCTION
	// VCKeeper       vckeeper.Keeper // TEMPORARILY DISABLED
	// ZKKeeper       zkkeeper.Keeper // TEMPORARILY DISABLED
	GuardianKeeper guardiankeeper.Keeper // ✅ ENABLED FOR PRODUCTION

	// Module Manager
	ModuleManager      *module.Manager
	BasicModuleManager module.BasicManager

	// simulation manager
	sm *module.SimulationManager

	// module configurator
	configurator module.Configurator
}

func New(
	logger log.Logger,
	db db.DB,
	traceStore io.Writer,
	loadLatest bool,
	skipUpgradeHeights map[int64]bool,
	homeDir string,
	invCheckPeriod uint,
	appOpts servertypes.AppOptions,
	baseAppOptions ...func(*baseapp.BaseApp),
) *App {
	// Enable proper AddressCodec to fix genesis gentx and signing issues
	interfaceRegistry, _ := types.NewInterfaceRegistryWithOptions(types.InterfaceRegistryOptions{
		ProtoFiles: proto.HybridResolver,
		SigningOptions: signing.Options{
			AddressCodec: address.Bech32Codec{
				Bech32Prefix: sdk.GetConfig().GetBech32AccountAddrPrefix(),
			},
			ValidatorAddressCodec: address.Bech32Codec{
				Bech32Prefix: sdk.GetConfig().GetBech32ValidatorAddrPrefix(),
			},
		},
	})
	appCodec := codec.NewProtoCodec(interfaceRegistry)
	legacyAmino := codec.NewLegacyAmino()
	txConfig := authtx.NewTxConfig(appCodec, authtx.DefaultSignModes)

	std.RegisterLegacyAminoCodec(legacyAmino)
	std.RegisterInterfaces(interfaceRegistry)

	bApp := baseapp.NewBaseApp(Name, logger, db, txConfig.TxDecoder(), baseAppOptions...)
	bApp.SetCommitMultiStoreTracer(traceStore)
	bApp.SetVersion(version.Version)
	bApp.SetInterfaceRegistry(interfaceRegistry)
	bApp.SetTxEncoder(txConfig.TxEncoder())

	keys := storetypes.NewKVStoreKeys(
		authtypes.StoreKey, banktypes.StoreKey, stakingtypes.StoreKey, crisistypes.StoreKey,
		minttypes.StoreKey, distrtypes.StoreKey, slashingtypes.StoreKey,
		govtypes.StoreKey, paramstypes.StoreKey, consensusparamtypes.StoreKey, upgradetypes.StoreKey, feegrant.StoreKey,
		// evidencetypes.StoreKey, // temporarily disabled
		authzkeeper.StoreKey,
		// ibcexported.StoreKey, ibctransfertypes.StoreKey, // temporarily disabled
		// Custom module store keys - temporarily disabled
		didtypes.StoreKey, /* vctypes.StoreKey, zktypes.StoreKey, */ guardiantypes.StoreKey, // VC/ZK TEMPORARILY DISABLED
	)

	// register streaming services
	if err := bApp.RegisterStreamingServices(appOpts, keys); err != nil {
		panic(err)
	}

	tkeys := storetypes.NewTransientStoreKeys(paramstypes.TStoreKey)
	memKeys := storetypes.NewMemoryStoreKeys() // Capability memkey removed

	app := &App{
		BaseApp:           bApp,
		legacyAmino:       legacyAmino,
		appCodec:          appCodec,
		txConfig:          txConfig,
		interfaceRegistry: interfaceRegistry,
		keys:              keys,
		tkeys:             tkeys,
		memKeys:           memKeys,
	}

	app.ParamsKeeper = initParamsKeeper(appCodec, legacyAmino, keys[paramstypes.StoreKey], tkeys[paramstypes.TStoreKey])

	// set the BaseApp's parameter store
	app.ConsensusParamsKeeper = consensusparamkeeper.NewKeeper(appCodec, runtime.NewKVStoreService(keys[consensusparamtypes.StoreKey]), authtypes.NewModuleAddress(govtypes.ModuleName).String(), runtime.EventService{})
	bApp.SetParamStore(app.ConsensusParamsKeeper.ParamsStore)

	// IBC capability handling simplified for IBC-Go v8 - removed capability scoping

	// add keepers
	app.AccountKeeper = authkeeper.NewAccountKeeper(
		appCodec, runtime.NewKVStoreService(keys[authtypes.StoreKey]), authtypes.ProtoBaseAccount, maccPerms, address.Bech32Codec{
			Bech32Prefix: sdk.GetConfig().GetBech32AccountAddrPrefix(),
		}, sdk.GetConfig().GetBech32AccountAddrPrefix(), authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	app.BankKeeper = bankkeeper.NewBaseKeeper(
		appCodec, runtime.NewKVStoreService(keys[banktypes.StoreKey]), app.AccountKeeper, BlockedAddresses(), authtypes.NewModuleAddress(govtypes.ModuleName).String(), logger,
	)

	app.StakingKeeper = stakingkeeper.NewKeeper(
		appCodec, runtime.NewKVStoreService(keys[stakingtypes.StoreKey]), app.AccountKeeper, app.BankKeeper, authtypes.NewModuleAddress(govtypes.ModuleName).String(), address.Bech32Codec{
			Bech32Prefix: sdk.GetConfig().GetBech32ValidatorAddrPrefix(),
		}, address.Bech32Codec{
			Bech32Prefix: sdk.GetConfig().GetBech32ConsensusAddrPrefix(),
		},
	)

	app.MintKeeper = mintkeeper.NewKeeper(appCodec, runtime.NewKVStoreService(keys[minttypes.StoreKey]), app.StakingKeeper, app.AccountKeeper, app.BankKeeper, authtypes.FeeCollectorName, authtypes.NewModuleAddress(govtypes.ModuleName).String())

	app.DistrKeeper = distrkeeper.NewKeeper(appCodec, runtime.NewKVStoreService(keys[distrtypes.StoreKey]), app.AccountKeeper, app.BankKeeper, app.StakingKeeper, authtypes.FeeCollectorName, authtypes.NewModuleAddress(govtypes.ModuleName).String())

	app.SlashingKeeper = slashingkeeper.NewKeeper(
		appCodec, legacyAmino, runtime.NewKVStoreService(keys[slashingtypes.StoreKey]), app.StakingKeeper, authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	app.CrisisKeeper = crisiskeeper.NewKeeper(appCodec, runtime.NewKVStoreService(keys[crisistypes.StoreKey]), 5, app.BankKeeper, authtypes.FeeCollectorName, authtypes.NewModuleAddress(govtypes.ModuleName).String(), app.AccountKeeper.AddressCodec())

	app.FeeGrantKeeper = feegrantkeeper.NewKeeper(appCodec, runtime.NewKVStoreService(keys[feegrant.StoreKey]), app.AccountKeeper)

	// register the staking hooks
	// NOTE: stakingKeeper above is passed by reference, so that it will contain these hooks
	app.StakingKeeper.SetHooks(
		stakingtypes.NewMultiStakingHooks(app.DistrKeeper.Hooks(), app.SlashingKeeper.Hooks()),
	)

	app.AuthzKeeper = authzkeeper.NewKeeper(runtime.NewKVStoreService(keys[authzkeeper.StoreKey]), appCodec, app.MsgServiceRouter(), app.AccountKeeper)

	// ✅ PRODUCTION: Initialize PersonaChain custom keepers
	app.DidKeeper = didkeeper.NewKeeper(
		appCodec, 
		runtime.NewKVStoreService(keys[didtypes.StoreKey]), 
		app.AccountKeeper,
		app.BankKeeper,
	)
	
	// TEMPORARILY DISABLED VC/ZK KEEPERS
	// app.VCKeeper = vckeeper.NewKeeper(
	//	appCodec,
	//	runtime.NewKVStoreService(keys[vctypes.StoreKey]),
	//	app.DidKeeper,
	//	app.AccountKeeper,
	// )
	
	// app.ZKKeeper = zkkeeper.NewKeeper(
	//	appCodec,
	//	runtime.NewKVStoreService(keys[zktypes.StoreKey]),
	//	app.VCKeeper,
	// )
	
	app.GuardianKeeper = guardiankeeper.NewKeeper(
		appCodec,
		runtime.NewKVStoreService(keys[guardiantypes.StoreKey]),
		app.DidKeeper,
		app.AccountKeeper,
	)

	// Create IBC Keeper - temporarily disabled to get basic blockchain running
	// app.IBCKeeper = ibckeeper.NewKeeper(
	//	appCodec, keys[ibcexported.StoreKey], app.GetSubspace(ibcexported.ModuleName), app.StakingKeeper, app.UpgradeKeeper, authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	// )

	// Create IBC Transfer Keeper - temporarily disabled
	// app.IBCTransferKeeper = ibctransferkeeper.NewKeeper(
	//	appCodec, keys[ibctransfertypes.StoreKey], app.GetSubspace(ibctransfertypes.ModuleName),
	//	app.IBCKeeper.ChannelKeeper, app.IBCKeeper.ChannelKeeper, app.IBCKeeper.PortKeeper,
	//	app.AccountKeeper, app.BankKeeper, nil, authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	// )

	// register the proposal types
	govRouter := govv1beta1.NewRouter()
	govRouter.AddRoute(govtypes.RouterKey, govv1beta1.ProposalHandler).
		AddRoute(paramproposal.RouterKey, params.NewParamChangeProposalHandler(app.ParamsKeeper))

	govConfig := govtypes.DefaultConfig()
	govKeeper := govkeeper.NewKeeper(
		appCodec, runtime.NewKVStoreService(keys[govtypes.StoreKey]), app.AccountKeeper, app.BankKeeper,
		app.StakingKeeper, app.DistrKeeper, app.MsgServiceRouter(), govConfig, authtypes.NewModuleAddress(govtypes.ModuleName).String(),
	)

	govKeeper.SetLegacyRouter(govRouter)

	app.GovKeeper = *govKeeper.SetHooks(
		govtypes.NewMultiGovHooks(
		// register the governance hooks
		),
	)

	app.UpgradeKeeper = upgradekeeper.NewKeeper(skipUpgradeHeights, runtime.NewKVStoreService(keys[upgradetypes.StoreKey]), appCodec, homeDir, app.BaseApp, authtypes.NewModuleAddress(govtypes.ModuleName).String())

	// Create evidence Keeper for to register the IBC light client misbehaviour evidence route
	// Temporarily disabled - fixing signature
	// evidenceKeeper := evidencekeeper.NewKeeper(
	//	appCodec, runtime.NewKVStoreService(keys[evidencetypes.StoreKey]), app.StakingKeeper, app.SlashingKeeper, app.AccountKeeper.AddressCodec(),
	// )
	// If evidence needs to be handled for the app, set routes in router here and seal
	// app.EvidenceKeeper = *evidenceKeeper

	// Initialize custom keepers - temporarily disabled
	// app.DidKeeper = didkeeper.NewKeeper(
	//	appCodec,
	//	runtime.NewKVStoreService(keys[didtypes.StoreKey]),
	//	app.GetSubspace(didtypes.ModuleName),
	//	app.AccountKeeper,
	//	app.BankKeeper,
	// ) // temporarily disabled

	// app.VcKeeper = vckeeper.NewKeeper(
	//	appCodec,
	//	runtime.NewKVStoreService(keys[vctypes.StoreKey]),
	//	app.GetSubspace(vctypes.ModuleName),
	//	app.DidKeeper,
	// )

	// app.ZkKeeper = zkkeeper.NewKeeper(
	//	appCodec,
	//	runtime.NewKVStoreService(keys[zktypes.StoreKey]),
	//	app.GetSubspace(zktypes.ModuleName),
	//	app.VcKeeper,
	// )

	// app.GuardianKeeper = guardiankeeper.NewKeeper(
	//	appCodec,
	//	runtime.NewKVStoreService(keys[guardiantypes.StoreKey]),
	//	app.GetSubspace(guardiantypes.ModuleName),
	//	app.DidKeeper,
	//	app.AccountKeeper,
	// )

	/**** Module Options ****/

	// NOTE: we may consider parsing `appOpts` inside module constructors. For the moment
	// we prefer to be more strict in what arguments the modules expect.
	skipGenesisInvariants := cast.ToBool(appOpts.Get(crisis.FlagSkipGenesisInvariants))

	// NOTE: Any module instantiated in the module manager that is later modified
	// must be passed by reference here.

	app.ModuleManager = module.NewManager(
		genutil.NewAppModule(
			app.AccountKeeper, app.StakingKeeper, app,
			txConfig,
		),
		auth.NewAppModule(appCodec, app.AccountKeeper, authsims.RandomGenesisAccounts, app.GetSubspace(authtypes.ModuleName)),
		// vesting.NewAppModule(app.AccountKeeper, app.BankKeeper), // temporarily disabled - might cause duplicate bank service registration
		bank.NewAppModule(appCodec, app.BankKeeper, app.AccountKeeper, app.GetSubspace(banktypes.ModuleName)),
		// capability.NewAppModule removed - deprecated in IBC-Go v8
		crisis.NewAppModule(app.CrisisKeeper, skipGenesisInvariants, app.GetSubspace(crisistypes.ModuleName)),
		gov.NewAppModule(appCodec, &app.GovKeeper, app.AccountKeeper, app.BankKeeper, app.GetSubspace(govtypes.ModuleName)),
		mint.NewAppModule(appCodec, app.MintKeeper, app.AccountKeeper, nil, app.GetSubspace(minttypes.ModuleName)),
		slashing.NewAppModule(appCodec, app.SlashingKeeper, app.AccountKeeper, app.BankKeeper, app.StakingKeeper, app.GetSubspace(slashingtypes.ModuleName), app.interfaceRegistry),
		distr.NewAppModule(appCodec, app.DistrKeeper, app.AccountKeeper, app.BankKeeper, app.StakingKeeper, app.GetSubspace(distrtypes.ModuleName)),
		staking.NewAppModule(appCodec, app.StakingKeeper, app.AccountKeeper, app.BankKeeper, app.GetSubspace(stakingtypes.ModuleName)),
		upgrade.NewAppModule(app.UpgradeKeeper, app.AccountKeeper.AddressCodec()),
		// evidence.NewAppModule(app.EvidenceKeeper), // temporarily disabled
		feegrantmodule.NewAppModule(appCodec, app.AccountKeeper, app.BankKeeper, app.FeeGrantKeeper, app.interfaceRegistry),
		authzmodule.NewAppModule(appCodec, app.AuthzKeeper, app.AccountKeeper, app.BankKeeper, app.interfaceRegistry),
		consensus.NewAppModule(appCodec, app.ConsensusParamsKeeper),
		// ibc.NewAppModule(app.IBCKeeper), // temporarily disabled
		// ibctransfer.NewAppModule(app.IBCTransferKeeper), // temporarily disabled
		params.NewAppModule(app.ParamsKeeper),
		// Custom modules - DID and Guardian enabled, VC/ZK temporarily disabled
		did.NewAppModule(appCodec, app.DidKeeper, app.AccountKeeper, app.BankKeeper), // ✅ ENABLED FOR PRODUCTION
		// vc.NewAppModule(appCodec, app.VCKeeper, app.DidKeeper), // TEMPORARILY DISABLED
		// zk.NewAppModule(appCodec, app.ZKKeeper, app.VCKeeper), // TEMPORARILY DISABLED
		guardian.NewAppModule(appCodec, app.GuardianKeeper, app.DidKeeper, app.AccountKeeper),
	)

	// BasicModuleManager defines the module BasicManager is in charge of setting up basic,
	// non-dependant module elements, such as codec registration and genesis verification.
	// By default it is composed of all the module from the module manager.
	// Additionally, app module basics can be overwritten by passing them as argument.
	app.BasicModuleManager = module.NewBasicManagerFromManager(
		app.ModuleManager,
		map[string]module.AppModuleBasic{
			genutiltypes.ModuleName: genutil.NewAppModuleBasic(genutiltypes.DefaultMessageValidator),
			govtypes.ModuleName: gov.NewAppModuleBasic(
				[]govclient.ProposalHandler{
					paramsclient.ProposalHandler,
				},
			),
		})
	app.BasicModuleManager.RegisterLegacyAminoCodec(legacyAmino)
	app.BasicModuleManager.RegisterInterfaces(interfaceRegistry)

	// During begin block slashing happens after distr.BeginBlocker so that
	// there is nothing left over in the validator fee pool, to keep the
	// CanWithdrawInvariant invariant.
	// NOTE: staking module is required if HistoricalEntries param > 0
	app.ModuleManager.SetOrderBeginBlockers(
		upgradetypes.ModuleName,
		// capabilitytypes.ModuleName, // removed
		minttypes.ModuleName,
		distrtypes.ModuleName,
		slashingtypes.ModuleName,
		// evidencetypes.ModuleName, // temporarily disabled
		stakingtypes.ModuleName,
		authz.ModuleName,
		feegrant.ModuleName,
		authtypes.ModuleName,
		banktypes.ModuleName,
		govtypes.ModuleName,
		crisistypes.ModuleName,
		genutiltypes.ModuleName,
		paramstypes.ModuleName,
		// vestingtypes.ModuleName, // temporarily disabled
		consensusparamtypes.ModuleName,
		// ibcexported.ModuleName, // temporarily disabled
		// ibctransfertypes.ModuleName, // temporarily disabled
		// Custom modules - temporarily disabled
		// didtypes.ModuleName,
		// vctypes.ModuleName,
		// zktypes.ModuleName,
		// guardiantypes.ModuleName,
	)

	app.ModuleManager.SetOrderEndBlockers(
		crisistypes.ModuleName,
		govtypes.ModuleName,
		stakingtypes.ModuleName,
		// ibcexported.ModuleName, // temporarily disabled
		// ibctransfertypes.ModuleName, // temporarily disabled
		// capabilitytypes.ModuleName, // removed
		authtypes.ModuleName,
		banktypes.ModuleName,
		distrtypes.ModuleName,
		slashingtypes.ModuleName,
		minttypes.ModuleName,
		genutiltypes.ModuleName,
		// evidencetypes.ModuleName, // temporarily disabled
		authz.ModuleName,
		feegrant.ModuleName,
		paramstypes.ModuleName,
		upgradetypes.ModuleName,
		// vestingtypes.ModuleName, // temporarily disabled
		consensusparamtypes.ModuleName,
		// Custom modules - temporarily disabled
		// didtypes.ModuleName,
		// vctypes.ModuleName,
		// zktypes.ModuleName,
		// guardiantypes.ModuleName,
	)

	// NOTE: The genutils module must occur after staking so that pools are
	// properly initialized with tokens from genesis accounts.
	// NOTE: Capability module must occur first so that it can initialize any capabilities
	// so that other modules that want to create or claim capabilities afterwards in InitChain
	// can do so safely.
	genesisModuleOrder := []string{
		// capabilitytypes.ModuleName, // removed
		authtypes.ModuleName, banktypes.ModuleName,
		distrtypes.ModuleName, stakingtypes.ModuleName, slashingtypes.ModuleName, govtypes.ModuleName,
		minttypes.ModuleName, crisistypes.ModuleName, 
		// ibcexported.ModuleName, ibctransfertypes.ModuleName, // temporarily disabled
		genutiltypes.ModuleName,
		// evidencetypes.ModuleName, // temporarily disabled
		authz.ModuleName, feegrant.ModuleName,
		paramstypes.ModuleName, upgradetypes.ModuleName, consensusparamtypes.ModuleName,
		// vestingtypes.ModuleName, // temporarily disabled
		// Custom modules - DID and Guardian enabled, VC/ZK temporarily disabled
		didtypes.ModuleName, /* vctypes.ModuleName, zktypes.ModuleName, */ guardiantypes.ModuleName,
	}
	app.ModuleManager.SetOrderInitGenesis(genesisModuleOrder...)
	app.ModuleManager.SetOrderExportGenesis(genesisModuleOrder...)

	// Uncomment if you want to set a custom migration order here.
	// app.ModuleManager.SetOrderMigrations(custom order)

	app.ModuleManager.RegisterInvariants(app.CrisisKeeper)

	app.configurator = module.NewConfigurator(app.appCodec, app.MsgServiceRouter(), app.GRPCQueryRouter())
	err := app.ModuleManager.RegisterServices(app.configurator)
	if err != nil {
		panic(err)
	}

	autocliv1.RegisterQueryServer(app.GRPCQueryRouter(), runtimeservices.NewAutoCLIQueryService(app.ModuleManager.Modules))

	reflectionSvc, err := runtimeservices.NewReflectionService()
	if err != nil {
		panic(err)
	}
	reflectionv1.RegisterReflectionServiceServer(app.GRPCQueryRouter(), reflectionSvc)

	// add test gRPC service for testing gRPC queries in isolation
	// testdata_pulsar.RegisterQueryServer(app.GRPCQueryRouter(), testdata_pulsar.QueryImpl{}) // removed for production

	// create the simulation manager and define the order of the modules for deterministic simulations
	//
	// NOTE: this is not required apps that don't use the simulator for fuzz testing
	// transactions
	overrideModules := map[string]module.AppModuleSimulation{
		authtypes.ModuleName: auth.NewAppModule(app.appCodec, app.AccountKeeper, authsims.RandomGenesisAccounts, app.GetSubspace(authtypes.ModuleName)),
	}
	app.sm = module.NewSimulationManagerFromAppModules(app.ModuleManager.Modules, overrideModules)

	app.sm.RegisterStoreDecoders()

	// initialize stores
	app.MountKVStores(keys)
	app.MountTransientStores(tkeys)
	app.MountMemoryStores(memKeys)

	anteHandler, err := ante.NewAnteHandler(
		ante.HandlerOptions{
			AccountKeeper:   app.AccountKeeper,
			BankKeeper:      app.BankKeeper,
			SignModeHandler: txConfig.SignModeHandler(),
			FeegrantKeeper:  app.FeeGrantKeeper,
			SigGasConsumer:  ante.DefaultSigVerificationGasConsumer,
		},
	)
	if err != nil {
		panic(err)
	}

	app.SetAnteHandler(anteHandler)
	app.SetInitChainer(app.InitChainer)
	app.SetBeginBlocker(app.BeginBlocker)
	app.SetEndBlocker(app.EndBlocker)

	if loadLatest {
		if err := app.LoadLatestVersion(); err != nil {
			panic(fmt.Errorf("error loading last version: %w", err))
		}
	}

	return app
}

// Name returns the name of the App
func (app *App) Name() string { return app.BaseApp.Name() }

// BeginBlocker application updates every begin block
func (app *App) BeginBlocker(ctx sdk.Context) (sdk.BeginBlock, error) {
	return app.ModuleManager.BeginBlock(ctx)
}

// EndBlocker application updates every end block
func (app *App) EndBlocker(ctx sdk.Context) (sdk.EndBlock, error) {
	return app.ModuleManager.EndBlock(ctx)
}

// InitChainer application update at chain initialization
func (app *App) InitChainer(ctx sdk.Context, req *abci.RequestInitChain) (*abci.ResponseInitChain, error) {
	var genesisState GenesisState
	if err := json.Unmarshal(req.AppStateBytes, &genesisState); err != nil {
		panic(err)
	}
	app.UpgradeKeeper.SetModuleVersionMap(ctx, app.ModuleManager.GetVersionMap())
	response, err := app.ModuleManager.InitGenesis(ctx, app.appCodec, genesisState)
	return response, err
}

// LoadHeight loads a particular height
func (app *App) LoadHeight(height int64) error {
	return app.LoadVersion(height)
}

// LegacyAmino returns SimApp's amino codec.
//
// NOTE: This is solely to be used for testing purposes as it may be desirable
// for modules to register their own custom testing types.
func (app *App) LegacyAmino() *codec.LegacyAmino {
	return app.legacyAmino
}

// AppCodec returns an app codec.
//
// NOTE: This is solely to be used for testing purposes as it may be desirable
// for modules to register their own custom testing types.
func (app *App) AppCodec() codec.Codec {
	return app.appCodec
}

// InterfaceRegistry returns an InterfaceRegistry
func (app *App) InterfaceRegistry() types.InterfaceRegistry {
	return app.interfaceRegistry
}

// TxConfig returns a TxConfig
func (app *App) TxConfig() client.TxConfig {
	return app.txConfig
}

// AutoCliOpts returns the autocli options for the app.
func (app *App) AutoCliOpts() autocli.AppOptions {
	modules := make(map[string]appmodule.AppModule, 0)
	for _, mod := range app.ModuleManager.Modules {
		if moduleWithName, ok := mod.(module.HasName); ok {
			moduleName := moduleWithName.Name()
			if appModule, ok := moduleWithName.(appmodule.AppModule); ok {
				modules[moduleName] = appModule
			}
		}
	}

	return autocli.AppOptions{
		Modules:               modules,
		ModuleOptions:         runtimeservices.ExtractAutoCLIOptions(app.ModuleManager.Modules),
		AddressCodec:          authcodec.NewBech32Codec(sdk.GetConfig().GetBech32AccountAddrPrefix()),
		ValidatorAddressCodec: authcodec.NewBech32Codec(sdk.GetConfig().GetBech32ValidatorAddrPrefix()),
		ConsensusAddressCodec: authcodec.NewBech32Codec(sdk.GetConfig().GetBech32ConsensusAddrPrefix()),
	}
}

// DefaultGenesis returns a default genesis from the registered AppModuleBasic's.
func (a *App) DefaultGenesis() map[string]json.RawMessage {
	return a.BasicModuleManager.DefaultGenesis(a.appCodec)
}

// GetKey returns the KVStoreKey for the provided store key.
//
// NOTE: This is solely to be used for testing purposes.
func (app *App) GetKey(storeKey string) *storetypes.KVStoreKey {
	return app.keys[storeKey]
}

// GetTKey returns the TransientStoreKey for the provided store key.
//
// NOTE: This is solely to be used for testing purposes.
func (app *App) GetTKey(storeKey string) *storetypes.TransientStoreKey {
	return app.tkeys[storeKey]
}

// GetMemKey returns the MemStoreKey for the provided mem key.
//
// NOTE: This is solely used for testing purposes.
func (app *App) GetMemKey(storeKey string) *storetypes.MemoryStoreKey {
	return app.memKeys[storeKey]
}

// GetSubspace returns a param subspace for a given module name.
//
// NOTE: This is solely to be used for testing purposes.
func (app *App) GetSubspace(moduleName string) paramstypes.Subspace {
	subspace, _ := app.ParamsKeeper.GetSubspace(moduleName)
	return subspace
}

// RegisterAPIRoutes registers all application module routes with the provided
// API server.
func (app *App) RegisterAPIRoutes(apiSvr *api.Server, apiConfig config.APIConfig) {
	clientCtx := apiSvr.ClientCtx
	// Register new tx routes from grpc-gateway.
	authtx.RegisterGRPCGatewayRoutes(clientCtx, apiSvr.GRPCGatewayRouter)

	// Register new tendermint queries routes from grpc-gateway.
	cmtservice.RegisterGRPCGatewayRoutes(clientCtx, apiSvr.GRPCGatewayRouter)

	// Register node gRPC service for grpc-gateway.
	nodeservice.RegisterGRPCGatewayRoutes(clientCtx, apiSvr.GRPCGatewayRouter)

	// Register grpc-gateway routes for all modules.
	app.BasicModuleManager.RegisterGRPCGatewayRoutes(clientCtx, apiSvr.GRPCGatewayRouter)

	// register swagger API from root so that other applications can override easily
	if err := server.RegisterSwaggerAPI(apiSvr.ClientCtx, apiSvr.Router, apiConfig.Swagger); err != nil {
		panic(err)
	}
}

// RegisterTxService implements the Application.RegisterTxService method.
func (app *App) RegisterTxService(clientCtx client.Context) {
	authtx.RegisterTxService(app.BaseApp.GRPCQueryRouter(), clientCtx, app.BaseApp.Simulate, app.interfaceRegistry)
}

// RegisterTendermintService implements the Application.RegisterTendermintService method.
func (app *App) RegisterTendermintService(clientCtx client.Context) {
	cmtservice.RegisterTendermintService(
		clientCtx,
		app.BaseApp.GRPCQueryRouter(),
		app.interfaceRegistry,
		app.Query,
	)
}

// RegisterGRPCServer implements the Application.RegisterGRPCServer method.
func (app *App) RegisterGRPCServer(server grpc.Server) {
	// Register gRPC services for all modules
	app.ModuleManager.RegisterServices(module.NewConfigurator(app.appCodec, app.MsgServiceRouter(), app.GRPCQueryRouter()))
}

// RegisterNodeService implements the Application.RegisterNodeService method.
func (app *App) RegisterNodeService(clientCtx client.Context, cfg config.Config) {
	nodeservice.RegisterNodeService(clientCtx, app.GRPCQueryRouter(), cfg)
}

// GetMaccPerms returns a copy of the module account permissions
//
// NOTE: This is solely to be used for testing purposes.
func GetMaccPerms() map[string][]string {
	dupMaccPerms := make(map[string][]string)
	for k, v := range maccPerms {
		dupMaccPerms[k] = v
	}
	return dupMaccPerms
}

// BlockedAddresses returns all the app's blocked account addresses.
func BlockedAddresses() map[string]bool {
	modAccAddrs := make(map[string]bool)
	for acc := range GetMaccPerms() {
		modAccAddrs[authtypes.NewModuleAddress(acc).String()] = true
	}

	// allow the following addresses to receive funds
	delete(modAccAddrs, authtypes.NewModuleAddress(govtypes.ModuleName).String())

	return modAccAddrs
}

// initParamsKeeper init params keeper and its subspaces
func initParamsKeeper(appCodec codec.BinaryCodec, legacyAmino *codec.LegacyAmino, key, tkey storetypes.StoreKey) paramskeeper.Keeper {
	paramsKeeper := paramskeeper.NewKeeper(appCodec, legacyAmino, key, tkey)

	// register the key tables for legacy param subspaces
	// keyTable := ibcclienttypes.ParamKeyTable() // temporarily disabled
	// keyTable.RegisterParamSet(&ibcconnectiontypes.Params{}) // temporarily disabled
	// paramsKeeper.Subspace(ibcexported.ModuleName).WithKeyTable(keyTable) // temporarily disabled
	// paramsKeeper.Subspace(ibctransfertypes.ModuleName).WithKeyTable(ibctransfertypes.ParamKeyTable()) // temporarily disabled
	paramsKeeper.Subspace(authtypes.ModuleName).WithKeyTable(authtypes.ParamKeyTable())
	paramsKeeper.Subspace(banktypes.ModuleName).WithKeyTable(banktypes.ParamKeyTable())
	paramsKeeper.Subspace(stakingtypes.ModuleName).WithKeyTable(stakingtypes.ParamKeyTable())
	paramsKeeper.Subspace(minttypes.ModuleName).WithKeyTable(minttypes.ParamKeyTable())
	paramsKeeper.Subspace(distrtypes.ModuleName).WithKeyTable(distrtypes.ParamKeyTable())
	paramsKeeper.Subspace(slashingtypes.ModuleName).WithKeyTable(slashingtypes.ParamKeyTable())
	paramsKeeper.Subspace(govtypes.ModuleName).WithKeyTable(govv1.ParamKeyTable())
	paramsKeeper.Subspace(crisistypes.ModuleName).WithKeyTable(crisistypes.ParamKeyTable())
	// Custom module subspaces - temporarily disabled
	// paramsKeeper.Subspace(didtypes.ModuleName)
	// paramsKeeper.Subspace(vctypes.ModuleName)
	// paramsKeeper.Subspace(zktypes.ModuleName)
	// paramsKeeper.Subspace(guardiantypes.ModuleName)

	return paramsKeeper
}