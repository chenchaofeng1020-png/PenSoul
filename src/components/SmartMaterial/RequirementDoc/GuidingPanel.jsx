import React from 'react';
import { MessageSquare } from 'lucide-react';
import { DOC_STATES } from '../../../context/RequirementDocContext';

export function GuidingPanel({ productId, sources }) {
  return (
    <div className="p-5 space-y-5">
      {/* 主提示卡片 */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-slate-900 mb-1">
              开始撰写需求文档
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              请在左侧聊天框描述您的需求，我会作为资深产品专家为您提供专业建议和方案。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
