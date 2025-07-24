// Clear all caches and force refresh - PersonaPass DID Service Fix
(async function clearCache() {
  console.log('🔄 PersonaPass: Clearing cache to get DID service fix...');
  
  if ('serviceWorker' in navigator) {
    // Unregister all service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('🧹 Unregistered service worker:', registration.scope);
    }
  }

  if ('caches' in window) {
    // Clear all caches
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => {
        console.log('🧹 Deleting cache:', cacheName);
        return caches.delete(cacheName);
      })
    );
  }

  // Clear localStorage and sessionStorage (but preserve important user data)
  const importantKeys = ['wallet_address', 'user_did', 'credentials'];
  const preserved = {};
  importantKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      preserved[key] = localStorage.getItem(key);
    }
  });
  
  localStorage.clear();
  sessionStorage.clear();
  
  // Restore important data
  Object.keys(preserved).forEach(key => {
    localStorage.setItem(key, preserved[key]);
  });
  
  console.log('✅ PersonaPass: Cache cleared! DID service fix applied. Reloading...');
  
  // Hard reload to get latest version
  window.location.reload(true);
})();