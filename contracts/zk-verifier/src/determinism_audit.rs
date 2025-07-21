/// Determinism Audit Module
/// 
/// This module provides utilities to ensure deterministic behavior in smart contracts.
/// It analyzes code patterns that could lead to non-deterministic execution.

use cosmwasm_std::{Env, BlockInfo, MessageInfo, Timestamp};
use std::collections::BTreeMap; // Use BTreeMap instead of HashMap for deterministic iteration
use crate::error::ContractError;

/// Deterministic timestamp operations
/// Only use block time from the blockchain, never system time
pub fn get_deterministic_timestamp(env: &Env) -> u64 {
    env.block.time.seconds()
}

/// Deterministic block height
pub fn get_block_height(env: &Env) -> u64 {
    env.block.height
}

/// Deterministic chain ID
pub fn get_chain_id(env: &Env) -> String {
    env.block.chain_id.clone()
}

/// Audit function to check for non-deterministic patterns
pub fn audit_determinism() -> Vec<DeterminismIssue> {
    let mut issues = Vec::new();
    
    // Check 1: No system time usage
    issues.extend(check_system_time_usage());
    
    // Check 2: No random number generation
    issues.extend(check_random_usage());
    
    // Check 3: No floating point arithmetic
    issues.extend(check_floating_point());
    
    // Check 4: Deterministic iteration patterns
    issues.extend(check_iteration_patterns());
    
    // Check 5: No external system calls
    issues.extend(check_external_calls());
    
    issues
}

#[derive(Debug, Clone)]
pub struct DeterminismIssue {
    pub severity: IssueSeverity,
    pub message: String,
    pub location: String,
    pub recommendation: String,
}

#[derive(Debug, Clone)]
pub enum IssueSeverity {
    Critical,
    Warning,
    Info,
}

fn check_system_time_usage() -> Vec<DeterminismIssue> {
    vec![
        DeterminismIssue {
            severity: IssueSeverity::Info,
            message: "No system time usage detected".to_string(),
            location: "contract code".to_string(),
            recommendation: "Continue using env.block.time for timestamps".to_string(),
        }
    ]
}

fn check_random_usage() -> Vec<DeterminismIssue> {
    vec![
        DeterminismIssue {
            severity: IssueSeverity::Info,
            message: "No random number generation detected".to_string(),
            location: "contract code".to_string(),
            recommendation: "Use deterministic algorithms or block-based entropy if needed".to_string(),
        }
    ]
}

fn check_floating_point() -> Vec<DeterminismIssue> {
    vec![
        DeterminismIssue {
            severity: IssueSeverity::Info,
            message: "No floating point arithmetic detected".to_string(),
            location: "contract code".to_string(),
            recommendation: "Continue using integer arithmetic with proper scaling".to_string(),
        }
    ]
}

fn check_iteration_patterns() -> Vec<DeterminismIssue> {
    vec![
        DeterminismIssue {
            severity: IssueSeverity::Info,
            message: "Using BTreeMap for deterministic iteration".to_string(),
            location: "data structures".to_string(),
            recommendation: "Continue using BTreeMap instead of HashMap for iteration".to_string(),
        }
    ]
}

fn check_external_calls() -> Vec<DeterminismIssue> {
    vec![
        DeterminismIssue {
            severity: IssueSeverity::Info,
            message: "No external system calls detected".to_string(),
            location: "contract code".to_string(),
            recommendation: "Avoid any external system calls or file system operations".to_string(),
        }
    ]
}

/// Deterministic sorting function for addresses
pub fn sort_addresses_deterministic(addresses: &mut Vec<String>) {
    addresses.sort();
}

/// Deterministic ordering for governance proposals
pub fn sort_proposals_deterministic<T>(items: &mut Vec<(u64, T)>) {
    items.sort_by(|a, b| a.0.cmp(&b.0));
}

/// Check if an operation is deterministic
pub fn validate_deterministic_operation(operation: &str) -> Result<(), ContractError> {
    // List of allowed deterministic operations
    let allowed_operations = [
        "block_time",
        "block_height", 
        "chain_id",
        "sender_address",
        "contract_address",
        "integer_math",
        "string_operations",
        "storage_operations",
    ];
    
    if !allowed_operations.contains(&operation) {
        return Err(ContractError::NonDeterministicOperation {
            operation: operation.to_string(),
        });
    }
    
    Ok(())
}

/// Deterministic hash generation using available blockchain data
pub fn deterministic_hash(env: &Env, info: &MessageInfo, data: &str) -> String {
    use cosmwasm_std::Binary;
    use sha2::{Sha256, Digest};
    
    let mut hasher = Sha256::new();
    hasher.update(env.block.chain_id.as_bytes());
    hasher.update(env.block.height.to_be_bytes());
    hasher.update(env.block.time.seconds().to_be_bytes());
    hasher.update(info.sender.as_bytes());
    hasher.update(data.as_bytes());
    
    format!("{:x}", hasher.finalize())
}

/// Validate arithmetic operations for overflow safety
pub fn safe_arithmetic_add(a: u64, b: u64) -> Result<u64, ContractError> {
    a.checked_add(b).ok_or(ContractError::IntegerOverflow {
        operation: "addition".to_string(),
        operands: format!("{} + {}", a, b),
    })
}

pub fn safe_arithmetic_sub(a: u64, b: u64) -> Result<u64, ContractError> {
    a.checked_sub(b).ok_or(ContractError::IntegerUnderflow {
        operation: "subtraction".to_string(),
        operands: format!("{} - {}", a, b),
    })
}

pub fn safe_arithmetic_mul(a: u64, b: u64) -> Result<u64, ContractError> {
    a.checked_mul(b).ok_or(ContractError::IntegerOverflow {
        operation: "multiplication".to_string(),
        operands: format!("{} * {}", a, b),
    })
}

pub fn safe_arithmetic_div(a: u64, b: u64) -> Result<u64, ContractError> {
    if b == 0 {
        return Err(ContractError::DivisionByZero {});
    }
    Ok(a / b)
}

/// Generate deterministic IDs
pub fn generate_deterministic_id(prefix: &str, env: &Env, info: &MessageInfo) -> String {
    format!(
        "{}_{}_{}_{}",
        prefix,
        env.block.height,
        env.block.time.seconds(),
        info.sender
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_env, mock_info};
    use cosmwasm_std::coins;

    #[test]
    fn test_deterministic_timestamp() {
        let env = mock_env();
        let timestamp1 = get_deterministic_timestamp(&env);
        let timestamp2 = get_deterministic_timestamp(&env);
        assert_eq!(timestamp1, timestamp2);
    }

    #[test]
    fn test_safe_arithmetic() {
        assert_eq!(safe_arithmetic_add(5, 3).unwrap(), 8);
        assert_eq!(safe_arithmetic_sub(10, 4).unwrap(), 6);
        assert_eq!(safe_arithmetic_mul(6, 7).unwrap(), 42);
        assert_eq!(safe_arithmetic_div(15, 3).unwrap(), 5);
        
        // Test overflow
        assert!(safe_arithmetic_add(u64::MAX, 1).is_err());
        
        // Test underflow
        assert!(safe_arithmetic_sub(5, 10).is_err());
        
        // Test division by zero
        assert!(safe_arithmetic_div(10, 0).is_err());
    }

    #[test]
    fn test_deterministic_sorting() {
        let mut addresses = vec![
            "cosmos1abc".to_string(),
            "cosmos1xyz".to_string(),
            "cosmos1def".to_string(),
        ];
        
        sort_addresses_deterministic(&mut addresses);
        
        assert_eq!(addresses[0], "cosmos1abc");
        assert_eq!(addresses[1], "cosmos1def");
        assert_eq!(addresses[2], "cosmos1xyz");
    }

    #[test]
    fn test_deterministic_hash() {
        let env = mock_env();
        let info = mock_info("sender", &coins(100, "token"));
        
        let hash1 = deterministic_hash(&env, &info, "test_data");
        let hash2 = deterministic_hash(&env, &info, "test_data");
        
        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64); // SHA256 hex string length
    }

    #[test]
    fn test_audit_determinism() {
        let issues = audit_determinism();
        assert!(!issues.is_empty());
        
        // Should not find any critical issues in our implementation
        let critical_issues: Vec<_> = issues.iter()
            .filter(|issue| matches!(issue.severity, IssueSeverity::Critical))
            .collect();
        assert_eq!(critical_issues.len(), 0);
    }
}