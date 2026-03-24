import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, CheckCircle, Loader2 } from 'lucide-react';
import {
  DEFAULT_SCOPE_CONFIG,
  WizardState,
  ROLE_CONFIG,
  ProjectType,
  DeliveryType,
  ReuseLevel,
  createFunctionItem,
  createScopeConfig,
  suggestEstimationUnits,
  saveEstimationDraft,
  loadEstimationDraft,
  clearEstimationDraft,
  calculateEvaluationProgress
} from '../../../utils/estimationTypes';
import { useUI } from '../../../context/UIContext';
import { dataSourceParser } from '../../../services/estimation/DataSourceParser';
import { FunctionListSidebar } from './FunctionListSidebar';
import { FunctionEvaluator } from './FunctionEvaluator';
import { EstimationSummary } from './EstimationSummary';
import { DraftChoiceStep } from './DraftChoiceStep';

function buildRiskHints(text = '') {
  const risks = [];

  if (/(权限|角色|鉴权|状态|流转|审批)/.test(text)) {
    risks.push('涉及权限或状态流转，评估时注意联调和回归成本');
  }
  if (/(同步|对接|集成|接口|企微|银行|支付|短信|邮件|回调)/.test(text)) {
    risks.push('涉及外部接口或协作方，建议预留联调与问题排查时间');
  }
  if (/(配置|规则|模板|参数|条件|策略)/.test(text)) {
    risks.push('规则和配置类需求容易低估，建议确认是否包含逻辑改造和测试回归');
  }

  return risks.slice(0, 3);
}

function buildFunctionItemsForManual(parsedFunctions = [], scopeConfig = DEFAULT_SCOPE_CONFIG) {
  return parsedFunctions.map(item => {
    const text = `${item.name || ''} ${item.description || ''}`;
    const looksReuse = /(复用|沿用|已有|二开|改造|兼容)/.test(text) || scopeConfig.projectType === ProjectType.SECONDARY_DEV;

    return createFunctionItem({
      ...item,
      sourceFunctions: [{
        id: item.id,
        name: item.name,
        description: item.description,
        module: item.module
      }],
      suggestedReason: '默认按单条需求逐条评估；如果它与其他需求明显属于同一交付包，可在“更多操作”里尝试 AI 合并相近需求。',
      reuseHint: looksReuse ? '疑似存在已有能力复用或二次开发，建议确认复用比例和回归范围。' : '',
      riskHints: buildRiskHints(text),
      reuseAssessment: looksReuse
        ? {
          hasExistingCapability: true,
          deliveryType: DeliveryType.SECONDARY_DEVELOPMENT,
          reuseLevel: ReuseLevel.R2
        }
        : undefined
    });
  });
}

export function EstimationWizard({ isOpen, onClose, sources, productId, onEstimationComplete, initialParsedFunctions = [] }) {
  const { showToast } = useUI();

  const [wizardState, setWizardState] = useState(WizardState.IMPORT);
  const [parsedFunctions, setParsedFunctions] = useState([]);
  const [estimationUnits, setEstimationUnits] = useState([]);
  const [unitAssignments, setUnitAssignments] = useState({});
  const [unitSuggestionsMeta, setUnitSuggestionsMeta] = useState({
    mergeSuggestions: [],
    splitSuggestions: [],
    missingCandidates: [],
    overallSummary: null,
    strategy: 'idle',
    warningMessage: ''
  });
  const [functions, setFunctions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scopeConfig, setScopeConfig] = useState(createScopeConfig(DEFAULT_SCOPE_CONFIG));
  const [savedDraft, setSavedDraft] = useState(null);
  const [listMode, setListMode] = useState('single');

  const initializeFromFunctions = useCallback((nextParsedFunctions, nextScopeConfig = DEFAULT_SCOPE_CONFIG) => {
    const initialSuggestion = suggestEstimationUnits(nextParsedFunctions);
    const nextScope = createScopeConfig(nextScopeConfig);

    setParsedFunctions(nextParsedFunctions);
    setEstimationUnits(initialSuggestion.units);
    setUnitAssignments(initialSuggestion.assignments);
    setUnitSuggestionsMeta({
      mergeSuggestions: [],
      splitSuggestions: [],
      missingCandidates: [],
      overallSummary: null,
      strategy: 'idle',
      warningMessage: ''
    });
    setFunctions(buildFunctionItemsForManual(nextParsedFunctions, nextScope));
    setCurrentIndex(0);
    setScopeConfig(nextScope);
    setListMode('single');
    setWizardState(WizardState.EVALUATION);
  }, []);

  const parseSources = useCallback(async () => {
    setWizardState(WizardState.PARSE);

    try {
      const nextParsedFunctions = await dataSourceParser.parseSources(sources);
      initializeFromFunctions(nextParsedFunctions, DEFAULT_SCOPE_CONFIG);
      showToast(`成功解析 ${nextParsedFunctions.length} 条需求`, 'success');
    } catch (err) {
      console.error('[EstimationWizard] Parse error:', err);
      showToast('解析数据源失败: ' + err.message, 'error');
      setWizardState(WizardState.IMPORT);
    }
  }, [initializeFromFunctions, sources, showToast]);

  useEffect(() => {
    if (isOpen && sources.length > 0) {
      const nextSavedDraft = loadEstimationDraft();
      const hasDraftContent = nextSavedDraft && (
        (nextSavedDraft.functions && nextSavedDraft.functions.length > 0) ||
        (nextSavedDraft.parsedFunctions && nextSavedDraft.parsedFunctions.length > 0)
      );

      if (hasDraftContent) {
        setSavedDraft(nextSavedDraft);
        setWizardState(WizardState.DRAFT_CHOICE);
      } else if (initialParsedFunctions.length > 0) {
        setSavedDraft(null);
        initializeFromFunctions(initialParsedFunctions, DEFAULT_SCOPE_CONFIG);
      } else {
        setSavedDraft(null);
        parseSources();
      }
    }
  }, [initialParsedFunctions, initializeFromFunctions, isOpen, sources, parseSources]);

  useEffect(() => {
    const hasDraftContent = parsedFunctions.length > 0 || functions.length > 0;
    if (hasDraftContent && wizardState !== WizardState.COMPLETED) {
      saveEstimationDraft({
        productId,
        parsedFunctions,
        estimationUnits,
        unitAssignments,
        unitSuggestionsMeta,
        functions,
        currentIndex,
        wizardState,
        scopeConfig,
        listMode
      });
    }
  }, [parsedFunctions, estimationUnits, unitAssignments, unitSuggestionsMeta, functions, currentIndex, wizardState, productId, scopeConfig, listMode]);

  const updateFunction = useCallback((index, updates) => {
    setFunctions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  }, []);

  const goToFunction = useCallback((index) => {
    if (index >= 0 && index < functions.length) {
      setCurrentIndex(index);
    }
  }, [functions.length]);

  const handleFunctionComplete = useCallback((index, evaluationData) => {
    updateFunction(index, {
      ...evaluationData,
      status: 'confirmed',
      confirmedAt: new Date().toISOString()
    });

    if (index < functions.length - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 300);
    }
  }, [functions.length, updateFunction]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const goToReview = useCallback(() => {
    setWizardState(WizardState.REVIEW);
  }, []);

  const continueSavedDraft = useCallback(() => {
    if (!savedDraft) return;

    const nextParsedFunctions = savedDraft.parsedFunctions || [];
    const nextScopeConfig = createScopeConfig(savedDraft.scopeConfig || DEFAULT_SCOPE_CONFIG);
    const nextSuggestion = nextParsedFunctions.length > 0
      ? suggestEstimationUnits(nextParsedFunctions)
      : { units: [], assignments: {} };
    const nextFunctions = savedDraft.functions?.length
      ? savedDraft.functions
      : buildFunctionItemsForManual(nextParsedFunctions, nextScopeConfig);

    setParsedFunctions(nextParsedFunctions);
    setEstimationUnits(savedDraft.estimationUnits?.length ? savedDraft.estimationUnits : nextSuggestion.units);
    setUnitAssignments(
      savedDraft.unitAssignments && Object.keys(savedDraft.unitAssignments).length > 0
        ? savedDraft.unitAssignments
        : nextSuggestion.assignments
    );
    setUnitSuggestionsMeta(
      savedDraft.unitSuggestionsMeta || {
        mergeSuggestions: [],
        splitSuggestions: [],
        missingCandidates: [],
        overallSummary: null,
        strategy: 'idle',
        warningMessage: ''
      }
    );
    setFunctions(nextFunctions);
    setCurrentIndex(Math.min(savedDraft.currentIndex || 0, Math.max(nextFunctions.length - 1, 0)));
    setScopeConfig(nextScopeConfig);
    setListMode(savedDraft.listMode || 'single');
    setWizardState(savedDraft.wizardState === WizardState.REVIEW ? WizardState.REVIEW : WizardState.EVALUATION);
    showToast('已恢复上次的人天评估草稿', 'success');
  }, [savedDraft, showToast]);

  const restartFromCurrentSources = useCallback(() => {
    clearEstimationDraft();
    setSavedDraft(null);
    setParsedFunctions([]);
    setEstimationUnits([]);
    setUnitAssignments({});
    setUnitSuggestionsMeta({
      mergeSuggestions: [],
      splitSuggestions: [],
      missingCandidates: [],
      overallSummary: null,
      strategy: 'idle',
      warningMessage: ''
    });
    setFunctions([]);
    setCurrentIndex(0);
    setScopeConfig(createScopeConfig(DEFAULT_SCOPE_CONFIG));
    setListMode('single');

    if (initialParsedFunctions.length > 0) {
      initializeFromFunctions(initialParsedFunctions, DEFAULT_SCOPE_CONFIG);
    } else {
      parseSources();
    }
  }, [initialParsedFunctions, initializeFromFunctions, parseSources]);

  const backToEvaluation = useCallback(() => {
    setWizardState(WizardState.EVALUATION);
  }, []);

  const generateReport = async () => {
    setWizardState(WizardState.COMPLETED);

    const confirmedFunctions = functions.filter(item => item.status === 'confirmed');
    const results = confirmedFunctions.map(item => ({
      functionId: item.id,
      functionName: item.name,
      module: item.module,
      complexity: item.aiEstimation?.complexity || 'medium',
      estimates: item.estimates,
      explanation: item.aiEstimation
        ? Object.entries(item.aiEstimation.roleExplanations || {})
          .map(([role, text]) => `${ROLE_CONFIG[role]?.label || role}: ${text}`)
          .join('；')
        : '人工逐条评估',
      reuseAssessment: item.reuseAssessment
    }));

    const report = {
      productId,
      createdAt: new Date().toISOString(),
      results,
      config: {
        mode: 'manual_ai',
        scopeConfig,
        parsedFunctions: [],
        estimationUnits: [],
        unitAssignments: {},
        totalFunctions: functions.length,
        confirmedFunctions: confirmedFunctions.length,
        listMode
      }
    };

    if (onEstimationComplete) {
      onEstimationComplete(report);
    }

    clearEstimationDraft();
    showToast('评估完成！', 'success');
  };

  const progress = calculateEvaluationProgress(functions);

  if (!isOpen) return null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50">
      <div className="min-h-0 flex-1 overflow-hidden">
        {wizardState === WizardState.DRAFT_CHOICE && (
          <DraftChoiceStep
            draftMeta={savedDraft}
            onContinue={continueSavedDraft}
            onRestart={restartFromCurrentSources}
          />
        )}

        {wizardState === WizardState.PARSE && (
          <div className="flex h-full items-center justify-center bg-slate-50/50">
            <div className="w-full max-w-md bg-white border border-slate-200/60 rounded-3xl shadow-lg shadow-slate-200/40 p-10 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 shadow-inner">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
              </div>
              <h3 className="mb-3 text-2xl font-black text-slate-800 tracking-tight">正在深度解析功能清单</h3>
              <p className="text-base text-slate-500 leading-relaxed">
                AI 正在提取资料中的核心需求点<br/>请稍候，这通常需要几秒钟...
              </p>
            </div>
          </div>
        )}

        {wizardState === WizardState.EVALUATION && functions.length > 0 && (
          <div className="flex h-full">
            <FunctionListSidebar
              functions={functions}
              currentIndex={currentIndex}
              title={listMode === 'merged' ? '评估项列表' : '功能列表'}
              progress={progress}
              onSelect={goToFunction}
            />

            <div className="flex min-w-0 flex-1 flex-col">
              <FunctionEvaluator
                functionItem={functions[currentIndex]}
                index={currentIndex}
                total={functions.length}
                scopeConfig={scopeConfig}
                onComplete={handleFunctionComplete}
                onUpdate={(updates) => updateFunction(currentIndex, updates)}
              />

              <div className="flex items-center justify-between border-t border-slate-200/60 bg-white px-8 py-5 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] z-10">
                <button
                  onClick={goToPrev}
                  disabled={currentIndex === 0}
                  className="group flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  上一项评估
                </button>

                <div className="flex items-center gap-4">
                  <button
                    onClick={goToReview}
                    disabled={progress.confirmed === 0}
                    className="rounded-xl px-5 py-2.5 text-sm font-bold text-blue-600 transition-all hover:bg-blue-50 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    跳过并查看汇总
                  </button>

                  {(!functions[currentIndex]?.estimates || Object.values(functions[currentIndex].estimates).every(value => value === 0)) && (
                    <button
                      onClick={() => handleFunctionComplete(currentIndex, functions[currentIndex])}
                      className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-100"
                    >
                      暂不填，跳过
                    </button>
                  )}

                  <button
                    onClick={() => handleFunctionComplete(currentIndex, functions[currentIndex])}
                    disabled={!functions[currentIndex]?.estimates || Object.values(functions[currentIndex].estimates).every(value => value === 0)}
                    className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-blue-600 px-8 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600 disabled:hover:shadow-md"
                  >
                    <CheckCircle className="h-4 w-4 transition-transform group-hover:scale-110" />
                    {currentIndex < functions.length - 1 ? '确认并继续' : '完成全部评估'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {wizardState === WizardState.REVIEW && (
          <div className="flex h-full flex-col">
            <EstimationSummary
              functions={functions}
              scopeConfig={scopeConfig}
              onBack={backToEvaluation}
              onGenerate={generateReport}
            />
          </div>
        )}

        {wizardState === WizardState.COMPLETED && (
          <div className="flex h-full items-center justify-center bg-slate-50/50">
            <div className="w-full max-w-md bg-white border border-slate-200/60 rounded-3xl shadow-lg shadow-slate-200/40 p-10 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100 shadow-inner">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
              </div>
              <h3 className="mb-3 text-2xl font-black text-slate-800 tracking-tight">评估已全部完成！</h3>
              <p className="mb-8 text-base text-slate-500">
                您已成功确认了 <span className="font-bold text-slate-700">{progress.confirmed}</span> 项需求的预估人天
              </p>
              <button
                onClick={onClose}
                className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-slate-900 px-6 py-3.5 text-base font-bold text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg"
              >
                关闭窗口并返回
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EstimationWizard;
