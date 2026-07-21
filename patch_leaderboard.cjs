const fs = require('fs');
let code = fs.readFileSync('src/pages/Leaderboard.tsx', 'utf-8');

code = code.replace(
  `                      {isFirst && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                          <span className="text-[10px] sm:text-xs font-black text-yellow-500 uppercase tracking-widest">Champion</span>
                        </div>
                      )}`,
  `                      {isFirst && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                          <span className="text-[10px] sm:text-xs font-black text-yellow-500 uppercase tracking-widest">Champion (Gold)</span>
                        </div>
                      )}
                      {isSecond && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-slate-300" />
                          <span className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest">Runner Up (Silver)</span>
                        </div>
                      )}
                      {isThird && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span className="text-[10px] sm:text-xs font-black text-amber-600 uppercase tracking-widest">Second Runner Up (Bronze)</span>
                        </div>
                      )}`
);

fs.writeFileSync('src/pages/Leaderboard.tsx', code);
