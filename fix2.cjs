const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

const tabsContent = `
        {/* Tabs */}
        <div className="flex overflow-x-auto border-t border-slate-800 scrollbar-hide">
          <button onClick={() => setActiveTab('settings')} className={\`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 \${activeTab === 'settings' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}\`}>
            <Settings className="w-4 h-4" /> সিস্টেম সেটিংস
          </button>
          <button onClick={() => setActiveTab('submissions')} className={\`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 \${activeTab === 'submissions' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}\`}>
            <Layers className="w-4 h-4" /> সাবমিশন
            {pendingSubmissionsCount > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingSubmissionsCount}</span>}
          </button>
          <button onClick={() => setActiveTab('withdrawals')} className={\`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 \${activeTab === 'withdrawals' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}\`}>
            <CreditCard className="w-4 h-4" /> উইথড্র રিকোয়েস্ট
            {pendingWithdrawalsCount > 0 && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingWithdrawalsCount}</span>}
          </button>
          <button onClick={() => setActiveTab('users')} className={\`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 \${activeTab === 'users' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}\`}>
            <Shield className="w-4 h-4" /> Users
          </button>
          <button onClick={() => setActiveTab('micro_jobs')} className={\`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 \${activeTab === 'micro_jobs' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}\`}>
            <Check className="w-4 h-4" /> Micro Jobs
          </button>
        </div>
`;

content = content.replace(/\{\/\* Tabs \*\/\}(.|\n)*?<\/div>/, tabsContent.trim());
fs.writeFileSync('src/pages/Admin.tsx', content);
