import { useState, useEffect } from 'react'
import { Sparkles, X, Wand2, Lightbulb, Copy, Check } from 'lucide-react'
import { useUI } from '../context/UIContext'

export default function AiPositioningAssistant({ isOpen, onClose, currentPositioning, onApply, initialData }) {
  const { showToast } = useUI()
  const [mode, setMode] = useState('optimize') // 'optimize' | 'guide'
  const [selectedModel, setSelectedModel] = useState('deepseek') // 'doubao' | 'deepseek'
  const [generatedOptions, setGeneratedOptions] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(null)
  
  // Guide mode inputs
  const [guideForm, setGuideForm] = useState({
    targetAudience: '',
    painPoint: '',
    category: '',
    keyBenefit: '',
    competitor: '',
    differentiation: ''
  })

  useEffect(() => {
    if (isOpen && initialData) {
      setGuideForm(prev => ({
        ...prev,
        targetAudience: initialData.targetAudience || prev.targetAudience,
        painPoint: initialData.painPoint || prev.painPoint,
        category: initialData.category || prev.category,
        keyBenefit: initialData.keyBenefit || prev.keyBenefit,
        competitor: initialData.competitor || prev.competitor,
        differentiation: initialData.differentiation || prev.differentiation
      }))
    }
  }, [isOpen, initialData])

  if (!isOpen) return null

  const handleGenerate = async () => {
    setIsGenerating(true)
    
    try {
      const res = await fetch('http://localhost:3001/api/ai/suggest-positioning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          currentContent: currentPositioning,
          guideData: guideForm,
          model: selectedModel
        })
      })
      const data = await res.json()
      if (data.error) {
        showToast('生成失败: ' + data.error, 'error')
        return
      }
      setGeneratedOptions(data.options || [])
    } catch (e) {
      showToast('网络请求失败，请检查后端服务是否启动', 'error')
      console.error(e)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white rounded-t-xl">
          <div className="flex items-center gap-2 text-blue-700">
            <Sparkles className="w-5 h-5" />
            <h2 className="font-semibold text-lg">AI 产品定位助手</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Model Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">选择 AI 模型</label>
            <div className="flex gap-3">
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition ${selectedModel === 'doubao' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  name="model"
                  value="doubao"
                  checked={selectedModel === 'doubao'}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="hidden"
                />
                <span className="font-medium text-sm">Doubao 1.5 Pro</span>
              </label>
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition ${selectedModel === 'deepseek' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  name="model"
                  value="deepseek"
                  checked={selectedModel === 'deepseek'}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="hidden"
                />
                <span className="font-medium text-sm">DeepSeek R1</span>
              </label>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-lg mb-6 w-fit">
            <button
              onClick={() => { setMode('optimize'); setGeneratedOptions([]) }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${mode === 'optimize' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              现有内容润色
            </button>
            <button
              onClick={() => { setMode('guide'); setGeneratedOptions([]) }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${mode === 'guide' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              向导式生成
            </button>
          </div>

          {/* Input Area */}
          <div className={generatedOptions.length > 0 ? "mb-8" : "mb-0"}>
            {mode === 'optimize' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">当前定位内容</label>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm min-h-[80px]">
                  {currentPositioning || '暂无内容，建议切换到“向导式生成”模式从头开始。'}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">目标客户 (Target Audience)</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="例如：中小型电商卖家"
                    value={guideForm.targetAudience}
                    onChange={e => setGuideForm({...guideForm, targetAudience: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">核心痛点 (Pain Point)</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="例如：无法高效管理多平台订单"
                    value={guideForm.painPoint}
                    onChange={e => setGuideForm({...guideForm, painPoint: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">产品品类 (Category)</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="例如：ERP SaaS"
                    value={guideForm.category}
                    onChange={e => setGuideForm({...guideForm, category: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">核心利益 (Key Benefit)</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="例如：自动化同步库存"
                    value={guideForm.keyBenefit}
                    onChange={e => setGuideForm({...guideForm, keyBenefit: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">主要竞品 (Competitor)</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="例如：Excel表格"
                    value={guideForm.competitor}
                    onChange={e => setGuideForm({...guideForm, competitor: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">差异化优势 (Differentiation)</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="例如：开箱即用，无需部署"
                    value={guideForm.differentiation}
                    onChange={e => setGuideForm({...guideForm, differentiation: e.target.value})}
                  />
                </div>
              </div>
            )}
            
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 border border-gray-300 rounded-lg transition"
              >
                取消
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
              >
                {isGenerating ? (
                  <>
                    <Wand2 className="w-4 h-4 animate-spin" />
                    正在思考...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    开始生成
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Area */}
          {generatedOptions.length > 0 && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 text-gray-900 font-medium">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                AI 生成建议
              </div>
              <div className="grid grid-cols-1 gap-4">
                {generatedOptions.map((option, idx) => (
                  <div key={idx} className="bg-white border border-blue-100 rounded-xl p-5 shadow-sm hover:shadow-md transition hover:border-blue-200 group relative">
                    <div className="flex justify-between items-start mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {option.type}
                      </span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                        <button 
                          onClick={() => handleCopy(option.content, idx)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition"
                          title="复制"
                        >
                          {copiedIndex === idx ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-800 text-sm leading-relaxed mb-3 whitespace-pre-wrap">
                      {option.content}
                    </p>
                    <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                      <span className="text-xs text-gray-400 flex-1 mr-4">{option.desc}</span>
                      <button
                        onClick={() => onApply(option.content, mode === 'guide' ? guideForm : null)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap flex-shrink-0"
                      >
                        采纳此方案
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}