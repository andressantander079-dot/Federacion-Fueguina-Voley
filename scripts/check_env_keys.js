const fs = require('fs');
const content = fs.readFileSync('.env.local', 'utf8');
const lines = content.split('\n');
const keys = lines.map(l => l.split('=')[0].trim()).filter(k => k && !k.startsWith('#'));
console.log('Keys:', keys);
