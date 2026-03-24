import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { executeSkill } from '../../services/skills';


const StyleWorkbench = ({ initialPersona, onSave, onBack }) => {
  // Input State
  const [inputText, setInputText] = useState('');
  
  // Basic Info State
  const [personaName, setPersonaName] = useState('公众号风格 · 示例');
  const [personaDesc, setPersonaDesc] = useState('技术前沿、逻辑严谨、实用导向、理性表达');
  
  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (initialPersona) {
      setPersonaName(initialPersona.name || '');
      setPersonaDesc(initialPersona.role_definition || '');
      setResult(initialPersona.style_dna || null);
    }
  }, [initialPersona]);

  // Listen for save event from parent header
  useEffect(() => {
    const handleSaveEvent = () => {
      handleSave();
    };
    document.addEventListener('save-persona', handleSaveEvent);
    return () => {
      document.removeEventListener('save-persona', handleSaveEvent);
    };
  }, [personaName, personaDesc, result, initialPersona]);

  const handleSave = () => {
    if (onSave) {
      onSave({
        id: initialPersona?.id,
        name: personaName,
        role_definition: personaDesc,
        style_dna: result || {}
      });
    }
  };

  const tabs = [
    { id: 'overview', label: '风格概述' },
    { id: 'methodology', label: '创作方法论' },
    { id: 'mindset', label: '思维内核' },
    { id: 'expression', label: '表达特征' },
    { id: 'habits', label: '创作习惯' },
    { id: 'signature', label: '独特标记' },
  ];

  const handleAnalyze = async () => {
    if (!inputText || inputText.length < 10) {
      setError('请输入至少10个字符的文本');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await executeSkill('extract_style_dna', {
        text: inputText,
        personaName: personaName || 'New Persona'
      });
      
      setResult(response.data.style_dna);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-full bg-white gap-6 p-6 overflow-hidden">
      {/* Left Panel: Basic Info & Control */}
      <div className="w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
        {/* Basic Info Section */}
        <div className="flex flex-col gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">基本信息</h3>
            
            <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">画像名称 (必填)</label>
              <input 
                type="text" 
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-800"
                placeholder="例如：科技博主风格"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">画像描述</label>
              <textarea 
                value={personaDesc}
                onChange={(e) => setPersonaDesc(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-800 h-24 resize-none"
                placeholder="简要描述该风格的核心特征..."
              />
            </div>
          </div>
        </div>
        </div>

        {/* Reference Materials / Input Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4">参考资料</h3>
          
          <div className="flex-1 flex flex-col gap-3 mb-4">
            {/* Mocked References List */}
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-sm text-indigo-900">
               <span className="flex-none text-lg">🔗</span>
               <span className="line-clamp-1 font-medium">一张图能装下多少文字？DeepSeek-OCR探索AI“读图机制”</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-sm text-indigo-900">
               <span className="flex-none text-lg">🔗</span>
               <span className="line-clamp-1 font-medium">Sora 2带来3个颠覆性创新，这个行业或将被彻底重构</span>
            </div>
             <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-sm text-indigo-900">
               <span className="flex-none text-lg">🔗</span>
               <span className="line-clamp-1 font-medium">ISA! 不等你开口就主动干活,实测ChatGPT Pulse三大特点</span>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-gray-600 mb-2">新增参考样文</label>
            <textarea
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm mb-3 h-32 resize-none"
              placeholder="请在此粘贴您希望模仿的文章片段..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !inputText}
              className={`w-full py-3 rounded-xl text-white font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                isAnalyzing || !inputText 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/30'
              }`}
            >
              {isAnalyzing ? '老 K 正在分析...' : '开始复盘'}
            </button>
            {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
          </div>
        </div>
      </div>

      {/* Right Panel: Content Display */}
      <div className="w-2/3 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        {/* Tabs Header */}
        <div className="flex items-center border-b border-gray-200 px-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {result ? (
            <div className="prose prose-indigo max-w-none">
              <ReactMarkdown 
                components={{
                  h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4 flex items-center gap-2" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-gray-700 mt-6 mb-3" {...props} />,
                  p: ({node, ...props}) => <p className="text-gray-600 leading-relaxed mb-4" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc list-outside ml-5 space-y-2 mb-4 text-gray-600" {...props} />,
                  li: ({node, ...props}) => <li className="pl-1" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-200 bg-indigo-50 py-3 px-4 rounded-r-lg italic text-gray-600 mb-6" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-bold text-indigo-900" {...props} />,
                }}
              >
                {result[activeTab] || '暂无内容'}
              </ReactMarkdown>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-3xl">
                    🧐
                </div>
                <p className="text-lg font-medium">等待开始分析</p>
                <p className="text-sm mt-2">请在左侧输入样文并点击“开始复盘”</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StyleWorkbench;
