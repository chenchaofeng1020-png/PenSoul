import React, { useState } from 'react';
import { Zap, Target, List, Heart, Flame, Sparkles, Check, FlaskConical, ArrowRight, Layers } from 'lucide-react';
import { useUI } from '../../context/UIContext';

// API helper
const API_BASE = import.meta.env.VITE_API_BASE || '';

const AngleLab = ({ selectedMaterials, currentUser, onGenerateStart, onGenerateSuccess, isGenerating }) => {
  const { showToast } = useUI();
  const [selectedModes, setSelectedModes] = useState([]);

  const toggleMode = (id) => {
    setSelectedModes(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const modes = [
    {
      id: 'counter_intuitive',
      icon: <Zap className="w-5 h-5 text-purple-500" />,
      title: '反常识/反直觉',
      desc: '挑战大众既定认知，制造冲突感',
    },
    {
      id: 'niche',
      icon: <Target className="w-5 h-5 text-blue-500" />,
      title: '极致细分/场景化',
      desc: '针对特定人群或具体场景切入',
    },
    {
      id: 'listicle',
      icon: <List className="w-5 h-5 text-green-500" />,
      title: '盘点/清单体',
      desc: '提供高密度信息增量',
    },
    {
      id: 'emotion',
      icon: <Heart className="w-5 h-5 text-pink-500" />,
      title: '情绪共鸣',
      desc: '侧重情感宣泄或抚慰',
    },
    {
      id: 'hotspot',
      icon: <Flame className="w-5 h-5 text-orange-500" />,
      title: '借势/蹭热点',
      desc: '强行关联当下最火的人或事',
    }
  ];

  const handleGenerate = async () => {
    if (selectedMaterials.length === 0) {
      showToast('请先从左侧选择至少1个素材', 'warning');
      return;
    }
    if (selectedModes.length === 0) {
      showToast('请选择至少一种加工模式', 'warning');
      return;
    }

    onGenerateStart();
    try {
      // Create a promise for each selected mode
      const promises = selectedModes.map(modeId => 
        fetch(`${API_BASE}/api/trends/generate-topic`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inspiration_ids: selectedMaterials.map(m => m.id),
            mode: modeId,
            user_id: currentUser?.id
          })
        }).then(async res => {
          const json = await res.json();
          return { modeId, json };
        })
      );

      const results = await Promise.all(promises);
      
      let allTopics = [];
      let hasError = false;

      results.forEach(({ modeId, json }) => {
        if (json.candidates) {
          const modeInfo = modes.find(m => m.id === modeId);
          const topics = json.candidates.map(c => ({
            ...c,
            mode: modeId,
            modeTitle: modeInfo?.title,
            topicId: json.topicId
          }));
          allTopics = [...allTopics, ...topics];
        } else {
          hasError = true;
        }
      });

      if (allTopics.length > 0) {
        onGenerateSuccess(allTopics);
        showToast('选题生成成功！', 'success');
      } else {
        throw new Error(results[0]?.json?.error || 'Unknown error');
      }
    } catch (err) {
      console.error(err);
      showToast('生成失败，请重试', 'error');
      onGenerateSuccess([]); // Reset loading state
    }
  };

  return (
    <div className="flex flex-col h-full relative">
       {/* Background Decoration */}
       <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white pointer-events-none" />

       {/* Header */}
       <div className="p-4 border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center space-x-2 text-gray-800 font-bold text-lg">
             <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600 shadow-sm">
                <FlaskConical className="w-4 h-4" />
             </div>
             <span>角度实验室</span>
          </div>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
             请选择加工模式（可多选），AI 将把左侧素材转化为右侧的爆款选题。
          </p>
       </div>

       {/* Input Status (Connecting from Left) */}
       <div className="px-4 py-3 bg-slate-50 border-b border-gray-200 flex items-center justify-between group cursor-help relative overflow-hidden transition-colors hover:bg-blue-50/30">
          <div className="flex items-center space-x-2 z-10">
             <Layers className="w-4 h-4 text-gray-400" />
             <span className="text-sm text-gray-600 font-medium">
                已选灵感 ({selectedMaterials.length})
             </span>
          </div>
          {selectedMaterials.length > 0 && (
             <div className="flex -space-x-2 z-10">
                {selectedMaterials.slice(0, 3).map((m, i) => (
                   <div key={m.id} className="w-6 h-6 rounded-full border-2 border-white bg-white shadow-sm flex items-center justify-center text-[10px] text-gray-500 shrink-0 overflow-hidden" title={m.content}>
                      {m.content[0]}
                   </div>
                ))}
                {selectedMaterials.length > 3 && (
                   <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 font-bold">
                      +{selectedMaterials.length - 3}
                   </div>
                )}
             </div>
          )}
          {/* Animated Connecting Line visual */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
       </div>

       {/* Scrollable Mode List */}
       <div className="flex-1 overflow-y-auto p-4 space-y-3 hover-scrollbar">
          {modes.map(mode => {
             const isSelected = selectedModes.includes(mode.id);
             return (
                <div
                   key={mode.id}
                   onClick={() => toggleMode(mode.id)}
                   className={`
                      relative p-3 rounded-xl border-2 transition-all duration-300 cursor-pointer group select-none
                      ${isSelected 
                         ? 'border-blue-500 bg-white shadow-lg shadow-blue-500/10 scale-[1.02] z-10' 
                         : 'border-transparent bg-white shadow-sm hover:border-blue-200 hover:shadow-md hover:scale-[1.01]'}
                   `}
                >
                   <div className="flex items-start space-x-3">
                      <div className={`
                         p-2.5 rounded-xl transition-colors duration-300 shrink-0
                         ${isSelected ? 'bg-blue-50 ring-1 ring-blue-100' : 'bg-gray-50 group-hover:bg-blue-50'}
                      `}>
                         {mode.icon}
                      </div>
                      <div className="flex-1 min-w-0 py-0.5">
                         <h3 className={`font-bold text-sm truncate ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                            {mode.title}
                         </h3>
                         <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            {mode.desc}
                         </p>
                      </div>
                      {isSelected && (
                         <div className="text-blue-500 animate-in zoom-in duration-300 flex items-center h-full">
                            <Check className="w-5 h-5" strokeWidth={3} />
                         </div>
                      )}
                   </div>
                </div>
             );
          })}
       </div>

       {/* Footer Action (Output Trigger) */}
       <div className="p-4 border-t border-gray-200 bg-white z-20">
          <button
             onClick={handleGenerate}
             disabled={isGenerating || selectedMaterials.length === 0 || selectedModes.length === 0}
             className={`
                w-full py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 relative overflow-hidden group
                ${isGenerating || selectedMaterials.length === 0 || selectedModes.length === 0
                   ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                   : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]'}
             `}
          >
             {isGenerating ? (
                <>
                   <Sparkles className="animate-spin" size={18} />
                   <span>正在分析...</span>
                </>
             ) : (
                <>
                   <span className="relative z-10 flex items-center">
                      开始分析
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                   </span>
                   {/* Shine effect */}
                   <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
                </>
             )}
          </button>
       </div>
       
       <style>{`
          @keyframes shimmer {
            100% {
              transform: translateX(100%);
            }
          }
       `}</style>
    </div>
  );
};

export default AngleLab;