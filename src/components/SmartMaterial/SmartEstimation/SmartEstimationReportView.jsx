import React from 'react';
import { AlertTriangle, BadgeCheck, BrainCircuit, CalendarClock, Layers3, ListChecks, Puzzle, UserRound } from 'lucide-react';

const ROLE_LABELS = {
  product: '产品',
  ui: 'UI',
  frontend: '前端',
  backend: '后端',
  qa: '测试'
};

const COMPLEXITY_LABELS = {
  simple: '简单',
  medium: '中等',
  complex: '复杂',
  high: '高复杂'
};

function formatDays(value) {
  const numeric = Number(value || 0);
  return `${numeric.toFixed(1)} 人天`;
}

function formatConfidence(value) {
  const numeric = Number(value || 0);
  return `${Math.round(numeric * 100)}%`;
}

function SectionCard({ title, icon, children, className = '' }) {
  return (
    <section className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {React.createElement(icon, { className: 'h-4 w-4' })}
        </div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

function KeyMetric({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs leading-5 text-slate-500">{hint}</div> : null}
    </div>
  );
}

function BulletList({ items, emptyText = '暂无' }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <div className="text-sm text-slate-400">{emptyText}</div>;
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className="flex gap-2 text-sm leading-6 text-slate-700">
          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-300" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

export function SmartEstimationReportView({ report }) {
  if (!report) {
    return null;
  }

  const roleBreakdown = Array.isArray(report.roleBreakdown) ? report.roleBreakdown : [];
  const functions = Array.isArray(report.functions) ? report.functions : [];
  const overview = report.overview || {};

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_36%),linear-gradient(180deg,#f8fbff_0%,#f8fafc_100%)] p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  AI 智能人天评估
                </span>
                {overview.complexity ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    复杂度 {COMPLEXITY_LABELS[overview.complexity] || overview.complexity}
                  </span>
                ) : null}
                {overview.reuseJudgement ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    {overview.reuseJudgement}
                  </span>
                ) : null}
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                {report.title || 'AI智能人天评估结果'}
              </h1>
              {overview.essence ? (
                <p className="mt-3 text-sm leading-7 text-slate-600">{overview.essence}</p>
              ) : null}
              {overview.scopeSummary ? (
                <p className="mt-3 text-sm leading-7 text-slate-500">{overview.scopeSummary}</p>
              ) : null}
            </div>

            <div className="min-w-[220px] rounded-[28px] border border-blue-100 bg-blue-50/70 px-5 py-5">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">总量判断</div>
              <div className="mt-3 text-4xl font-semibold text-slate-950">
                {formatDays(overview.totalDays)}
              </div>
              {overview.scheduleSuggestion ? (
                <div className="mt-3 flex items-start gap-2 text-sm leading-6 text-slate-600">
                  <CalendarClock className="mt-1 h-4 w-4 flex-shrink-0 text-blue-600" />
                  <span>{overview.scheduleSuggestion}</span>
                </div>
              ) : null}
              {overview.confidence !== undefined ? (
                <div className="mt-3 text-xs text-slate-500">
                  置信度 {formatConfidence(overview.confidence)}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 border-t border-slate-100 px-6 py-5 md:grid-cols-2 xl:grid-cols-4">
            <KeyMetric label="评估范围" value={overview.scopeLabel || `${functions.length} 个功能项`} hint="可继续在聊天区补充范围或约束" />
            <KeyMetric label="角色数量" value={`${roleBreakdown.length || 5} 个角色`} hint="按产品 / UI / 前端 / 后端 / 测试拆解" />
            <KeyMetric label="信息完备度" value={formatConfidence(overview.confidence || 0.65)} hint="信息越完整，建议值越稳定" />
            <KeyMetric label="资料输入" value={`${(overview.sourceDigest || []).length} 条线索`} hint="来自左侧勾选资料和聊天补充" />
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionCard title="角色拆解" icon={UserRound}>
            <div className="grid gap-3 md:grid-cols-2">
              {roleBreakdown.map((role) => (
                <div key={role.role} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {ROLE_LABELS[role.role] || role.role}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{role.rationale}</div>
                    </div>
                    <div className="text-right text-lg font-semibold text-slate-900">
                      {formatDays(role.days)}
                    </div>
                  </div>
                  {Array.isArray(role.workItems) && role.workItems.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {role.workItems.map((item, index) => (
                        <span key={`${item}-${index}`} className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="评估判断" icon={BrainCircuit}>
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI 结论</div>
                <div className="mt-2 text-sm leading-7 text-slate-700">
                  {overview.summary || '当前结果基于已勾选资料和聊天补充生成，仍建议人工确认边界与排除项。'}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">资料吸收</div>
                <BulletList items={overview.sourceDigest} emptyText="本次主要依据聊天输入生成。" />
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard title={`功能明细 (${functions.length})`} icon={Layers3}>
          <div className="space-y-4">
            {functions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-400">
                暂无功能拆解，继续在聊天区补充“需要评估的功能清单 / 页面 / 接口 / 角色”即可。
              </div>
            ) : null}

            {functions.map((item, index) => (
              <div key={`${item.name}-${index}`} className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                        {item.module || '未分类模块'}
                      </span>
                      {item.complexity ? (
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                          {COMPLEXITY_LABELS[item.complexity] || item.complexity}
                        </span>
                      ) : null}
                    </div>
                    <h4 className="mt-3 text-xl font-semibold text-slate-950">{item.name}</h4>
                    {item.description ? (
                      <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
                    ) : null}
                    {item.essence ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                        {item.essence}
                      </div>
                    ) : null}
                  </div>

                  <div className="min-w-[180px] rounded-3xl border border-slate-200 bg-white px-4 py-4 text-right">
                    <div className="text-xs uppercase tracking-wide text-slate-400">单项估算</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">
                      {formatDays(item.totalDays)}
                    </div>
                    {item.confidence !== undefined ? (
                      <div className="mt-1 text-xs text-slate-500">
                        置信度 {formatConfidence(item.confidence)}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-[1.2fr_1fr]">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">角色人天</div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {Object.entries(item.roleDays || {}).map(([role, days]) => (
                        <div key={role} className="rounded-2xl bg-slate-50 px-3 py-3">
                          <div className="text-xs text-slate-500">{ROLE_LABELS[role] || role}</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">{formatDays(days)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <Puzzle className="h-3.5 w-3.5" />
                        页面 / 接口 / 复用
                      </div>
                      <div className="space-y-3 text-sm text-slate-700">
                        <div>
                          <div className="mb-1 text-xs text-slate-400">涉及页面</div>
                          <BulletList items={item.pages} emptyText="未显式提到页面，按模块实现估算。" />
                        </div>
                        <div>
                          <div className="mb-1 text-xs text-slate-400">涉及接口</div>
                          <BulletList items={item.interfaces} emptyText="暂未识别明确接口边界。" />
                        </div>
                        {item.reuseHint ? (
                          <div className="rounded-2xl bg-emerald-50 px-3 py-3 text-emerald-800">
                            {item.reuseHint}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      可能低估点
                    </div>
                    <BulletList items={item.risks} emptyText="暂未发现明显低估风险。" />
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <ListChecks className="h-3.5 w-3.5" />
                      建议补充背景
                    </div>
                    <BulletList items={item.backgroundQuestions} emptyText="当前这条功能的背景信息已相对够用。" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="grid gap-5 xl:grid-cols-3">
          <SectionCard title="全局风险" icon={AlertTriangle}>
            <BulletList items={report.risks} emptyText="暂无额外全局风险。" />
          </SectionCard>
          <SectionCard title="估算假设" icon={BadgeCheck}>
            <BulletList items={report.assumptions} emptyText="暂无额外假设。" />
          </SectionCard>
          <SectionCard title="建议继续确认" icon={ListChecks}>
            <BulletList items={report.missingBackground || report.recommendations} emptyText="当前信息可直接进入人工确认阶段。" />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
