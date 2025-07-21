const { generateKeyPair, exportJWK } = require('jose');

async function generateKeys() {
    const { publicKey, privateKey } = await generateKeyPair('EdDSA', {
        crv: 'Ed25519',
    });
    
    const publicJWK = await exportJWK(publicKey);
    const privateJWK = await exportJWK(privateKey);
    
    console.log('ISSUER_PRIVATE_KEY=' + JSON.stringify(privateJWK));
    console.log('ISSUER_PUBLIC_KEY=' + JSON.stringify(publicJWK));
}

generateKeys().catch(console.error);
