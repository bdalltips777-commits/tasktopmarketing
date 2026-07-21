const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

const derivedState = `  const filteredSubmissions = submissions
    .filter(s => s.status === submissionsTab)
    .filter(s => {
      if (submissionFilterCategory !== 'All') {
        if (s.type.toLowerCase() !== submissionFilterCategory.toLowerCase()) return false;
      }
      if (submissionSearchQuery) {
        const query = submissionSearchQuery.toLowerCase();
        const email = (s.user?.email || '').toLowerCase();
        let dataStr = '';
        try {
           const parsed = typeof s.credentials_json === 'string' ? JSON.parse(s.credentials_json) : s.credentials_json;
           dataStr = Object.values(parsed || {}).join(' ').toLowerCase();
        } catch(e) {
           dataStr = String(s.credentials_json || '').toLowerCase();
        }
        return email.includes(query) || dataStr.includes(query);
      }
      return true;
    });`;

code = code.replace(
  `{/* Tab 2: Submissions */}`,
  derivedState + `\n\n        {/* Tab 2: Submissions */}`
);

const filterUI = `<div className="flex gap-2 border-b border-slate-800 pb-4">
              <button onClick={() => setSubmissionsTab('Pending')} className={\`px-4 py-2 rounded-xl text-xs font-bold transition \${submissionsTab === 'Pending' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}\`}>Pending</button>
              <button onClick={() => setSubmissionsTab('Approved')} className={\`px-4 py-2 rounded-xl text-xs font-bold transition \${submissionsTab === 'Approved' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}\`}>Approved</button>
              <button onClick={() => setSubmissionsTab('Rejected')} className={\`px-4 py-2 rounded-xl text-xs font-bold transition \${submissionsTab === 'Rejected' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}\`}>Rejected</button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50 mb-6">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Search by User Email or Submitted Data...</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    value={submissionSearchQuery}
                    onChange={(e) => setSubmissionSearchQuery(e.target.value)}
                    placeholder="Search by Email or Proof..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-slate-600"
                  />
                </div>
              </div>
              <div className="w-full md:w-64">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Category Filter</label>
                <div className="flex flex-wrap gap-1.5">
                  {['All', 'Gmail', 'Facebook', 'Instagram', 'Microjob'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSubmissionFilterCategory(cat)}
                      className={\`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border \${
                        submissionFilterCategory === cat 
                          ? 'bg-slate-700/80 text-white border-slate-600 shadow-sm' 
                          : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-300'
                      }\`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>`;

code = code.replace(
  `<div className="flex gap-2 border-b border-slate-800 pb-4">
              <button onClick={() => setSubmissionsTab('Pending')} className={\`px-4 py-2 rounded-xl text-xs font-bold transition \${submissionsTab === 'Pending' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}\`}>Pending</button>
              <button onClick={() => setSubmissionsTab('Approved')} className={\`px-4 py-2 rounded-xl text-xs font-bold transition \${submissionsTab === 'Approved' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}\`}>Approved</button>
              <button onClick={() => setSubmissionsTab('Rejected')} className={\`px-4 py-2 rounded-xl text-xs font-bold transition \${submissionsTab === 'Rejected' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}\`}>Rejected</button>
            </div>`,
  filterUI
);

// We need to map `filteredSubmissions` instead of `submissions.filter(...)`
code = code.replace(
  `{submissions.filter(s => s.status === submissionsTab).length === 0 ? (`,
  `{filteredSubmissions.length === 0 ? (`
);

code = code.replace(
  `submissions.filter(s => s.status === submissionsTab).map((sub) => (`,
  `filteredSubmissions.map((sub) => {
                let parsedCreds: any = sub.credentials_json;
                try {
                  if (typeof parsedCreds === 'string') {
                    parsedCreds = JSON.parse(parsedCreds);
                  }
                } catch(e) {}
                
                return (
`
);

// And close the map function correctly
code = code.replace(
  `</button>
                    </div>
                  )}
                </div>
              ))`,
  `</button>
                    </div>
                  )}
                </div>
              );
            })`
);

// We need to add credentials UI for Microjob & Dailyjob
const microjobUI = `
                      {(sub.type === 'microjob' || sub.type === 'dailyjob') && parsedCreds && (
                        <div className="space-y-1">
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Title:</span> {parsedCreds.job_title}</p>
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Proof:</span> {parsedCreds.proof}</p>
                        </div>
                      )}`;

code = code.replace(
  `{sub.type === 'instagram' && (`,
  microjobUI + `\n                      {sub.type === 'instagram' && (`
);

// Need to update sub.credentials_json to parsedCreds in the UI render
code = code.replace(/sub\.credentials_json\./g, 'parsedCreds.');

fs.writeFileSync('src/pages/Admin.tsx', code);
