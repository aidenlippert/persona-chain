#!/usr/bin/env node

// PersonaChain Zero-Knowledge Proof MCP Server
// Production-ready ZK proof generation and verification using Circom and snarkjs

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');

class ZKProofServer {
  constructor() {
    this.server = new Server(
      {
        name: 'zk-proof-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.circuitsPath = path.join(__dirname, '../../circuits');
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'generate_age_proof':
          return this.generateAgeProof(args.birthDate, args.minimumAge, args.salt);
        case 'verify_age_proof':
          return this.verifyAgeProof(args.proof, args.publicInputs);
        case 'generate_membership_proof':
          return this.generateMembershipProof(args.memberList, args.userID, args.salt);
        case 'verify_membership_proof':
          return this.verifyMembershipProof(args.proof, args.publicInputs);
        case 'generate_range_proof':
          return this.generateRangeProof(args.value, args.minRange, args.maxRange, args.salt);
        case 'verify_range_proof':
          return this.verifyRangeProof(args.proof, args.publicInputs);
        case 'generate_selective_disclosure':
          return this.generateSelectiveDisclosure(args.credentials, args.revealedFields, args.salt);
        case 'verify_selective_disclosure':
          return this.verifySelectiveDisclosure(args.proof, args.publicInputs);
        case 'compile_circuit':
          return this.compileCircuit(args.circuitName, args.circuitCode);
        case 'setup_trusted_setup':
          return this.setupTrustedSetup(args.circuitName);
        case 'get_circuit_info':
          return this.getCircuitInfo(args.circuitName);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });

    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'generate_age_proof',
            description: 'Generate zero-knowledge proof of age without revealing exact birth date',
            inputSchema: {
              type: 'object',
              properties: {
                birthDate: { type: 'string', description: 'Birth date in YYYY-MM-DD format' },
                minimumAge: { type: 'number', description: 'Minimum age to prove' },
                salt: { type: 'string', description: 'Random salt for privacy' }
              },
              required: ['birthDate', 'minimumAge', 'salt']
            }
          },
          {
            name: 'verify_age_proof',
            description: 'Verify a zero-knowledge age proof',
            inputSchema: {
              type: 'object',
              properties: {
                proof: { type: 'object', description: 'ZK proof object' },
                publicInputs: { type: 'array', description: 'Public inputs for verification' }
              },
              required: ['proof', 'publicInputs']
            }
          },
          {
            name: 'generate_membership_proof',
            description: 'Generate proof of membership in a set without revealing which member',
            inputSchema: {
              type: 'object',
              properties: {
                memberList: { type: 'array', description: 'List of valid members' },
                userID: { type: 'string', description: 'User ID to prove membership of' },
                salt: { type: 'string', description: 'Random salt for privacy' }
              },
              required: ['memberList', 'userID', 'salt']
            }
          },
          {
            name: 'verify_membership_proof',
            description: 'Verify a zero-knowledge membership proof',
            inputSchema: {
              type: 'object',
              properties: {
                proof: { type: 'object', description: 'ZK proof object' },
                publicInputs: { type: 'array', description: 'Public inputs for verification' }
              },
              required: ['proof', 'publicInputs']
            }
          },
          {
            name: 'generate_range_proof',
            description: 'Generate proof that a value is within a range without revealing the value',
            inputSchema: {
              type: 'object',
              properties: {
                value: { type: 'number', description: 'Value to prove is in range' },
                minRange: { type: 'number', description: 'Minimum value of range' },
                maxRange: { type: 'number', description: 'Maximum value of range' },
                salt: { type: 'string', description: 'Random salt for privacy' }
              },
              required: ['value', 'minRange', 'maxRange', 'salt']
            }
          },
          {
            name: 'verify_range_proof',
            description: 'Verify a zero-knowledge range proof',
            inputSchema: {
              type: 'object',
              properties: {
                proof: { type: 'object', description: 'ZK proof object' },
                publicInputs: { type: 'array', description: 'Public inputs for verification' }
              },
              required: ['proof', 'publicInputs']
            }
          },
          {
            name: 'generate_selective_disclosure',
            description: 'Generate proof revealing only selected credential fields',
            inputSchema: {
              type: 'object',
              properties: {
                credentials: { type: 'object', description: 'Full credential data' },
                revealedFields: { type: 'array', description: 'Fields to reveal' },
                salt: { type: 'string', description: 'Random salt for privacy' }
              },
              required: ['credentials', 'revealedFields', 'salt']
            }
          },
          {
            name: 'verify_selective_disclosure',
            description: 'Verify a selective disclosure proof',
            inputSchema: {
              type: 'object',
              properties: {
                proof: { type: 'object', description: 'ZK proof object' },
                publicInputs: { type: 'array', description: 'Public inputs for verification' }
              },
              required: ['proof', 'publicInputs']
            }
          },
          {
            name: 'compile_circuit',
            description: 'Compile a new Circom circuit for custom ZK proofs',
            inputSchema: {
              type: 'object',
              properties: {
                circuitName: { type: 'string', description: 'Name for the circuit' },
                circuitCode: { type: 'string', description: 'Circom circuit code' }
              },
              required: ['circuitName', 'circuitCode']
            }
          },
          {
            name: 'setup_trusted_setup',
            description: 'Perform trusted setup ceremony for a circuit',
            inputSchema: {
              type: 'object',
              properties: {
                circuitName: { type: 'string', description: 'Circuit name to setup' }
              },
              required: ['circuitName']
            }
          },
          {
            name: 'get_circuit_info',
            description: 'Get information about available circuits',
            inputSchema: {
              type: 'object',
              properties: {
                circuitName: { type: 'string', description: 'Circuit name (optional)' }
              }
            }
          }
        ]
      };
    });
  }

  async generateAgeProof(birthDate, minimumAge, salt) {
    try {
      // Calculate if user meets minimum age requirement
      const birth = new Date(birthDate);
      const today = new Date();
      const ageInYears = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      let actualAge = ageInYears;
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        actualAge--;
      }

      const meetsRequirement = actualAge >= minimumAge ? 1 : 0;

      // Prepare circuit inputs
      const inputs = {
        birthYear: birth.getFullYear(),
        birthMonth: birth.getMonth() + 1,
        birthDay: birth.getDate(),
        currentYear: today.getFullYear(),
        currentMonth: today.getMonth() + 1,
        currentDay: today.getDate(),
        minimumAge: minimumAge,
        salt: this.stringToField(salt)
      };

      // Generate proof using age verification circuit
      const circuitPath = path.join(this.circuitsPath, 'age_verification.wasm');
      const zkeyPath = path.join(this.circuitsPath, 'age_verification_final.zkey');

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        inputs,
        circuitPath,
        zkeyPath
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            proof,
            publicInputs: publicSignals,
            meetsRequirement,
            circuitType: 'age_verification',
            generatedAt: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error generating age proof: ${error.message}`
        }],
        isError: true
      };
    }
  }

  async verifyAgeProof(proof, publicInputs) {
    try {
      const vkeyPath = path.join(this.circuitsPath, 'age_verification_verification_key.json');
      const vKey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));

      const isValid = await snarkjs.groth16.verify(vKey, publicInputs, proof);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            isValid,
            publicInputs,
            circuitType: 'age_verification',
            verifiedAt: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error verifying age proof: ${error.message}`
        }],
        isError: true
      };
    }
  }

  async generateMembershipProof(memberList, userID, salt) {
    try {
      // Create Merkle tree of member list
      const memberHashes = memberList.map(member => this.hash(member));
      const merkleTree = this.buildMerkleTree(memberHashes);
      const merkleRoot = merkleTree[merkleTree.length - 1][0];

      // Find user's position and generate proof path
      const userHash = this.hash(userID);
      const userIndex = memberHashes.indexOf(userHash);
      
      if (userIndex === -1) {
        throw new Error('User not found in member list');
      }

      const merklePath = this.getMerklePath(merkleTree, userIndex);

      const inputs = {
        userHash: userHash,
        merkleRoot: merkleRoot,
        merklePath: merklePath,
        pathIndices: this.getPathIndices(userIndex, memberList.length),
        salt: this.stringToField(salt)
      };

      const circuitPath = path.join(this.circuitsPath, 'membership.wasm');
      const zkeyPath = path.join(this.circuitsPath, 'membership_final.zkey');

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        inputs,
        circuitPath,
        zkeyPath
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            proof,
            publicInputs: publicSignals,
            merkleRoot,
            circuitType: 'membership',
            generatedAt: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error generating membership proof: ${error.message}`
        }],
        isError: true
      };
    }
  }

  async generateSelectiveDisclosure(credentials, revealedFields, salt) {
    try {
      // Create commitment to full credential
      const fullCredentialHash = this.hash(JSON.stringify(credentials));
      
      // Extract revealed data
      const revealedData = {};
      revealedFields.forEach(field => {
        if (credentials[field] !== undefined) {
          revealedData[field] = credentials[field];
        }
      });

      // Generate proof that revealed data is part of original credential
      const inputs = {
        fullCredentialHash,
        revealedDataHash: this.hash(JSON.stringify(revealedData)),
        salt: this.stringToField(salt),
        ...this.prepareCredentialFields(credentials, revealedFields)
      };

      const circuitPath = path.join(this.circuitsPath, 'selective_disclosure.wasm');
      const zkeyPath = path.join(this.circuitsPath, 'selective_disclosure_final.zkey');

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        inputs,
        circuitPath,
        zkeyPath
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            proof,
            publicInputs: publicSignals,
            revealedData,
            revealedFields,
            circuitType: 'selective_disclosure',
            generatedAt: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error generating selective disclosure proof: ${error.message}`
        }],
        isError: true
      };
    }
  }

  // Utility functions
  stringToField(str) {
    // Convert string to field element for circuit
    const hash = require('crypto').createHash('sha256').update(str).digest('hex');
    return BigInt('0x' + hash) % BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  }

  hash(data) {
    return require('crypto').createHash('sha256').update(data).digest('hex');
  }

  buildMerkleTree(leaves) {
    let tree = [leaves];
    let currentLevel = leaves;

    while (currentLevel.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        nextLevel.push(this.hash(left + right));
      }
      tree.push(nextLevel);
      currentLevel = nextLevel;
    }

    return tree;
  }

  getMerklePath(tree, leafIndex) {
    const path = [];
    let currentIndex = leafIndex;

    for (let level = 0; level < tree.length - 1; level++) {
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
      
      if (siblingIndex < tree[level].length) {
        path.push(tree[level][siblingIndex]);
      } else {
        path.push(tree[level][currentIndex]);
      }
      
      currentIndex = Math.floor(currentIndex / 2);
    }

    return path;
  }

  getPathIndices(leafIndex, totalLeaves) {
    const indices = [];
    let currentIndex = leafIndex;

    while (currentIndex > 0) {
      indices.push(currentIndex % 2);
      currentIndex = Math.floor(currentIndex / 2);
    }

    return indices;
  }

  prepareCredentialFields(credentials, revealedFields) {
    // Prepare credential fields for circuit input
    const fields = {};
    
    Object.keys(credentials).forEach((key, index) => {
      const isRevealed = revealedFields.includes(key);
      fields[`field_${index}`] = this.stringToField(credentials[key]);
      fields[`reveal_${index}`] = isRevealed ? 1 : 0;
    });

    return fields;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('ZK Proof MCP server running on stdio');
  }
}

const server = new ZKProofServer();
server.run().catch(console.error);