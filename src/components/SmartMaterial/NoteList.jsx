import React from 'react';
import { FileText, Clock, BarChart, Code, Layout, Trash2, MessageSquare, Calculator, Sparkles } from 'lucide-react';

// 小红书 Logo SVG 组件
const XiaohongshuIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 14.36c-.36.36-.88.56-1.44.56H9.8c-.56 0-1.08-.2-1.44-.56-.36-.36-.56-.88-.56-1.44V9.08c0-.56.2-1.08.56-1.44.36-.36.88-.56 1.44-.56h5.4c.56 0 1.08.2 1.44.56.36.36.56.88.56 1.44v5.84c0 .56-.2 1.08-.56 1.44z"/>
    <path d="M9.8 9.8h1.8v4.4H9.8zM12.4 9.8h1.8v4.4h-1.8z"/>
  </svg>
);

const TYPE_ICONS = {
  xiaohongshu: XiaohongshuIcon,
  summary: FileText,
  roadmap: BarChart,
  architecture: Code,
  prototype: Layout,
  chat_deliverable: MessageSquare,
  estimation_report: Calculator,
  smart_estimation: Sparkles
};

// 从内容中提取标题
const extractTitleFromContent = (content, type, noteTitle) => {
  // 如果有明确的标题（非默认标题），直接返回
  if (noteTitle && !noteTitle.startsWith('AI 回复 -') && !noteTitle.startsWith('未命名')) {
    return noteTitle;
  }

  if (!content) return noteTitle || '未命名文档';

  // 人天评估报告：直接返回标题
  if (type === 'estimation_report') {
    return noteTitle || '人天评估报告';
  }

  if (type === 'smart_estimation') {
    try {
      const parsed = JSON.parse(content);
      return parsed?.title || noteTitle || 'AI智能人天评估';
    } catch {
      return noteTitle || 'AI智能人天评估';
    }
  }

  // 聊天交付物：返回前30个字符作为预览
  if (type === 'chat_deliverable') {
    const preview = content.replace(/\n/g, ' ').substring(0, 30);
    return preview + (content.length > 30 ? '...' : '');
  }

  // 小红书内容：提取第二行作为标题（第一行是分类类型）
  if (type === 'xiaohongshu') {
    const lines = content.split('\n').filter(line => line.trim());
    // 跳过第一行（分类类型），从第二行开始找标题
    for (let i = 1; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      // 匹配 # 标题 或 **标题** 或 纯文本标题
      if (trimmed.startsWith('#')) {
        return trimmed.replace(/^#+\s*/, '').substring(0, 30);
      }
      if (trimmed.startsWith('**') && trimmed.includes('**')) {
        return trimmed.replace(/\*\*/g, '').substring(0, 30);
      }
      // 如果是 emoji 开头，也作为标题
      if (/^[\u{1F300}-\u{1F9FF}]/u.test(trimmed)) {
        return trimmed.substring(0, 30);
      }
      // 非空行也作为标题候选
      if (trimmed.length > 0) {
        return trimmed.substring(0, 30);
      }
    }
    // 默认返回前30个字符
    return content.replace(/\n/g, ' ').substring(0, 30) + '...';
  }

  // 其他类型：返回前50个字符
  return content.replace(/\n/g, ' ').substring(0, 50) + (content.length > 50 ? '...' : '');
};

export function NoteList({ notes, onSelect, onDelete, compact = false }) {
  if (notes.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-100">
        <p>暂无生成笔记</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {notes.map(note => {
          const Icon = TYPE_ICONS[note.type] || FileText;
          const contentTitle = extractTitleFromContent(note.content, note.type, note.title);
          return (
            <div 
              key={note.id} 
              onClick={() => onSelect(note)}
              className="group relative bg-white p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer flex items-start"
            >
              <div className={`p-1.5 rounded-md mr-3 flex-shrink-0 ${note.type === 'xiaohongshu' ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-500'}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-800 text-xs truncate mb-1 pr-4" title={contentTitle}>
                  {contentTitle || note.title}
                </h3>
                <div className="flex items-center text-[10px] text-gray-400">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (window.confirm('确定删除此笔记吗？')) {
                    onDelete(note.id); 
                  }
                }}
                className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {notes.map(note => {
        const Icon = TYPE_ICONS[note.type] || FileText;
        const contentTitle = extractTitleFromContent(note.content, note.type, note.title);
        return (
          <div 
            key={note.id} 
            onClick={() => onSelect(note)}
            className="group relative bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col h-40"
          >
            <div className="flex justify-between items-start mb-2">
              <div className={`p-1.5 rounded-lg ${note.type === 'xiaohongshu' ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-500'}`}>
                <Icon className="w-4 h-4" />
              </div>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (window.confirm('确定删除此笔记吗？')) {
                    onDelete(note.id); 
                  }
                }}
                className="text-gray-300 hover:text-red-500 p-1 rounded hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 mb-2" title={contentTitle}>{contentTitle || note.title}</h3>
            
            <div className="flex-1 overflow-hidden">
               <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                 {note.content}
               </p>
            </div>
            
            <div className="mt-2 pt-2 border-t border-gray-50 flex items-center text-xs text-gray-400">
              <Clock className="w-3 h-3 mr-1" />
              {new Date(note.created_at).toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
