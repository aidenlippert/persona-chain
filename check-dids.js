// Debug script to check DID storage
console.log("🔍 Checking DID Storage...");

// Check localStorage for blockchain DIDs
const blockchainDIDs = localStorage.getItem('blockchain_dids');
console.log("Blockchain DIDs:", blockchainDIDs ? JSON.parse(blockchainDIDs) : 'None');

// Check for individual DID records
const allKeys = Object.keys(localStorage);
const didKeys = allKeys.filter(key => key.startsWith('did_record_'));
console.log("DID Record Keys:", didKeys);

// Check for other relevant storage
console.log("User DID:", localStorage.getItem('user_did'));
console.log("Persona Wallet:", localStorage.getItem('persona_wallet') ? 'Present' : 'None');
console.log("Current DID:", localStorage.getItem('current_did'));

// Try to open IndexedDB and check Dexie storage
if (typeof window !== 'undefined' && window.indexedDB) {
  const request = window.indexedDB.open('PersonaWallet');
  request.onsuccess = (event) => {
    const db = event.target.result;
    console.log("IndexedDB version:", db.version);
    console.log("Object stores:", Array.from(db.objectStoreNames));
    
    if (db.objectStoreNames.contains('dids')) {
      const transaction = db.transaction(['dids'], 'readonly');
      const store = transaction.objectStore('dids');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        console.log("DIDs in IndexedDB:", getAllRequest.result);
      };
    }
  };
  
  request.onerror = () => {
    console.log("Could not open IndexedDB");
  };
}