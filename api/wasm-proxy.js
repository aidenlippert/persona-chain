/**
 * WASM Proxy API - Serves WASM files with correct MIME type
 * This is a Vercel serverless function that ensures WASM files are served correctly
 */

import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Parse the requested file path
  const { file } = req.query;
  
  if (!file) {
    res.status(400).json({ error: 'Missing file parameter' });
    return;
  }
  
  // Sanitize the file path to prevent directory traversal
  const sanitizedFile = file.replace(/\.\./g, '').replace(/^\//, '');
  
  // Log the request for debugging
  console.log('[WASM-PROXY] Request for file:', sanitizedFile);
  
  // Construct the full file path
  const wasmPath = path.join(process.cwd(), 'public', sanitizedFile);
  
  // Check if file exists and is a WASM file
  if (!wasmPath.endsWith('.wasm')) {
    res.status(400).json({ error: 'Invalid file type. Only .wasm files are allowed' });
    return;
  }
  
  try {
    // Read the WASM file
    const wasmContent = fs.readFileSync(wasmPath);
    
    // Set the correct MIME type for WASM files
    res.setHeader('Content-Type', 'application/wasm');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Length', wasmContent.length);
    
    // Send the WASM file
    res.status(200).send(wasmContent);
  } catch (error) {
    console.error('[WASM-PROXY] Error reading file:', error);
    
    // If file not found, try the circuits/build directory
    const circuitsPath = path.join(process.cwd(), sanitizedFile);
    
    try {
      const wasmContent = fs.readFileSync(circuitsPath);
      
      res.setHeader('Content-Type', 'application/wasm');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Content-Length', wasmContent.length);
      
      res.status(200).send(wasmContent);
    } catch (innerError) {
      res.status(404).json({ error: 'WASM file not found' });
    }
  }
}