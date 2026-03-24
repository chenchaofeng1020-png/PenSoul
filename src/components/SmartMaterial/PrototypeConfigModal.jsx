import React, { useState, useMemo } from 'react';
import { X, Layout, FileText, MessageSquare, Sparkles, Loader2 } from 'lucide-react';
import { useUI } from '../../context/UIContext';

export function PrototypeConfigModal({ 
  isOpen, 
  onClose, 
  sources, 
  chatHistory, 
  onConfirm 
}) {
  const { showToast } = useUI();
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // 获取资料源的内容预览
  const getSourcePreview = (source) => {
    if (source.file_type === 'live_product_data') {
      return '实时产品数据';
    }
    const content = source.content || '';
    return content.substring(0, 100) + (content.length > 100 ? '...' : '');
  };

  // 获取资料源图标
  const getSourceIcon = (fileType) => {
    switch (fileType) {
      case 'txt':
      case 'md':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'csv':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'live_product_data':
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  // 构建完整的提示词
  const buildFullPrompt = () => {
    const basePrompt = `Role: Frontend Developer
Task: Create a UI prototype based on the requirements. Use HTML and Tailwind CSS.

IMPORTANT: Return ONLY the complete HTML code starting with <!DOCTYPE html> or <html>. Do NOT include any introduction text, explanations, or markdown code blocks. The response should be valid HTML that can be directly rendered in a browser.`;

    if (customPrompt.trim()) {
      return `${basePrompt}\n\nAdditional Requirements:\n${customPrompt.trim()}`;
    }
    return basePrompt;
  };

  const handleConfirm = async () => {
    if (sources.length === 0 && chatHistory.length === 0) {
      showToast('请先上传资料或输入对话内容', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      await onConfirm({
        prompt: buildFullPrompt(),
        customPrompt: customPrompt.trim()
      });
      onClose();
    } catch (error) {
      console.error('Generation failed:', error);
      showToast('生成失败', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg mr-3">
              <Layout className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">UI 原型配置</h2>
              <p className="text-sm text-gray-500">确认资料来源并补充功能要求</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 已选资料源 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-indigo-500" />
              已选择的资料 ({sources.length})
            </h3>
            {sources.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-lg text-gray-500 text-sm text-center">
                未选择任何资料源
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sources.map((source) => (
                  <div 
                    key={source.id} 
                    className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors"
                  >
                    <div className="flex items-start">
                      <div className="mt-0.5 mr-3">
                        {getSourceIcon(source.file_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">
                          {source.file_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {getSourcePreview(source)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 对话历史 */}
          {chatHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 text-indigo-500" />
                对话上下文 ({chatHistory.length} 条)
              </h3>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-600">
                  已包含最近的 {chatHistory.length} 条对话记录作为上下文
                </p>
              </div>
            </div>
          )}

          {/* 自定义提示词 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
              补充功能要求（可选）
            </h3>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="例如：
- 这是一个电商APP的首页，需要展示商品列表和搜索功能
- 风格要求：简洁现代，主色调为蓝色
- 必须包含：顶部导航、轮播图、商品卡片、底部标签栏
- 目标用户：25-35岁年轻白领"
              className="w-full h-32 p-4 bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm resize-none"
            />
            <p className="text-xs text-gray-400 mt-2">
              补充越详细的需求描述，生成的原型越符合预期
            </p>
          </div>

          {/* 预览提示词 */}
          {customPrompt.trim() && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-xs font-medium text-gray-500 mb-2">将发送给 AI 的完整提示词：</h4>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                {buildFullPrompt()}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={isGenerating || (sources.length === 0 && chatHistory.length === 0)}
            className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Layout className="w-4 h-4 mr-2" />
                开始生成原型
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
