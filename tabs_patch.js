const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');
const newTabs = `          <button 
            onClick={() => setActiveTab('users')}
            className={\`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 \${activeTab === 'users' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}\`}
          >
            <Shield className="w-4 h-4" />
            Users (ইউজার)
          </button>
          <button 
            onClick={() => setActiveTab('micro_jobs')}
            className={\`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 \${activeTab === 'micro_jobs' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}\`}
          >
            <Settings className="w-4 h-4" />
            Micro Jobs (মাইক্রো জব)
          </button>
        </div>`;
content = content.replace('        </div>', newTabs);
fs.writeFileSync('src/pages/Admin.tsx', content);
