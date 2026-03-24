import React, { useState } from 'react';
import { PenTool, FileText, BarChart, Code, Layout, Loader2, Sparkles, Calculator, BrainCircuit } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { XiaohongshuDrawer } from './XiaohongshuDrawer';
import { EstimationModal } from './EstimationModal';
import { PrototypeConfigModal } from './PrototypeConfigModal';
import { RoadmapParseModal } from './RoadmapParseModal';

const GENERATION_CARDS = [
  { id: 'xiaohongshu', title: '小红书文案', icon: PenTool, desc: '生成 Emoji 风格的种草笔记', prompt: 'Role: 小红书爆款文案专家\nTask: 基于资料写一篇小红书笔记，多用 Emoji，语气活泼。' },
  { id: 'requirement_doc', title: '需求文档', icon: FileText, desc: 'AI引导撰写需求文档', prompt: null, isNew: true },
  { id: 'summary', title: '内容摘要', icon: FileText, desc: '快速提取核心观点和总结', prompt: 'Role: 资深分析师\nTask: 总结资料的核心内容，列出关键点。' },
  { id: 'roadmap', title: '产品路线图', icon: BarChart, desc: '生成 Mermaid 甘特图/路线图', prompt: 'Role: 产品经理\nTask: 基于资料生成产品路线图。使用 Mermaid gantt 语法。' },
  { id: 'architecture', title: '架构图', icon: Code, desc: '生成 HTML/Tailwind 架构图', prompt: 'Role: UI Engineer\nTask: Create a modern architecture diagram using HTML and Tailwind CSS. Use flexbox/grid for layout, cards with shadows, rounded corners, and gradients. Use inline SVGs for icons and connecting lines. Return a single HTML string with Tailwind CDN included.' },
  { id: 'prototype', title: 'UI 原型', icon: Layout, desc: '生成 HTML/Tailwind 界面原型', prompt: 'Role: Frontend Developer\nTask: Create a UI prototype based on the requirements. Use HTML and Tailwind CSS.\n\nIMPORTANT: Return ONLY the complete HTML code starting with <!DOCTYPE html> or <html>. Do NOT include any introduction text, explanations, or markdown code blocks. The response should be valid HTML that can be directly rendered in a browser.' },
  { id: 'estimation', title: '人工人天评估', icon: Calculator, desc: '人工逐条评估，AI按需辅助', prompt: null, isNew: true },
  { id: 'smart_estimation', title: 'AI智能人天评估', icon: BrainCircuit, desc: '像写需求文档一样生成评估网页', prompt: null, isNew: true }
];

export function GenerationGrid({ productId, sources, chatHistory, onNoteCreated, compact = false, onOpenRequirementDoc, onOpenSmartEstimation }) {
  const { showToast } = useUI();
  const [generatingId, setGeneratingId] = useState(null);
  const [isXiaohongshuOpen, setIsXiaohongshuOpen] = useState(false);
  const [isEstimationOpen, setIsEstimationOpen] = useState(false);
  const [isPrototypeConfigOpen, setIsPrototypeConfigOpen] = useState(false);
  const [isRoadmapParseOpen, setIsRoadmapParseOpen] = useState(false);
  const [pendingCard, setPendingCard] = useState(null);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [roadmapData, setRoadmapData] = useState(null);

  const handleGenerate = async (card, customConfig = null) => {
    // 需求文档使用特殊模式
    if (card.id === 'requirement_doc') {
      if (onOpenRequirementDoc) {
        onOpenRequirementDoc();
      }
      return;
    }

    if (card.id === 'smart_estimation') {
      if (sources.length === 0) {
        showToast('请先勾选或上传用于评估的资料', 'error');
        return;
      }

      onOpenSmartEstimation?.();
      return;
    }

    // 人天评估使用弹窗模式
    if (card.id === 'estimation') {
      if (sources.length === 0) {
        showToast('请先上传需求文档', 'error');
        return;
      }
      
      setIsEstimationOpen(true);
      return;
    }

    // 产品路线图使用AI解析弹窗模式
    if (card.id === 'roadmap') {
      if (sources.length === 0) {
        showToast('请先上传需求文档', 'error');
        return;
      }
      
      setIsRoadmapParseOpen(true);
      return;
    }

    // 小红书文案使用抽屉模式
    if (card.id === 'xiaohongshu') {
      if (sources.length === 0 && chatHistory.length === 0) {
        showToast('请先上传资料或输入对话内容', 'error');
        return;
      }
      
      // 直接打开抽屉，人设选择内置在抽屉中
      setIsXiaohongshuOpen(true);
      return;
    }

    // UI 原型使用配置弹窗模式
    if (card.id === 'prototype') {
      if (sources.length === 0 && chatHistory.length === 0) {
        showToast('请先上传资料或输入对话内容', 'error');
        return;
      }
      
      if (!customConfig) {
        // 首次点击，打开配置弹窗
        setPendingCard(card);
        setIsPrototypeConfigOpen(true);
        return;
      }
      // 从配置弹窗返回，继续生成
    }

    // 其他类型使用原有逻辑
    if (sources.length === 0 && chatHistory.length === 0) {
      showToast('请先上传资料或输入对话内容', 'error');
      return;
    }

    setGeneratingId(card.id);
    
    try {
      // 1. Create a pending note
      const noteRes = await fetch('http://localhost:3002/api/smart/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          title: `${card.title} - ${new Date().toLocaleTimeString()}`,
          content: '正在生成...',
          type: card.id,
          sourceRefs: sources.map(s => s.id)
        })
      });
      const noteData = await noteRes.json();
      const noteId = noteData.data.id;
      
      // Update local state immediately to show the new note
      onNoteCreated(noteData.data);

      // 2. Start Generation
      const sourceIds = sources.map(s => s.id);
      
      const response = await fetch('http://localhost:3002/api/smart/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          prompt: customConfig?.prompt || card.prompt,
          sourceIds, // Pass sourceIds for backend live data resolution
          context: `Chat History:\n${chatHistory.map(m => `${m.role}: ${m.content}`).join('\n')}` // Pass only chat history as context text
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            const dataStr = trimmedLine.slice(6);
            if (dataStr === '[DONE]') break;
            try {
              const data = JSON.parse(dataStr);
              if (data.content) {
                fullContent += data.content;
              }
            } catch {
              // Ignore malformed stream chunk and continue consuming.
            }
          }
        }
      }

      // 3. Update Note with final content
      await fetch(`http://localhost:3002/api/smart/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fullContent })
      });

      // Trigger refresh of that specific note in parent
      onNoteCreated({ ...noteData.data, content: fullContent }); 
      showToast('生成完成', 'success');

    } catch (error) {
      console.error('Generation failed:', error);
      showToast('生成失败', 'error');
    } finally {
      setGeneratingId(null);
    }
  };

  if (compact) {
    return (
      <>
        <div className="grid grid-cols-2 gap-2">
          {GENERATION_CARDS.map(card => (
            <button
              key={card.id}
              onClick={() => handleGenerate(card)}
              disabled={generatingId !== null}
              className={`flex items-center p-2 rounded-lg border transition-all text-left ${
                generatingId === card.id 
                  ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100' 
                  : 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-sm'
              } ${generatingId !== null && generatingId !== card.id ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`p-1.5 rounded-md mr-2 ${generatingId === card.id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-50 text-gray-600'}`}>
                {generatingId === card.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <card.icon className="w-3.5 h-3.5" />}
              </div>
              <span className="font-medium text-gray-700 text-xs truncate">{card.title}</span>
            </button>
          ))}
        </div>
        <XiaohongshuDrawer
          isOpen={isXiaohongshuOpen}
          onClose={() => setIsXiaohongshuOpen(false)}
          productId={productId}
          sources={sources}
          onNoteCreated={onNoteCreated}
          selectedPersona={selectedPersona}
          onChangePersona={setSelectedPersona}
        />
        <EstimationModal
          isOpen={isEstimationOpen}
          onClose={() => setIsEstimationOpen(false)}
          productId={productId}
          sources={sources}
          onEstimationComplete={(results) => {
            console.log('Estimation completed:', results);
          }}
          onNoteCreated={onNoteCreated}
        />
        <PrototypeConfigModal
          isOpen={isPrototypeConfigOpen}
          onClose={() => {
            setIsPrototypeConfigOpen(false);
            setPendingCard(null);
          }}
          sources={sources}
          chatHistory={chatHistory}
          onConfirm={async (config) => {
            if (pendingCard) {
              await handleGenerate(pendingCard, config);
              setPendingCard(null);
            }
          }}
        />
        <RoadmapParseModal
          isOpen={isRoadmapParseOpen}
          onClose={() => setIsRoadmapParseOpen(false)}
          sources={sources}
          onConfirm={(data) => {
            setRoadmapData(data);
            generateRoadmapNote(data);
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-amber-500" />
          智能生成
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {GENERATION_CARDS.map(card => (
            <button
              key={card.id}
              onClick={() => handleGenerate(card)}
              disabled={generatingId !== null}
              className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left relative ${
                generatingId === card.id
                  ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100'
                  : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5'
              } ${generatingId !== null && generatingId !== card.id ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {card.isNew && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-blue-500 text-white text-[10px] font-medium rounded">
                  NEW
                </span>
              )}
              <div className={`p-2 rounded-lg mb-3 ${generatingId === card.id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
                {generatingId === card.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <card.icon className="w-5 h-5" />}
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">{card.title}</h3>
              <p className="text-xs text-gray-500 leading-snug">{card.desc}</p>
            </button>
          ))}
        </div>
      </div>
      <XiaohongshuDrawer
        isOpen={isXiaohongshuOpen}
        onClose={() => setIsXiaohongshuOpen(false)}
        productId={productId}
        sources={sources}
        onNoteCreated={onNoteCreated}
        selectedPersona={selectedPersona}
        onChangePersona={setSelectedPersona}
      />
      <EstimationModal
        isOpen={isEstimationOpen}
        onClose={() => setIsEstimationOpen(false)}
        productId={productId}
        sources={sources}
        onEstimationComplete={(results) => {
          console.log('Estimation completed:', results);
        }}
        onNoteCreated={onNoteCreated}
      />
      <PrototypeConfigModal
        isOpen={isPrototypeConfigOpen}
        onClose={() => {
          setIsPrototypeConfigOpen(false);
          setPendingCard(null);
        }}
        sources={sources}
        chatHistory={chatHistory}
        onConfirm={async (config) => {
          if (pendingCard) {
            await handleGenerate(pendingCard, config);
            setPendingCard(null);
          }
        }}
      />
      <RoadmapParseModal
        isOpen={isRoadmapParseOpen}
        onClose={() => setIsRoadmapParseOpen(false)}
        sources={sources}
        onConfirm={(data) => {
          setRoadmapData(data);
          // 生成路线图笔记
          generateRoadmapNote(data);
        }}
      />
    </>
  );
}

// 生成路线图笔记
async function generateRoadmapNote(data) {
  // 这里可以实现生成路线图笔记的逻辑
  console.log('生成路线图:', data);
}
