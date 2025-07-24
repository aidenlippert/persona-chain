// OAuth Callback Handler - Processes both old and new formats
(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const credential = urlParams.get('credential');
    const success = urlParams.get('success');
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    console.log('🔍 OAuth Callback Handler - Params:', {
        hasCredential: !!credential,
        success: success,
        hasCode: !!code,
        error: error
    });
    
    // Handle Railway's credential format
    if (success === 'true' && credential) {
        try {
            const credentialData = JSON.parse(decodeURIComponent(credential));
            console.log('✅ Railway OAuth Success - Storing credential...');
            
            // Store credential
            const existingCreds = JSON.parse(localStorage.getItem('credentials') || '[]');
            if (!existingCreds.some(c => c.id === credentialData.id)) {
                existingCreds.push(credentialData);
                localStorage.setItem('credentials', JSON.stringify(existingCreds));
            }
            
            // Show success message
            document.body.innerHTML = `
                <div style="font-family: system-ui; padding: 40px; text-align: center; background: #000; color: white; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
                    <div style="background: rgba(255,255,255,0.1); border: 2px solid #ff6b35; border-radius: 20px; padding: 40px; max-width: 500px;">
                        <div style="font-size: 4em; margin-bottom: 20px;">✅</div>
                        <h1 style="color: #ff6b35;">GitHub OAuth Success!</h1>
                        <p>Your credential has been stored.</p>
                        <p style="margin: 20px 0;">Username: <strong>${credentialData.credentialSubject.login}</strong></p>
                        <button onclick="window.close()" style="background: #ff6b35; color: white; border: none; padding: 15px 30px; border-radius: 10px; font-size: 1.1em; cursor: pointer; margin: 10px;">Close Window</button>
                        <button onclick="window.location.href='/credentials'" style="background: #ff6b35; color: white; border: none; padding: 15px 30px; border-radius: 10px; font-size: 1.1em; cursor: pointer; margin: 10px;">View Credentials</button>
                    </div>
                </div>
            `;
            
            // Notify parent window
            if (window.opener) {
                window.opener.postMessage({
                    type: 'GITHUB_OAUTH_SUCCESS',
                    credential: credentialData,
                    username: credentialData.credentialSubject.login
                }, window.location.origin);
            }
            
        } catch (e) {
            console.error('Failed to process credential:', e);
            document.body.innerHTML = '<div style="padding: 40px; text-align: center;">Error processing credential. <a href="/credentials">Go to credentials page</a></div>';
        }
    } 
    // Handle error
    else if (error) {
        document.body.innerHTML = `<div style="padding: 40px; text-align: center;">OAuth Error: ${error}. <button onclick="window.close()">Close</button></div>`;
    }
    // Handle old format or loading state
    else {
        // Keep existing page content for old OAuth flow
        console.log('Using existing OAuth callback handler...');
    }
})();