import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  GitMerge,
  Layers3,
  Plus,
  RefreshCw,
  Scissors,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2
} from 'lucide-react';
import {
  buildLocalOverallSummary,
  UNIT_TYPE_OPTIONS,
  createEstimationUnit
} from '../../../utils/estimationTypes';

function inferChannels(members = []) {
  const text = members.map(item => `${item.name} ${item.description || ''}`).join(' ');
  const channels = [];

  if (/(后台|管理端|pc端|web端|门户)/i.test(text)) channels.push('后台');
  if (/(企微|企业微信|员工端)/i.test(text)) channels.push('企微端');
  if (/(微信|公众号|h5|小程序|客户端|移动端)/i.test(text)) channels.push('微信/移动端');
  if (/(接口|同步|集成|三方|银行)/i.test(text)) channels.push('集成/接口');

  return channels.length > 0 ? channels : ['同一业务域'];
}

function UnitTag({ children, tone = 'slate' }) {
  const toneClass = {
    slate: 'bg-slate-100 text-slate-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
    blue: 'bg-blue-50 text-blue-700'
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${toneClass}`}>
      {children}
    </span>
  );
}

export function EstimationUnitConfirmStep({
  parsedFunctions,
  units,
  assignments,
  suggestionMeta,
  isRegenerating,
  onAssignmentsChange,
  onUnitsChange,
  onSuggestionsMetaChange,
  onBack,
  onConfirm,
  onRegenerate
}) {
  const [selectedUnitId, setSelectedUnitId] = useState(units[0]?.id || '');
  const [mergeTargetId, setMergeTargetId] = useState('');

  useEffect(() => {
    if (!units.length) {
      setSelectedUnitId('');
      return;
    }

    if (!selectedUnitId || !units.some(unit => unit.id === selectedUnitId)) {
      setSelectedUnitId(units[0].id);
    }
  }, [selectedUnitId, units]);

  const getUnitMembers = (unitId) => parsedFunctions.filter(item => assignments[item.id] === unitId);
  const findFunctionById = (functionId) => parsedFunctions.find(item => item.id === functionId);

  const updateUnit = (unitId, patch) => {
    onUnitsChange(units.map(unit => (
      unit.id === unitId ? { ...unit, ...patch } : unit
    )));
  };

  const handleAssignmentChange = (functionId, value) => {
    onAssignmentsChange({
      ...assignments,
      [functionId]: value === 'excluded' ? null : value
    });
  };

  const handleAddUnit = () => {
    const nextUnit = createEstimationUnit({
      name: `自定义交付项 ${units.length + 1}`,
      module: '未分类',
      suggestedReason: '人工新增的交付项'
    });
    onUnitsChange([...units, nextUnit]);
    setSelectedUnitId(nextUnit.id);
  };

  const handleDeleteUnit = (unitId) => {
    const nextAssignments = { ...assignments };
    Object.keys(nextAssignments).forEach(functionId => {
      if (nextAssignments[functionId] === unitId) {
        nextAssignments[functionId] = null;
      }
    });
    onAssignmentsChange(nextAssignments);
    onUnitsChange(units.filter(unit => unit.id !== unitId));
  };

  const handleAddMissingCandidate = (candidate) => {
    const nextUnit = createEstimationUnit({
      name: candidate.name,
      module: candidate.module,
      suggestedReason: candidate.reason,
      riskHints: ['AI判断该交付项可能被遗漏，建议在后续评估时重点确认边界']
    });

    onUnitsChange([...units, nextUnit]);
    setSelectedUnitId(nextUnit.id);
    onSuggestionsMetaChange({
      ...suggestionMeta,
      missingCandidates: (suggestionMeta?.missingCandidates || []).filter(item => item.id !== candidate.id)
    });
  };

  const handleSplitOutMember = (member) => {
    const nextUnit = createEstimationUnit({
      name: member.name,
      module: member.module || '未分类',
      suggestedReason: `从“${selectedUnit?.name || '当前交付项'}”中拆出，单独评估其交付边界`,
      sourceFunctionIds: [member.id]
    });

    onUnitsChange([...units, nextUnit]);
    onAssignmentsChange({
      ...assignments,
      [member.id]: nextUnit.id
    });
    setSelectedUnitId(nextUnit.id);
  };

  const handleMergeUnit = () => {
    if (!selectedUnitId || !mergeTargetId || selectedUnitId === mergeTargetId) return;

    const nextAssignments = { ...assignments };
    Object.keys(nextAssignments).forEach(functionId => {
      if (nextAssignments[functionId] === selectedUnitId) {
        nextAssignments[functionId] = mergeTargetId;
      }
    });

    onAssignmentsChange(nextAssignments);
    onUnitsChange(units.filter(unit => unit.id !== selectedUnitId));
    setSelectedUnitId(mergeTargetId);
    setMergeTargetId('');
  };

  const mergeSuggestions = suggestionMeta?.mergeSuggestions || [];
  const splitSuggestions = suggestionMeta?.splitSuggestions || [];
  const missingCandidates = suggestionMeta?.missingCandidates || [];
  const suggestionStrategy = suggestionMeta?.strategy || 'fallback';
  const warningMessage = suggestionMeta?.warningMessage || '';
  const overallSummary = suggestionMeta?.overallSummary || buildLocalOverallSummary(parsedFunctions, units);
  const includedCount = parsedFunctions.filter(item => assignments[item.id]).length;
  const unassignedFunctions = parsedFunctions.filter(item => !assignments[item.id]);
  const selectedUnit = units.find(unit => unit.id === selectedUnitId) || null;
  const selectedMembers = selectedUnit ? getUnitMembers(selectedUnit.id) : [];
  const stats = {
    rawCount: parsedFunctions.length,
    includedCount,
    unitCount: units.filter(unit => getUnitMembers(unit.id).length > 0).length,
    insightCount: mergeSuggestions.length + splitSuggestions.length + missingCandidates.length
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-8 py-5">
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs text-slate-500 mb-1">原始需求</div>
            <div className="text-2xl font-semibold text-slate-900">{stats.rawCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs text-slate-500 mb-1">已纳入交付项</div>
            <div className="text-2xl font-semibold text-slate-900">{stats.includedCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs text-slate-500 mb-1">交付项数量</div>
            <div className="text-2xl font-semibold text-slate-900">{stats.unitCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs text-slate-500 mb-1">待关注异常</div>
            <div className="text-2xl font-semibold text-slate-900">{stats.insightCount + unassignedFunctions.length}</div>
          </div>
        </div>
      </div>

      {overallSummary && (
        <div className="border-b border-slate-200 bg-white px-8 py-5">
          <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6 shadow-sm">
            <div className="grid grid-cols-[1.15fr_0.85fr] gap-6">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-blue-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI整体分析摘要
                </div>
                <p className="text-sm leading-7 text-slate-700">{overallSummary.overview}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(overallSummary.businessDomains || []).map(item => (
                    <UnitTag key={item}>{item}</UnitTag>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-600">
                    <GitMerge className="h-3.5 w-3.5 text-blue-600" />
                    合并逻辑
                  </div>
                  <div className="space-y-1.5">
                    {(overallSummary.mergeLogic || []).slice(0, 2).map(item => (
                      <p key={item} className="text-xs leading-5 text-slate-500">{item}</p>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-amber-700">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    风险焦点
                  </div>
                  <div className="space-y-1.5">
                    {(overallSummary.riskFocus || []).slice(0, 2).map(item => (
                      <p key={item} className="text-xs leading-5 text-amber-700">{item}</p>
                    ))}
                  </div>
                </div>
                <div className="col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-emerald-700">
                    <Target className="h-3.5 w-3.5" />
                    建议重点确认
                  </div>
                  <div className="space-y-1.5">
                    {(overallSummary.reviewFocus || []).slice(0, 2).map(item => (
                      <p key={item} className="text-xs leading-5 text-emerald-700">{item}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden px-8 py-6">
        <div className="grid h-full min-h-0 grid-cols-[300px_minmax(0,1fr)_360px] gap-6">
          <div className="min-h-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="text-lg font-semibold text-slate-900">异常与辅助区</div>
              <div className="mt-1 text-sm leading-6 text-slate-500">
                这里只放真正需要人工关注的原始需求、拆分建议和遗漏项。
              </div>
            </div>
            <div className="h-[calc(100%-88px)] overflow-y-auto p-4 space-y-4">
              {warningMessage && (
                <div className={`rounded-2xl border px-4 py-3 ${
                  suggestionStrategy === 'ai'
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-amber-200 bg-amber-50'
                }`}>
                  <div className={`text-sm font-medium ${suggestionStrategy === 'ai' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {suggestionStrategy === 'ai' ? 'AI整理完成' : '当前使用规则草案'}
                  </div>
                  <p className={`mt-1 text-xs leading-5 ${suggestionStrategy === 'ai' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {warningMessage}
                  </p>
                </div>
              )}

              {unassignedFunctions.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-800">未归入任何交付项</div>
                    <span className="text-xs text-slate-400">{unassignedFunctions.length} 条</span>
                  </div>
                  <div className="space-y-3">
                    {unassignedFunctions.map(item => (
                      <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="text-sm font-medium text-slate-800">{item.name}</div>
                        {item.description ? (
                          <p className="mt-1 text-xs leading-5 text-slate-500 line-clamp-2">{item.description}</p>
                        ) : null}
                        <div className="mt-3">
                          <select
                            value={assignments[item.id] || 'excluded'}
                            onChange={(e) => handleAssignmentChange(item.id, e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          >
                            <option value="excluded">不纳入本次评估</option>
                            {units.map(unit => (
                              <option key={unit.id} value={unit.id}>{unit.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mergeSuggestions.length > 0 && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-900">
                    <GitMerge className="h-4 w-4" />
                    AI 建议合并
                  </div>
                  <div className="space-y-3">
                    {mergeSuggestions.map((item, index) => (
                      <div key={`${item.title}-${index}`} className="rounded-2xl border border-blue-100 bg-white p-3">
                        <div className="text-sm font-medium text-slate-800">{item.title}</div>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {splitSuggestions.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Scissors className="h-4 w-4 text-slate-500" />
                    AI 建议拆分
                  </div>
                  <div className="space-y-3">
                    {splitSuggestions.map((item, index) => {
                      const functionItem = findFunctionById(item.sourceFunctionId);
                      return (
                        <div key={`${item.sourceFunctionId}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <div className="text-sm font-medium text-slate-800">{functionItem?.name || '待确认功能项'}</div>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{item.reason}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(item.suggestedUnits || []).map(unitName => (
                              <UnitTag key={unitName} tone="blue">{unitName}</UnitTag>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {missingCandidates.length > 0 && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <AlertTriangle className="h-4 w-4" />
                    可能遗漏的交付项
                  </div>
                  <div className="space-y-3">
                    {missingCandidates.map(candidate => (
                      <div key={candidate.id} className="rounded-2xl border border-emerald-200 bg-white p-3">
                        <div className="text-sm font-medium text-slate-800">{candidate.name}</div>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {candidate.module ? `${candidate.module} · ` : ''}{candidate.reason}
                        </p>
                        <button
                          onClick={() => handleAddMissingCandidate(candidate)}
                          className="mt-3 inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          加入交付项
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">AI识别的交付项</div>
                <div className="mt-1 text-sm leading-6 text-slate-500">
                  先看 AI 怎么把需求合并成交付项，你主要处理少量需要纠偏的地方。
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onRegenerate}
                  disabled={isRegenerating}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                  {isRegenerating ? 'AI整理中…' : 'AI重新整理'}
                </button>
                <button
                  onClick={handleAddUnit}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  新增交付项
                </button>
              </div>
            </div>

            <div className="h-[calc(100%-88px)] overflow-y-auto p-4 space-y-4">
              {units.map(unit => {
                const members = getUnitMembers(unit.id);
                const isActive = unit.id === selectedUnitId;
                const channels = inferChannels(members);

                return (
                  <button
                    type="button"
                    key={unit.id}
                    onClick={() => setSelectedUnitId(unit.id)}
                    className={`w-full rounded-3xl border p-5 text-left transition-all ${
                      isActive
                        ? 'border-blue-500 bg-blue-50 shadow-sm ring-4 ring-blue-500/10'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-semibold text-slate-900">{unit.name}</div>
                          <UnitTag>{unit.module}</UnitTag>
                          <UnitTag tone="blue">
                            {UNIT_TYPE_OPTIONS.find(option => option.key === unit.type)?.label || '模块型'}
                          </UnitTag>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {unit.suggestedReason || 'AI 认为这些需求共享同一交付边界，适合一起评估。'}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                        <div className="text-xs text-slate-500">包含需求</div>
                        <div className="mt-1 text-xl font-semibold text-slate-900">{members.length}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {channels.map(channel => (
                        <UnitTag key={channel}>{channel}</UnitTag>
                      ))}
                      {unit.reuseHint ? <UnitTag tone="violet">疑似复用 / 二开</UnitTag> : null}
                      {(unit.riskHints || []).slice(0, 2).map(hint => (
                        <UnitTag key={hint} tone="amber">{hint}</UnitTag>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="text-lg font-semibold text-slate-900">交付项详情</div>
              <div className="mt-1 text-sm leading-6 text-slate-500">
                这里处理当前交付项的边界微调、拆分、合并和需求点移动。
              </div>
            </div>

            <div className="h-[calc(100%-88px)] overflow-y-auto p-5">
              {selectedUnit ? (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <input
                      value={selectedUnit.name}
                      onChange={(e) => updateUnit(selectedUnit.id, { name: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <div className="grid grid-cols-[1fr_150px] gap-3">
                      <input
                        value={selectedUnit.module}
                        onChange={(e) => updateUnit(selectedUnit.id, { module: e.target.value })}
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="所属模块"
                      />
                      <select
                        value={selectedUnit.type}
                        onChange={(e) => updateUnit(selectedUnit.id, { type: e.target.value })}
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        {UNIT_TYPE_OPTIONS.map(option => (
                          <option key={option.key} value={option.key}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-800 mb-3">当前交付边界</div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs font-medium text-slate-500 mb-1.5">AI 合并理由</div>
                        <p className="text-sm leading-6 text-slate-600">
                          {selectedUnit.suggestedReason || '建议按该交付边界评估，避免按零散功能点拆分导致低估。'}
                        </p>
                      </div>
                      {selectedUnit.reuseHint ? (
                        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
                          <div className="text-xs font-medium text-violet-700 mb-1.5">复用 / 二开提示</div>
                          <p className="text-xs leading-5 text-violet-700">{selectedUnit.reuseHint}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {selectedUnit.riskHints?.length > 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <div className="text-sm font-semibold text-amber-800 mb-3">风险提醒</div>
                      <div className="space-y-2">
                        {selectedUnit.riskHints.map(hint => (
                          <p key={hint} className="text-xs leading-5 text-amber-800">{hint}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-800 mb-3">已包含的原始需求 ({selectedMembers.length})</div>
                    <div className="space-y-3">
                      {selectedMembers.length > 0 ? selectedMembers.map(member => (
                        <div key={member.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <div className="text-sm font-medium text-slate-800">{member.name}</div>
                          {member.description ? (
                            <p className="mt-1 text-xs leading-5 text-slate-500 line-clamp-2">{member.description}</p>
                          ) : null}
                          <div className="mt-3 flex items-center gap-2">
                            <select
                              value={assignments[member.id] || 'excluded'}
                              onChange={(e) => handleAssignmentChange(member.id, e.target.value)}
                              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            >
                              <option value="excluded">不纳入本次评估</option>
                              {units.map(unit => (
                                <option key={unit.id} value={unit.id}>{unit.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleSplitOutMember(member)}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-white"
                            >
                              <Scissors className="h-3.5 w-3.5" />
                              拆出
                            </button>
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                          当前还没有原始需求分配到这个交付项
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-800 mb-3">高频操作</div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <select
                          value={mergeTargetId}
                          onChange={(e) => setMergeTargetId(e.target.value)}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                          <option value="">选择要合并到的交付项</option>
                          {units.filter(unit => unit.id !== selectedUnit.id).map(unit => (
                            <option key={unit.id} value={unit.id}>{unit.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleMergeUnit}
                          disabled={!mergeTargetId}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <GitMerge className="h-4 w-4" />
                          合并
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteUnit(selectedUnit.id)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        删除当前交付项
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  请选择一个交付项查看详情
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            返回口径确认
          </button>

          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-500">
              已纳入 {includedCount} / {parsedFunctions.length} 条原始需求
            </div>
            <button
              onClick={onConfirm}
              disabled={includedCount === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm"
            >
              确认交付项并进入评估
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EstimationUnitConfirmStep;
