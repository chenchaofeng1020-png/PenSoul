import { ArrowRight, Briefcase, Layers3, Loader2 } from 'lucide-react';
import {
  DELIVERY_CALIBER_OPTIONS,
  LEVEL_CONFIG,
  PROJECT_TYPE_OPTIONS,
  getScopeSummary
} from '../../../utils/estimationTypes';

const TOGGLE_FIELDS = [
  { key: 'includeProduct', label: '产品方案/PRD' },
  { key: 'includeUI', label: 'UI设计' },
  { key: 'includeFrontend', label: '前端开发' },
  { key: 'includeBackend', label: '后端开发' },
  { key: 'includeQA', label: '测试回归' },
  { key: 'includeIntegration', label: '联调集成' },
  { key: 'includeLaunch', label: '上线支持' },
  { key: 'includeProjectManagement', label: '项目沟通' },
  { key: 'includeTraining', label: '培训交接' },
  { key: 'includeBuffer', label: '风险缓冲' }
];

export function ScopeConfirmStep({ scopeConfig, functionCount, onChange, onConfirm, isSubmitting = false }) {
  const scopeSummary = getScopeSummary(scopeConfig);

  const updateField = (key, value) => {
    onChange({
      ...scopeConfig,
      [key]: value
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">先确认本次评估口径</h3>
              <p className="text-sm text-gray-600 leading-6">
                这一步会决定AI估算的人天边界。先统一“这次到底评什么”，再进入逐项评估，能明显减少低估和误解。
              </p>
              <p className="mt-2 text-xs text-gray-400">当前已识别 {functionCount} 个候选功能项。</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="space-y-6">
            <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-800 mb-4">项目类型</h4>
              <div className="grid grid-cols-3 gap-3">
                {PROJECT_TYPE_OPTIONS.map(option => (
                  <button
                    key={option.key}
                    onClick={() => updateField('projectType', option.key)}
                    className={`rounded-xl border px-4 py-4 text-left transition-colors ${
                      scopeConfig.projectType === option.key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-800 mb-1">{option.label}</div>
                    <div className="text-xs leading-5 text-gray-500">{option.description}</div>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-800 mb-4">交付口径</h4>
              <div className="space-y-3">
                {DELIVERY_CALIBER_OPTIONS.map(option => (
                  <button
                    key={option.key}
                    onClick={() => updateField('deliveryCaliber', option.key)}
                    className={`w-full rounded-xl border px-4 py-4 text-left transition-colors ${
                      scopeConfig.deliveryCaliber === option.key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-800 mb-1">{option.label}</div>
                    <div className="text-xs leading-5 text-gray-500">{option.description}</div>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Layers3 className="w-4 h-4 text-gray-500" />
                <h4 className="text-sm font-semibold text-gray-800">本次纳入评估的交付内容</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {TOGGLE_FIELDS.map(field => (
                  <button
                    key={field.key}
                    onClick={() => updateField(field.key, !scopeConfig[field.key])}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                      scopeConfig[field.key]
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-500'
                    }`}
                  >
                    <div className="font-medium">{field.label}</div>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-800 mb-4">团队基准</h4>
              <div className="space-y-2">
                {Object.entries(LEVEL_CONFIG).map(([key, level]) => (
                  <button
                    key={key}
                    onClick={() => updateField('teamLevel', key)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                      scopeConfig.teamLevel === key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-800">{level.label}</div>
                    <div className="text-xs text-gray-500 mt-1">按{level.label}人员效率作为默认评估基准</div>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm">
              <h4 className="text-sm font-semibold text-white/90 mb-4">本次口径摘要</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-white/60">项目类型</span>
                  <span>{scopeSummary.projectTypeLabel}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-white/60">交付口径</span>
                  <span>{scopeSummary.caliberLabel}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-white/60">团队基准</span>
                  <span>{scopeSummary.teamLevelLabel}</span>
                </div>
                <div>
                  <div className="text-white/60 mb-2">纳入项</div>
                  <div className="flex flex-wrap gap-2">
                    {scopeSummary.includedItems.map(item => (
                      <span
                        key={item}
                        className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-xs"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-white font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在进入交付项确认...
                </>
              ) : (
                <>
                  确认口径并整理交付项
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScopeConfirmStep;
