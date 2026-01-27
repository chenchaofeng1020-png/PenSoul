import React, { useState, useEffect } from 'react';
import { ArrowRight, BookOpen, ChevronRight, Copy, Check, Loader2, PenTool, X, Sparkles } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import ReactMarkdown from 'react-markdown';

// API helper
const API_BASE = import.meta.env.VITE_API_BASE || '';

const TopicResults = ({ topics, isGenerating, currentUser, onCreatePlan }) => {
  const { showToast } = useUI();
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(null);
  const [isGeneratingFramework, setIsGeneratingFramework] = useState(false);
  const [framework, setFramework] = useState(null);
  const [loadingText, setLoadingText] = useState('正在分析当前热点趋势...');
  const [cachedFrameworks, setCachedFrameworks] = useState(() => {
    try {
        const saved = localStorage.getItem('topic_frameworks_cache');
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.error('Error loading cache:', e);
        return {};
    }
  });

  const updateCache = (topicId, content) => {
      setCachedFrameworks(prev => {
          const next = { ...prev, [topicId]: content };
          try {
              localStorage.setItem('topic_frameworks_cache', JSON.stringify(next));
          } catch (e) {
              console.error('Error saving cache:', e);
          }
          return next;
      });
  };

  // Reset selection when topics change
  useEffect(() => {
    setSelectedTopicIndex(null);
    setFramework(null);
    // Do not clear cache when topics change to persist data across page views
  }, [topics]);

  useEffect(() => {
    if (!isGenerating) return;
    
    const texts = [
      '正在分析当前热点趋势...',
      '正在结合您的账号风格...',
      '正在构思核心观点...',
      '正在打磨标题吸引力...',
      '正在生成最终方案...'
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % texts.length;
      setLoadingText(texts[index]);
    }, 1500);
    
    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    if (framework) {
        console.log('Framework content:', framework);
    }
  }, [framework]);

  const handleSelectTopic = async (index, forceRegenerate = false) => {
    setSelectedTopicIndex(index);
    const topic = topics[index];
    
    // Check cache first
    if (!forceRegenerate && cachedFrameworks[topic.topicId]) {
        setFramework(cachedFrameworks[topic.topicId]);
        return;
    }

    setFramework(null); // Clear previous framework
    
    // Auto-generate framework for selected topic
    setIsGeneratingFramework(true);
    
    try {
      const res = await fetch(`${API_BASE}/api/trends/generate-framework`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: topic.topicId,
          selectedCandidateIndex: index,
          selectedCandidate: topic
        })
      });
      const json = await res.json();
      if (json.outline) {
        let content = json.outline;
        // Robust check: if object (legacy format), convert to markdown string
        if (typeof content === 'object') {
           try {
              let md = `# ${topic.title}\n\n`;
              // Try to find hook (case insensitive)
              const hook = content.hook || content.Hook || content.HOOK;
              if (hook) md += `## Hook\n${hook}\n\n`;
              
              // Try to find body
              const body = content.body || content.Body || content.BODY || [];
              if (Array.isArray(body) && body.length > 0) {
                  md += `## Body\n`;
                  body.forEach(b => {
                      const point = b.point || b.Point || b.title || '';
                      const support = b.support || b.Support || b.content || '';
                      if (point) md += `- ${point}\n`;
                      if (support) md += `  > ${support}\n`;
                  });
                  md += '\n';
              }
              
              // Try to find conclusion
              const conclusion = content.conclusion || content.Conclusion || content.CONCLUSION;
              if (conclusion) md += `## Conclusion\n${conclusion}`;
              
              // If we only have title, maybe the object structure is completely different?
              // Fallback: dump the object as code block if md is too short
              if (md.length < topic.title.length + 20) {
                  md += `\n\n\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\``;
              }
              
              content = md;
           } catch (e) {
              console.error('Error converting outline object to markdown:', e);
              content = `# ${topic.title}\n\nError parsing content:\n\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\``;
           }
        }
        const finalContent = String(content);
        setFramework(finalContent);
        updateCache(topic.topicId, finalContent);
      }
    } catch (err) {
      console.error(err);
      showToast('大纲生成失败', 'error');
    } finally {
      setIsGeneratingFramework(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('已复制到剪贴板', 'success');
  };

  const handleCreatePlan = () => {
    if (!framework) return;
    const topic = topics[selectedTopicIndex];
    
    if (onCreatePlan) {
        onCreatePlan({
            title: topic.title,
            core_view: topic.core_view,
            outline: framework // Now a markdown string
        });
    }
  };

  if (isGenerating) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 relative overflow-hidden">
        {/* Background Animation */}
        <div className="absolute inset-0 bg-blue-50/30 animate-pulse" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-blue-100 relative">
            <div className="absolute inset-0 rounded-full border-4 border-blue-50 border-t-blue-500 animate-spin" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-2 rounded-full border-4 border-indigo-50 border-b-indigo-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }} />
            <Sparkles className="w-8 h-8 text-blue-600 animate-pulse" />
          </div>
          
          <h3 className="text-xl font-bold text-gray-800 mb-2">正在疯狂构思中...</h3>
          
          <div className="h-8 flex items-center justify-center overflow-hidden">
            <p key={loadingText} className="text-sm text-blue-600 font-medium animate-bounce">
              {loadingText}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!topics || topics.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-300">
        <BookOpen size={48} className="mb-4 opacity-20" />
        <p>暂无生成结果</p>
        <p className="text-sm mt-1">请在左侧选择素材并开始生成</p>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      {/* List of Topic Cards */}
      <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto pb-20">
        <div className="flex items-center space-x-2 text-gray-800 font-bold text-lg mb-4">
           <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600 shadow-sm">
              <Sparkles className="w-4 h-4" />
           </div>
           <span>生成的选题方案</span>
           <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{topics.length}</span>
        </div>
        
        {topics.map((topic, index) => (
          <div 
            key={index}
            className={`
              p-5 rounded-xl border-2 transition-all hover:shadow-lg group flex flex-col
              ${selectedTopicIndex === index 
                ? 'border-blue-500 bg-white ring-4 ring-blue-500/10' 
                : 'border-gray-100 bg-white hover:border-blue-200'}
            `}
          >
            {topic.modeTitle && (
              <div className="mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  {topic.modeTitle}
                </span>
              </div>
            )}

            <div className="flex justify-between items-start mb-2">
               <h3 className="text-lg font-bold text-gray-900 leading-snug">
                 {topic.title}
               </h3>
               {selectedTopicIndex === index && <Check className="text-blue-500 flex-shrink-0 ml-2" size={20} />}
            </div>
            
            <div className="mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">核心观点</span>
              <p className="text-sm text-gray-700 mt-1">{topic.core_view}</p>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4 flex-1">
               <span className="text-xs font-bold text-blue-600 flex items-center mb-1">
                 <Sparkles className="w-3 h-3 mr-1" /> 推荐理由
               </span>
               <p className="text-xs text-gray-600 leading-relaxed">{topic.rationale}</p>
            </div>

            <button
              onClick={() => handleSelectTopic(index)}
              className={`w-full py-2 border text-sm font-bold rounded-lg transition-all flex items-center justify-center shadow-sm hover:shadow-md ${
                  cachedFrameworks[topic.topicId] 
                  ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
                  : 'bg-white border-gray-200 hover:border-blue-500 hover:text-blue-600 text-gray-600'
              }`}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              {cachedFrameworks[topic.topicId] ? '查看大纲' : '生成大纲'}
            </button>
          </div>
        ))}
      </div>

      {/* Drawer Overlay */}
      {selectedTopicIndex !== null && (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
                onClick={() => setSelectedTopicIndex(null)}
            />
            
            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 w-[600px] bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/50 sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">深度成文大纲</h2>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">基于选题：{topics[selectedTopicIndex].title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={() => handleSelectTopic(selectedTopicIndex, true)}
                            disabled={isGeneratingFramework}
                            className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${isGeneratingFramework ? 'opacity-50 cursor-not-allowed' : 'text-gray-500 hover:text-blue-600'}`}
                            title="重新生成大纲"
                         >
                            <Sparkles size={20} className={isGeneratingFramework ? "animate-spin" : ""} />
                         </button>
                         <button 
                            onClick={() => {
                               if (!framework) return;
                               copyToClipboard(framework);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600 transition-colors"
                            title="复制大纲"
                         >
                            <Copy size={20} />
                         </button>
                        <button 
                            onClick={() => setSelectedTopicIndex(null)}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 hover-scrollbar">
                    {isGeneratingFramework ? (
                        <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                            <p>正在规划文章结构...</p>
                        </div>
                    ) : framework ? (
                        <div className="pb-10 px-2" style={{ minHeight: '100px' }}>
                            <div className="prose prose-blue max-w-none text-gray-800">
                                <ReactMarkdown
                                    components={{
                                        h1: ({children}) => <h1 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100">{children}</h1>,
                                        h2: ({children}) => <h2 className="text-lg font-bold text-gray-800 mt-8 mb-4 flex items-center"><span className="w-1.5 h-6 bg-blue-600 rounded-full mr-3"></span>{children}</h2>,
                                        ul: ({children}) => <ul className="space-y-4 my-4">{children}</ul>,
                                        li: ({children}) => <li className="list-none bg-gray-50 p-4 rounded-lg border border-gray-100">{children}</li>,
                                        p: ({children}) => <p className="text-gray-600 leading-7 mb-2">{children}</p>,
                                        blockquote: ({children}) => (
                                            <div className="mt-2 pl-4 border-l-4 border-blue-200 bg-blue-50/50 py-2 pr-4 rounded-r text-sm text-gray-500 italic">
                                                {children}
                                            </div>
                                        )
                                    }}
                                >
                                    {framework}
                                </ReactMarkdown>
                            </div>
                            
                            {/* Debug View - visible in dev or if content seems short */}
                            <details className="mt-8 pt-4 border-t border-gray-200">
                                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">查看原始内容 (Debug)</summary>
                                <pre className="mt-2 p-4 bg-gray-800 text-gray-100 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                                    {framework}
                                </pre>
                            </details>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-red-400">生成失败，请重试</div>
                    )}
                </div>
                
                {/* Footer with Create Button */}
                {framework && (
                    <div className="p-6 border-t border-gray-100 bg-gray-50">
                        <button
                            onClick={handleCreatePlan}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center"
                        >
                            <PenTool className="w-5 h-5 mr-2" />
                            一键创建内容计划
                        </button>
                    </div>
                )}
            </div>
        </>
      )}
    </div>
  );
};

// Simple Icon Component
const SparklesIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor"/>
  </svg>
);

export default TopicResults;
