import { useState, useCallback, useEffect } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { ROLE_CONFIG, createReuseAssessment } from '../../../utils/estimationTypes';
import { AIEstimationPanel } from './AIEstimationPanel';
import { ReuseAssessmentPanel } from './ReuseAssessmentPanel';

export function FunctionEvaluator({ functionItem, index, total, onUpdate, scopeConfig }) {
  const [estimates, setEstimates] = useState(functionItem.estimates || {
    product: 0, ui: 0, frontend: 0, backend: 0, test: 0
  });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiResult, setAiResult] = useState(functionItem.aiEstimation || null);
  const [error, setError] = useState(null);
  const [reuseAssessment, setReuseAssessment] = useState(createReuseAssessment(functionItem.reuseAssessment || {}));

  useEffect(() => {
    setEstimates(functionItem.estimates || {
      product: 0, ui: 0, frontend: 0, backend: 0, test: 0
    });
    setAiResult(functionItem.aiEstimation || null);
    setReuseAssessment(createReuseAssessment(functionItem.reuseAssessment || {}));
    setError(null);
    setIsEvaluating(false);
  }, [functionItem]);

  const handleEstimateChange = useCallback((role, value) => {
    const numValue = parseFloat(value) || 0;
    const nextEstimates = { ...estimates, [role]: numValue };
    setEstimates(nextEstimates);
    onUpdate({ estimates: nextEstimates, estimationMode: aiResult ? 'hybrid' : 'manual' });
  }, [aiResult, estimates, onUpdate]);

  const handleReuseAssessmentChange = useCallback((nextAssessment) => {
    const normalized = createReuseAssessment(nextAssessment);
    setReuseAssessment(normalized);
    onUpdate({ reuseAssessment: normalized });
  }, [onUpdate]);

  const handleAIEvaluation = async () => {
    setIsEvaluating(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3002/api/smart/estimation/evaluate-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionItem: {
            name: functionItem.name,
            description: functionItem.description,
            module: functionItem.module,
            reuseAssessment
          },
          config: { scopeConfig, reuseAssessment },
          model: 'glm-4-7-251222'
        })
      });

      if (!response.ok) {
        throw new Error('AI评估请求失败');
      }

      const result = await response.json();
      setAiResult(result);
      onUpdate({
        aiEstimation: result,
        reuseAssessment,
        status: 'evaluated',
        evaluatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('AI评估失败:', err);
      setError('AI评估失败: ' + err.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleApplyAISuggestion = useCallback(() => {
    if (!aiResult?.estimates) return;

    setEstimates(aiResult.estimates);
    onUpdate({
      estimates: aiResult.estimates,
      aiEstimation: aiResult,
      estimationMode: 'hybrid',
      reuseAssessment,
      status: 'evaluated',
      evaluatedAt: new Date().toISOString()
    });
  }, [aiResult, onUpdate, reuseAssessment]);

  const totalDays = Object.values(estimates).reduce((sum, days) => sum + days, 0);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header Section - 优化版需求卡片 */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          <div className="p-7">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-100/80 rounded-lg">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">NO.</span>
                  <span className="text-sm font-black text-slate-700">{index + 1} / {total}</span>
                </div>
                {functionItem.module && (
                  <span className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100/50 rounded-lg">
                    {functionItem.module}
                  </span>
                )}
              </div>
            </div>
            
            <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight mb-4">
              {functionItem.name}
            </h3>
            
            {functionItem.description && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-5">
                <div className="prose prose-sm prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {functionItem.description}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reuse Assessment */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 overflow-hidden">
          <ReuseAssessmentPanel
            value={reuseAssessment}
            onChange={handleReuseAssessmentChange}
          />
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 shadow-sm">
            <AlertCircle className="h-5 w-5 text-red-500" />
            {error}
          </div>
        )}

        {/* Manual Estimation Section (Most Prominent) */}
        <div className="relative rounded-2xl border border-blue-100 bg-white p-6 shadow-md ring-1 ring-blue-50 mt-8">
          <div className="absolute -top-3.5 left-6 bg-white px-3 rounded-full border border-blue-100 shadow-sm">
            <span className="text-sm font-bold text-blue-600">人工评估 (核心)</span>
          </div>
          <div className="mb-5 flex items-center justify-between mt-2">
            <p className="text-sm text-slate-500">请为各个角色分配合理的人天预估</p>
            <div className="flex items-baseline gap-1.5 rounded-xl bg-blue-50 px-4 py-2">
              <span className="text-sm font-medium text-blue-900">总计</span>
              <span className="text-2xl font-black text-blue-600">{totalDays.toFixed(1)}</span>
              <span className="text-sm font-medium text-blue-900">天</span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            {Object.entries(ROLE_CONFIG).map(([role, config]) => (
              <div key={role} className="group relative">
                <div className="mb-2 text-center">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-blue-600 transition-colors">
                    {config.label}
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={estimates[role] || ''}
                    onChange={(event) => handleEstimateChange(role, event.target.value)}
                    className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 py-3 text-center text-lg font-semibold text-slate-900 transition-all hover:bg-white focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                    placeholder="0.0"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
                    天
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Suggestion Section */}
        <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 p-6 shadow-sm ring-1 ring-indigo-50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="flex items-center gap-2 text-base font-bold text-indigo-900">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                AI 智能辅助估算
              </h4>
              <p className="mt-1.5 text-sm text-indigo-600/80">
                不确定评估标准？让 AI 基于历史数据和功能复杂度为您提供参考建议。
              </p>
            </div>

            <button
              onClick={handleAIEvaluation}
              disabled={isEvaluating}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow disabled:opacity-50"
            >
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
                <div className="relative h-full w-8 bg-white/20" />
              </div>
              {isEvaluating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在深度分析...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {aiResult ? '重新生成建议' : '获取 AI 建议'}
                </>
              )}
            </button>
          </div>

          {aiResult && (
            <div className="mt-6 border-t border-indigo-100/50 pt-6">
              <AIEstimationPanel
                aiResult={aiResult}
                onApply={handleApplyAISuggestion}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FunctionEvaluator;
