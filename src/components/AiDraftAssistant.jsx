import { useState, useEffect } from 'react'
import { Sparkles, PenTool, Loader2, ChevronDown, ChevronUp, Palette, User, X, UserCheck, CheckCircle } from 'lucide-react'
 
import { PLATFORM_MAP } from '../constants/platforms'
import PlatformBadge from './PlatformBadge'
import { useUI } from '../context/UIContext'
import Drawer from './ui/Drawer'

export default function AiDraftAssistant({ currentProduct, composeItem, topic, platform, onDraftGenerated }) {
  const { showToast } = useUI()
  const [isOpen, setIsOpen] = useState(true)
  const [model, setModel] = useState('deepseek')
  const [isLoading, setIsLoading] = useState(false)
  
  const [outline, setOutline] = useState('')

  // Style Cloning State
  const [userStyle, setUserStyle] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showStyleInput, setShowStyleInput] = useState(false)
  const [sampleText, setSampleText] = useState('')

  // Mode State
  const [mode, setMode] = useState('create') // 'create' | 'refine' | 'proofread'

  const [generatedContent, setGeneratedContent] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const handleProofread = async () => {
    if (!composeItem?.body || composeItem.body.length < 5) {
      showToast('请先在编辑器中输入需要校对的内容 (至少5个字)', 'warning')
      return
    }
    setIsLoading(true)
    setGeneratedContent('')
    setShowPreview(false)
    try {
      const res = await fetch('/api/ai/proofread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: composeItem.body,
          model
        })
      })

      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        throw new Error(res.ok ? 'Invalid server response' : `Server Error: ${res.status}`)
      }

      if (!res.ok) throw new Error(data.error || 'Proofread failed')
      
      if (data.content) {
        setGeneratedContent(data.content)
        setShowPreview(true)
        setIsOpen(true)
      }
    } catch (e) {
      showToast('校对失败: ' + e.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefine = async () => {
    if (!composeItem?.body || composeItem.body.length < 10) {
      showToast('请先在编辑器中输入需要润色的内容 (至少10个字)', 'warning')
      return
    }
    setIsLoading(true)
    setGeneratedContent('')
    setShowPreview(false)
    try {
      const activePlatform = platform || composeItem?.platform || 'wechat_mp'
      const res = await fetch('/api/ai/refine-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: composeItem.body,
          platform: activePlatform,
          model,
          userStyle
        })
      })

      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        throw new Error(res.ok ? 'Invalid server response' : `Server Error: ${res.status}`)
      }

      if (!res.ok) throw new Error(data.error || 'Refinement failed')
      
      if (data.content) {
        setGeneratedContent(data.content)
        setShowPreview(true)
        setIsOpen(true)
      }
    } catch (e) {
      showToast('润色失败: ' + e.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // Load style from local storage
  useEffect(() => {
    const savedStyle = localStorage.getItem('user_writing_style')
    if (savedStyle) setUserStyle(savedStyle)
  }, [])

  // Analyze function
  const handleAnalyzeStyle = async () => {
    if (!sampleText || sampleText.length < 50) {
      showToast('请至少输入50字以上的样文', 'warning')
      return
    }
    setIsAnalyzing(true)
    try {
      const res = await fetch('/api/ai/analyze-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: sampleText, model })
      })
      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        throw new Error(res.ok ? 'Invalid server response' : `Server Error: ${res.status}`)
      }
      
      if (data.error) throw new Error(data.error)
      
      setUserStyle(data.style)
      localStorage.setItem('user_writing_style', data.style)
      setShowStyleInput(false)
      setSampleText('')
    } catch (e) {
      showToast('分析失败: ' + e.message, 'error')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Pre-fill outline from composeItem body if available
  useEffect(() => {
    if (composeItem?.body) {
      const match = composeItem.body.match(/### 建议大纲\n([\s\S]*?)(?=\n\n###|$)/)
      if (match && match[1]) {
        setOutline(match[1].trim())
      }
    }
  }, [composeItem])
  
  // Fetch context data
  const collectContext = async () => {
    if (!currentProduct?.id) return null

    const context = {
      productBasic: currentProduct,
      personas: [],
      messaging: [],
      features: [],
      competitors: []
    }

    // Load from LocalStorage (matching ProductDataManager keys)
    try {
      const storyKey = `user_stories_${currentProduct.id}`
      const stories = localStorage.getItem(storyKey)
      if (stories) context.personas = JSON.parse(stories)

      const msgKey = `product_messaging_${currentProduct.id}`
      const msgs = localStorage.getItem(msgKey)
      if (msgs) context.messaging = JSON.parse(msgs)

      const featKey = `feature_cards_${currentProduct.id}`
      const feats = localStorage.getItem(featKey)
      if (feats) context.features = JSON.parse(feats)
    } catch (e) {
      console.warn('Failed to load local context', e)
    }

    // 竞品模块已移除，兼容为空数据
    context.competitors = []

    return context
  }
  
  const handleGenerate = async () => {
    setIsLoading(true)
    setGeneratedContent('')
    setShowPreview(false)
    try {
      const activeTopic = topic || composeItem?.title || '未命名主题'
      const activePlatform = platform || composeItem?.platform || 'wechat_mp'
      const context = await collectContext()

      const res = await fetch('/api/ai/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: activeTopic,
          platform: activePlatform,
          outline,
          context,
          model,
          userStyle
        })
      })

      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        throw new Error(res.ok ? 'Invalid server response' : `Server Error: ${res.status}`)
      }
      
      if (!res.ok) {
        throw new Error(data.error || data.message || `Generation failed: ${res.status}`)
      }
      
      if (data.content) {
        setGeneratedContent(data.content)
        setShowPreview(true)
        setIsOpen(true)
      } else {
        throw new Error('No content returned from AI')
      }
    } catch (e) {
      console.error('AI Generation Error:', e)
      showToast('生成失败: ' + e.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyContent = () => {
    if (generatedContent && onDraftGenerated) {
      onDraftGenerated(generatedContent)
      showToast('内容已应用到编辑器', 'success')
      // Optional: Close drawer after apply? User might want to keep it open to refer.
      // Let's keep it open as per user request (drawer for viewing)
    }
  }

  const previewDrawer = (
    <Drawer 
      isOpen={showPreview} 
      onClose={() => setShowPreview(false)}
      title="AI 生成结果预览"
      width="w-[600px]"
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto mb-4 bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
          {generatedContent}
        </div>
        
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 bg-white sticky bottom-0">
          <button 
            onClick={() => {
              setGeneratedContent('')
              setShowPreview(false)
            }}
            className="px-4 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            放弃
          </button>
          <button 
            onClick={handleApplyContent}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2 font-medium transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            确认应用
          </button>
        </div>
      </div>
    </Drawer>
  )

  if (!isOpen) {
    return (
      <>
        <button 
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles className="w-4 h-4" />
            AI 写作助手
          </div>
          <ChevronDown className="w-4 h-4" />
        </button>
        {previewDrawer}
      </>
    )
  }

  return (
    <div className="bg-white border border-blue-100 rounded-xl shadow-sm overflow-hidden">
      <div className="p-3 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-800 font-semibold">
          <Sparkles className="w-4 h-4" />
          AI 写作助手
        </div>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Mode Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setMode('create')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
              mode === 'create' 
                ? 'bg-white text-blue-700 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            生成初稿
          </button>
          <button
            onClick={() => setMode('refine')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
              mode === 'refine' 
                ? 'bg-white text-blue-700 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            AI 润色
          </button>
          <button
            onClick={() => setMode('proofread')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
              mode === 'proofread' 
                ? 'bg-white text-blue-700 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            纠错校对
          </button>
        </div>

        {/* Model Selection */}
        <div>
           <label className="text-xs font-medium text-gray-500 mb-1.5 block">选择模型</label>
           <div className="flex gap-2">
             <label className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border cursor-pointer transition ${model === 'doubao' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}>
               <input type="radio" name="draft_model" value="doubao" checked={model === 'doubao'} onChange={(e) => setModel(e.target.value)} className="hidden" />
               <span className="text-xs font-medium">Doubao</span>
             </label>
             <label className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border cursor-pointer transition ${model === 'deepseek' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}>
               <input type="radio" name="draft_model" value="deepseek" checked={model === 'deepseek'} onChange={(e) => setModel(e.target.value)} className="hidden" />
               <span className="text-xs font-medium">DeepSeek</span>
             </label>
           </div>
        </div>

        {/* Platform Display */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">当前平台</label>
          <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-100 rounded-lg">
             <PlatformBadge id={platform || composeItem?.platform || 'wechat_mp'} size={16} />
             <span className="text-sm text-gray-700 font-medium">
               {PLATFORM_MAP[platform || composeItem?.platform || 'wechat_mp']?.name || '未知平台'}
             </span>
          </div>
        </div>

        {/* Style Cloning */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
              <Palette className="w-3 h-3" />
              文风复刻 (可选)
            </label>
            {userStyle && (
              <button 
                onClick={() => { setUserStyle(''); localStorage.removeItem('user_writing_style'); }}
                className="text-[10px] text-red-400 hover:text-red-500 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> 清除
              </button>
            )}
          </div>

          {userStyle ? (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 relative group">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-800 line-clamp-3" title={userStyle}>
                  {userStyle}
                </p>
              </div>
              <button 
                onClick={() => setShowStyleInput(true)}
                className="absolute top-1 right-1 p-1 text-blue-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <PenTool className="w-3 h-3" />
              </button>
            </div>
          ) : (
            !showStyleInput ? (
              <button 
                onClick={() => setShowStyleInput(true)}
                className="w-full py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-1"
              >
                <Palette className="w-3 h-3" />
                添加个人文风配置
              </button>
            ) : (
              <div className="space-y-2 border border-gray-100 rounded-lg p-2 bg-gray-50">
                <textarea
                  value={sampleText}
                  onChange={(e) => setSampleText(e.target.value)}
                  placeholder="粘贴一段您满意的过往文章（建议300字以上），AI将提取您的写作风格..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-300 resize-none bg-white"
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => setShowStyleInput(false)}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleAnalyzeStyle}
                    disabled={isAnalyzing || sampleText.length < 50}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    开始分析
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {mode === 'create' ? (
          <>
            {/* Outline Input */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">内容大纲 (可选)</label>
              <textarea
                value={outline}
                onChange={(e) => setOutline(e.target.value)}
                placeholder="输入大纲，每行一点..."
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-300 resize-none"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isLoading || !composeItem}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
              {isLoading ? '正在撰写...' : '生成初稿'}
            </button>
          </>
        ) : (
          <>
            {/* Refine Mode Info */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="bg-blue-100 p-1.5 rounded-full shrink-0">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-blue-800 mb-0.5">资深主编正在待命</h4>
                  <p className="text-[10px] text-blue-600 leading-relaxed">
                    我将作为您的专属编辑，检查当前内容的逻辑、语病和润色文采。
                    同时会根据<span className="font-bold">{(PLATFORM_MAP[platform || composeItem?.platform || 'wechat_mp']?.name || '当前平台')}</span>的调性进行优化。
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleRefine}
              disabled={isLoading || !composeItem?.body || composeItem.body.length < 10}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isLoading ? '正在润色...' : '开始润色当前内容'}
            </button>
          </>
        )}
        
        <p className="text-[10px] text-gray-400 text-center">
          {mode === 'create' ? '生成的内容将覆盖当前编辑器内容' : '润色后的内容将替换当前编辑器内容'}
        </p>

        {/* Generated Content Preview Trigger */}
        {generatedContent && !showPreview && (
          <div className="mt-4 border-t border-blue-100 pt-4 animate-in fade-in zoom-in duration-300">
             <button 
                onClick={() => setShowPreview(true)}
                className="w-full py-2 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:from-blue-200 hover:to-blue-100 transition-all flex items-center justify-center gap-2 shadow-sm border border-blue-200"
             >
                <Sparkles className="w-4 h-4" />
                ✨ 已生成初稿，点击查看结果
             </button>
          </div>
        )}

        {previewDrawer}
      </div>
    </div>
  )
}
