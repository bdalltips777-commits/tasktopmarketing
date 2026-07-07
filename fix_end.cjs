const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');
content = content.replace(/      <\/div>\n\n      <\/div>\n    <\/div>\n  \);\n\}/, '      </div>\n    </div>\n  );\n}');
fs.writeFileSync('src/pages/Admin.tsx', content);
