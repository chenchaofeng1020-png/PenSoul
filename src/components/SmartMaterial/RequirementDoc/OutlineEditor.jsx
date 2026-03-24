import React, { useState } from 'react';
import { Layout, Check, RefreshCw, Edit2, ChevronRight, FileText } from 'lucide-react';
import { useRequirementDoc, DOC_STATES } from '../../../context/RequirementDocContext';

export function OutlineEditor() {
  const { state, dispatch } = useRequirementDoc();
  const [editingSection, setEditingSection] = useState(null);
  const [editText, setEditText] = useState('');

  if (!state.outline) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <span className="text-sm">正在生成大纲...</span>
      </div>
    );
  }

  const handleConfirm = () => {
    dispatch({ type: 'CONFIRM_OUTLINE' });
  };

  const handleRegenerate = () => {
    console.log('重新生成大纲');
  };

  const handleEditSection = (sectionIndex, subsectionIndex) => {
    const key = `${sectionIndex}-${subsectionIndex}`;
    setEditingSection(key);
    const section = state.outline.sections[sectionIndex];
    if (subsectionIndex !== null) {
      setEditText(section.subsections[subsectionIndex]);
    } else {
      setEditText(section.title);
    }
  };

  const handleSaveEdit = (sectionIndex, subsectionIndex) => {
    if (editText.trim()) {
      const newOutline = { ...state.outline };
      if (subsectionIndex !== null) {
        newOutline.sections[sectionIndex].subsections[subsectionIndex] = editText.trim();
      } else {
        newOutline.sections[sectionIndex].title = editText.trim();
      }
      dispatch({ type: 'SET_OUTLINE', payload: newOutline });
    }
    setEditingSection(null);
    setEditText('');
  };

  return (
    <div className="p-5 space-y-5">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
            <Layout className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">文档大纲</h3>
            <p className="text-xs text-slate-500">确认或编辑大纲结构</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRegenerate}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            重新生成
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Check className="w-4 h-4" />
            确认大纲
          </button>
        </div>
      </div>

      {/* 大纲内容 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {state.outline.sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="group">
              {/* 章节标题 */}
              <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                    <span className="text-xs font-semibold text-slate-600">{sectionIndex + 1}</span>
                  </div>
                  
                  {editingSection === `${sectionIndex}-null` ? (
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => handleSaveEdit(sectionIndex, null)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(sectionIndex, null)}
                      className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                      autoFocus
                    />
                  ) : (
                    <div className="flex-1 flex items-center gap-2">
                      <span className="font-medium text-slate-800">{section.title}</span>
                      <div className="flex gap-1.5">
                        {section.needFlowchart && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-600 border border-blue-100 rounded">
                            流程图
                          </span>
                        )}
                        {section.needPrototype && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-purple-50 text-purple-600 border border-purple-100 rounded">
                            原型
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => handleEditSection(sectionIndex, null)}
                  className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 子章节 */}
              {section.subsections && section.subsections.length > 0 && (
                <div className="pl-12 pr-4 pb-3 space-y-1">
                  {section.subsections.map((subsection, subIndex) => (
                    <div 
                      key={subIndex} 
                      className="flex items-center justify-between group/sub py-1.5"
                    >
                      {editingSection === `${sectionIndex}-${subIndex}` ? (
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onBlur={() => handleSaveEdit(sectionIndex, subIndex)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(sectionIndex, subIndex)}
                          className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          autoFocus
                        />
                      ) : (
                        <>
                          <div className="flex items-center gap-2 flex-1">
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                            <span className="text-sm text-slate-600">{subsection}</span>
                          </div>
                          <button
                            onClick={() => handleEditSection(sectionIndex, subIndex)}
                            className="p-1 text-slate-200 hover:text-slate-600 hover:bg-slate-100 rounded opacity-0 group-hover/sub:opacity-100 transition-all"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        点击章节可进行编辑
      </p>
    </div>
  );
}
