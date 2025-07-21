# Simulation testing targets for Persona Chain

.PHONY: test-sim-full test-sim-import-export test-sim-after-import test-sim-determinism test-sim-custom-invariants test-sim-random-ops test-sim-ci clean-sim-data

# Default simulation parameters
SIM_NUM_BLOCKS ?= 500
SIM_BLOCK_SIZE ?= 200
SIM_COMMIT ?= true
SIM_ENABLED ?= true
SIM_VERBOSE ?= true
SIM_SEED ?= 42
SIM_PERIOD ?= 1

# Test data directory
SIM_DATA_DIR ?= ./simdata

# Full application simulation test
test-sim-full:
	@echo "Running full application simulation..."
	@mkdir -p $(SIM_DATA_DIR)
	@go test -mod=readonly ./tests/simulation -run TestFullAppSimulation \
		-SimulationEnabled=$(SIM_ENABLED) \
		-SimulationNumBlocks=$(SIM_NUM_BLOCKS) \
		-SimulationBlockSize=$(SIM_BLOCK_SIZE) \
		-SimulationCommit=$(SIM_COMMIT) \
		-SimulationVerbose=$(SIM_VERBOSE) \
		-SimulationSeed=$(SIM_SEED) \
		-SimulationPeriod=$(SIM_PERIOD) \
		-v -timeout 24h

# Import/export simulation test
test-sim-import-export:
	@echo "Running import/export simulation..."
	@mkdir -p $(SIM_DATA_DIR)
	@go test -mod=readonly ./tests/simulation -run TestAppImportExport \
		-SimulationEnabled=$(SIM_ENABLED) \
		-SimulationNumBlocks=50 \
		-SimulationBlockSize=100 \
		-SimulationCommit=$(SIM_COMMIT) \
		-SimulationVerbose=$(SIM_VERBOSE) \
		-SimulationSeed=$(SIM_SEED) \
		-v -timeout 10m

# Simulation after import test
test-sim-after-import:
	@echo "Running simulation after import..."
	@mkdir -p $(SIM_DATA_DIR)
	@go test -mod=readonly ./tests/simulation -run TestAppSimulationAfterImport \
		-SimulationEnabled=$(SIM_ENABLED) \
		-SimulationNumBlocks=100 \
		-SimulationBlockSize=50 \
		-SimulationCommit=$(SIM_COMMIT) \
		-SimulationVerbose=$(SIM_VERBOSE) \
		-SimulationSeed=$(SIM_SEED) \
		-v -timeout 10m

# State determinism test
test-sim-determinism:
	@echo "Running state determinism test..."
	@mkdir -p $(SIM_DATA_DIR)
	@go test -mod=readonly ./tests/simulation -run TestAppStateDeterminism \
		-SimulationEnabled=$(SIM_ENABLED) \
		-SimulationNumBlocks=50 \
		-SimulationBlockSize=100 \
		-SimulationCommit=false \
		-SimulationVerbose=false \
		-v -timeout 30m

# Custom invariants test
test-sim-custom-invariants:
	@echo "Running custom invariants test..."
	@mkdir -p $(SIM_DATA_DIR)
	@go test -mod=readonly ./tests/simulation -run TestCustomInvariants \
		-SimulationEnabled=$(SIM_ENABLED) \
		-SimulationNumBlocks=200 \
		-SimulationBlockSize=100 \
		-SimulationCommit=$(SIM_COMMIT) \
		-SimulationVerbose=$(SIM_VERBOSE) \
		-SimulationSeed=$(SIM_SEED) \
		-SimulationPeriod=1 \
		-v -timeout 20m

# Random operations test
test-sim-random-ops:
	@echo "Running random operations test..."
	@go test -mod=readonly ./tests/simulation -run TestSimulationRandomOperations \
		-SimulationEnabled=$(SIM_ENABLED) \
		-v -timeout 5m

# Continuous integration simulation (shorter)
test-sim-ci:
	@echo "Running CI simulation tests..."
	@mkdir -p $(SIM_DATA_DIR)
	@go test -mod=readonly ./tests/simulation -run TestFullAppSimulation \
		-SimulationEnabled=true \
		-SimulationNumBlocks=100 \
		-SimulationBlockSize=50 \
		-SimulationCommit=false \
		-SimulationVerbose=false \
		-SimulationSeed=1 \
		-SimulationPeriod=5 \
		-v -timeout 10m

# Long-running simulation for stress testing
test-sim-stress:
	@echo "Running stress simulation..."
	@mkdir -p $(SIM_DATA_DIR)
	@go test -mod=readonly ./tests/simulation -run TestFullAppSimulation \
		-SimulationEnabled=true \
		-SimulationNumBlocks=2000 \
		-SimulationBlockSize=500 \
		-SimulationCommit=true \
		-SimulationVerbose=true \
		-SimulationSeed=$(SIM_SEED) \
		-SimulationPeriod=1 \
		-v -timeout 48h

# Multi-seed determinism test
test-sim-multi-seed:
	@echo "Running multi-seed simulation..."
	@mkdir -p $(SIM_DATA_DIR)
	@for seed in 1 2 3 4 5; do \
		echo "Testing with seed $$seed..."; \
		go test -mod=readonly ./tests/simulation -run TestFullAppSimulation \
			-SimulationEnabled=true \
			-SimulationNumBlocks=100 \
			-SimulationBlockSize=100 \
			-SimulationCommit=false \
			-SimulationVerbose=false \
			-SimulationSeed=$$seed \
			-SimulationPeriod=10 \
			-v -timeout 15m || exit 1; \
	done

# Test all simulation scenarios
test-sim-all: test-sim-full test-sim-import-export test-sim-after-import test-sim-custom-invariants test-sim-random-ops

# Run simulation benchmarks
benchmark-sim:
	@echo "Running simulation benchmarks..."
	@go test -mod=readonly ./tests/simulation -bench=. -run=^$$ \
		-SimulationEnabled=true \
		-SimulationNumBlocks=100 \
		-SimulationBlockSize=100 \
		-SimulationCommit=false \
		-SimulationVerbose=false \
		-v -timeout 20m

# Profile simulation performance
profile-sim:
	@echo "Profiling simulation performance..."
	@mkdir -p $(SIM_DATA_DIR)/profiles
	@go test -mod=readonly ./tests/simulation -run TestFullAppSimulation \
		-SimulationEnabled=true \
		-SimulationNumBlocks=200 \
		-SimulationBlockSize=200 \
		-SimulationCommit=false \
		-SimulationVerbose=false \
		-cpuprofile=$(SIM_DATA_DIR)/profiles/cpu.prof \
		-memprofile=$(SIM_DATA_DIR)/profiles/mem.prof \
		-v -timeout 15m

# View CPU profile
view-cpu-profile:
	@go tool pprof $(SIM_DATA_DIR)/profiles/cpu.prof

# View memory profile
view-mem-profile:
	@go tool pprof $(SIM_DATA_DIR)/profiles/mem.prof

# Clean simulation data
clean-sim-data:
	@echo "Cleaning simulation data..."
	@rm -rf $(SIM_DATA_DIR)
	@rm -f simulation-params.json
	@rm -f exported-genesis.json

# Help target
help-sim:
	@echo "Simulation testing targets:"
	@echo "  test-sim-full           - Run full application simulation"
	@echo "  test-sim-import-export  - Test state import/export"
	@echo "  test-sim-after-import   - Test simulation after import"
	@echo "  test-sim-determinism    - Test state determinism"
	@echo "  test-sim-custom-invariants - Test custom module invariants"
	@echo "  test-sim-random-ops     - Test random operations"
	@echo "  test-sim-ci             - Run CI-friendly simulation"
	@echo "  test-sim-stress         - Run stress simulation"
	@echo "  test-sim-multi-seed     - Test with multiple seeds"
	@echo "  test-sim-all            - Run all simulation tests"
	@echo "  benchmark-sim           - Run simulation benchmarks"
	@echo "  profile-sim             - Profile simulation performance"
	@echo "  clean-sim-data          - Clean simulation data"
	@echo ""
	@echo "Parameters:"
	@echo "  SIM_NUM_BLOCKS     - Number of blocks to simulate (default: 500)"
	@echo "  SIM_BLOCK_SIZE     - Number of operations per block (default: 200)"
	@echo "  SIM_COMMIT         - Whether to commit to disk (default: true)"
	@echo "  SIM_VERBOSE        - Enable verbose output (default: true)"
	@echo "  SIM_SEED           - Random seed (default: 42)"
	@echo "  SIM_PERIOD         - Invariant check period (default: 1)"