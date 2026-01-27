import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, FileText, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Component for rendering Research Reports
const ResearchReportCard = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Simple parsing logic based on the format in index.jsx
  // "### 📄 全网调研报告\n\n> Summary...\n\n#### 📝 调研详情\nContent...\n\n#### 🔗 参考来源\nSources..."
  
  const summaryMatch = content.match(/> (.*?)\n\n/s);
  const summary = summaryMatch ? summaryMatch[1] : "点击查看调研详情";
  
  const detailParts = content.split('#### 📝 调研详情\n');
  const bodyAndSources = detailParts[1] || "";
  
  const [reportBody, sourcesPart] = bodyAndSources.split('#### 🔗 参考来源');
  
  return (
    <div className="bg-blue-50/50 border border-blue-100 rounded-lg overflow-hidden w-full max-w-2xl my-2">
      {/* Header */}
      <div 
        className="flex items-start p-3 cursor-pointer hover:bg-blue-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-shrink-0 mt-1 mr-3 text-blue-500">
           <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
           <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-blue-800">全网调研报告</h3>
              <div className="text-blue-400">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
           </div>
           <p className="text-xs text-blue-600 line-clamp-2 leading-relaxed">
             {summary}
           </p>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-blue-100 bg-white p-4 text-sm text-gray-700 space-y-4 animate-in slide-in-from-top-2 duration-200">
           {/* Main Report */}
           <div className="prose prose-sm max-w-none prose-blue">
              <ReactMarkdown>{reportBody}</ReactMarkdown>
           </div>
           
           {/* Sources */}
           {sourcesPart && (
             <div className="pt-3 border-t border-gray-100 mt-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                  <ExternalLink className="w-3 h-3 mr-1" /> 参考来源
                </h4>
                <div className="prose prose-sm max-w-none prose-a:text-blue-600 prose-ul:pl-0">
                  <ReactMarkdown>{sourcesPart}</ReactMarkdown>
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

const ChatInterface = ({ messages, onSendMessage, isTyping, isResearching, currentPersona, personas, currentPersonaId, onPersonaChange }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isResearching]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative min-w-0">
      {/* Header */}
      <div className="h-14 border-b border-gray-100 flex items-center justify-center px-4 bg-white z-10">
        <span className="text-sm font-medium text-gray-500">
          正在与 <span className="text-blue-600 font-bold">{currentPersona?.name || '诸葛'}</span> 对话
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-white">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3 space-x-reverse`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-blue-100 ml-3' : 'bg-purple-100 mr-3'
              }`}>
                {msg.role === 'user' ? (
                  <User className="w-5 h-5 text-blue-600" />
                ) : (
                  <Bot className="w-5 h-5 text-purple-600" />
                )}
              </div>
              
              <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
              }`}>
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  msg.content.startsWith('### 📄 全网调研报告') ? (
                     <ResearchReportCard content={msg.content} />
                  ) : (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1">
                       <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isResearching && (
          <div className="flex justify-start">
             <div className="flex flex-row items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mr-3">
                 <span className="text-lg">🕵️</span>
              </div>
              <div className="bg-white border border-blue-200 bg-blue-50 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-xs text-blue-700 font-medium">卓伟正在全网调研中...</span>
              </div>
            </div>
          </div>
        )}
        
        {isTyping && !isResearching && (
          <div className="flex justify-start">
             <div className="flex flex-row items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mr-3">
                 <Bot className="w-5 h-5 text-purple-600" />
              </div>
              <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                <span className="text-xs text-gray-500">诸葛正在思考...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100 bg-white z-10">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center gap-2 p-1.5 bg-gray-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
            {/* Persona Selector */}
            <div className="flex-shrink-0 relative group">
                <select 
                    className="appearance-none bg-transparent pl-3 pr-8 py-1.5 text-sm font-medium text-blue-600 outline-none cursor-pointer hover:bg-gray-100 rounded-lg transition-colors max-w-[120px] truncate"
                    value={currentPersonaId || ''}
                    onChange={(e) => onPersonaChange && onPersonaChange(e.target.value)}
                    title="切换当前对话人设"
                >
                    {personas && personas.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入你的想法..."
                className="flex-1 bg-transparent border-none outline-none text-sm px-2 min-w-0"
                disabled={isTyping}
            />
            
            <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors flex-shrink-0"
            >
                <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
