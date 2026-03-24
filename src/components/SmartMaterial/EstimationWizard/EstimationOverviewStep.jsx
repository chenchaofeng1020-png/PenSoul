import { ArrowRight, GitMerge, Layers3, Loader2, RefreshCw, ShieldAlert, Sparkles, Target } from 'lucide-react';

export function EstimationOverviewStep({
  parsedFunctions = [],
  suggestedUnitCount = null,
  overallSummary,
  isAnalyzing = false,
  summarySource = 'idle',
  statusMessage = '',
  title = '先建立整体认知，再进入评估',
  description = 'AI 先把需求整体看一遍，帮助你理解这次要交付什么、为什么建议按交付项而不是按零散功能点评估。',
  actionLabel = '继续确认评估口径',
  onPrimaryAction,
  secondaryAction,
  onRefresh
}) {
  const moduleCount = new Set(parsedFunctions.map(item => item.module || '未分类')).size;
  const hasOverviewResult = Boolean(overallSummary) && (summarySource === 'ai' || summarySource === 'fallback');
  const isIdle = summarySource === 'idle' && !isAnalyzing;
  const isError = summarySource === 'error';

  const statusTitle = isAnalyzing
    ? 'AI 正在分析整体需求…'
    : isIdle
    ? '尚未开始 AI 分析'
    : isError
    ? 'AI 分析失败'
    : summarySource === 'ai'
    ? '当前展示 AI 分析结果'
    : '当前展示规则兜底摘要';

  const statusDescription = statusMessage || (
    isAnalyzing
      ? '分析完成后会自动刷新整体理解和建议交付项数量。'
      : isIdle
      ? '点击按钮后再开始分析，避免进入页面就长时间等待。'
      : isError
      ? '本次没有拿到有效分析结果，请重试。'
      : '如果你怀疑分组不准，可以手动重新触发 AI 分析。'
  );

  return (
    <div className="h-full overflow-y-auto px-8 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                <Sparkles className="h-3.5 w-3.5" />
                AI整体理解
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
            </div>

            <div className="grid min-w-[320px] grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">原始功能</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{parsedFunctions.length}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">建议交付项</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{suggestedUnitCount ?? '--'}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">涉及模块</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{moduleCount}</div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-3">
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              ) : (
                <Sparkles className={`h-4 w-4 ${summarySource === 'ai' ? 'text-emerald-600' : isError ? 'text-red-500' : 'text-slate-400'}`} />
              )}
              <div>
                <div className="text-sm font-medium text-slate-800">{statusTitle}</div>
                <div className="text-xs text-slate-500">{statusDescription}</div>
              </div>
            </div>

            {onRefresh && !isIdle ? (
              <button
                onClick={onRefresh}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                重新分析
              </button>
            ) : null}
          </div>
        </div>

        {hasOverviewResult ? (
          <div className="grid grid-cols-[1.1fr_0.9fr] gap-6">
            <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-7 shadow-sm">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-blue-700">
                <Sparkles className="h-3.5 w-3.5" />
                需求总览
              </div>
              <p className="text-base leading-8 text-slate-700">{overallSummary.overview}</p>

              <div className="mt-6">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Layers3 className="h-4 w-4 text-slate-500" />
                  AI识别的核心业务域
                </div>
                <div className="flex flex-wrap gap-2">
                  {(overallSummary.businessDomains || []).map(item => (
                    <span
                      key={item}
                      className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <GitMerge className="h-4 w-4 text-blue-600" />
                  AI建议的合并逻辑
                </div>
                <div className="space-y-2">
                  {(overallSummary.mergeLogic || []).map(item => (
                    <p key={item} className="text-sm leading-6 text-slate-600">{item}</p>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <ShieldAlert className="h-4 w-4" />
                  风险焦点
                </div>
                <div className="space-y-2">
                  {(overallSummary.riskFocus || []).map(item => (
                    <p key={item} className="text-sm leading-6 text-amber-800">{item}</p>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <Target className="h-4 w-4" />
                  建议重点确认
                </div>
                <div className="space-y-2">
                  {(overallSummary.reviewFocus || []).map(item => (
                    <p key={item} className="text-sm leading-6 text-emerald-800">{item}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 shadow-sm">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                {isAnalyzing ? (
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                ) : (
                  <Sparkles className={`h-6 w-6 ${isError ? 'text-red-500' : 'text-slate-400'}`} />
                )}
              </div>
              <h4 className="text-xl font-semibold text-slate-900">
                {isAnalyzing ? 'AI 正在分析整体需求' : isError ? 'AI 暂时没有返回结果' : '点击按钮后开始 AI 分析'}
              </h4>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                {isAnalyzing
                  ? '系统会基于整份需求资料识别核心业务域、建议合并逻辑、风险焦点和建议重点确认点。'
                  : isError
                  ? '这一步不再自动展示默认摘要。你可以再次点击开始分析，拿到真实的 AI 结果后再继续。'
                  : '这一步不会自动发请求，也不会预填兜底内容。手动开始后，页面才会展示 AI 的真实分析结果。'}
              </p>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div className="text-sm text-slate-500">
            先看懂整体，再统一边界和交付项，会比直接逐条估算更稳。
          </div>
          <div className="flex items-center gap-3">
            {secondaryAction}
            <button
              onClick={onPrimaryAction}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              {actionLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EstimationOverviewStep;
