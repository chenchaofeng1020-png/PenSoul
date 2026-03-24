import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, FileText, Loader2, RotateCcw } from 'lucide-react';
import { dataSourceParser } from '../../services/estimation/DataSourceParser';
import { EstimationReport } from './EstimationReport';
import { EstimationWizard } from './EstimationWizard';
import { EstimationWorkspaceDrawer } from './EstimationWorkspaceDrawer';
import { useUI } from '../../context/UIContext';

function EmptyState({ sources, isParsing, onRetry, onClose }) {
  return (
    <div className="flex h-full items-center justify-center px-8 py-10 bg-slate-50/50">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200/60 bg-white p-10 shadow-lg shadow-slate-200/40">
        <div className="flex items-start gap-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 shadow-inner">
            {isParsing ? (
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            ) : (
              <FileText className="h-8 w-8 text-indigo-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              {isParsing ? '正在深度解析需求资料...' : '未识别出明确的可评估需求'}
            </h3>
            <p className="mt-3 text-base leading-relaxed text-slate-500">
              {isParsing
                ? '系统正在运用 AI 提取文档中的核心功能点，解析完成后将自动进入“逐条评估”主界面。'
                : '可能是当前资料中缺少具体的功能点描述。您可以尝试重新解析，或返回检查资料内容。'}
            </p>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-slate-300 rounded-full"></span>
                当前分析的数据源
              </div>
              <div className="space-y-2">
                {sources.map((source, index) => (
                  <div
                    key={`${source.id || source.file_name}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-white px-4 py-3 shadow-sm transition-all hover:border-indigo-200 hover:shadow"
                  >
                    <div className="truncate text-sm font-bold text-slate-700">{source.file_name}</div>
                    <div className="ml-3 shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-medium text-slate-500">{source.file_type || '文档资料'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={onClose}
                className="rounded-xl px-6 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100"
              >
                关闭返回
              </button>
              {!isParsing ? (
                <button
                  onClick={onRetry}
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg"
                >
                  <RotateCcw className="h-4 w-4 transition-transform group-hover:-rotate-180 duration-500" />
                  重新解析资料
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EstimationModal({ isOpen, onClose, sources, productId, onEstimationComplete, onNoteCreated }) {
  const { showToast } = useUI();
  const [view, setView] = useState('entry');
  const [parsedFunctions, setParsedFunctions] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [reportConfigOverride, setReportConfigOverride] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    document.body.classList.add('estimation-modal-open');
    return () => {
      document.body.classList.remove('estimation-modal-open');
    };
  }, [isOpen]);

  const parseSources = useCallback(async () => {
    setIsParsing(true);
    setError(null);

    try {
      const functions = await dataSourceParser.parseSources(sources);
      setParsedFunctions(functions);

      if (functions.length > 0) {
        setView('manual');
      } else {
        setView('entry');
      }
    } catch (err) {
      console.error('[EstimationModal] Parse error:', err);
      setError('解析数据源失败: ' + err.message);
      setView('entry');
    } finally {
      setIsParsing(false);
    }
  }, [sources]);

  useEffect(() => {
    if (isOpen && sources.length > 0) {
      setReportConfigOverride(null);
      setResults(null);
      setError(null);
      setParsedFunctions([]);
      setView('entry');
      parseSources();
    }
  }, [isOpen, sources, parseSources]);

  if (!isOpen) return null;

  return (
    <EstimationWorkspaceDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="人天评估"
      sourceLabel={sources.map(source => source.file_name).join(', ')}
    >
      <div className="flex h-full flex-col overflow-hidden">
        {error && (
          <div className="px-8 pt-6">
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {view === 'entry' && (
          <EmptyState
            sources={sources}
            isParsing={isParsing}
            onRetry={parseSources}
            onClose={onClose}
          />
        )}

        {view === 'manual' && parsedFunctions.length > 0 && (
          <EstimationWizard
            isOpen
            onClose={onClose}
            sources={sources}
            productId={productId}
            initialParsedFunctions={parsedFunctions}
            onEstimationComplete={(report) => {
              setReportConfigOverride(report.config || null);
              setResults(report.results);
              setView('result');
              if (onEstimationComplete) {
                onEstimationComplete(report.results);
              }
            }}
          />
        )}

        {view === 'result' && results && (
          <div className="min-h-0 flex-1 overflow-hidden">
            <EstimationReport
              embedded
              report={{
                id: productId,
                productId,
                createdAt: new Date().toISOString(),
                config: reportConfigOverride || {},
                results
              }}
              onClose={onClose}
              onSave={async (report) => {
                try {
                  const response = await fetch('http://localhost:3002/api/smart/estimation/report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      productId,
                      results: report.results,
                      config: report.config
                    })
                  });

                  if (!response.ok) throw new Error('保存报告失败');

                  const data = await response.json();
                  const reportUrl = `${window.location.origin}/#${data.reportUrl}`;

                  showToast('已保存到交付列表', 'success');

                  if (onNoteCreated) {
                    onNoteCreated(data.note);
                  }

                  if (navigator.clipboard) {
                    await navigator.clipboard.writeText(reportUrl);
                    showToast('报告链接已复制到剪贴板', 'success');
                  }

                  onClose();
                } catch (err) {
                  console.error('保存失败:', err);
                  showToast('保存失败: ' + err.message, 'error');
                }
              }}
            />
          </div>
        )}
      </div>
    </EstimationWorkspaceDrawer>
  );
}

export default EstimationModal;
