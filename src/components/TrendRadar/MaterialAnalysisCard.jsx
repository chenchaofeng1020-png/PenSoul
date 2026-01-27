import React, { useState, useEffect } from 'react'
import { Brain, Lightbulb, MessageCircle, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Zap, Tag, ExternalLink } from 'lucide-react'
import { useUI } from '../../context/UIContext'

// Value Tags Component
const ValueTags = ({ tags }) => {
  if (!tags || tags.length === 0) return null
  
  return (
    <div className="flex flex-wrap gap-1 mt-2 mb-2">
      {tags.map((tag, i) => (
        <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <Tag className="w-3 h-3 mr-1" />
          {tag}
        </span>
      ))}
    </div>
  )
}

export default function MaterialAnalysisCard({ material, productContext, isSelected, onToggleSelect, tags }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [expanded, setExpanded] = useState(false)
  
  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      // In real implementation, call fetch('/api/trends/analyze-material', ...)
      const res = await fetch('/api/trends/analyze-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material, productContext })
      })
      const json = await res.json()
      setAnalysis(json.data)
    } catch (e) {
      console.error(e)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className={`rounded-lg transition-all duration-300 ${isSelected ? 'border border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'bg-gray-50/50 hover:bg-gray-100'}`}>
      <div className="p-4">
        {/* Header: Raw Material Summary */}
        <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-start space-x-3 flex-1">
             <div className="flex-shrink-0 mt-1">
               {isSelected ? (
                 <CheckCircle2 className="w-5 h-5 text-indigo-600" />
               ) : (
                 <div className="w-5 h-5 rounded-full border-2 border-gray-300" onClick={(e) => { e.stopPropagation(); onToggleSelect(); }} />
               )}
             </div>
             <div className="flex-1 min-w-0">
               <div className="flex items-center justify-between mb-1">
                 <h4 className="text-sm font-medium text-gray-900 leading-snug truncate">
                   {material.title || (material.content ? material.content.slice(0, 20) + '...' : '素材片段')}
                 </h4>
                 <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">
                   {material.source || '未知来源'}
                 </span>
               </div>
               
               {/* Pre-analysis Tags */}
               <ValueTags tags={tags} />
               
               <p className={`text-sm text-gray-700 mt-2 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
                {material.content || material.summary || '暂无摘要...'}
              </p>
              
              {/* External Link */}
              {expanded && material.url && (material.url.startsWith('http') || material.url.startsWith('https')) && (
                <div className="mt-3 flex justify-end">
                   <a 
                     href={material.url} 
                     target="_blank" 
                     rel="noreferrer"
                     className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center bg-indigo-50 px-2 py-1 rounded transition-colors"
                     onClick={(e) => e.stopPropagation()}
                   >
                     查看原文 <ExternalLink className="w-3 h-3 ml-1" />
                   </a>
                </div>
              )}
             </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600 ml-2 mt-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Expanded: AI Analysis */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-200/50 pl-0">
             {analyzing ? (
               <div className="flex items-center space-x-2 text-sm text-indigo-600 animate-pulse">
                 <Brain className="w-4 h-4" />
                 <span>AI 正在解构素材 (PAS-C模型)...</span>
               </div>
             ) : analysis ? (
               <div className="space-y-3">
                 <div className="grid grid-cols-2 gap-3">
                   <div className="bg-gray-50 p-2 rounded text-xs">
                     <span className="text-gray-400 block mb-1">现象 (Phenomenon)</span>
                     <span className="text-gray-700">{analysis.phenomenon}</span>
                   </div>
                   <div className="bg-gray-50 p-2 rounded text-xs">
                     <span className="text-gray-400 block mb-1">情绪 (Sentiment)</span>
                     <span className="text-gray-700">{analysis.sentiment}</span>
                   </div>
                 </div>
                 
                 <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                    <div className="flex items-start space-x-2">
                      <Zap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-blue-700 block mb-1">与【{productContext.name}】的连接点</span>
                        <p className="text-xs text-blue-800 leading-relaxed">{analysis.connection_point}</p>
                      </div>
                    </div>
                 </div>
                 
                 {!isSelected && (
                   <button 
                     onClick={onToggleSelect}
                     className="w-full mt-2 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50 transition-colors"
                   >
                     采纳此分析点
                   </button>
                 )}
               </div>
             ) : (
              <div className="flex flex-col items-center justify-center py-6 bg-indigo-50/50 rounded-lg border border-dashed border-indigo-200 mt-2">
                 <p className="text-xs text-gray-500 mb-3">想要深入挖掘该素材与产品的结合点？</p>
                 <button 
                   onClick={handleAnalyze} 
                   className="flex items-center px-4 py-2 bg-white border border-indigo-200 text-indigo-600 text-xs font-bold rounded-full shadow-sm hover:bg-indigo-50 hover:border-indigo-300 transition-all transform hover:-translate-y-0.5"
                 >
                   <Brain className="w-3.5 h-3.5 mr-1.5" />
                   AI 深度解构 & 分析
                 </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
