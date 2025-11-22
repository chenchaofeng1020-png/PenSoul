import React from 'react';
import { X, Clock, FileText, Edit, Trash2, Plus } from 'lucide-react';
import CommentSystem from './CommentSystem';

const FeatureAnalysisDetailDrawer = ({ 
  isOpen, 
  onClose, 
  item, 
  onEdit, 
  onDelete, 
  onCreateRequirement,
  currentUser
}) => {
  if (!isOpen || !item) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* 抽屉内容 */}
      <div className="absolute right-0 top-0 h-full w-[900px] bg-white shadow-xl transform transition-transform">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {item.title || '功能分析详情'}
              </h2>
              <p className="text-sm text-gray-500">功能分析</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 功能名称 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              功能名称
            </label>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-900">{item.title || '未命名功能'}</p>
            </div>
          </div>

          {/* 上线时间 */}
          {item.launchDate && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                上线时间
              </label>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <Clock className="w-4 h-4 text-gray-500" />
                <p className="text-gray-900">{formatDate(item.launchDate)}</p>
              </div>
            </div>
          )}

          {/* 分析内容 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              分析内容
            </label>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div 
                className="prose prose-sm max-w-none text-gray-900"
                dangerouslySetInnerHTML={{ __html: item.content || '暂无内容' }}
              />
            </div>
          </div>

          {/* 创建时间 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              创建时间
            </label>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-sm">
                {formatDate(item.createdAt)}
              </p>
            </div>
          </div>

          {/* 评论系统 */}
          {currentUser && (
            <div className="mb-6">
              <CommentSystem
                targetType="feature_analysis"
                targetId={item.id}
                currentUser={currentUser}
              />
            </div>
          )}
        </div>

        {/* 底部操作按钮 */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => onCreateRequirement(item)}
              className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>创建需求</span>
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={() => onEdit(item)}
                className="flex items-center justify-center space-x-2 flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>编辑</span>
              </button>
              
              <button
                onClick={() => onDelete(item)}
                className="flex items-center justify-center space-x-2 flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>删除</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureAnalysisDetailDrawer;