const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

const badgeOld = `<span className={\`px-2.5 py-1 text-[10px] uppercase tracking-wider font-black rounded-full \${sub.type === 'gmail' ? 'bg-red-500/10 text-red-400' : sub.type === 'facebook' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'}\`}>
                        {sub.type} Account
                      </span>`;

const badgeNew = `<span className={\`px-2.5 py-1 text-[10px] uppercase tracking-wider font-black rounded-full \${
                        sub.type === 'gmail' ? 'bg-red-500/10 text-red-400' : 
                        sub.type === 'facebook' ? 'bg-blue-500/10 text-blue-400' : 
                        sub.type === 'instagram' ? 'bg-pink-500/10 text-pink-400' :
                        sub.type === 'microjob' ? 'bg-indigo-500/10 text-indigo-400' :
                        'bg-amber-500/10 text-amber-400'
                      }\`}>
                        {sub.type} {sub.type === 'microjob' || sub.type === 'dailyjob' ? 'Submission' : 'Account'}
                      </span>`;

code = code.replace(badgeOld, badgeNew);

fs.writeFileSync('src/pages/Admin.tsx', code);
