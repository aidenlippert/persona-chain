/**
 * Load Testing Framework for PersonaPass Wallet
 * Tests performance under various load conditions
 */

import { bench, describe } from "vitest";
import { enhancedZKProofService } from "../__mocks__/enhancedZKProofService";

// Mock large-scale operations
const generateMultipleCredentials = async (count: number) => {
  const credentials = Array.from({ length: count }, (_, i) => ({
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    id: `urn:uuid:test-credential-${i}`,
    type: ["VerifiableCredential", "EmploymentCredential"],
    issuer: "did:persona:test123456789abcdef",
    issuanceDate: "2023-01-01T00:00:00Z",
    expirationDate: "2024-01-01T00:00:00Z",
    credentialSubject: {
      id: "did:example:subject",
      name: `Test User ${i}`,
      title: "Software Engineer",
      company: "TechCorp",
      salary: 75000 + i * 1000,
    },
  }));

  return Promise.all(
    credentials.map(async (credential) => {
      const request = {
        credentialId: credential.id,
        proofType: "age_verification" as const,
        publicInputs: {
          minimum_age: 18,
          current_timestamp: Math.floor(Date.now() / 1000),
          date_of_birth: Math.floor(new Date("1990-01-01").getTime() / 1000),
        },
        privacyLevel: "selective" as const,
      };
      return enhancedZKProofService.generateProof(request);
    })
  );
};

describe("Performance Benchmarks", () => {
  // ZK Proof Generation Performance
  bench("ZK Proof Generation - Single", async () => {
    const request = {
      credentialId: "test-credential",
      proofType: "age_verification" as const,
      publicInputs: {
        minimum_age: 18,
        current_timestamp: Math.floor(Date.now() / 1000),
        date_of_birth: Math.floor(new Date("1990-01-01").getTime() / 1000),
      },
      privacyLevel: "selective" as const,
    };
    await enhancedZKProofService.generateProof(request);
  });

  bench("ZK Proof Generation - Batch of 10", async () => {
    await generateMultipleCredentials(10);
  });

  bench("ZK Proof Generation - Batch of 50", async () => {
    await generateMultipleCredentials(50);
  });

  bench("ZK Proof Generation - Batch of 100", async () => {
    await generateMultipleCredentials(100);
  });

  // Memory and CPU intensive operations
  bench("Large Credential Processing", async () => {
    const largeCredential = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      id: "urn:uuid:large-credential",
      type: ["VerifiableCredential", "ComplexCredential"],
      issuer: "did:persona:test123456789abcdef",
      issuanceDate: "2023-01-01T00:00:00Z",
      credentialSubject: {
        ...Object.fromEntries(
          Array.from({ length: 1000 }, (_, i) => [`field${i}`, `value${i}`])
        ),
      },
    };

    await enhancedZKProofService.createPrivacyPreservingCredential(
      largeCredential,
      "selective"
    );
  });

  // Concurrent operations stress test
  bench("Concurrent ZK Proof Generation", async () => {
    const concurrentRequests = Array.from({ length: 20 }, (_, i) => ({
      credentialId: `concurrent-credential-${i}`,
      proofType: "age_verification" as const,
      publicInputs: {
        minimum_age: 18,
        current_timestamp: Math.floor(Date.now() / 1000),
        date_of_birth: Math.floor(new Date("1990-01-01").getTime() / 1000),
      },
      privacyLevel: "selective" as const,
    }));

    await Promise.all(
      concurrentRequests.map((request) =>
        enhancedZKProofService.generateProof(request)
      )
    );
  });

  // Privacy recommendations performance
  bench("Privacy Recommendations - Multiple Types", async () => {
    const credentialTypes = [
      "FinancialCredential",
      "EmploymentCredential",
      "HealthCredential",
      "EducationCredential",
      "GovernmentCredential",
      "BasicCredential",
    ];

    credentialTypes.forEach((type) => {
      enhancedZKProofService.getPrivacyRecommendations(type);
    });
  });

  // Circuit information retrieval
  bench("Circuit Information Retrieval", async () => {
    const circuits = enhancedZKProofService.listCircuits();
    circuits.forEach((circuit) => {
      enhancedZKProofService.getCircuitInfo(circuit.id);
    });
  });
});

describe("Memory Usage Benchmarks", () => {
  bench("Memory - Large Data Structures", async () => {
    // Simulate memory intensive operations
    const largeArray = Array.from({ length: 10000 }, (_, i) => ({
      id: `item-${i}`,
      data: "x".repeat(1000), // 1KB per item = 10MB total
      timestamp: Date.now(),
    }));

    // Process the array
    const processed = largeArray.map((item) => ({
      ...item,
      processed: true,
      hash: `hash-${item.id}`,
    }));

    return processed.length;
  });

  bench("Memory - Rapid Allocation/Deallocation", async () => {
    for (let i = 0; i < 1000; i++) {
      const tempData = Array.from({ length: 100 }, () => Math.random());
      // Process and discard
      tempData.reduce((sum, val) => sum + val, 0);
    }
  });
});

describe("Network Simulation Benchmarks", () => {
  // Simulate network delays
  const simulateNetworkDelay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  bench("Network - Fast Connection (50ms)", async () => {
    await simulateNetworkDelay(50);
    const request = {
      credentialId: "network-test",
      proofType: "age_verification" as const,
      publicInputs: {
        minimum_age: 18,
        current_timestamp: Math.floor(Date.now() / 1000),
        date_of_birth: Math.floor(new Date("1990-01-01").getTime() / 1000),
      },
      privacyLevel: "selective" as const,
    };
    await enhancedZKProofService.generateProof(request);
  });

  bench("Network - Slow Connection (500ms)", async () => {
    await simulateNetworkDelay(500);
    const request = {
      credentialId: "network-test-slow",
      proofType: "age_verification" as const,
      publicInputs: {
        minimum_age: 18,
        current_timestamp: Math.floor(Date.now() / 1000),
        date_of_birth: Math.floor(new Date("1990-01-01").getTime() / 1000),
      },
      privacyLevel: "selective" as const,
    };
    await enhancedZKProofService.generateProof(request);
  });
});

describe("Scalability Benchmarks", () => {
  // Test with increasing load
  const scaleFactors = [1, 5, 10, 25, 50];

  scaleFactors.forEach((factor) => {
    bench(`Scalability - ${factor}x load`, async () => {
      await generateMultipleCredentials(factor);
    });
  });

  // Test sustained load
  bench("Sustained Load - 5 minutes simulation", async () => {
    const endTime = Date.now() + 5000; // 5 seconds in benchmark (simulating 5 minutes)
    let operationCount = 0;

    while (Date.now() < endTime) {
      const request = {
        credentialId: `sustained-${operationCount}`,
        proofType: "age_verification" as const,
        publicInputs: {
          minimum_age: 18,
          current_timestamp: Math.floor(Date.now() / 1000),
          date_of_birth: Math.floor(new Date("1990-01-01").getTime() / 1000),
        },
        privacyLevel: "selective" as const,
      };
      await enhancedZKProofService.generateProof(request);
      operationCount++;
    }

    return operationCount;
  });
});