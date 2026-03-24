import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Calendar, Image } from 'lucide-react';

export function DocumentDetailModal({ isOpen, onClose, document: sourceDocument }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !sourceDocument || !mounted) return null;

  const content = sourceDocument.content || '暂无内容';
  const fileName = sourceDocument.file_name || sourceDocument.fileName || '未命名';
  const fileType = sourceDocument.file_type || sourceDocument.fileType || 'unknown';
  const createdAt = sourceDocument.created_at || sourceDocument.createdAt;
  const isImage = fileType === 'image';

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={onClose}>
      <div 
        className={`bg-white rounded-xl w-full ${isImage ? 'max-w-4xl' : 'max-w-3xl'} max-h-[85vh] flex flex-col shadow-xl m-4`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isImage ? 'bg-pink-50 text-pink-600' : 'bg-indigo-50 text-indigo-600'}`}>
              {isImage ? <Image className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{fileName}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>{createdAt ? new Date(createdAt).toLocaleString('zh-CN') : '未知时间'}</span>
                <span className="text-gray-300">|</span>
                <span>{fileType === 'product_data' ? '产品规划资料' : fileType === 'image' ? '图片' : fileType}</span>
              </div>
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
        <div className="flex-1 overflow-y-auto p-6">
          {isImage ? (
            // 图片预览
            <div className="flex items-center justify-center bg-gray-50 rounded-lg p-4 border border-gray-100 min-h-[300px]">
              <img 
                src={content} 
                alt={fileName}
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm"
              />
            </div>
          ) : (
            // 文本内容预览
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
                {content}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, globalThis.document.body);
}
