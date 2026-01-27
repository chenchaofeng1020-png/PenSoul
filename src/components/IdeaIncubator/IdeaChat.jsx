import React, { useState, useEffect, useRef, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Send, ArrowLeft, Bot, User, Rocket, Edit2, Save, X, Sparkles, Share2, Copy, Check, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getIdea, chatWithIdea, updateIdea, convertIdeaToProduct } from '../../services/api';
import { useUI } from '../../context/UIContext';

export default function IdeaChat({ ideaId, onBack, currentUser, onProductCreated }) {
  const [idea, setIdea] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Structured Data Editing
  const [isEditing, setIsEditing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [editData, setEditData] = useState({});
  const messagesEndRef = useRef(null);
  const { showToast } = useUI();

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
      setIdea(data);
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      showToast('加载灵感详情失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const userMsg = { role: 'user', content: input, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    // Create a placeholder for the AI response
    const aiMsgId = Date.now();
    const initialAiMsg = { 
      role: 'ai', 
      content: '', 
      created_at: new Date().toISOString(),
      id: aiMsgId
    };
    setMessages(prev => [...prev, initialAiMsg]);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s connection timeout

      const response = await fetch(`${import.meta.env.VITE_API_BASE || ''}/api/ideas/${ideaId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMsg.content }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split('\n');
        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.trim() === 'data: [DONE]') continue;
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'content') {
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMsgId 
                    ? { ...msg, content: msg.content + data.text }
                    : msg
                ));
              } else if (data.type === 'meta') {
                if (data.info) {
                  setIdea(prev => ({
                    ...prev,
                    structured_data: {
                      ...prev.structured_data,
                      ...data.info
                    }
                  }));
                }
              } else if (data.type === 'error') {
                showToast(data.message || 'Error generating response', 'error');
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

    } catch (error) {
      console.error(error);
      if (error.name === 'AbortError') {
        showToast('连接超时，请检查网络或重试', 'error');
      } else if (error.message && error.message.includes('Failed to fetch')) {
        showToast('连接服务器失败，请检查网络或服务状态', 'error');
      } else {
        showToast('发送消息失败: ' + (error.message || '未知错误'), 'error');
      }
      // Remove the placeholder AI message if it has no content (failed before generation)
      setMessages(prev => {
         const msg = prev.find(m => m.id === aiMsgId);
         if (msg && !msg.content) {
           return prev.filter(m => m.id !== aiMsgId);
         }
         return prev;
      });
    } finally {
      setIsSending(false);
    }
  };

  // --- Editing Handlers ---

  const handleStartEdit = () => {
    setEditData(JSON.parse(JSON.stringify(idea.structured_data || {})));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handleSaveEdit = async () => {
    try {
      const updatedIdea = {
        ...idea,
        structured_data: editData
      };
      await updateIdea(idea.id, updatedIdea);
      setIdea(updatedIdea);
      setIsEditing(false);
      showToast('更新成功', 'success');
    } catch (error) {
      console.error(error);
      showToast('更新失败', 'error');
    }
  };

  const handleChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field, text) => {
    const array = text.split('\n').filter(line => line.trim() !== '');
    setEditData(prev => ({ ...prev, [field]: array }));
  };

  const handleSummarize = async () => {
    if (isSummarizing) return;
    setIsSummarizing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3001'}/api/ideas/${ideaId}/summarize`, {
        method: 'POST',
      });
      if (response.ok) {
        const { data } = await response.json();
        setIdea(prev => ({
          ...prev,
          structured_data: data
        }));
      }
    } catch (error) {
      console.error('Summarize failed:', error);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleConvert = () => {
    setIsConvertModalOpen(true);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/?share_idea=${idea.id}`;
    setShareUrl(url);
    setIsShareModalOpen(true);
  };

  const toggleShare = async (enable) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE || ''}/api/ideas/${ideaId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: enable })
      });
      if (!response.ok) {
        // Try to parse error message
        let errorMsg = 'Failed to update share status';
        try {
            const errData = await response.json();
            if (errData.error) errorMsg = errData.error;
        } catch (e) {
            // ignore json parse error
        }
        throw new Error(errorMsg);
      }
      setIdea(prev => ({ ...prev, is_public: enable }));
      if (enable) {
        showToast('已开启分享', 'success');
      } else {
        showToast('已关闭分享', 'success');
      }
    } catch (error) {
      console.error(error);
      showToast('操作失败: ' + error.message, 'error');
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    showToast('链接已复制', 'success');
  };

  const confirmConvert = async () => {
    try {
      const result = await convertIdeaToProduct(idea.id, {
        product_name: idea.structured_data?.product_name || idea.title
      });
      setIdea(prev => ({ ...prev, status: 'converted', converted_product_id: result.productId }));
      setIsConvertModalOpen(false);
      
      if (onProductCreated && result.productId) {
        showToast('转化成功！正在跳转...', 'success');
        // 给一点时间让 toast 显示
        setTimeout(() => {
          onProductCreated(result.productId);
        }, 1000);
      } else {
        showToast('转化成功！', 'success');
      }
    } catch (error) {
      showToast('转化失败: ' + error.message, 'error');
      setIsConvertModalOpen(false);
    }
  };

  if (isLoading && !idea) {
    return <div className="p-6 text-center">加载中...</div>;
  }

  if (!idea) return null;

  return (
    <>
      <div className="flex h-full bg-white rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
        {/* Left: Chat (70%) */}
        <div className="flex-1 flex flex-col border-r border-gray-100 relative">
          {/* Header */}
        <div className="h-16 px-5 border-b border-gray-100 flex items-center gap-4 bg-white/80 backdrop-blur-sm z-10">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-all hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 overflow-hidden">
            <span className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
              idea.status === 'converted' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-amber-100 text-amber-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${idea.status === 'converted' ? 'bg-green-500' : 'bg-amber-500'}`} />
              {idea.status === 'converted' ? '已转化' : '孵化中'}
            </span>
            <h2 className="font-bold text-gray-900 text-lg leading-tight truncate">{idea.title}</h2>
          </div>
          
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleShare}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                idea.is_public
                  ? 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{idea.is_public ? '已分享' : '分享'}</span>
            </button>

            <button
              onClick={handleSummarize}
              disabled={isSummarizing || isSending}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isSummarizing 
                  ? 'bg-blue-50 text-blue-400 cursor-wait' 
                  : 'bg-white border border-blue-100 text-blue-600 hover:bg-blue-50 hover:border-blue-200 shadow-sm hover:shadow'
              }`}
            >
              {isSummarizing ? (
                <>
                  <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                  <span>分析中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI 一键总结</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 scroll-smooth">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 py-20">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Bot className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-gray-900 font-medium mb-2">我是你的 AI 产品顾问</h3>
              <p className="text-sm">请告诉我关于这个想法的更多细节，我会帮你完善它。</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} group`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border-2 border-white ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                  : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl p-5 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-white text-gray-800 rounded-tr-none border border-gray-100' 
                  : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
              }`}>
                <div className="text-[15px] leading-relaxed text-gray-700 overflow-hidden">
                  {!msg.content && msg.role !== 'user' ? (
                    <div className="flex space-x-2 items-center h-5">
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce delay-200" />
                    </div>
                  ) : (
                    <ReactMarkdown 
                      components={{
                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                        li: ({node, ...props}) => <li className="mb-1" {...props} />,
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-2" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-md font-bold mb-2" {...props} />,
                        hr: ({node, ...props}) => null, // Hide horizontal rules
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
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="min-h-[80px] px-5 py-4 bg-white border-t border-gray-100 flex items-end">
          <form onSubmit={handleSend} className="flex gap-3 relative w-full items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="输入你的想法... (Shift+Enter 换行)"
              disabled={isSending}
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700 placeholder-gray-400 resize-none min-h-[52px] max-h-32 no-scrollbar"
              rows={1}
              style={{ height: 'auto', minHeight: '52px' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
              }}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isSending}
              className="h-[52px] px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center flex-shrink-0"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right: Structured Data (30%) */}
      <div className="w-[450px] bg-white border-l border-gray-100 flex flex-col overflow-hidden">
        <div className="h-16 px-5 border-b border-gray-200 bg-white flex justify-between items-center">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Rocket className="w-4 h-4 text-blue-500" />
            产品蓝图
          </h3>
          {!isEditing ? (
            <button 
              onClick={handleStartEdit}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              title="编辑"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex gap-1">
              <button 
                onClick={handleSaveEdit}
                className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                title="保存"
              >
                <Save className="w-4 h-4" />
              </button>
              <button 
                onClick={handleCancelEdit}
                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                title="取消"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Target User */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">目标用户</label>
            {isEditing ? (
              <textarea
                value={Array.isArray(editData.target_users) ? editData.target_users.join('\n') : editData.target_users || ''}
                onChange={(e) => handleArrayChange('target_users', e.target.value)}
                className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                rows={3}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {idea.structured_data?.target_users?.length > 0 ? (
                  idea.structured_data.target_users.map((user, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-100">
                      {user}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 text-sm italic">待补充...</span>
                )}
              </div>
            )}
          </div>

          {/* Core Features */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">核心功能</label>
            {isEditing ? (
              <textarea
                value={Array.isArray(editData.core_features) ? editData.core_features.join('\n') : editData.core_features || ''}
                onChange={(e) => handleArrayChange('core_features', e.target.value)}
                className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                rows={4}
              />
            ) : (
              <ul className="space-y-2">
                {idea.structured_data?.core_features?.length > 0 ? (
                  idea.structured_data.core_features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))
                ) : (
                  <span className="text-gray-400 text-sm italic">待补充...</span>
                )}
              </ul>
            )}
          </div>

          {/* Value Proposition */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">核心价值</label>
            {isEditing ? (
              <textarea
                value={editData.value_proposition || ''}
                onChange={(e) => handleChange('value_proposition', e.target.value)}
                className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                rows={3}
              />
            ) : (
              <p className="text-sm text-gray-700 leading-relaxed">
                {idea.structured_data?.value_proposition || <span className="text-gray-400 italic">待补充...</span>}
              </p>
            )}
          </div>
          
          {/* Product Name */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">建议名称</label>
            {isEditing ? (
              <input
                type="text"
                value={editData.product_name || ''}
                onChange={(e) => handleChange('product_name', e.target.value)}
                className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            ) : (
              <div className="text-lg font-bold text-blue-900">
                {idea.structured_data?.product_name || <span className="text-gray-400 text-sm font-normal italic">待生成...</span>}
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="h-20 px-5 border-t border-gray-200 bg-white flex items-center">
          <button
            onClick={handleConvert}
            disabled={idea.status === 'converted'}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
              idea.status === 'converted'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white hover:shadow-lg transform active:scale-95'
            }`}
          >
            {idea.status === 'converted' ? (
              <>
                <span>已转化为产品</span>
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                <span>转化为正式产品</span>
              </>
            )}
          </button>
        </div>
      </div>
      </div>

      <Transition appear show={isShareModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsShareModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-bold leading-6 text-gray-900 flex items-center gap-2"
                    >
                      <Share2 className="w-5 h-5 text-blue-500" />
                      分享灵感
                    </Dialog.Title>
                    <button onClick={() => setIsShareModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-blue-900 text-sm mb-1">公开分享</h4>
                          <p className="text-xs text-blue-700 leading-relaxed">
                            开启后，任何人通过链接都可以查看此灵感的对话记录和产品蓝图。
                          </p>
                        </div>
                        <button
                          onClick={() => toggleShare(!idea.is_public)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            idea.is_public ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`${
                              idea.is_public ? 'translate-x-6' : 'translate-x-1'
                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                          />
                        </button>
                      </div>
                    </div>

                    {idea.is_public && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">分享链接</label>
                        <div className="flex gap-2">
                          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 truncate font-mono">
                            {shareUrl}
                          </div>
                          <button
                            onClick={copyShareLink}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors shadow-sm flex items-center justify-center min-w-[44px]"
                            title="复制链接"
                          >
                            {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <a
                            href={shareUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center min-w-[44px]"
                            title="打开链接"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Transition appear show={isConvertModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsConvertModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-gray-100">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-bold leading-6 text-gray-900 flex items-center gap-2"
                  >
                    <Rocket className="w-5 h-5 text-blue-500" />
                    确认转化为正式产品？
                  </Dialog.Title>
                  <div className="mt-3">
                    <p className="text-sm text-gray-500 leading-relaxed">
                      转化后将根据当前的蓝图信息创建一个新的产品项目。此操作将改变灵感状态，且不可撤销。
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 transition-colors"
                      onClick={() => setIsConvertModalOpen(false)}
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-xl border border-transparent bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors shadow-lg shadow-blue-200"
                      onClick={confirmConvert}
                    >
                      确认转化
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
