import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Save } from 'lucide-react';

export function TextSourceDrawer({ isOpen, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleSave = async () => {
    if (!title.trim()) {
      alert('请输入资料名称');
      return;
    }
    if (!content.trim()) {
      alert('请输入内容');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        fileName: title.trim(),
        fileType: 'text',
        content: content.trim(),
        displayTitle: title.trim(),
        displaySubtitle: '手动输入的文本资料'
      });
      // 清空输入
      setTitle('');
      setContent('');
      onClose();
    } catch (e) {
      console.error('Save failed:', e);
      alert('保存失败：' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const drawerContent = (
    <div 
      className="fixed inset-0 bg-black/40 flex justify-end z-[100]"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white w-full max-w-[480px] h-full shadow-2xl flex flex-col animate-slide-in-right"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">添加文本资料</h2>
              <p className="text-xs text-gray-500">手动输入或粘贴文本内容</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 资料名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              资料名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：竞品分析报告、用户调研总结..."
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          {/* 内容 */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="在此粘贴或输入文本内容..."
              className="w-full h-[calc(100vh-280px)] min-h-[300px] px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !title.trim() || !content.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? '保存中...' : '保存资料'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
