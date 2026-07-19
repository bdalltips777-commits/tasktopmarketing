const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

const dailyJobsTab = `

        {/* Tab 5.5: Daily Jobs */}
        {activeTab === 'daily_jobs' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">Add New Daily Job</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const { data, error } = await supabase.from('daily_jobs').insert([{ ...newDailyJob, reward_amount: Number(newDailyJob.reward_amount) }]).select();
                  if (error) throw error;
                  if (data) {
                    setDailyJobs([data[0], ...dailyJobs]);
                    setNewDailyJob({ title: '', description: '', reward_amount: '' });
                    showToast('Daily Job created successfully!', 'success');
                  }
                } catch (err: any) {
                  showToast('Error: ' + err.message, 'error');
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Title</label>
                  <input required value={newDailyJob.title} onChange={e => setNewDailyJob({...newDailyJob, title: e.target.value})} type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200" placeholder="Enter daily job title" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Description (Rules & Requirements)</label>
                  <textarea required value={newDailyJob.description} onChange={e => setNewDailyJob({...newDailyJob, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 min-h-[100px]" placeholder="Explain the task step by step..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Reward Amount (৳)</label>
                  <input required value={newDailyJob.reward_amount} onChange={e => setNewDailyJob({...newDailyJob, reward_amount: e.target.value})} type="number" step="0.01" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200" placeholder="0.00" />
                </div>
                <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-4 rounded-xl transition">Create Daily Job</button>
              </form>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white mt-8 mb-4">Existing Daily Jobs</h3>
              {dailyJobs.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">No active daily jobs found.</div>
              ) : (
                dailyJobs.map((job) => (
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
                          try {
                            const { error } = await supabase.from('daily_jobs').update({ status: !job.status }).eq('id', job.id);
                            if (error) throw error;
                            setDailyJobs(dailyJobs.map(j => j.id === job.id ? { ...j, status: !job.status } : j));
                            showToast(\`Daily Job is now \${!job.status ? 'Active' : 'Inactive'}!\`, 'success');
                          } catch (err: any) {
                            showToast('Error toggling status: ' + err.message, 'error');
                          }
                        }}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 text-xs font-bold rounded-lg transition"
                      >Toggle Status</button>
                      <button 
                        onClick={async () => {
                          if(!confirm('Delete this daily job? All associated user submissions will also be deleted.')) return;
                          try {
                            await supabase.from('daily_job_submissions').delete().eq('job_id', job.id);
                            const { error } = await supabase.from('daily_jobs').delete().eq('id', job.id);
                            if (error) throw error;
                            setDailyJobs(dailyJobs.filter(j => j.id !== job.id));
                            showToast('Daily Job deleted successfully!', 'success');
                          } catch (err: any) {
                            showToast('Error deleting Daily Job: ' + err.message, 'error');
                          }
                        }}
                        className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 px-4 py-2 text-xs font-bold rounded-lg transition"
                      >Delete Job</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
`;

code = code.replace(
  "{/* Tab 6: Gift Codes */}",
  dailyJobsTab + "\n        {/* Tab 6: Gift Codes */}"
);

// Add the daily jobs tab button
const dailyJobTabButton = `
          <button onClick={() => setActiveTab('daily_jobs')} className={\`flex-1 py-4 px-6 text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap transition border-b-2 \${activeTab === 'daily_jobs' ? 'border-amber-500 text-amber-400 bg-amber-500/5' : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}\`}>
            <Calendar className="w-4 h-4" /> Daily Jobs
          </button>`;

code = code.replace(
  `<button onClick={() => setActiveTab('gift_codes')}`,
  dailyJobTabButton + "\n          <button onClick={() => setActiveTab('gift_codes')}"
);

fs.writeFileSync('src/pages/Admin.tsx', code);
