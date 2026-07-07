const fs = require('fs');
const content = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');
const fixedContent = content.replace(/<button[^>]*>[\s\S]*?Users \(ইউজার\)[\s\S]*?<\/button>[\s\S]*?<button[^>]*>[\s\S]*?Micro Jobs \(মাইক্রো জব\)[\s\S]*?<\/button>/g, '');
fs.writeFileSync('src/pages/Admin.tsx', fixedContent);
