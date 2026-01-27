import React, { useState } from 'react'
import { Sparkles, Loader2, Settings2 } from 'lucide-react'
import { useUI } from '../../context/UIContext'

export default function IdeaGenerator({ selectedAnalyses, productContext, onGenerateSuccess }) {
  const { showToast } = useUI()
  const [generating, setGenerating] = useState(false)
  const [tone, setTone] = useState('depth') // depth, emotion, business

  const tones = [
    { id: 'depth', label: '借势科普', desc: '侧重深度解析与知识输出', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'emotion', label: '情绪共鸣', desc: '侧重情感连接与观点表达', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    { id: 'business', label: '行业分析', desc: '侧重商业洞察与趋势研判', color: 'bg-amber-50 text-amber-700 border-amber-200' }
  ]

  const handleGenerate = async () => {
    if (selectedAnalyses.length === 0) return
    
    setGenerating(true)
    try {
      const res = await fetch('/api/trends/generate-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          analyses: selectedAnalyses,
          productContext,
          tone // Pass selected tone to backend
        })
      })
      const json = await res.json()
      if (json.data) {
        onGenerateSuccess(json.data, tone)
        showToast('选题方案已生成', 'success')
      }
    } catch (e) {
      console.error(e)
      showToast('生成选题失败，请重试', 'error')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="bg-white border-t border-gray-200 p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] z-30 relative">
      <div>
         {/* Tone Selection */}
         <div className="mb-2">
           <div className="flex items-center justify-between mb-2">
             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center">
               <Settings2 className="w-3.5 h-3.5 mr-1.5" />
               设定选题基调
             </label>
             <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
               已选素材: {selectedAnalyses.length}
             </span>
           </div>
           
           <div className="grid grid-cols-3 gap-2">
             {tones.map(t => (
               <button
                 key={t.id}
                 onClick={() => setTone(t.id)}
                 className={`text-left px-2 py-1.5 rounded-lg border transition-all duration-200 relative overflow-hidden group ${
                   tone === t.id 
                     ? `${t.color} ring-1 ring-current shadow-sm` 
                     : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                 }`}
               >
                 <div className={`text-xs font-bold mb-0.5 flex items-center justify-between ${tone === t.id ? 'opacity-100' : 'text-gray-700'}`}>
                   {t.label}
                   {tone === t.id && <Sparkles className="w-3 h-3 opacity-50" />}
                 </div>
                 <div className={`text-[10px] leading-tight truncate ${tone === t.id ? 'opacity-80' : 'text-gray-400'}`}>
                   {t.desc}
                 </div>
               </button>
             ))}
           </div>
         </div>

         <div className="pt-1">
           <button
             onClick={handleGenerate}
             disabled={selectedAnalyses.length === 0 || generating}
             className={`w-full flex items-center justify-center h-9 rounded-lg text-sm font-bold text-white shadow-lg transition-all duration-300 transform active:scale-[0.98] ${
               selectedAnalyses.length > 0 
                 ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] hover:bg-right animate-gradient' 
                 : 'bg-gray-200 cursor-not-allowed text-gray-400 shadow-none'
             }`}
           >
             {generating ? (
               <>
                 <Loader2 className="w-4 h-4 mr-2.5 animate-spin" />
                 正在基于 {selectedAnalyses.length} 个素材深度策划...
               </>
             ) : (
               <>
                 <Sparkles className="w-4 h-4 mr-2.5" />
                 立即生成选题方案
               </>
             )}
           </button>
        </div>
      </div>
    </div>
  )
}
