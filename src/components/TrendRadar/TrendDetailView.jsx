import React, { useState, useEffect } from 'react'
import { ArrowLeft, ExternalLink, Info, Filter, Sparkles, FileText, X, Search } from 'lucide-react'
import MaterialAnalysisCard from './MaterialAnalysisCard'
import IdeaGenerator from './IdeaGenerator'
import Drawer from '../ui/Drawer'

export default function TrendDetailView({ trend, onBack, productContext, onCreatePlan }) {
  const [materials, setMaterials] = useState([])
  const [selectedAnalysisIds, setSelectedAnalysisIds] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  
  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [generatedIdeas, setGeneratedIdeas] = useState([])
  const [generatedTone, setGeneratedTone] = useState('')

  // Reset state when trend changes
  useEffect(() => {
    setMaterials([])
    setHasFetched(false)
    setLoading(false)
    setSelectedAnalysisIds(new Set())
  }, [trend?.id])

  const handleStartMining = () => {
    if (!trend) return
    setLoading(true)
    setHasFetched(true)

    // 1. Load initial materials from trend object
    const initialMaterials = (trend.materials || []).map((m, idx) => ({
      ...m,
      id: m.id || `mat-init-${idx}-${Date.now()}`
    }))
    
    // 2. Fetch more materials from server
    fetch('/api/trends/fetch-materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: trend.title })
    })
    .then(res => res.json())
    .then(json => {
      let newMaterials = []
      if (json.data && Array.isArray(json.data)) {
        newMaterials = json.data.map((m, idx) => ({
          ...m,
          id: m.id || `mat-fetched-${idx}-${Date.now()}`
        }))
      }
      setMaterials([...initialMaterials, ...newMaterials])
    })
    .catch(err => {
      console.error('Failed to fetch more materials:', err)
      setMaterials(initialMaterials) // Fallback to initial
    })
    .finally(() => {
      setLoading(false)
    })
  }

  const toggleSelection = (material) => {
    const id = material.id
    const newSet = new Set(selectedAnalysisIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedAnalysisIds(newSet)
  }

  const handleIdeasGenerated = (ideas, tone) => {
    setGeneratedIdeas(ideas)
    setGeneratedTone(tone)
    setIsDrawerOpen(true)
  }

  // Prepare data for IdeaGenerator
  const selectedAnalyses = materials
    .filter(m => selectedAnalysisIds.has(m.id))
    .map(m => ({
      phenomenon: m.content,
      angle: m.type === 'depth' ? '深度视角' : m.type === 'emotion' ? '情绪视角' : '行业视角',
      connection_point: "用户选中的关键素材",
      tags: m.tags
    }))

  if (!trend) return null

  const toneLabels = {
    depth: '借势科普',
    emotion: '情绪共鸣',
    business: '行业分析'
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden relative">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 z-10">
        <h1 className="text-xl font-bold text-gray-900 leading-tight mb-1 pr-8 font-display">
          {trend.title}
        </h1>
        
        {/* AI Summary Block - Hidden by user request
        {trend.summary && (
          <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-lg border border-indigo-100 mb-4 shadow-sm">
             <div className="flex items-start gap-2">
               <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
               <div>
                 <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide mb-1">AI 深度聚合摘要</h4>
                 <p className="text-sm text-gray-800 leading-relaxed font-medium">
                   {trend.summary}
                 </p>
               </div>
             </div>
          </div>
        )}
        */}
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
             {trend.url && (
               <a href={trend.url} target="_blank" rel="noreferrer" className="flex items-center hover:text-indigo-600 transition-colors border-b border-transparent hover:border-indigo-600 pb-0.5">
                 查看原始链接 <ExternalLink className="w-3 h-3 ml-1" />
               </a>
             )}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 pb-40">
        <div className="max-w-4xl mx-auto h-full">
          
          {/* State 1: Not Fetched (Start Button) */}
          {!hasFetched && !loading && (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-indigo-100">
                <Search className="w-10 h-10 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">准备好挖掘“{trend.title}”了吗？</h2>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-8 leading-relaxed">
                点击下方按钮，AI 将立即为您实时抓取全网相关的高价值素材，并进行深度解构。
              </p>
              <button
                onClick={handleStartMining}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                开始全网深度挖掘
              </button>
            </div>
          )}

          {/* State 2: Loading (Cool Animation) */}
          {loading && (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <div className="relative w-32 h-32 mb-8">
                 <div className="absolute inset-0 border-4 border-indigo-100 rounded-full animate-ping opacity-75"></div>
                 <div className="absolute inset-0 border-4 border-indigo-200 rounded-full animate-pulse"></div>
                 <div className="absolute inset-2 border-2 border-indigo-500/30 rounded-full flex items-center justify-center overflow-hidden bg-indigo-50/30 backdrop-blur-sm">
                    <div className="w-full h-1/2 bg-gradient-to-b from-transparent to-indigo-500/20 animate-[spin_2s_linear_infinite] origin-bottom"></div>
                 </div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-indigo-600 animate-bounce" />
                 </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">全网素材深度挖掘中...</h3>
              <p className="text-sm text-gray-500 animate-pulse">正在扫描 微博、知乎、36Kr 等平台数据</p>
            </div>
          )}

          {/* State 3: Results List */}
          {hasFetched && !loading && (
            <>
              {materials.length > 0 ? (
                <div className="space-y-4">
                  {materials.map((material, idx) => (
                    <MaterialAnalysisCard
                      key={material.id || idx}
                      material={material}
                      productContext={productContext}
                      isSelected={selectedAnalysisIds.has(material.id)}
                      onToggleSelect={() => toggleSelection(material)}
                      tags={material.tags}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Filter className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">未找到相关素材</p>
                  <button onClick={handleStartMining} className="text-indigo-600 text-sm mt-2 hover:underline">重试</button>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* Footer: Idea Generator (Only show when we have fetched materials) */}
      {hasFetched && !loading && materials.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <IdeaGenerator 
            selectedAnalyses={selectedAnalyses}
            productContext={productContext}
            onGenerateSuccess={handleIdeasGenerated}
          />
        </div>
      )}

      {/* Ideas Result Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={
          <div className="flex items-center">
            <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
            <span>AI 选题方案 · {toneLabels[generatedTone] || '推荐'}</span>
          </div>
        }
        width="w-[600px]"
      >
        <div className="space-y-6 pb-10">
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 text-sm text-purple-800">
            已基于您选择的 <span className="font-bold">{selectedAnalyses.length}</span> 个素材，为您策划了以下 3 个差异化选题方向。
          </div>

          {generatedIdeas.map((idea, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles className="w-24 h-24 text-purple-600 rotate-12" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {idea.type}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-3 leading-snug">
                  {idea.title}
                </h3>
                
                <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-600 italic border-l-2 border-indigo-400">
                  “{idea.core_view}”
                </div>
                
                <div className="space-y-2 mb-6">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">内容大纲</h4>
                  <ul className="space-y-2">
                    {idea.outline.map((line, i) => (
                      <li key={i} className="flex items-start text-sm text-gray-700">
                        <span className="mr-2 text-indigo-400 mt-0.5">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => {
                    onCreatePlan(idea)
                    setIsDrawerOpen(false)
                  }}
                  className="w-full flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm hover:shadow"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  采用此方案并创建计划
                </button>
              </div>
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  )
}
