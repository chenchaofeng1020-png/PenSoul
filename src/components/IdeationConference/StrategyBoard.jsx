import React, { useState, useEffect } from 'react';
import TopicCard from './TopicCard';
import { LayoutGrid, FileText, ArrowLeft, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const StrategyBoard = ({ topics, onScheduleTopic, previewContent, onClearPreview }) => {
  // Mode: 'board' (default) or 'preview'
  const mode = previewContent ? 'preview' : 'board';

  if (mode === 'preview') {
    return (
      <div className="w-[480px] border-l border-gray-200 bg-white flex flex-col h-full shadow-xl z-20 transition-all duration-300">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between h-14 shrink-0">
          <div className="flex items-center space-x-2">
            <button 
              onClick={onClearPreview}
              className="p-1 hover:bg-gray-200 rounded-md transition-colors"
              title="返回策略看板"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-gray-800 text-sm truncate max-w-[200px]">
              {previewContent.title || '文档预览'}
            </span>
          </div>
          <div className="flex items-center space-x-1">
             <span className="text-xs text-gray-400">AI 生成内容</span>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-sm prose-blue max-w-none">
            <ReactMarkdown>{previewContent.content}</ReactMarkdown>
          </div>
          
          {previewContent.sources && previewContent.sources.length > 0 && (
             <div className="mt-8 pt-6 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">参考来源</h4>
                <ul className="space-y-2">
                    {previewContent.sources.map((s, idx) => (
                        <li key={idx}>
                            <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-xs text-blue-600 hover:underline group">
                                <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 opacity-50 group-hover:opacity-100" />
                                <span className="line-clamp-1">{s.title || s.url}</span>
                            </a>
                        </li>
                    ))}
                </ul>
             </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col h-full transition-all duration-300">
      <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between h-14 shrink-0">
        <div className="flex items-center space-x-2">
          <LayoutGrid className="w-4 h-4 text-gray-500" />
          <span className="font-semibold text-gray-800 text-sm">策略看板</span>
        </div>
        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-500 font-medium">
          {topics.length} 方案
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {topics.map(topic => (
          <TopicCard 
            key={topic.id} 
            topic={topic} 
            onSchedule={onScheduleTopic}
          />
        ))}
        
        {topics.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center px-4">
            <LayoutGrid className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">暂无选题方案</p>
            <p className="text-xs mt-1 opacity-70">请在左侧与诸葛对话，生成新的策划案</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategyBoard;
