import { CheckCircle, Circle, Clock } from 'lucide-react';
import { COMPLEXITY_CONFIG } from '../../../utils/estimationTypes';

export function FunctionListSidebar({ functions, currentIndex, onSelect, title = '功能列表', progress = null }) {
  const groupedFunctions = functions.reduce((acc, func, idx) => {
    const module = func.module || '未分类';
    if (!acc[module]) acc[module] = [];
    acc[module].push({ ...func, originalIndex: idx });
    return acc;
  }, {});

  return (
    <div className="flex w-[260px] flex-col border-r border-slate-200/60 bg-white xl:w-[280px]">
      <div className="border-b border-slate-200/60 bg-white px-4 py-3 z-10">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight">{title} ({functions.length})</h3>
        {progress ? (
          <div className="mt-2.5">
            <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-500">
              <span>已确认 {progress.confirmed} / {progress.total}</span>
              <span className="text-blue-600">{progress.percentage}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin scrollbar-thumb-slate-200">
        {Object.entries(groupedFunctions).map(([module, funcs]) => (
          <div key={module} className="mb-3">
            <div className="sticky top-0 z-[1] mb-1 px-2 py-1 bg-white/95 backdrop-blur-sm">
              <div className="inline-flex items-center px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {module}
              </div>
            </div>

            <div className="space-y-0.5">
              {funcs.map((func) => {
                const isActive = func.originalIndex === currentIndex;
                const isConfirmed = func.status === 'confirmed';
                const isEvaluated = func.status === 'evaluated';
                const totalDays = Object.values(func.estimates || {}).reduce((a, b) => a + b, 0);

                return (
                  <button
                    key={func.id}
                    onClick={() => onSelect(func.originalIndex)}
                    className={`group relative w-full rounded-lg px-2.5 py-2 text-left transition-all duration-200 ${
                      isActive 
                        ? 'bg-blue-50/50 shadow-sm ring-1 ring-blue-100/50' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-500" />
                    )}
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex-shrink-0 transition-transform group-hover:scale-110">
                        {isConfirmed ? (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        ) : isEvaluated ? (
                          <Clock className="h-3.5 w-3.5 text-amber-500" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-slate-300" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={`line-clamp-2 text-xs leading-snug ${isActive ? 'font-semibold text-blue-700' : 'font-medium text-slate-700 group-hover:text-slate-900'}`}>
                          {func.name}
                        </p>

                        {(isConfirmed || isEvaluated) && func.estimates ? (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              {totalDays.toFixed(1)} 天
                            </span>
                            {func.aiEstimation?.complexity ? (
                              <span
                                className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
                                style={{
                                  backgroundColor: COMPLEXITY_CONFIG[func.aiEstimation.complexity]?.bgColor || '#F1F5F9',
                                  color: COMPLEXITY_CONFIG[func.aiEstimation.complexity]?.color || '#475569'
                                }}
                              >
                                {COMPLEXITY_CONFIG[func.aiEstimation.complexity]?.label || '中等'}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <div className="mt-1 text-[10px] font-medium text-slate-400">
                            {isActive ? '当前评估中...' : '待填写人天'}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FunctionListSidebar;
