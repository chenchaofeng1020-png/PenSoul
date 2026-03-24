import React, { useState, useEffect, useRef } from 'react';
import { FileText, Download, Save, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { useRequirementDoc, DOC_STATES } from '../../../context/RequirementDocContext';
import { MermaidRenderer } from './MermaidRenderer';
import { StructuredMarkdownContent } from './StructuredMarkdownContent';
import { useUI } from '../../../context/UIContext';

export function DocumentEditor({ productId, onNoteCreated }) {
  const { state, dispatch } = useRequirementDoc();
  const { showToast } = useUI();
  const [selectedText, setSelectedText] = useState('');
  const [showQuoteButton, setShowQuoteButton] = useState(false);
  const [quotePosition, setQuotePosition] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const contentRef = useRef(null);

  const shouldShowPreview = [
    DOC_STATES.WRITING,
    DOC_STATES.EDITING,
    DOC_STATES.COMPLETED
  ].includes(state.mode);

  const previewDocument = shouldShowPreview ? state.document : null;

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      const anchorElement = selection.anchorNode?.nodeType === Node.TEXT_NODE
        ? selection.anchorNode.parentElement
        : selection.anchorNode;
      const sectionElement = anchorElement?.closest?.('[data-doc-section-index]');
      
      if (text && contentRef.current?.contains(selection.anchorNode) && sectionElement) {
        setSelectedText(text);
        setShowQuoteButton(true);
        
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setQuotePosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });
      } else {
        setShowQuoteButton(false);
        setSelectedText('');
      }
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, []);

  const handleQuote = () => {
    const selection = window.getSelection();
    const anchorElement = selection?.anchorNode?.nodeType === Node.TEXT_NODE
      ? selection.anchorNode.parentElement
      : selection?.anchorNode;
    const sectionElement = anchorElement?.closest?.('[data-doc-section-index]');
    const sectionIndex = sectionElement ? Number(sectionElement.getAttribute('data-doc-section-index')) : null;
    const sectionTitle = sectionElement?.getAttribute('data-doc-section-title') || '';

    const event = new CustomEvent('quoteToChat', {
      detail: {
        text: selectedText,
        sectionIndex,
        sectionTitle
      }
    });
    window.dispatchEvent(event);
    setShowQuoteButton(false);
    setSelectedText('');
  };

  const handleSave = async () => {
    if (!state.document) return;
    
    setIsSaving(true);
    try {
      const noteData = {
        productId,
        title: state.title || '需求文档',
        content: JSON.stringify(state.document),
        type: 'requirement_doc',
        sourceType: 'generated',
        metadata: {
          docId: state.docId,
          version: '1.0',
          sections: state.document.sections.map(s => s.title)
        }
      };

      const res = await fetch('http://localhost:3002/api/smart/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
      });

      if (!res.ok) throw new Error('保存失败');
      
      const result = await res.json();
      onNoteCreated?.(result.data);
      
      dispatch({ type: 'COMPLETE' });
      showToast('文档已保存到交付物', 'success');
    } catch (error) {
      console.error('保存失败:', error);
      showToast('保存失败，请重试', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    if (!previewDocument) return;
    
    const markdown = previewDocument.sections
      .map(s => `## ${s.title}\n\n${s.content}`)
      .join('\n\n---\n\n');
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.title || '需求文档'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSection = (index) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (!previewDocument) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="text-center space-y-2">
          <span className="block text-sm">
            {state.isWriting ? '正在撰写文档...' : '大纲确认与任务拆解会在聊天区展示'}
          </span>
          <span className="block text-xs text-slate-400">开始逐章写作后，右侧才会实时展示当前成果</span>
        </div>
      </div>
    );
  }

  const completedTasks = state.tasks.filter(task => task.status === 'completed').length;
  const currentTask = state.tasks[state.currentTaskIndex];
  const canPersistDocument = Boolean(
    state.document?.sections?.some(section => section.content?.trim())
  );

  return (
    <div className="p-5 space-y-5">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">
              {previewDocument.title || state.title || '需求文档'}
            </h3>
            <div className="flex items-center gap-2">
              {state.mode === DOC_STATES.COMPLETED && (
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">已完成</span>
              )}
              {state.mode === DOC_STATES.WRITING && (
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                  正在撰写 {currentTask?.section || ''}
                </span>
              )}
              {state.isRevising && (
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                  正在修订第 {(state.activeRevisionSectionIndex ?? 0) + 1} 章
                </span>
              )}
              <span className="text-xs text-slate-500">
                {previewDocument.sections.length} 个章节
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={!canPersistDocument}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !canPersistDocument}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                保存
              </>
            )}
          </button>
        </div>
      </div>

      {(state.mode === DOC_STATES.OUTLINE_CONFIRMING || state.mode === DOC_STATES.TASK_CONFIRMING || state.mode === DOC_STATES.WRITING) && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>当前创作状态</span>
            {state.tasks.length > 0 && (
              <span>{completedTasks}/{state.tasks.length} 章节已完成</span>
            )}
          </div>
          {state.tasks.length > 0 && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900 transition-all duration-300"
                style={{ width: `${Math.round((completedTasks / state.tasks.length) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* 文档内容 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" ref={contentRef}>
        <div className="divide-y divide-slate-100">
          {previewDocument.sections.map((section, index) => {
            const isExpanded = expandedSections[index] !== false;
            const taskStatus = state.tasks[index]?.status || (section.content ? 'completed' : 'pending');
            
            return (
              <div key={index}>
                {/* 章节标题 */}
                <button
                  onClick={() => toggleSection(index)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                      <span className="text-xs font-semibold text-slate-600">{index + 1}</span>
                    </div>
                    <div className="min-w-0 text-left">
                      <h2 className="text-sm font-semibold text-slate-800">{section.title}</h2>
                      {section.subsections?.length > 0 && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {section.subsections.join(' / ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {taskStatus === 'writing' && (
                      <span className="text-[10px] text-blue-600">撰写中</span>
                    )}
                    {taskStatus === 'completed' && (
                      <span className="text-[10px] text-slate-500">已完成</span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* 章节内容 */}
                {isExpanded && (
                  <div
                    className="px-4 pb-4 pl-12"
                    data-doc-section-index={index}
                    data-doc-section-title={section.title}
                  >
                    {section.content ? (
                      <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                        <StructuredMarkdownContent
                          content={section.content}
                          sectionTitle={section.title}
                          dense
                        />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-400">
                        {state.mode === DOC_STATES.OUTLINE_CONFIRMING && '等待在聊天区确认大纲'}
                        {state.mode === DOC_STATES.TASK_CONFIRMING && '任务已生成，等待在聊天区开始撰写'}
                        {state.mode === DOC_STATES.WRITING && taskStatus !== 'writing' && '该章节尚未开始撰写'}
                        {state.mode === DOC_STATES.WRITING && taskStatus === 'writing' && '正在实时生成本章节内容...'}
                        {(state.mode === DOC_STATES.EDITING || state.mode === DOC_STATES.COMPLETED) && '该章节当前暂无内容'}
                      </div>
                    )}

                    {section.flowchart && (
                      <div className="mt-3">
                        <MermaidRenderer 
                          code={section.flowchart} 
                          title="流程图"
                        />
                      </div>
                    )}

                    {section.prototype && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-xs font-medium text-slate-700">页面原型补充</span>
                        <div className="mt-2">
                          <StructuredMarkdownContent content={section.prototype} dense />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部提示 */}
      <p className="text-xs text-slate-400 text-center">
        选中文档内容可引用到对话框进行修改
      </p>

      {/* 引用按钮 */}
      {showQuoteButton && (
        <div
          className="fixed z-50"
          style={{
            left: quotePosition.x,
            top: quotePosition.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <button
            onClick={handleQuote}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-lg hover:bg-slate-800 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            引用到对话框
          </button>
        </div>
      )}
    </div>
  );
}
