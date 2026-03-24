import React, { useMemo, useState } from 'react';
import { Bookmark, Expand, Loader2, Sparkles, X } from 'lucide-react';
import { useUI } from '../../../context/UIContext';
import { useSmartEstimation } from '../../../context/SmartEstimationContext';
import { SmartEstimationReportView } from './SmartEstimationReportView';

function FullscreenOverlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/60 backdrop-blur-sm">
      <div className="absolute inset-4 overflow-hidden rounded-[32px] border border-white/10 bg-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-md transition-colors hover:bg-white hover:text-slate-900"
          title="退出全屏"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="h-full overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function SmartEstimationMode({ productId, sources, onNoteCreated }) {
  const { showToast } = useUI();
  const { state, dispatch } = useSmartEstimation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const statusText = useMemo(() => {
    if (state.isGenerating) return 'AI 正在整理评估结果';
    if (state.isRevising) return 'AI 正在按你的补充修订';
    if (state.report) return '结果已生成，可继续在聊天区追问或修订';
    return '聊天区负责补充信息，这里实时展示 AI 评估结果';
  }, [state.isGenerating, state.isRevising, state.report]);

  const handleSave = async () => {
    if (!state.report) {
      showToast('请先生成评估结果', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        productId,
        title: state.report.title || 'AI智能人天评估',
        content: JSON.stringify(state.report),
        type: 'smart_estimation',
        sourceRefs: sources.map((source) => source.id)
      };

      const endpoint = state.savedNoteId
        ? `http://localhost:3002/api/smart/notes/${state.savedNoteId}`
        : 'http://localhost:3002/api/smart/notes';
      const method = state.savedNoteId ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      const savedNote = data.data;

      if (!response.ok || !savedNote) {
        throw new Error(data?.error || '保存失败');
      }

      dispatch({ type: 'MARK_SAVED', payload: savedNote.id });
      onNoteCreated?.(savedNote);
      showToast(state.savedNoteId ? '已更新交付物' : '已保存到交付物', 'success');
    } catch (error) {
      console.error('Save smart estimation note failed:', error);
      showToast(error.message || '保存失败', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const emptyState = (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-xl rounded-[32px] border border-slate-200 bg-white px-7 py-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
          {state.isGenerating ? <Loader2 className="h-7 w-7 animate-spin" /> : <Sparkles className="h-7 w-7" />}
        </div>
        <h3 className="mt-5 text-2xl font-semibold text-slate-900">
          {state.isGenerating ? '正在生成评估网页' : '等待 AI 产出评估结果'}
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          你可以在中间聊天区直接描述要评估的功能，也可以先在左侧勾选资料后再补一句“按这些功能评估”。
          AI 会按你提供的 skill 规则输出结构化结果，并在这里实时展示。
        </p>
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-left text-sm text-slate-600">
          <div className="font-medium text-slate-800">建议先补充：</div>
          <div className="mt-2">1. 要评估的功能清单或页面清单</div>
          <div className="mt-1">2. 是否偏新建 / 二开 / 复用</div>
          <div className="mt-1">3. 是否有第三方接口、权限、流程、数据迁移</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex h-full flex-col bg-[#f8fafc]">
        <div className="border-b border-slate-200/80 bg-white px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-[15px] font-semibold text-slate-900">AI智能人天评估</h2>
                <p className="text-xs text-slate-500">{statusText}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullscreen(true)}
                disabled={!state.report}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Expand className="h-4 w-4" />
                全屏查看
              </button>
              <button
                onClick={handleSave}
                disabled={!state.report || isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-sm text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />}
                {state.savedNoteId ? '更新交付物' : '保存到交付物'}
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {state.report ? <SmartEstimationReportView report={state.report} /> : emptyState}
        </div>
      </div>

      {isFullscreen && state.report ? (
        <FullscreenOverlay onClose={() => setIsFullscreen(false)}>
          <SmartEstimationReportView report={state.report} />
        </FullscreenOverlay>
      ) : null}
    </>
  );
}
