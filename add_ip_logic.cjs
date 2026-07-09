const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const actionFunctions = `
  const handleApproveIp = async (userId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ status: 'Active' }).eq('id', userId);
      if (error) throw error;
      setIpRequests(prev => prev.filter(u => u.id !== userId));
      showToast('User approved successfully.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Error approving user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectIp = async (userId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('delete_rejected_user', { target_user_id: userId });
      if (error) throw error;
      setIpRequests(prev => prev.filter(u => u.id !== userId));
      showToast('Account deleted and removed from the system.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Error deleting user', 'error');
    } finally {
      setActionLoading(false);
    }
  };
`;

code = code.replace("  const showToast = (message: string, type: 'success' | 'error' = 'success') => {", actionFunctions + "\n  const showToast = (message: string, type: 'success' | 'error' = 'success') => {");

const tabContent = `
        {/* Tab 8: IP Requests */}
        {activeTab === 'ip_requests' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-4">
                <Shield className="w-5 h-5 text-amber-400" />
                IP Verification Requests
              </h2>
              
              {ipRequests.length === 0 ? (
                <div className="text-center p-10 bg-slate-950 rounded-2xl border border-slate-800">
                  <p className="text-slate-400">No pending IP verification requests.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(
                    ipRequests.reduce((acc, user) => {
                      const ip = user.ip_address || 'Unknown';
                      if (!acc[ip]) acc[ip] = [];
                      acc[ip].push(user);
                      return acc;
                    }, {} as Record<string, any[]>)
                  ).map(([ip, usersInGroup]) => (
                    <div key={ip} className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-inner">
                      <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                        <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-md text-xs border border-amber-500/20">IP: {ip}</span>
                        <span className="text-slate-500">({usersInGroup.length} Account{usersInGroup.length > 1 ? 's' : ''})</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {usersInGroup.map((u: any) => (
                          <div key={u.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                            <div className="mb-4">
                              <p className="text-sm font-bold text-white">{u.full_name}</p>
                              <p className="text-xs text-slate-400">{u.email}</p>
                              <p className="text-xs text-slate-500 font-mono mt-1">Ref Code: {u.referral_code}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveIp(u.id)}
                                disabled={actionLoading}
                                className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-2 rounded-lg text-xs font-bold transition flex justify-center items-center gap-1"
                              >
                                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectIp(u.id)}
                                disabled={actionLoading}
                                className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 py-2 rounded-lg text-xs font-bold transition flex justify-center items-center gap-1"
                              >
                                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
`;

code = code.replace("      </div>\n\n      {/* Edit Wallet Balance Modal */}", tabContent + "\n      </div>\n\n      {/* Edit Wallet Balance Modal */}");
fs.writeFileSync('src/pages/Admin.tsx', code);
