const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf-8');

code = code.replace(
  `import { \n  Loader2, \n  Mail,`,
  `import { \n  Loader2, \n  Mail, \n  Gift,`
);

fs.writeFileSync('src/pages/Login.tsx', code);
