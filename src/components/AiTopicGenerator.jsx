import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Loader2, Settings, Check, RefreshCw, Plus, Edit3, Trash2, Github, FileText, PenTool, ChevronDown } from 'lucide-react'
import { createContentItem } from '../services/api'
import { PLATFORM_MAP } from '../constants/platforms'
import { WechatLogo, XiaohongshuLogo, DouyinLogo, WeiboLogo, BilibiliLogo, KuaishouLogo, ZhihuLogo, LinkedinLogo, TwitterLogo, DefaultLogo } from '../assets/platformLogos'
import { useUI } from '../context/UIContext'

const getPlatformLogo = (platformId) => {
  switch (platformId) {
    case 'wechat_mp': return WechatLogo
    case 'xiaohongshu': return XiaohongshuLogo
    case 'douyin': return DouyinLogo
    case 'weibo': return WeiboLogo
    case 'bilibili': return BilibiliLogo
    case 'kuaishou': return KuaishouLogo
    case 'zhihu': return ZhihuLogo
    case 'linkedin': return LinkedinLogo
    case 'twitter': return TwitterLogo
    default: return DefaultLogo
  }
}

function MultiSelectDropdown({ label, options, selected, onChange, color = 'blue' }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-sm font-semibold text-gray-900 mb-1.5 block">{label}</label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 bg-white border rounded-xl text-sm transition-all duration-200 min-h-[42px] ${isOpen ? `border-${color}-500 ring-1 ring-${color}-500` : 'border-gray-200 hover:border-gray-300'}`}
      >
        <div className="flex flex-wrap gap-1.5 flex-1 pr-2">
          {selected.length === 0 ? (
            <span className="text-gray-400">请选择...</span>
          ) : (
            selected.map(id => {
              const opt = options.find(o => o.id === id)
              if (!opt) return null
              return (
                <span key={id} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${color}-50 text-${color}-700 border border-${color}-100`}>
                  {opt.label}
                  <div 
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onChange(selected.filter(x => x !== id))
                    }}
                    className={`ml-1 hover:bg-${color}-200 rounded-full p-0.5 transition-colors cursor-pointer`}
                  >
                    <X className="w-3 h-3" />
                  </div>
                </span>
              )
            })
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-30 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto p-1.5 animate-in fade-in zoom-in-95 duration-100">
           {options.map(opt => {
             const isSelected = selected.includes(opt.id)
             return (
               <div 
                 key={opt.id}
                 onClick={() => {
                   const next = isSelected 
                      ? selected.filter(id => id !== opt.id)
                      : [...selected, opt.id]
                   onChange(next)
                 }}
                 className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
               >
                 <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${isSelected ? `bg-${color}-600 border-${color}-600` : 'border-gray-300 bg-white'}`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                 </div>
                 <span className={`text-sm ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{opt.label}</span>
               </div>
             )
           })}
        </div>
      )}
    </div>
  )
}

export default function AiTopicGenerator({ currentProduct, onContentCreated }) {
  const { showToast } = useUI()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('deepseek') // 'doubao' | 'deepseek'
  const [generatedTopics, setGeneratedTopics] = useState([])
  const [config, setConfig] = useState({
    sources: ['product', 'personas', 'messaging', 'features', 'competitors'],
    creativity: 'balance',
    platforms: ['wechat_mp', 'xiaohongshu'],
    item_limit: 5,
    custom_keywords: ''
  })

  const PLATFORM_OPTIONS = [
    { id: 'wechat_mp', label: '公众号' },
    { id: 'xiaohongshu', label: '小红书' },
    { id: 'douyin', label: '抖音脚本' },
    { id: 'weibo', label: '微博' },
    { id: 'bilibili', label: '哔哩哔哩' },
    { id: 'kuaishou', label: '快手' },
    { id: 'zhihu', label: '知乎' },
    { id: 'linkedin', label: 'LinkedIn' },
    { id: 'twitter', label: 'Twitter' }
  ]

  const CREATIVITY_OPTIONS = [
    { id: 'conservative', label: '保守 (精准)' },
    { id: 'balance', label: '平衡 (推荐)' },
    { id: 'open', label: '开放 (脑洞)' }
  ]

  const SOURCE_OPTIONS = [
    { id: 'product', label: '产品定义' },
    { id: 'personas', label: '目标画像' },
    { id: 'messaging', label: '关键消息' },
    { id: 'features', label: '近期功能' },
    { id: 'competitors', label: '竞品分析' }
  ]

  // Edit Modal State
  const [editingTopic, setEditingTopic] = useState(null)
  const [editForm, setEditForm] = useState({
    title: '',
    platform: '',
    outline: '',
    schedule_at: ''
  })

  // GitHub Readme State
  const [githubUrl, setGithubUrl] = useState('')
  const [readmeContent, setReadmeContent] = useState(null)
  const [isFetchingReadme, setIsFetchingReadme] = useState(false)

  const handleFetchReadme = async () => {
    if (!githubUrl) return
    setIsFetchingReadme(true)
    setReadmeContent(null)
    try {
      const res = await fetch('/api/github/readme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: githubUrl })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fetch failed')
      
      setReadmeContent(data)
    } catch (e) {
      showToast('获取 README 失败: ' + e.message, 'error')
    } finally {
      setIsFetchingReadme(false)
    }
  }

  // Fetch context data
  const collectContext = async () => {
    if (!currentProduct?.id) return null

    const context = {
      productBasic: currentProduct,
      personas: [],
      messaging: [],
      features: [],
      competitors: [],
      githubReadme: readmeContent ? readmeContent.content : null
    }

    // Load from LocalStorage (matching ProductDataManager keys)
    try {
      if (config.sources.includes('personas')) {
        const storyKey = `user_stories_${currentProduct.id}`
        const stories = localStorage.getItem(storyKey)
        if (stories) context.personas = JSON.parse(stories)
      }

      if (config.sources.includes('messaging')) {
        const msgKey = `product_messaging_${currentProduct.id}`
        const msgs = localStorage.getItem(msgKey)
        if (msgs) context.messaging = JSON.parse(msgs)
      }

      if (config.sources.includes('features')) {
        const featKey = `feature_cards_${currentProduct.id}`
        const feats = localStorage.getItem(featKey)
        if (feats) context.features = JSON.parse(feats)
      }
    } catch (e) {
      console.warn('Failed to load local context', e)
    }

    // Load from Supabase
    // 竞品模块已移除，兼容为空数据
    context.competitors = []

    // If product definition is NOT selected, we might want to mask it, 
    // but usually product name is essential. 
    // However, strictly following "Sources", if 'product' is unchecked, 
    // we might pass a minimal version or empty object.
    // Let's keep basic ID/Name but maybe hide detailed description if user unchecks it.
    if (!config.sources.includes('product')) {
       context.productBasic = { id: currentProduct.id, name: currentProduct.name } 
    }

    return context
  }

  const handleGenerate = async () => {
    setIsLoading(true)
    try {
      const context = await collectContext()
      const preferences = {
        item_limit: config.item_limit,
        platforms: config.platforms,
        creativity: config.creativity,
        custom_keywords: config.custom_keywords
      }

      const res = await fetch('/api/ai/suggest-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, preferences, model: selectedModel })
      })

      if (!res.ok) throw new Error('Generation failed')
      
      const data = await res.json()
      setGeneratedTopics(data.topics || [])
    } catch (e) {
      showToast('生成失败: ' + e.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const openEditModal = (topic) => {
    setEditingTopic(topic)
    setEditForm({
      title: topic.title,
      platform: topic.platform || 'wechat_mp',
      outline: (topic.outline || []).join('\n'),
      schedule_at: new Date().toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
    })
  }

  const confirmAddToPlan = async () => {
    if (!currentProduct?.id) return
    try {
      const payload = {
        product_id: currentProduct.id,
        platform: editForm.platform,
        title: editForm.title, // 这里使用建议标题作为最终的内容标题
        body: `### 核心角度\n${editingTopic.angle}\n\n### 建议大纲\n${editForm.outline.split('\n').map(l => l.startsWith('-') ? l : `- ${l}`).join('\n')}\n\n### 建议受众\n${editingTopic.persona || '通用'}\n\n### AI 备注\n${editingTopic.schedule_hint || ''}`,
        schedule_at: new Date(editForm.schedule_at).toISOString(),
        status: 'draft',
        topic_title: editingTopic.topic_direction || editForm.title // 这里将 topic_title 字段设置为选题方向
      }

      await createContentItem(payload)
      showToast('已添加到排期公告板！', 'success')
      if (onContentCreated) onContentCreated()
      
      setGeneratedTopics(prev => prev.filter(t => t !== editingTopic))
      setEditingTopic(null)
    } catch (e) {
      showToast('入库失败: ' + e.message, 'error')
    }
  }

  const optimizeTitle = async () => {
    if (!editForm.title) return
    // 简单的模拟优化逻辑，实际应调用AI接口
    const variants = [
      `🔥 ${editForm.title}`,
      `【深度解析】${editForm.title}`,
      `为什么${editForm.title}？（附解决方案）`,
      `揭秘：${editForm.title}背后的真相`,
      `3分钟看懂：${editForm.title}`
    ]
    // 随机选一个，实际可以做成弹窗选
    const next = variants[Math.floor(Math.random() * variants.length)]
    setEditForm(prev => ({ ...prev, title: next }))
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-md hover:from-blue-700 hover:to-blue-700 shadow-sm transition-all"
      >
        <Sparkles className="w-3 h-3" />
        <span className="text-sm font-medium">AI 灵感选题</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer */}
          <div className="relative w-full max-w-xl bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 rounded-l-2xl overflow-hidden border-l border-gray-100">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-10 sticky top-0">
              <div className="flex items-center gap-3 text-gray-900">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">AI 灵感选题助手</h2>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {/* Config Section */}
              <div className="space-y-5">
                
                {/* AI Model Selection */}
                <div>
                  <label className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-gray-500" />
                    选择 AI 模型
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'doubao', label: 'Doubao 1.5 Pro', desc: '快速、稳定' },
                      { id: 'deepseek', label: 'DeepSeek R1', desc: '深度思考、逻辑强' }
                    ].map(model => (
                      <label 
                        key={model.id}
                        className={`relative flex flex-col items-start p-2.5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          selectedModel === model.id 
                            ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600/20' 
                            : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="topic_model"
                          value={model.id}
                          checked={selectedModel === model.id}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="hidden"
                        />
                        <span className={`font-semibold text-sm mb-0.5 ${selectedModel === model.id ? 'text-blue-700' : 'text-gray-900'}`}>
                          {model.label}
                        </span>
                        <span className="text-xs text-gray-500">{model.desc}</span>
                        {selectedModel === model.id && (
                          <div className="absolute top-3 right-3 text-blue-600">
                            <div className="w-2 h-2 rounded-full bg-blue-600" />
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Data Sources */}
                <MultiSelectDropdown 
                  label="参考数据源"
                  options={SOURCE_OPTIONS}
                  selected={config.sources}
                  onChange={(newSources) => setConfig({ ...config, sources: newSources })}
                  color="blue"
                />

                {/* GitHub Reference */}
                <div className="bg-gray-50/50 rounded-xl p-3.5 border border-gray-100">
                  <label className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Github className="w-4 h-4" />
                    GitHub 项目参考 <span className="text-xs font-normal text-gray-400">(可选)</span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input 
                      type="text" 
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/username/repo"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all bg-white"
                    />
                    <button 
                      onClick={handleFetchReadme}
                      disabled={isFetchingReadme || !githubUrl}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      {isFetchingReadme ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '读取'}
                    </button>
                  </div>
                  {readmeContent && (
                    <div className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-100 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 truncate mr-2">
                        <Check className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">已获取 {readmeContent.owner}/{readmeContent.repo} README</span>
                        <span className="text-green-600/70">({readmeContent.content.length} 字符)</span>
                      </span>
                      <button onClick={() => setReadmeContent(null)} className="text-green-600 hover:text-green-800 p-0.5 rounded hover:bg-green-100 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Target Platforms */}
                <MultiSelectDropdown 
                  label="目标平台"
                  options={PLATFORM_OPTIONS}
                  selected={config.platforms}
                  onChange={(newPlatforms) => setConfig({ ...config, platforms: newPlatforms })}
                  color="blue"
                />

                {/* Creativity */}
                <div>
                  <label className="text-sm font-semibold text-gray-900 mb-2 block">创意发散度</label>
                  <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-200/50">
                    {CREATIVITY_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setConfig({ ...config, creativity: opt.id })}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                          config.creativity === opt.id
                            ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Keywords */}
                <div>
                   <label className="text-sm font-semibold text-gray-900 mb-2 block">自定义关键词 <span className="font-normal text-gray-400">(可选)</span></label>
                   <input 
                      type="text"
                      value={config.custom_keywords}
                      onChange={(e) => setConfig({ ...config, custom_keywords: e.target.value })}
                      placeholder="例如：双十一、职场焦虑、行业黑幕..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder-gray-400"
                   />
                </div>

                {/* Action Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isLoading || config.platforms.length === 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {isLoading ? 'AI 正在深度思考中...' : '开始生成灵感'}
                </button>
              </div>

              {/* Results Section */}
              {generatedTopics.length > 0 && (
                <div className="space-y-4 pt-5 border-t border-gray-100">
                   <div className="flex items-center justify-between">
                     <h3 className="text-base font-bold text-gray-900">生成结果 <span className="text-gray-400 font-normal text-sm ml-1">({generatedTopics.length})</span></h3>
                     <button onClick={() => setGeneratedTopics([])} className="text-xs font-medium text-gray-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50">清空结果</button>
                   </div>
                   <div className="space-y-3">
                      {generatedTopics.map((topic, idx) => {
                        const PlatformLogo = getPlatformLogo(topic.platform)
                        const platformName = PLATFORM_MAP[topic.platform]?.name || topic.platform
                        
                        return (
                        <div key={idx} className="group bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-blue-300/50 transition-all duration-300 relative">
                           <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 text-gray-600 text-[10px] font-bold uppercase tracking-wider border border-gray-100">
                                    <PlatformLogo size={12} />
                                    {platformName}
                                  </span>
                                  <span className="text-[10px] text-blue-700 font-semibold bg-blue-50/80 px-2 py-1 rounded-md border border-blue-100/50">{topic.angle}</span>
                                  {topic.predicted_effect && (
                                    <span className="text-[10px] text-blue-700 font-semibold bg-blue-50/80 px-2 py-1 rounded-md border border-blue-100/50">{topic.predicted_effect}</span>
                                  )}
                                </div>
                                <h4 className="text-base font-bold text-gray-900 leading-snug mb-2 group-hover:text-blue-700 transition-colors">{topic.topic_direction}</h4>
                                <div className="text-xs text-gray-600 bg-gray-50/80 p-3 rounded-lg border border-gray-100/80 leading-relaxed">
                                   <span className="font-medium text-gray-500 mr-1">建议标题:</span> 
                                   {topic.title}
                                </div>
                              </div>
                              <button
                                onClick={() => openEditModal(topic)}
                                className="ml-3 p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm hover:shadow-md flex-shrink-0"
                                title="加入计划"
                              >
                                <Plus className="w-5 h-5" />
                              </button>
                           </div>
                           
                           {topic.outline && (
                             <div className="text-xs text-gray-500 space-y-1.5 mt-4 pt-3 border-t border-gray-100/80">
                               {topic.outline.slice(0, 3).map((line, i) => (
                                 <div key={i} className="flex gap-2 items-start">
                                   <span className="text-blue-400 mt-0.5 text-[10px]">•</span>
                                   <span className="line-clamp-1 opacity-90">{line}</span>
                                 </div>
                               ))}
                             </div>
                           )}
                           
                           {topic.schedule_hint && (
                             <div className="mt-3 text-[10px] text-gray-400 italic flex items-center gap-1.5 bg-gray-50/50 px-2 py-1 rounded border border-gray-100/50">
                               <Info className="w-3 h-3 text-blue-400" />
                               <span>AI 建议：{topic.schedule_hint}</span>
                             </div>
                           )}
                        </div>
                      )})}
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {editingTopic && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">微调选题计划</h3>
              <button onClick={() => setEditingTopic(null)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    onClick={optimizeTitle}
                    className="px-3 py-2 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 whitespace-nowrap"
                    title="AI 标题优化"
                  >
                    <Sparkles className="w-3 h-3" />
                    优化标题
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">发布平台</label>
                  <select
                    value={editForm.platform}
                    onChange={e => setEditForm(prev => ({ ...prev, platform: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {PLATFORM_OPTIONS.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">计划时间</label>
                  <input
                    type="datetime-local"
                    value={editForm.schedule_at}
                    onChange={e => setEditForm(prev => ({ ...prev, schedule_at: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内容大纲</label>
                <textarea
                  rows={5}
                  value={editForm.outline}
                  onChange={e => setEditForm(prev => ({ ...prev, outline: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  onClick={() => setEditingTopic(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={confirmAddToPlan}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  确认加入计划
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Info({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
