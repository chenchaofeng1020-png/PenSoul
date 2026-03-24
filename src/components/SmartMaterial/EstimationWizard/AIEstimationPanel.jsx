import { Sparkles, TrendingUp, Info, CheckCircle } from 'lucide-react';
import { ROLE_CONFIG, COMPLEXITY_CONFIG } from '../../../utils/estimationTypes';

export function AIEstimationPanel({ aiResult, onApply }) {
  const { complexity, estimates, roleExplanations, confidence, implementationApproach } = aiResult;
  const complexityConfig = COMPLEXITY_CONFIG[complexity] || COMPLEXITY_CONFIG.medium;

  return (
    <div className="relative mt-2">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <h4 className="text-lg font-bold text-slate-800">AI 评估报告</h4>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="flex h-7 items-center rounded-full px-3 text-xs font-bold shadow-sm ring-1 ring-inset ring-slate-900/5"
            style={{
              backgroundColor: complexityConfig.bgColor,
              color: complexityConfig.color
            }}
          >
            {complexityConfig.label}
          </span>
          <div className="flex h-7 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>置信度 {(confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(ROLE_CONFIG).map(([role, config]) => {
          const days = estimates[role] || 0;
          const explanation = roleExplanations?.[role] || '';

          return (
            <div key={role} className="group relative overflow-hidden rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:ring-1 hover:ring-indigo-100">
              <div className="mb-3 flex items-center justify-between">
                <div
                  className="flex h-6 items-center rounded-md px-2 text-xs font-bold tracking-wide"
                  style={{
                    backgroundColor: config.color + '15',
                    color: config.color
                  }}
                >
                  {config.label}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-slate-800">{days.toFixed(1)}</span>
                  <span className="text-xs font-medium text-slate-400">天</span>
                </div>
              </div>
              {explanation && (
                <p className="text-sm leading-relaxed text-slate-600 line-clamp-3 group-hover:line-clamp-none transition-all">
                  {explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {implementationApproach ? (
        <div className="mt-5 overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm">
          <div className="border-b border-indigo-50 bg-indigo-50/50 px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-800">
              <Info className="h-4 w-4" />
              估算依据与实现思路
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm leading-relaxed text-slate-700">{implementationApproach}</p>
          </div>
        </div>
      ) : null}

      {onApply && (
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
          <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Info className="h-4 w-4" />
            您可以直接采用这版建议值，也可以继续手工微调。
          </p>
          <button
            onClick={onApply}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg"
          >
            <CheckCircle className="h-4 w-4 transition-transform group-hover:scale-110" />
            一键采用 AI 建议
          </button>
        </div>
      )}
    </div>
  );
}

export default AIEstimationPanel;
