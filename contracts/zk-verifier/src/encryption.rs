use sha2::{Sha256, Digest};
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng, AeadCore},
    Aes256Gcm, Nonce, Key
};
use base64::{Engine as _, engine::general_purpose};
use crate::error::ContractError;

/// Encryption service for sensitive data
pub struct EncryptionService {
    key: [u8; 32],
}

impl EncryptionService {
    /// Create new encryption service with derived key
    pub fn new(master_key: &str) -> Self {
        let mut hasher = Sha256::new();
        hasher.update(master_key.as_bytes());
        let key = hasher.finalize().into();
        
        Self { key }
    }

    /// Encrypt sensitive data
    pub fn encrypt(&self, plaintext: &str) -> Result<String, ContractError> {
        let key = Key::<Aes256Gcm>::from_slice(&self.key);
        let cipher = Aes256Gcm::new(key);
        
        // Generate random nonce
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
        
        // Encrypt the data
        let ciphertext = cipher.encrypt(&nonce, plaintext.as_bytes())
            .map_err(|_| ContractError::EncryptionError {})?;
        
        // Combine nonce and ciphertext
        let mut encrypted_data = nonce.to_vec();
        encrypted_data.extend_from_slice(&ciphertext);
        
        // Encode as base64
        Ok(general_purpose::STANDARD.encode(encrypted_data))
    }

    /// Decrypt sensitive data
    pub fn decrypt(&self, encrypted_data: &str) -> Result<String, ContractError> {
        let key = Key::<Aes256Gcm>::from_slice(&self.key);
        let cipher = Aes256Gcm::new(key);
        
        // Decode from base64
        let encrypted_bytes = general_purpose::STANDARD.decode(encrypted_data)
            .map_err(|_| ContractError::DecryptionError {})?;
        
        if encrypted_bytes.len() < 12 {
            return Err(ContractError::DecryptionError {});
        }
        
        // Extract nonce and ciphertext
        let (nonce_bytes, ciphertext) = encrypted_bytes.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);
        
        // Decrypt the data
        let plaintext = cipher.decrypt(nonce, ciphertext)
            .map_err(|_| ContractError::DecryptionError {})?;
        
        String::from_utf8(plaintext)
            .map_err(|_| ContractError::DecryptionError {})
    }
}

/// Encrypted storage wrapper for sensitive data
#[derive(Clone)]
pub struct EncryptedData {
    pub encrypted_value: String,
    pub hash: String, // SHA256 hash for integrity checking
}

impl EncryptedData {
    /// Create new encrypted data
    pub fn new(plaintext: &str, encryption_service: &EncryptionService) -> Result<Self, ContractError> {
        let encrypted_value = encryption_service.encrypt(plaintext)?;
        let hash = Self::compute_hash(plaintext);
        
        Ok(Self {
            encrypted_value,
            hash,
        })
    }

    /// Decrypt and verify data
    pub fn decrypt(&self, encryption_service: &EncryptionService) -> Result<String, ContractError> {
        let plaintext = encryption_service.decrypt(&self.encrypted_value)?;
        
        // Verify integrity
        let computed_hash = Self::compute_hash(&plaintext);
        if computed_hash != self.hash {
            return Err(ContractError::IntegrityError {});
        }
        
        Ok(plaintext)
    }

    /// Compute SHA256 hash for integrity checking
    fn compute_hash(data: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data.as_bytes());
        format!("{:x}", hasher.finalize())
    }
}

/// Key derivation for different data types
pub struct KeyDerivation;

impl KeyDerivation {
    /// Derive encryption key for verification keys
    pub fn verification_key(circuit_id: &str, master_key: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(master_key.as_bytes());
        hasher.update(b"verification_key");
        hasher.update(circuit_id.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Derive encryption key for proofs
    pub fn proof_key(proof_id: &str, master_key: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(master_key.as_bytes());
        hasher.update(b"proof");
        hasher.update(proof_id.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Derive encryption key for governance data
    pub fn governance_key(master_key: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(master_key.as_bytes());
        hasher.update(b"governance");
        format!("{:x}", hasher.finalize())
    }
}

/// Encrypted circuit with sensitive data protected
#[derive(Clone)]
pub struct EncryptedCircuit {
    pub circuit_id: String,
    pub encrypted_verification_key: EncryptedData,
    pub circuit_type: String,
    pub creator: cosmwasm_std::Addr,
    pub active: bool,
    pub created_at: u64,
}

impl EncryptedCircuit {
    /// Create new encrypted circuit
    pub fn new(
        circuit_id: String,
        verification_key: &str,
        circuit_type: String,
        creator: cosmwasm_std::Addr,
        master_key: &str,
    ) -> Result<Self, ContractError> {
        let encryption_key = KeyDerivation::verification_key(&circuit_id, master_key);
        let encryption_service = EncryptionService::new(&encryption_key);
        let encrypted_verification_key = EncryptedData::new(verification_key, &encryption_service)?;
        
        Ok(Self {
            circuit_id,
            encrypted_verification_key,
            circuit_type,
            creator,
            active: true,
            created_at: 0, // Will be set in the actual contract call
        })
    }

    /// Decrypt verification key
    pub fn decrypt_verification_key(&self, master_key: &str) -> Result<String, ContractError> {
        let encryption_key = KeyDerivation::verification_key(&self.circuit_id, master_key);
        let encryption_service = EncryptionService::new(&encryption_key);
        self.encrypted_verification_key.decrypt(&encryption_service)
    }
}

/// Encrypted proof with sensitive data protected
#[derive(Clone)]
pub struct EncryptedProof {
    pub proof_id: String,
    pub circuit_id: String,
    pub submitter: cosmwasm_std::Addr,
    pub public_inputs: Vec<String>, // Public inputs are not encrypted
    pub encrypted_proof: EncryptedData,
    pub verified: bool,
    pub submitted_at: u64,
    pub verified_at: Option<u64>,
}

impl EncryptedProof {
    /// Create new encrypted proof
    pub fn new(
        proof_id: String,
        circuit_id: String,
        submitter: cosmwasm_std::Addr,
        public_inputs: Vec<String>,
        proof: &str,
        master_key: &str,
    ) -> Result<Self, ContractError> {
        let encryption_key = KeyDerivation::proof_key(&proof_id, master_key);
        let encryption_service = EncryptionService::new(&encryption_key);
        let encrypted_proof = EncryptedData::new(proof, &encryption_service)?;
        
        Ok(Self {
            proof_id,
            circuit_id,
            submitter,
            public_inputs,
            encrypted_proof,
            verified: false,
            submitted_at: 0, // Will be set in the actual contract call
            verified_at: None,
        })
    }

    /// Decrypt proof data
    pub fn decrypt_proof(&self, master_key: &str) -> Result<String, ContractError> {
        let encryption_key = KeyDerivation::proof_key(&self.proof_id, master_key);
        let encryption_service = EncryptionService::new(&encryption_key);
        self.encrypted_proof.decrypt(&encryption_service)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encryption_service() {
        let service = EncryptionService::new("test_master_key");
        let plaintext = "sensitive_verification_key_data";
        
        let encrypted = service.encrypt(plaintext).unwrap();
        let decrypted = service.decrypt(&encrypted).unwrap();
        
        assert_eq!(plaintext, decrypted);
        assert_ne!(plaintext, encrypted);
    }

    #[test]
    fn test_encrypted_data() {
        let service = EncryptionService::new("test_master_key");
        let plaintext = "sensitive_data";
        
        let encrypted_data = EncryptedData::new(plaintext, &service).unwrap();
        let decrypted = encrypted_data.decrypt(&service).unwrap();
        
        assert_eq!(plaintext, decrypted);
    }

    #[test]
    fn test_key_derivation() {
        let master_key = "master_key_123";
        let circuit_id = "test_circuit";
        
        let key1 = KeyDerivation::verification_key(circuit_id, master_key);
        let key2 = KeyDerivation::verification_key(circuit_id, master_key);
        let key3 = KeyDerivation::verification_key("different_circuit", master_key);
        
        assert_eq!(key1, key2);
        assert_ne!(key1, key3);
    }

    #[test]
    fn test_encrypted_circuit() {
        let circuit_id = "test_circuit".to_string();
        let verification_key = "test_verification_key";
        let circuit_type = "age_verification".to_string();
        let creator = cosmwasm_std::Addr::unchecked("creator");
        let master_key = "master_key_123";
        
        let encrypted_circuit = EncryptedCircuit::new(
            circuit_id.clone(),
            verification_key,
            circuit_type,
            creator,
            master_key,
        ).unwrap();
        
        let decrypted_key = encrypted_circuit.decrypt_verification_key(master_key).unwrap();
        assert_eq!(verification_key, decrypted_key);
    }
}