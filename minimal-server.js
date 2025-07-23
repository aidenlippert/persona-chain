const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

console.log('🚀 MINIMAL SERVER STARTING...');
console.log('📍 PORT:', PORT);
console.log('📍 NODE_ENV:', process.env.NODE_ENV);

app.get('/', (req, res) => {
  res.json({ 
    message: 'MINIMAL SERVER WORKING!', 
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV 
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ MINIMAL SERVER RUNNING ON PORT ${PORT}`);
});

server.on('error', (err) => {
  console.error('❌ SERVER ERROR:', err);
  process.exit(1);
});