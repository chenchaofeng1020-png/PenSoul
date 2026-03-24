import { ArrowLeft, CheckCircle } from 'lucide-react';
import {
  ROLE_CONFIG,
  calculateRoleTotals,
  calculateModuleTotals,
  calculateReuseBreakdown,
  getReuseSummary,
  getScopeSummary
} from '../../../utils/estimationTypes';

export function EstimationSummary({ functions, onBack, onGenerate, scopeConfig }) {
  const confirmedFunctions = functions.filter(f => f.status === 'confirmed');
  const results = confirmedFunctions.map(f => ({
    functionName: f.name,
    module: f.module,
    complexity: f.aiEstimation?.complexity || 'medium',
    estimates: f.estimates,
    reuseAssessment: f.reuseAssessment
  }));

  const roleTotals = calculateRoleTotals(results);
  const moduleTotals = calculateModuleTotals(results);
  const reuseBreakdown = calculateReuseBreakdown(results);
  const totalDays = Object.values(roleTotals).reduce((sum, days) => sum + days, 0);
  const scopeSummary = getScopeSummary(scopeConfig);

  return (
    <div className="h-full flex flex-col p-8 overflow-y-auto bg-slate-50/50">
      <div className="max-w-6xl mx-auto w-full">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2.5 bg-white shadow-sm ring-1 ring-slate-200/50 hover:bg-slate-50 hover:shadow rounded-xl transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">评估结果汇总</h3>
          </div>
          <button
            onClick={onGenerate}
            className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg"
          >
            <CheckCircle className="w-4 h-4 transition-transform group-hover:scale-110" />
            生成正式报告
          </button>
        </div>

        <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-5 mb-8">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
              评估口径摘要
            </h4>
            <span className="px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
              {scopeSummary.projectTypeLabel} / {scopeSummary.caliberLabel}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-500 ml-3.5">
            当前按 <strong className="text-slate-700">{scopeSummary.teamLevelLabel}</strong> 团队效率估算，默认纳入：
            {scopeSummary.includedItems.join('、')}
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-5 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-5 border border-blue-100/50 shadow-sm">
            <p className="text-sm font-semibold text-blue-600 mb-2">功能总数</p>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-black text-blue-900">{confirmedFunctions.length}</p>
              <p className="text-sm font-medium text-blue-600/80">项</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-5 border border-emerald-100/50 shadow-sm">
            <p className="text-sm font-semibold text-emerald-600 mb-2">总人天</p>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-black text-emerald-900">{totalDays.toFixed(1)}</p>
              <p className="text-sm font-medium text-emerald-600/80">天</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-5 border border-purple-100/50 shadow-sm">
            <p className="text-sm font-semibold text-purple-600 mb-2">平均每个功能</p>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-black text-purple-900">
                {confirmedFunctions.length > 0 ? (totalDays / confirmedFunctions.length).toFixed(1) : '0.0'}
              </p>
              <p className="text-sm font-medium text-purple-600/80">天</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl p-5 border border-orange-100/50 shadow-sm">
            <p className="text-sm font-semibold text-orange-600 mb-2">模块数</p>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-black text-orange-900">{Object.keys(moduleTotals).length}</p>
              <p className="text-sm font-medium text-orange-600/80">个</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-6">
            <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
              定制开发 vs 复用已有能力
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-5 py-4">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">需要定制</div>
                <div className="flex items-baseline gap-1">
                  <div className="text-2xl font-black text-slate-800">{reuseBreakdown.newBuildDays.toFixed(1)}</div>
                  <div className="text-xs font-medium text-slate-500">天</div>
                </div>
                <div className="text-xs font-medium text-slate-500 mt-1">{reuseBreakdown.newBuildCount} 项</div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-5 py-4">
                <div className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-2">已有能力可覆盖</div>
                <div className="flex items-baseline gap-1">
                  <div className="text-2xl font-black text-slate-800">{reuseBreakdown.reuseDays.toFixed(1)}</div>
                  <div className="text-xs font-medium text-slate-500">天</div>
                </div>
                <div className="text-xs font-medium text-slate-500 mt-1">{reuseBreakdown.reuseCount} 项</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-6">
            <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
              满足情况分布
            </h4>
            <div className="space-y-3">
              {Object.entries(reuseBreakdown.byReuseLevel).length > 0 ? Object.entries(reuseBreakdown.byReuseLevel).map(([level, days]) => {
                const label = getReuseSummary({ reuseLevel: level }).reuseLevelLabel;
                return (
                  <div key={level} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-4 py-2.5">
                    <span className="font-medium text-slate-700">{label}</span>
                    <span className="font-bold text-indigo-600">{days.toFixed(1)} 天</span>
                  </div>
                );
              }) : (
                <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400 py-8">当前没有满足情况数据</div>
              )}
            </div>
          </div>
        </div>

        {/* 角色分布 */}
        <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-6 mb-8">
          <h4 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-amber-500 rounded-full"></span>
            角色人天分布
          </h4>
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(ROLE_CONFIG).map(([role, config]) => (
              <div key={role} className="text-center p-4 rounded-xl border border-slate-100 transition-all hover:shadow-md" style={{ backgroundColor: config.color + '08' }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: config.color }}>{config.label}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <p className="text-2xl font-black text-slate-800">{roleTotals[role].toFixed(1)}</p>
                  <p className="text-xs font-medium text-slate-400">天</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 功能清单表格 */}
        <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl overflow-hidden flex-1 mb-8">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80">
            <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
              详细评估清单
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">功能名称</th>
                  <th className="px-6 py-4 text-left font-bold tracking-wider">模块</th>
                  <th className="px-6 py-4 text-center font-bold tracking-wider">产品</th>
                  <th className="px-6 py-4 text-center font-bold tracking-wider">UI</th>
                  <th className="px-6 py-4 text-center font-bold tracking-wider">前端</th>
                  <th className="px-6 py-4 text-center font-bold tracking-wider">后端</th>
                  <th className="px-6 py-4 text-center font-bold tracking-wider">测试</th>
                  <th className="px-6 py-4 text-center font-bold tracking-wider text-blue-600">小计</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {confirmedFunctions.map((func) => {
                  const subtotal = Object.values(func.estimates || {}).reduce((a, b) => a + b, 0);
                  return (
                    <tr key={func.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-800">
                        <div className="font-bold">{func.name}</div>
                        {func.reuseAssessment && (
                          <div className="inline-flex mt-1.5 items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                            {getReuseSummary(func.reuseAssessment).fulfillmentLabel}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">{func.module}</td>
                      <td className="px-6 py-4 text-center text-slate-600 font-medium">{(func.estimates?.product || 0).toFixed(1)}</td>
                      <td className="px-6 py-4 text-center text-slate-600 font-medium">{(func.estimates?.ui || 0).toFixed(1)}</td>
                      <td className="px-6 py-4 text-center text-slate-600 font-medium">{(func.estimates?.frontend || 0).toFixed(1)}</td>
                      <td className="px-6 py-4 text-center text-slate-600 font-medium">{(func.estimates?.backend || 0).toFixed(1)}</td>
                      <td className="px-6 py-4 text-center text-slate-600 font-medium">{(func.estimates?.test || 0).toFixed(1)}</td>
                      <td className="px-6 py-4 text-center font-black text-blue-600">{subtotal.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                <tr>
                  <td className="px-6 py-5 text-slate-800 uppercase tracking-wider" colSpan="2">合计</td>
                  <td className="px-6 py-5 text-center text-slate-800">{roleTotals.product.toFixed(1)}</td>
                  <td className="px-6 py-5 text-center text-slate-800">{roleTotals.ui.toFixed(1)}</td>
                  <td className="px-6 py-5 text-center text-slate-800">{roleTotals.frontend.toFixed(1)}</td>
                  <td className="px-6 py-5 text-center text-slate-800">{roleTotals.backend.toFixed(1)}</td>
                  <td className="px-6 py-5 text-center text-slate-800">{roleTotals.test.toFixed(1)}</td>
                  <td className="px-6 py-5 text-center text-blue-700 text-lg">{totalDays.toFixed(1)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
