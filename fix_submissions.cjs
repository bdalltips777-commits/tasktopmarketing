const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

const replacement = `
        {/* Tab 2: Submissions */}
        {activeTab === 'submissions' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex gap-2 border-b border-slate-800 pb-4">
              <button onClick={() => setSubmissionsTab('Pending')} className={\`px-4 py-2 rounded-xl text-xs font-bold transition \${submissionsTab === 'Pending' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}\`}>Pending</button>
              <button onClick={() => setSubmissionsTab('Approved')} className={\`px-4 py-2 rounded-xl text-xs font-bold transition \${submissionsTab === 'Approved' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}\`}>Approved</button>
              <button onClick={() => setSubmissionsTab('Rejected')} className={\`px-4 py-2 rounded-xl text-xs font-bold transition \${submissionsTab === 'Rejected' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}\`}>Rejected</button>
            </div>
            {submissions.filter(s => s.status === submissionsTab).length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                <Shield className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-400">No {submissionsTab.toLowerCase()} submissions</h3>
              </div>
            ) : (
              submissions.filter(s => s.status === submissionsTab).map((sub) => (
                <div key={sub.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row gap-5 hover:border-slate-700 transition">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={\`px-2.5 py-1 text-[10px] uppercase tracking-wider font-black rounded-full \${sub.type === 'gmail' ? 'bg-red-500/10 text-red-400' : sub.type === 'facebook' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'}\`}>
                        {sub.type} Account
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{formatDateTime(sub.created_at)}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Submitted By</p>
                        <p className="text-sm font-semibold text-slate-200">{sub.user?.fullName}</p>
                        <p className="text-xs text-slate-400">{sub.user?.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Reward Value</p>
                        <p className="text-lg font-bold text-emerald-400">৳{sub.price_at_submission}</p>
                      </div>
                    </div>

                    <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs text-slate-300 border border-slate-800">
                      <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider">Credentials</p>
                      {sub.type === 'gmail' && (
                        <div className="space-y-1">
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Email:</span> {sub.credentials_json.email} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(sub.credentials_json.email)} /></p>
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Password:</span> {sub.credentials_json.password} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(sub.credentials_json.password)} /></p>
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Recovery:</span> {sub.credentials_json.recoveryEmail} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(sub.credentials_json.recoveryEmail)} /></p>
                        </div>
                      )}
                      {sub.type === 'facebook' && (
                        <div className="space-y-1">
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Number/Email:</span> {sub.credentials_json.identifier || sub.credentials_json.fbUid} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(sub.credentials_json.identifier || sub.credentials_json.fbUid)} /></p>
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Password:</span> {sub.credentials_json.password || sub.credentials_json.fbPassword} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(sub.credentials_json.password || sub.credentials_json.fbPassword)} /></p>
                          {(sub.credentials_json.twoFAKey || sub.credentials_json.fb2FA) && <p className="flex items-center gap-2"><span className="text-indigo-400">2FA Key:</span> {sub.credentials_json.twoFAKey || sub.credentials_json.fb2FA} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(sub.credentials_json.twoFAKey || sub.credentials_json.fb2FA)} /></p>}
                          <p><span className="text-indigo-400">Profile Link:</span> {sub.credentials_json.profileLink || \`https://facebook.com/profile.php?id=\${sub.credentials_json.fbUid || sub.credentials_json.identifier}\`}</p>
                        </div>
                      )}
                      {sub.type === 'instagram' && (
                        <div className="space-y-1">
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Username/Number:</span> {sub.credentials_json.identifier || sub.credentials_json.igUid} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(sub.credentials_json.identifier || sub.credentials_json.igUid)} /></p>
                          <p className="flex items-center gap-2"><span className="text-indigo-400">Password:</span> {sub.credentials_json.password || sub.credentials_json.igPassword} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(sub.credentials_json.password || sub.credentials_json.igPassword)} /></p>
                          {(sub.credentials_json.twoFAKey || sub.credentials_json.ig2FA) && <p className="flex items-center gap-2"><span className="text-indigo-400">2FA Key:</span> {sub.credentials_json.twoFAKey || sub.credentials_json.ig2FA} <Copy className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(sub.credentials_json.twoFAKey || sub.credentials_json.ig2FA)} /></p>}
                          <p><span className="text-indigo-400">Profile Link:</span> {sub.credentials_json.profileLink || \`https://instagram.com/\${sub.credentials_json.igUid || sub.credentials_json.identifier}\`}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {submissionsTab === 'Pending' && (
                    <div className="flex flex-row md:flex-col justify-end gap-3 border-t border-slate-800 md:border-t-0 pt-4 md:pt-0">
                      <button 
                        onClick={() => handleApproveSubmission(sub)} 
                        disabled={actioningId === sub.id}
                        className="flex-1 md:flex-none bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-600/30 px-4 py-3 rounded-xl transition flex items-center justify-center gap-2 font-bold text-sm"
                      >
                        {actioningId === sub.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        এপ্রুভ
                      </button>
                      <button 
                        onClick={() => handleRejectSubmission(sub)} 
                        disabled={actioningId === sub.id}
                        className="flex-1 md:flex-none bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-600/30 px-4 py-3 rounded-xl transition flex items-center justify-center gap-2 font-bold text-sm"
                      >
                        {actioningId === sub.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        রিজেক্ট
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
`;

content = content.replace(/\{\/\* Tab 2: Pending Submissions \*\/\}(.|\n)*?\{\/\* Tab 3: Withdrawals \*\/\}/, replacement.trim() + '\n\n        {/* Tab 3: Withdrawals */}');
fs.writeFileSync('src/pages/Admin.tsx', content);
