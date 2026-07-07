const fs = require('fs');
const content = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');
const lines = content.split('\n');
let level = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/<[a-zA-Z]+/g) || []).filter(tag => !['<br', '<img', '<input', '<hr', '<Copy', '<Settings', '<Shield', '<Layers', '<CreditCard', '<Check', '<X', '<Loader2', '<ImageIcon'].includes(tag)).length;
  const closes = (line.match(/<\/[a-zA-Z]+/g) || []).length;
  // This is too simplistic. Let's just use Babel to parse it.
}
