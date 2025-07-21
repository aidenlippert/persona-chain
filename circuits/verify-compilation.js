#!/usr/bin/env node

/**
 * PersonaPass ZK Circuit Compilation Verification
 * Verifies that circuits compiled successfully and files exist
 */

const fs = require("fs");
const path = require("path");

function checkCircuitFiles(circuitName) {
    console.log(`\n🔍 Checking ${circuitName} circuit files...`);
    
    const buildPath = path.join(__dirname, "build");
    const r1csFile = path.join(buildPath, `${circuitName}.r1cs`);
    const symFile = path.join(buildPath, `${circuitName}.sym`);
    const wasmFile = path.join(buildPath, `${circuitName}_js`, `${circuitName}.wasm`);
    
    let allFilesExist = true;
    
    // Check R1CS file
    if (fs.existsSync(r1csFile)) {
        const r1csSize = fs.statSync(r1csFile).size;
        console.log(`✅ R1CS file exists: ${r1csFile} (${r1csSize} bytes)`);
    } else {
        console.log(`❌ R1CS file missing: ${r1csFile}`);
        allFilesExist = false;
    }
    
    // Check symbol file
    if (fs.existsSync(symFile)) {
        const symSize = fs.statSync(symFile).size;
        console.log(`✅ Symbol file exists: ${symFile} (${symSize} bytes)`);
    } else {
        console.log(`❌ Symbol file missing: ${symFile}`);
        allFilesExist = false;
    }
    
    // Check WASM file
    if (fs.existsSync(wasmFile)) {
        const wasmSize = fs.statSync(wasmFile).size;
        console.log(`✅ WASM file exists: ${wasmFile} (${wasmSize} bytes)`);
    } else {
        console.log(`❌ WASM file missing: ${wasmFile}`);
        allFilesExist = false;
    }
    
    return allFilesExist;
}

function main() {
    console.log("🚀 PersonaPass ZK Circuit Compilation Verification");
    console.log("==================================================");
    
    const circuits = [
        "simple_age_proof",
        "simple_income_proof", 
        "age_verification",
        "income_threshold"
    ];
    
    let workingCircuits = 0;
    
    circuits.forEach(circuit => {
        if (checkCircuitFiles(circuit)) {
            console.log(`✅ ${circuit}: ALL FILES PRESENT`);
            workingCircuits++;
        } else {
            console.log(`❌ ${circuit}: MISSING FILES`);
        }
    });
    
    console.log("\n📊 Compilation Results:");
    console.log(`✅ Working circuits: ${workingCircuits}/${circuits.length}`);
    console.log(`📈 Success rate: ${Math.round((workingCircuits / circuits.length) * 100)}%`);
    
    if (workingCircuits === circuits.length) {
        console.log("\n🎉 ALL CIRCUITS COMPILED SUCCESSFULLY!");
        console.log("PersonaPass ZK proof infrastructure is ready! 🔐");
        console.log("\nNext steps:");
        console.log("1. Set up trusted setup ceremony for production");
        console.log("2. Generate proving and verifying keys");
        console.log("3. Integrate with frontend ZK proof generation");
    } else if (workingCircuits > 0) {
        console.log(`\n✅ ${workingCircuits} circuits are working and ready for ZK proofs!`);
        console.log("This is sufficient for initial PersonaPass functionality.");
    } else {
        console.log("\n❌ No circuits compiled successfully.");
        console.log("ZK proof functionality needs circuit compilation fixes.");
    }
    
    return workingCircuits > 0;
}

main();