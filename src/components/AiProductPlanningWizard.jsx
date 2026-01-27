import React, { useState, useEffect } from 'react'
import { 
  Wand2, X, ChevronRight, ChevronLeft, 
  Target, Users, Zap, Lightbulb, 
  CheckCircle2, Plus, Trash2, RefreshCw,
  ArrowRight, MessageSquare, Layout
} from 'lucide-react'
import { useUI } from '../context/UIContext'

// 步骤定义
const STEPS = [
  { id: 1, key: 'positioning', title: '愿景与定位', icon: Target, desc: '明确产品核心价值与市场位置' },
  { id: 2, key: 'personas', title: '用户画像', icon: Users, desc: '定义谁是你的核心用户' },
  { id: 3, key: 'features', title: '功能规划', icon: Layout, desc: '规划核心功能与路线图' },
  { id: 4, key: 'messaging', title: '价值传递', icon: MessageSquare, desc: '如何向用户介绍产品' }
]

export default function AiProductPlanningWizard({
  currentProduct,
  context, // 包含 productBasic, personas, features, etc.
  onClose,
  onApplyUpdates // (type, data) => Promise<void>
}) {
  const { confirm, showToast } = useUI()
  const [activeStep, setActiveStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [idea, setIdea] = useState('') // 用户的初始想法或补充指令
  
  const [selectedModel, setSelectedModel] = useState('deepseek')
  const [planningMode, setPlanningMode] = useState('brainstorm') // 'planning' | 'brainstorm'

  // Chat State
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  // 存储 AI 的建议结果
  const [suggestions, setSuggestions] = useState({
    brainstorm: [],
    basic: [],
    personas: [],
    features: [],
    messaging: []
  })

  // 存储用户已采纳/编辑的草稿（用于本会话内的上下文传递）
  const [drafts, setDrafts] = useState({
    basic: context?.productBasic || {},
    personas: context?.personas || [],
    features: context?.features || [],
    messaging: context?.messaging || []
  })

  const base = import.meta.env.VITE_API_BASE || ''

  // 自动初始化：如果产品已有描述，填入 idea 框作为上下文
  useEffect(() => {
    if (!idea && context?.productBasic?.description) {
      setIdea(`基于现有产品：${context.productBasic.name}。\n${context.productBasic.description}`)
    }
  }, [])

  // 加载和保存聊天记录
  useEffect(() => {
    if (currentProduct?.id) {
      const key = `chat_history_${currentProduct.id}`
      const saved = localStorage.getItem(key)
      if (saved) {
        try {
          setChatMessages(JSON.parse(saved))
        } catch (e) {
          console.error('Failed to load chat history', e)
        }
      }
    }
  }, [currentProduct?.id])

  useEffect(() => {
    if (currentProduct?.id && chatMessages.length > 0) {
      const key = `chat_history_${currentProduct.id}`
      localStorage.setItem(key, JSON.stringify(chatMessages))
    }
  }, [chatMessages, currentProduct?.id])

  // 清空聊天记录
  const clearChatHistory = async () => {
    if (await confirm({ title: '清空历史', message: '确定要清空当前产品的对话历史吗？' })) {
      setChatMessages([])
      if (currentProduct?.id) {
        localStorage.removeItem(`chat_history_${currentProduct.id}`)
      }
    }
  }

  // 发送对话消息
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return
    
    const newMessages = [...chatMessages, { role: 'user', content: chatInput }]
    setChatMessages(newMessages)
    setChatInput('')
    setChatLoading(true)

    try {
      const res = await fetch(`${base}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages,
          model: selectedModel
        })
      })
      
      if (!res.ok) {
              const errData = await res.json().catch(() => ({}))
              throw new Error(errData.error || '对话请求失败')
            }
            const data = await res.json()
            setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
          } catch (e) {
            console.error(e)
            const msg = e.message
            if (msg.includes('Missing AI API Key')) {
               showToast('AI 服务未配置：请在 Vercel 设置环境变量 VOLCENGINE_API_KEY', 'error')
            } else {
               showToast(msg || 'AI 响应失败，请重试', 'error')
            }
          } finally {
      setChatLoading(false)
    }
  }

  // 从对话生成规划
  const handleGenerateFromChat = async () => {
    if (chatMessages.length === 0) {
      showToast('请先与 AI 专家进行对话', 'warning')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${base}/api/ai/product-planning/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: chatMessages, // 传入对话历史
          model: selectedModel,
          mode: 'planning' // 强制转为结构化生成
        })
      })
      
      if (!res.ok) throw new Error('生成失败')
      const data = await res.json()

      // 更新建议池 (basic 是一定会有的)
      if (data.basic) {
        setSuggestions(prev => ({
            ...prev,
            basic: Array.isArray(data.basic) ? data.basic : [data.basic],
            personas: data.personas || [],
            features: data.features || [],
            messaging: data.messaging || []
        }))
        // 自动切换到结构化展示模式
        setPlanningMode('planning')
        showToast('规划方案已生成！请在下方查看并采纳。', 'success')
      }
    } catch (e) {
      console.error(e)
      showToast('生成规划失败，请重试', 'error')
    } finally {
      setLoading(false)
    }
  }

  // 通用生成函数
  const generate = async (scope) => {
    setLoading(true)
    try {
      // 构建上下文：包含当前已有的草稿，让 AI 基于最新状态生成下一步
      const currentContext = {
        productBasic: drafts.basic,
        personas: drafts.personas,
        features: drafts.features,
        competitors: context?.competitors || []
      }

      const res = await fetch(`${base}/api/ai/product-planning/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          idea: idea || `为 ${drafts.basic.name || '这个产品'} 进行规划`, 
          scope: [scope], // 每次只生成当前步骤相关的
          context: currentContext,
          model: selectedModel,
          mode: scope === 'basic' ? planningMode : 'planning' // 仅在第一步支持模式切换
        })
      })
      
      if (!res.ok) throw new Error('生成失败')
      const data = await res.json()

      // 检查是否触发了降级（返回了占位符）
      const isFallback = (data.basic && data.basic.positioning === '针对特定人群解决核心痛点的产品定位') ||
                        (data.personas && data.personas[0]?.who === '核心角色A') ||
                        (data.metadata?.warnings?.includes('使用本地回退结果'))
      
      if (isFallback) {
        // 虽然请求成功，但是是 Mock 数据，提示用户检查后台日志或配置
        console.warn('AI 服务使用了降级数据', data)
        showToast('AI 服务暂未完全接通，当前显示的是示例数据。', 'warning')
      }
      
      // 更新建议池
      if (data.brainstorm) {
        setSuggestions(prev => ({ ...prev, brainstorm: data.brainstorm }))
      } else {
        setSuggestions(prev => ({
          ...prev,
          [scope]: Array.isArray(data[scope]) ? data[scope] : (data[scope] ? [data[scope]] : [])
        }))
      }
    } catch (e) {
      console.error(e)
      showToast('AI 思考超时，请重试', 'error')
    } finally {
      setLoading(false)
    }
  }

  // 简单的 Markdown 渲染：处理加粗和换行
  const renderMessageContent = (content) => {
    if (!content) return null
    return content.split('\n').map((line, i) => {
      // 空行作为段落分隔
      if (!line.trim()) return <div key={i} className="h-2" />
      
      // 处理加粗 **text**
      const parts = line.split(/(\*\*.*?\*\*)/g)
      return (
        <div key={i} className="min-h-[1.2em]">
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="font-bold">{part.slice(2, -2)}</strong>
            }
            return <span key={j}>{part}</span>
          })}
        </div>
      )
    })
  }

  // 渲染步骤 1: 定位
  const renderStepPositioning = () => (
    <div className="space-y-3 h-full flex flex-col">
      {/* 顶部控制栏：模式切换与模型选择 */}
      <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
        <div className="flex bg-gray-200 rounded-lg p-1">
          <button
            onClick={() => setPlanningMode('brainstorm')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-all flex items-center gap-1 ${
              planningMode === 'brainstorm' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="w-3 h-3" /> 专家咨询 (对话引导)
          </button>
          <button
            onClick={() => setPlanningMode('planning')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-all flex items-center gap-1 ${
              planningMode === 'planning' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Layout className="w-3 h-3" /> 结构规划 (直接生成)
          </button>
        </div>

        <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200">
          <label className={`px-3 py-1.5 text-xs font-medium rounded cursor-pointer transition-all ${
            selectedModel === 'doubao' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'
          }`}>
            <input 
              type="radio" 
              name="model" 
              value="doubao" 
              checked={selectedModel === 'doubao'}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="hidden"
            />
            Doubao Pro
          </label>
          <label className={`px-3 py-1.5 text-xs font-medium rounded cursor-pointer transition-all ${
            selectedModel === 'deepseek' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'
          }`}>
            <input 
              type="radio" 
              name="model" 
              value="deepseek" 
              checked={selectedModel === 'deepseek'}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="hidden"
            />
            DeepSeek R1
          </label>
        </div>
      </div>

      {/* 模式 A: 专家咨询 (聊天模式) */}
      {planningMode === 'brainstorm' && (
        <div className="flex-1 flex flex-col border border-blue-200 rounded-xl bg-white overflow-hidden shadow-sm">
          {/* 聊天记录区域 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {chatMessages.length === 0 && (
               <div className="text-center py-10 text-gray-500">
                 <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                   <Users className="w-6 h-6 text-blue-600" />
                 </div>
                 <h3 className="text-sm font-bold text-gray-900">我是你的产品商业化专家</h3>
                 <p className="text-xs mt-1 max-w-xs mx-auto">请告诉我你的初步想法，我会通过提问帮你梳理商业模式、用户痛点和核心竞争力。</p>
               </div>
            )}
            {chatMessages.length > 0 && (
              <div className="flex justify-center mb-4">
                <button 
                  onClick={clearChatHistory}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> 清空历史记录
                </button>
              </div>
            )}
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                }`}>
                  {renderMessageContent(msg.content)}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
                  <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                  <span className="text-xs text-gray-500">专家正在思考...</span>
                </div>
              </div>
            )}
          </div>
          
          {/* 底部输入栏 */}
          <div className="p-3 bg-white border-t border-gray-200">
             {chatMessages.length > 2 && (
               <div className="mb-3 flex justify-center">
                 <button
                   onClick={handleGenerateFromChat}
                   disabled={loading}
                   className="bg-green-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow hover:bg-green-700 transition flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2"
                 >
                   {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                   对话已充分？点击生成产品规划
                 </button>
               </div>
             )}
             <div className="flex gap-2 items-end">
               <textarea
                 value={chatInput}
                 onChange={(e) => setChatInput(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault()
                     handleSendMessage()
                   }
                 }}
                 placeholder="输入你的想法或回答专家的问题... (Shift+Enter 换行)"
                 className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none max-h-32 min-h-[40px]"
                 style={{ height: 'auto', overflowY: 'auto' }}
                 rows={1}
                 onInput={(e) => {
                   e.target.style.height = 'auto'
                   e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
                 }}
               />
               <button
                 onClick={handleSendMessage}
                 disabled={!chatInput.trim() || chatLoading}
                 className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-0.5"
               >
                 <ArrowRight className="w-5 h-5" />
               </button>
             </div>
          </div>
        </div>
      )}

      {/* 模式 B: 结构规划 (原有的一键生成模式) */}
      {planningMode === 'planning' && !suggestions.basic.length && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            告诉 AI 你的初步想法
          </h3>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="例如：我想做一个针对自由职业者的财务管理工具，解决报税繁琐的问题..."
            className="w-full p-3 border border-blue-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px]"
          />
          <div className="mt-3 flex justify-end">
            <button 
              onClick={() => generate('basic')}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50 shadow-sm"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              直接生成方案
            </button>
          </div>
        </div>
      )}

      {/* 结果展示 (仅在 Planning 模式下或生成后显示) */}
      {planningMode === 'planning' && suggestions.basic.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
        {suggestions.basic.map((item, idx) => (
          <div key={idx} className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all bg-white group h-fit">
            <div className="flex justify-between items-start mb-3">
              <div className="text-xs font-bold text-gray-500 uppercase">方案 {idx + 1}</div>
              <button
                onClick={() => {
                  const newBasic = { ...drafts.basic, ...item }
                  setDrafts(prev => ({ ...prev, basic: newBasic }))
                  onApplyUpdates('basic', item)
                }}
                className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-medium hover:bg-green-100 flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3" /> 采纳此方案
              </button>
            </div>
            <h4 className="font-bold text-gray-900 mb-2">{item.product_category}</h4>
            <p className="text-sm text-gray-600 mb-3 italic">"{item.positioning}"</p>
            <div className="space-y-2 text-xs bg-gray-50 p-3 rounded-lg">
              <div className="flex gap-2"><span className="text-gray-500 w-16 flex-shrink-0">目标用户:</span> <span className="text-gray-900">{item.target_audience}</span></div>
              <div className="flex gap-2"><span className="text-gray-500 w-16 flex-shrink-0">核心价值:</span> <span className="text-gray-900">{item.key_benefit}</span></div>
              <div className="flex gap-2"><span className="text-gray-500 w-16 flex-shrink-0">差异优势:</span> <span className="text-gray-900">{item.differentiation}</span></div>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* 结果预览 (始终显示) */}
      {planningMode === 'planning' && (
      <div className="mt-auto border-t pt-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">当前已采纳的定位</h3>
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-gray-500 mb-1">产品品类</label>
              <input 
                value={drafts.basic.product_category || ''} 
                onChange={(e) => setDrafts(prev => ({...prev, basic: {...prev.basic, product_category: e.target.value}}))}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">目标受众</label>
              <input 
                value={drafts.basic.target_audience || ''} 
                onChange={(e) => setDrafts(prev => ({...prev, basic: {...prev.basic, target_audience: e.target.value}}))}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">定位陈述 (Positioning Statement)</label>
              <textarea 
                value={drafts.basic.positioning || ''} 
                onChange={(e) => setDrafts(prev => ({...prev, basic: {...prev.basic, positioning: e.target.value}}))}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm"
                rows={2}
              />
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  )

  // 渲染步骤 2: 用户画像
  const renderStepPersonas = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
        <div className="text-sm text-blue-800">
          基于定位：<span className="font-semibold">{drafts.basic.positioning || '暂无定位'}</span>
        </div>
        <button 
          onClick={() => generate('personas')}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
          AI 推荐画像
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {suggestions.personas.map((p, idx) => (
          <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-white hover:border-blue-300 transition-all relative">
             <div className="flex justify-between items-start mb-2">
               <div className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{p.role_tag}</div>
               <button 
                 onClick={() => {
                   const newPersonas = [...drafts.personas, p]
                   setDrafts(prev => ({...prev, personas: newPersonas}))
                   onApplyUpdates('persona', p)
                 }}
                 className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                 title="添加到我的画像列表"
               >
                 <Plus className="w-4 h-4" />
               </button>
             </div>
             <h4 className="font-bold text-gray-900 mb-2">{p.who}</h4>
             <div className="text-xs text-gray-600 space-y-2">
               <p><span className="font-semibold">痛点:</span> {p.max_pain}</p>
               <p><span className="font-semibold">目标:</span> {p.user_goal}</p>
               <p><span className="font-semibold">场景:</span> {p.existing_solution}</p>
             </div>
          </div>
        ))}
      </div>

      <div className="mt-8 border-t pt-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">已确认的用户画像 ({drafts.personas.length})</h3>
        <div className="space-y-3">
          {drafts.personas.map((p, idx) => (
            <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs">
                  {p.who?.[0]}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{p.who} <span className="text-gray-400 text-xs">| {p.role_tag}</span></div>
                  <div className="text-xs text-gray-500 truncate max-w-md">{p.max_pain}</div>
                </div>
              </div>
              <button className="text-gray-400 hover:text-red-500">
                {/* 这里暂时只展示，不做删除逻辑，因为 ProductDataManager 已经有删除功能 */}
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </button>
            </div>
          ))}
          {drafts.personas.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-300">
              暂无画像，请从上方 AI 建议中添加
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // 渲染步骤 3: 功能规划
  const renderStepFeatures = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
        <div className="text-sm text-blue-800">
          基于 <span className="font-bold">{drafts.personas.length}</span> 个用户画像生成功能建议
        </div>
        <button 
          onClick={() => generate('features')}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          AI 策划功能
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suggestions.features.map((f, idx) => (
          <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-white hover:border-blue-300 transition-all">
             <div className="flex justify-between items-start mb-2">
               <div className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{f.module}</div>
               <button 
                 onClick={() => {
                   const newFeatures = [...drafts.features, f]
                   setDrafts(prev => ({...prev, features: newFeatures}))
                   onApplyUpdates('feature', f)
                 }}
                 className="text-blue-600 hover:bg-blue-50 p-1 rounded flex items-center gap-1 text-xs font-medium"
               >
                 <Plus className="w-3 h-3" /> 添加
               </button>
             </div>
             <h4 className="font-bold text-gray-900 mb-1">{f.name}</h4>
             <p className="text-xs text-gray-600 mb-2">{f.intro_problem} → {f.intro_solution}</p>
             <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 p-2 rounded">
               <span className="font-semibold">预期效果:</span> {f.intro_effect}
             </div>
          </div>
        ))}
      </div>

      <div className="mt-8 border-t pt-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">功能路线图预览 ({drafts.features.length})</h3>
        <div className="space-y-2">
          {drafts.features.map((f, idx) => (
            <div key={idx} className="flex items-center justify-between bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                 <div className="w-1 h-8 bg-blue-500 rounded-full"></div>
                 <div>
                   <div className="text-sm font-medium text-gray-900">{f.name}</div>
                   <div className="text-xs text-gray-500">{f.module}</div>
                 </div>
              </div>
              <div className="text-xs text-gray-400">
                {f.launch_date || '待定'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // 渲染步骤 4: 价值传递
  const renderStepMessaging = () => (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
        <div className="text-sm text-blue-800">
          为不同画像生成针对性的营销话术
        </div>
        <button 
          onClick={() => generate('messaging')}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
          生成话术
        </button>
      </div>

      <div className="space-y-4">
        {suggestions.messaging.map((m, idx) => (
          <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-white hover:border-green-300 transition-all">
            <div className="flex justify-between items-start mb-3">
               <div className="flex items-center gap-2">
                 <div className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">{m.channel || '通用渠道'}</div>
                 <ArrowRight className="w-3 h-3 text-gray-400" />
                 <div className="text-sm font-medium text-gray-900">{m.persona}</div>
               </div>
               <button 
                 onClick={() => {
                   const newMessaging = [...drafts.messaging, m]
                   setDrafts(prev => ({...prev, messaging: newMessaging}))
                   onApplyUpdates('messaging', m)
                 }}
                 className="text-green-600 hover:bg-green-50 p-1 rounded flex items-center gap-1 text-xs font-medium"
               >
                 <Plus className="w-3 h-3" /> 采纳
               </button>
            </div>
            <div className="bg-green-50 p-3 rounded-lg relative">
              <div className="text-sm text-green-900 font-medium leading-relaxed">"{m.anchor_message}"</div>
              <div className="mt-2 text-xs text-green-700">
                <span className="font-bold">针对痛点:</span> {m.pain}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative bg-white w-full max-w-5xl h-full shadow-2xl flex overflow-hidden animate-in slide-in-from-right duration-300 rounded-l-2xl">
        
        {/* Sidebar Steps */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-lg">
              <Wand2 className="w-6 h-6" />
              产品规划向导
            </div>
          </div>
          <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
            {STEPS.map((step) => {
              const Icon = step.icon
              const isActive = activeStep === step.id
              const isDone = activeStep > step.id
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-all ${
                    isActive 
                      ? 'bg-white shadow-md border border-blue-100 ring-1 ring-blue-500/20' 
                      : 'hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                    isActive ? 'bg-blue-600 text-white' : (isDone ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500')
                  }`}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : step.id}
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 leading-tight">
                      {step.desc}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="p-4 border-t border-gray-200 bg-gray-50">
             <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
               <div className="text-xs font-medium text-blue-800 mb-1">当前进度</div>
               <div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden">
                 <div className="bg-blue-600 h-full transition-all duration-500" style={{width: `${(activeStep/STEPS.length)*100}%`}}></div>
               </div>
             </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="px-6 py-3 border-b border-gray-200 flex justify-between items-center">
             <div>
               <h2 className="text-lg font-bold text-gray-900">{STEPS[activeStep-1].title}</h2>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
               <X className="w-5 h-5" />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-white">
            {activeStep === 1 && renderStepPositioning()}
            {activeStep === 2 && renderStepPersonas()}
            {activeStep === 3 && renderStepFeatures()}
            {activeStep === 4 && renderStepMessaging()}
          </div>

          {/* Footer Navigation */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <button 
              onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
              disabled={activeStep === 1}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> 上一步
            </button>
            
            <div className="flex gap-3">
              {activeStep < STEPS.length ? (
                 <button 
                   onClick={() => setActiveStep(activeStep + 1)}
                   className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg hover:shadow-xl transition flex items-center gap-2"
                 >
                   下一步 <ChevronRight className="w-4 h-4" />
                 </button>
              ) : (
                <button 
                  onClick={onClose}
                  className="px-6 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-lg hover:shadow-xl transition flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> 完成规划
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
