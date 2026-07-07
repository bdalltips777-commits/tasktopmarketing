const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

const targetStr = `
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Transfer To</p>
                          <p className="text-lg font-mono text-white flex items-center gap-2">
                            {withd.accountNumber}
                            
                    </div>
                  </div>
                );
              })
`;

const replacementStr = `
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Transfer To</p>
                          <p className="text-lg font-mono text-white flex items-center gap-2">
                            {withd.accountNumber}
                            <Copy className="w-4 h-4 cursor-pointer text-slate-500 hover:text-white transition" onClick={() => navigator.clipboard.writeText(withd.accountNumber)} />
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col justify-end gap-3 border-t border-slate-800 md:border-t-0 pt-4 md:pt-0">
                        <button 
                          onClick={() => handleApproveWithdrawal(withd.id)} 
                          disabled={actioningId === withd.id}
                          className="flex-1 md:flex-none bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-600/30 px-4 py-3 rounded-xl transition flex items-center justify-center gap-2 font-bold text-sm"
                        >
                          {actioningId === withd.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          পরিশোধিত (Paid)
                        </button>
                        <button 
                          onClick={() => handleRejectWithdrawal(withd)} 
                          disabled={actioningId === withd.id}
                          className="flex-1 md:flex-none bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-600/30 px-4 py-3 rounded-xl transition flex items-center justify-center gap-2 font-bold text-sm"
                        >
                          {actioningId === withd.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                          বাতিল (Reject)
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
`;

content = content.replace(targetStr.trim(), replacementStr.trim());
fs.writeFileSync('src/pages/Admin.tsx', content);
