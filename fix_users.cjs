const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

const additionalTabs = `
        {/* Tab 4: Users */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/50 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                      <th className="p-4 font-bold">User Name</th>
                      <th className="p-4 font-bold">Email</th>
                      <th className="p-4 font-bold">Role</th>
                      <th className="p-4 font-bold">Balance (৳)</th>
                      <th className="p-4 font-bold text-right">Status / Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {usersData.map((usr) => (
                      <tr key={usr.id} className="hover:bg-slate-800/20 transition">
                        <td className="p-4">
                          <p className="font-bold text-slate-200">{usr.full_name || 'N/A'}</p>
                        </td>
                        <td className="p-4 text-slate-300">{usr.email}</td>
                        <td className="p-4 text-slate-400">
                           <span className={\`px-2 py-1 text-[10px] uppercase font-bold rounded-md \${usr.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-300'}\`}>{usr.role}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-400">৳{usr.wallet_balance}</span>
                            <button 
                              onClick={async () => {
                                const newBal = prompt('Enter new balance for ' + usr.full_name + ':', usr.wallet_balance);
                                if (newBal !== null && !isNaN(Number(newBal))) {
                                  const { error } = await supabase.from('profiles').update({ wallet_balance: Number(newBal) }).eq('id', usr.id);
                                  if (!error) {
                                    alert('Balance updated successfully!');
                                    setUsersData(usersData.map(u => u.id === usr.id ? { ...u, wallet_balance: Number(newBal) } : u));
                                  } else {
                                    alert('Error updating balance: ' + error.message);
                                  }
                                }
                              }}
                              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded"
                            >Edit</button>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={async () => {
                              const newStatus = !usr.is_blocked;
                              const { error } = await supabase.from('profiles').update({ is_blocked: newStatus }).eq('id', usr.id);
                              if (!error) {
                                alert(newStatus ? 'User blocked!' : 'User unblocked!');
                                setUsersData(usersData.map(u => u.id === usr.id ? { ...u, is_blocked: newStatus } : u));
                              } else {
                                alert('Error updating status: ' + error.message);
                              }
                            }}
                            className={\`px-3 py-1 text-xs font-bold rounded-lg transition \${usr.is_blocked ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}\`}
                          >
                            {usr.is_blocked ? 'Unblock' : 'Block'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {usersData.length === 0 && <div className="p-8 text-center text-slate-500">No users found.</div>}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Micro Jobs */}
        {activeTab === 'micro_jobs' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Add New Micro Job</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const { data, error } = await supabase.from('micro_jobs').insert([{ ...newJob, reward_amount: Number(newJob.reward_amount) }]).select();
                if (!error && data) {
                  setMicroJobs([data[0], ...microJobs]);
                  setNewJob({ title: '', description: '', reward_amount: '' });
                  alert('Micro Job created successfully!');
                } else {
                  alert('Error: ' + error?.message);
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Title</label>
                  <input required value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200" placeholder="e.g. Subscribe to YouTube Channel" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Description (Rules & Requirements)</label>
                  <textarea required value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 min-h-[100px]" placeholder="Explain the task step by step..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Reward Amount (৳)</label>
                  <input required value={newJob.reward_amount} onChange={e => setNewJob({...newJob, reward_amount: e.target.value})} type="number" step="0.01" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200" placeholder="0.00" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition">Create Micro Job</button>
              </form>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white mt-8 mb-4">Existing Micro Jobs</h3>
              {microJobs.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">No active micro jobs found.</div>
              ) : (
                microJobs.map((job) => (
                  <div key={job.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-200">{job.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{job.description}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-sm font-black text-emerald-400">৳{job.reward_amount}</span>
                        <span className={\`px-2 py-0.5 text-[10px] font-bold uppercase rounded \${job.status ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}\`}>{job.status ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                    <div className="flex sm:flex-col gap-2 shrink-0">
                      <button 
                        onClick={async () => {
                          const { error } = await supabase.from('micro_jobs').update({ status: !job.status }).eq('id', job.id);
                          if (!error) setMicroJobs(microJobs.map(j => j.id === job.id ? { ...j, status: !job.status } : j));
                        }}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 text-xs font-bold rounded-lg transition"
                      >Toggle Status</button>
                      <button 
                        onClick={async () => {
                          if(!confirm('Delete this job?')) return;
                          const { error } = await supabase.from('micro_jobs').delete().eq('id', job.id);
                          if (!error) setMicroJobs(microJobs.filter(j => j.id !== job.id));
                        }}
                        className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-4 py-2 text-xs font-bold rounded-lg transition"
                      >Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
`;

content = content.replace('      </div>\n    </div>\n  );\n}', additionalTabs + '\n      </div>\n    </div>\n  );\n}');
fs.writeFileSync('src/pages/Admin.tsx', content);
