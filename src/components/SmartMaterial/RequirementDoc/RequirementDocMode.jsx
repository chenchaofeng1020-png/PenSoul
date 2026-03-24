import React from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { useRequirementDoc, DOC_STATES } from '../../../context/RequirementDocContext';
import { DocumentEditor } from './DocumentEditor';

export function RequirementDocMode({ productId, onNoteCreated }) {
  const { state } = useRequirementDoc();

  const getStatusText = () => {
    switch (state.mode) {
      case DOC_STATES.COLLECTING:
        return '需求收集中';
      case DOC_STATES.OUTLINE_CONFIRMING:
        return '聊天区确认大纲';
      case DOC_STATES.TASK_CONFIRMING:
        return state.tasks.length > 0 ? '聊天区确认任务' : '正在拆解任务';
      case DOC_STATES.WRITING:
        return '正在撰写初稿';
      case DOC_STATES.EDITING:
        return '初稿已完成';
      case DOC_STATES.COMPLETED:
        return '已保存为成果';
      default:
        return '等待开始';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fafafa]">
      <div className="px-5 py-4 bg-white border-b border-gray-200/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
              <FileText className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">需求文档成果预览</h2>
              <p className="text-xs text-slate-500">聊天区负责过程，这里实时展示当前成果</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
            {state.isWriting && (
              <Loader2 className="w-3.5 h-3.5 text-slate-600 animate-spin" />
            )}
            <span className="text-xs font-medium text-slate-700">{getStatusText()}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <DocumentEditor 
          productId={productId}
          onNoteCreated={onNoteCreated}
        />
      </div>
    </div>
  );
}
