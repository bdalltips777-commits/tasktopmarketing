const fs = require('fs');
const content = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');
const lines = content.split('\n');
let level = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/<div/g) || []).length;
  const closes = (line.match(/<\/div/g) || []).length;
  level += opens - closes;
  if (level < 0) {
    console.log(`Negative level at line ${i+1}: ${line}`);
    break;
  }
}
