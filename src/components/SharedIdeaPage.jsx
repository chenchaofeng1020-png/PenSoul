import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Bot, User, Share2, Rocket, ExternalLink, MessageSquare, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getIdea } from '../services/api';

export default function SharedIdeaPage({ ideaId, onLogin }) {
  const [idea, setIdea] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadIdea();
  }, [ideaId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadIdea = async () => {
    setIsLoading(true);
    try {
      const data = await getIdea(ideaId);
      
      if (!data) {
        throw new Error('灵感不存在');
      }
      
      // Check visibility
      if (!data.is_public) {
        throw new Error('该灵感未公开分享');
      }

      setIdea(data);
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to load shared idea:', error);
      setError(error.message || '加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500">正在加载分享的灵感...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">无法查看灵感</h1>
        <p className="text-gray-500 mb-8">{error}</p>
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-tight truncate max-w-[200px] sm:max-w-md">
                {idea.title}
              </h1>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {idea.owner_id ? '用户分享' : '匿名分享'}
                </span>
                <span>•</span>
                <span>{new Date(idea.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button
              onClick={() => window.location.href = '/'}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <Rocket className="w-4 h-4" />
              我也要孵化灵感
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Left: Chat History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2 text-sm font-bold text-gray-700">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              孵化对话记录
            </div>
            <div className="p-6 space-y-8">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-10">
                  <p>暂无对话记录</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border-2 border-white ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                        : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                    }`}>
                      {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>
                    <div className={`max-w-[85%] rounded-2xl p-5 shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-blue-50 text-gray-800 rounded-tr-none border border-blue-100' 
                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                    }`}>
                      <div className="text-[15px] leading-relaxed text-gray-700 overflow-hidden prose prose-sm max-w-none prose-p:my-1 prose-ul:my-2 prose-li:my-0.5">
                        <ReactMarkdown 
                          components={{
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                            code: ({node, inline, className, children, ...props}) => {
                              return inline ? (
                                <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-red-500" {...props}>
                                  {children}
                                </code>
                              ) : (
                                <code className="block bg-gray-800 text-white p-2 rounded-lg text-sm font-mono overflow-x-auto my-2" {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {msg.content.replace(/(?:<<<|---|—)?\s*EXTRACTED_INFO[\s\S]*$/, '').trim()}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Right: Structured Data (Blueprint) */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
              <div className="h-14 px-5 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between text-white">
                <h3 className="font-bold flex items-center gap-2">
                  <Rocket className="w-4 h-4" />
                  产品蓝图
                </h3>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded text-white/90">
                  AI 生成
                </span>
              </div>
              
              <div className="p-5 space-y-6 max-h-[calc(100vh-160px)] overflow-y-auto custom-scrollbar">
                {/* Product Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">产品名称</label>
                  <div className="text-lg font-bold text-gray-900">
                    {idea.structured_data?.product_name || '待生成...'}
                  </div>
                </div>

                {/* Target User */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">目标用户</label>
                  <div className="flex flex-wrap gap-2">
                    {idea.structured_data?.target_users?.length > 0 ? (
                      idea.structured_data.target_users.map((user, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-100">
                          {user}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 text-sm italic">暂无信息</span>
                    )}
                  </div>
                </div>

                {/* Core Features */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">核心功能</label>
                  <ul className="space-y-3">
                    {idea.structured_data?.core_features?.length > 0 ? (
                      idea.structured_data.core_features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded-lg">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))
                    ) : (
                      <span className="text-gray-400 text-sm italic">暂无信息</span>
                    )}
                  </ul>
                </div>

                {/* Value Proposition */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">核心价值</label>
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm text-amber-900 leading-relaxed">
                    {idea.structured_data?.value_proposition || <span className="text-gray-400 italic">暂无信息</span>}
                  </div>
                </div>
              </div>
           </div>
        </div>

      </main>

      <div className="fixed bottom-0 w-full p-4 bg-white border-t border-gray-100 lg:hidden flex justify-center">
         <button
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 font-bold"
          >
            <Rocket className="w-5 h-5" />
            我也要孵化灵感
          </button>
      </div>
    </div>
  );
}
