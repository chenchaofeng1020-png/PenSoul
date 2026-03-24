import {
  FULFILLMENT_OPTIONS,
  applyFulfillmentSelection,
  getFulfillmentOption,
  createReuseAssessment,
  getReuseSummary
} from '../../../utils/estimationTypes';

export function ReuseAssessmentPanel({ value, onChange }) {
  const assessment = createReuseAssessment(value);
  const summary = getReuseSummary(assessment);
  const selectedFulfillment = getFulfillmentOption(assessment);

  return (
    <div className="bg-white p-7">
      <div className="mb-6">
        <div>
          <h4 className="flex items-center gap-2 text-lg font-black text-slate-800 tracking-tight">
            功能满足情况
          </h4>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 max-w-xl">
            只需要判断当前需求和已有功能的匹配程度，再补充必要备注，后续 AI 评估会据此调整判断口径。
          </p>
        </div>
      </div>

      <div className="mb-6 space-y-2">
        <label className="block text-sm font-bold text-slate-700">已有功能满足情况</label>
        <div className="flex flex-wrap gap-2.5">
          {FULFILLMENT_OPTIONS.map(option => {
            const active = selectedFulfillment.key === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onChange(applyFulfillmentSelection(option.key, assessment))}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                  active
                    ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm ring-2 ring-blue-500/10'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 leading-6">
          当前选择：<span className="font-semibold text-slate-700">{summary.fulfillmentLabel}</span>。
          {selectedFulfillment.description}
          <span className="ml-1 text-slate-400">{summary.ratioLabel}。</span>
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-bold text-slate-700">补充说明</label>
        <textarea
          value={assessment.notes}
          onChange={(e) => onChange({ ...assessment, notes: e.target.value })}
          placeholder="可补充需求说明、实现方案思路、边界条件、风险提醒等。"
          className="h-28 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all placeholder:text-slate-400 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
    </div>
  );
}

export default ReuseAssessmentPanel;
