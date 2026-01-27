import { useState, useEffect } from 'react'
import { Users, Bot, Save, Play, RefreshCw, AlertCircle, Check, Settings, Cpu, GitBranch } from 'lucide-react'
import TeamMemberPage from './TeamMemberPage'
import AgentOrchestration from './AgentOrchestration'
import axios from 'axios'
import { useUI } from '../context/UIContext'

const MODEL_OPTIONS = [
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'deepseek-chat', label: 'DeepSeek Chat' },
]

// Agent 管理组件
const AgentManager = () => {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [testMessage, setTestMessage] = useState('')
  const [testResult, setTestResult] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const { showToast } = useUI()

  // Helper to determine if current model is custom
  const isCustomModel = (model) => {
    // If explicitly empty string, it's custom (user cleared input or just selected custom)
    if (model === '') return true
    // If model is undefined/null, it falls back to default options, so NOT custom
    if (!model) return false
    // Otherwise check if it's in the preset list
    return !MODEL_OPTIONS.some(opt => opt.value === model)
  }

  // Helper to get display name for model
  const getModelDisplayName = (model) => {
    const option = MODEL_OPTIONS.find(opt => opt.value === model)
    return option ? option.label : (model || '未设置模型')
  }

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/agents')
      setAgents(res.data.data || [])
    } catch (error) {
      console.error('Failed to load agents:', error)
      showToast('加载 Agent 列表失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedAgent) return
    try {
      await axios.put(`/api/agents/${selectedAgent.id}`, {
        system_prompt: selectedAgent.system_prompt,
        model_config: selectedAgent.model_config
      })
      showToast('保存成功', 'success')
      setIsEditing(false)
      loadAgents() // Refresh list
    } catch (error) {
      console.error('Failed to update agent:', error)
      showToast('保存失败', 'error')
    }
  }

  const handleTest = async () => {
    if (!testMessage.trim()) {
      showToast('请输入测试内容', 'warning')
      return
    }
    setIsTesting(true)
    setTestResult('')
    try {
      const res = await axios.post('/api/agents/test', {
        system_prompt: selectedAgent.system_prompt,
        model_config: selectedAgent.model_config,
        user_message: testMessage
      })
      setTestResult(res.data.reply)
    } catch (error) {
      console.error('Test failed:', error)
      setTestResult(`测试失败: ${error.response?.data?.error || error.message}`)
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* 左侧列表 */}
      <div className="w-72 border-r border-gray-200 bg-gray-50/50 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wider px-2">AI 智能体</h3>
          <button 
            onClick={loadAgents} 
            className="p-1.5 hover:bg-white rounded-md text-gray-400 hover:text-indigo-600 transition-all shadow-sm border border-transparent hover:border-gray-200"
            title="刷新列表"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {agents.map(agent => (
            <div
              key={agent.id}
              onClick={() => {
                setSelectedAgent(agent)
                setIsEditing(false)
                setTestResult('')
                setTestMessage('')
              }}
              className={`group p-3 cursor-pointer rounded-lg border transition-all duration-200 relative ${
                selectedAgent?.id === agent.id 
                  ? 'bg-white border-blue-200 shadow-sm ring-1 ring-blue-50/50' 
                  : 'bg-transparent border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm'
              }`}
            >
              {selectedAgent?.id === agent.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
              )}
              <div className="flex items-start gap-3 pl-2">
                <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  selectedAgent?.id === agent.id 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-indigo-600'
                }`}>
                  {agent.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm truncate ${
                    selectedAgent?.id === agent.id ? 'text-gray-900' : 'text-gray-700'
                  }`}>
                    {agent.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                    {agent.description}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {selectedAgent ? (
          <>
            {/* 顶部工具栏 */}
            <div className="h-16 px-6 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-blue-100 shadow-lg">
                    {selectedAgent.name.slice(0, 1).toUpperCase()}
                 </div>
                 <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedAgent.name}</h2>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      Ready to chat
                    </p>
                 </div>
              </div>
              <div className="flex space-x-3">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-sm hover:shadow-md"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      保存配置
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 rounded-lg transition-all shadow-sm"
                  >
                    配置 Prompt
                  </button>
                )}
              </div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-hidden flex">
              {/* Prompt 编辑区 */}
              <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isEditing ? 'border-r border-gray-200' : 'border-r border-gray-200'}`}>
                {isEditing ? (
                   <div className="flex-1 flex flex-col p-6 overflow-hidden bg-gray-50/30">
                      <div className="flex-1 flex flex-col gap-4 min-h-0">
                        <div className="flex-1 flex flex-col min-h-0">
                            <label className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-2">
                                <span>System Prompt</span>
                                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Markdown Supported</span>
                            </label>
                            <div className="flex-1 relative rounded-xl border border-gray-300 shadow-sm bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                <textarea
                                    value={selectedAgent.system_prompt}
                                    onChange={(e) => setSelectedAgent({ ...selectedAgent, system_prompt: e.target.value })}
                                    className="absolute inset-0 w-full h-full p-4 font-mono text-sm leading-relaxed resize-none outline-none"
                                    spellCheck={false}
                                    placeholder="输入系统提示词..."
                                />
                            </div>
                        </div>

                        {/* Model Selection */}
                        <div className="flex-shrink-0">
                            <label className="flex items-center text-sm font-semibold text-gray-700 mb-2 gap-2">
                                <Cpu className="w-4 h-4 text-blue-500" />
                                <span>模型选择</span>
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <select
                                        value={isCustomModel(selectedAgent.model_config?.model) ? 'custom' : (selectedAgent.model_config?.model || 'doubao-pro-1.5')}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            const newConfig = { ...selectedAgent.model_config }
                                            if (val === 'custom') {
                                                // Keep existing custom value if switching to custom, or empty string
                                                if (!isCustomModel(newConfig.model)) {
                                                    newConfig.model = ''
                                                }
                                            } else {
                                                newConfig.model = val
                                            }
                                            setSelectedAgent({ ...selectedAgent, model_config: newConfig })
                                        }}
                                        className="w-full h-10 pl-3 pr-8 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        {MODEL_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                        <option value="custom">自定义模型...</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                                
                                {isCustomModel(selectedAgent.model_config?.model) && (
                                    <div className="col-span-2 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="col-span-2">
                                            <input
                                                type="text"
                                                value={selectedAgent.model_config?.model || ''}
                                                onChange={(e) => {
                                                    setSelectedAgent({
                                                        ...selectedAgent,
                                                        model_config: { ...selectedAgent.model_config, model: e.target.value }
                                                    })
                                                }}
                                                placeholder="输入模型 ID (如: gpt-4)"
                                                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">API Key</label>
                                            <input
                                                type="password"
                                                value={selectedAgent.model_config?.apiKey || ''}
                                                onChange={(e) => {
                                                    setSelectedAgent({
                                                        ...selectedAgent,
                                                        model_config: { ...selectedAgent.model_config, apiKey: e.target.value }
                                                    })
                                                }}
                                                placeholder="sk-..."
                                                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">API Base URL</label>
                                            <input
                                                type="text"
                                                value={selectedAgent.model_config?.baseURL || ''}
                                                onChange={(e) => {
                                                    setSelectedAgent({
                                                        ...selectedAgent,
                                                        model_config: { ...selectedAgent.model_config, baseURL: e.target.value }
                                                    })
                                                }}
                                                placeholder="https://api.openai.com/v1"
                                                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="h-48 flex flex-col min-h-0">
                             <label className="flex items-center text-sm font-semibold text-gray-700 mb-2 gap-2">
                                <Settings className="w-4 h-4 text-gray-400" />
                                <span>高级参数配置 (JSON)</span>
                             </label>
                             <div className="flex-1 relative rounded-xl border border-gray-300 shadow-sm bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                <textarea
                                    value={JSON.stringify(selectedAgent.model_config, null, 2)}
                                    onChange={(e) => {
                                        try {
                                            const config = JSON.parse(e.target.value);
                                            setSelectedAgent({ ...selectedAgent, model_config: config });
                                        } catch {}
                                    }}
                                    className="absolute inset-0 w-full h-full p-4 font-mono text-xs leading-relaxed resize-none outline-none text-gray-600"
                                    spellCheck={false}
                                />
                             </div>
                        </div>
                      </div>
                   </div>
                ) : (
                  <div className="flex-1 p-8 overflow-y-auto">
                    <div className="max-w-3xl mx-auto">
                        <div className="mb-8">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">当前 System Prompt</h3>
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 font-mono text-sm leading-relaxed text-gray-800 whitespace-pre-wrap shadow-inner">
                                {selectedAgent.system_prompt}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">模型参数</h3>
                            
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
                                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">基础模型</span>
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100">
                                        <Cpu className="w-3.5 h-3.5 text-blue-500" />
                                        <span className="text-xs font-semibold text-blue-700">
                                            {getModelDisplayName(selectedAgent.model_config?.model)}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50/50">
                                    <pre className="font-mono text-xs text-gray-600 overflow-x-auto">
                                        {JSON.stringify(selectedAgent.model_config, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 调试区域 - 始终显示，作为侧边栏 */}
              <div className="w-[400px] flex flex-col bg-white border-l border-gray-100 shadow-[rgba(0,0,0,0.03)_0px_0px_10px_-5px_inset]">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <h4 className="font-semibold text-gray-800 flex items-center text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                    调试预览
                  </h4>
                  <button 
                    onClick={() => { setTestMessage(''); setTestResult(''); }}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-200/50 transition-colors"
                  >
                    清空
                  </button>
                </div>
                
                <div className="flex-1 flex flex-col p-4 overflow-hidden gap-4">
                  {/* 模拟聊天窗口 */}
                  <div className="flex-1 bg-gray-50 rounded-xl border border-gray-100 p-4 overflow-y-auto space-y-4">
                     {testMessage && (
                        <div className="flex justify-end">
                            <div className="bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm max-w-[85%] shadow-sm leading-relaxed">
                                {testMessage}
                            </div>
                        </div>
                     )}
                     
                     {isTesting && (
                        <div className="flex justify-start">
                             <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm text-sm max-w-[85%] shadow-sm flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                             </div>
                        </div>
                     )}

                     {!isTesting && testResult && (
                        <div className="flex justify-start">
                             <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-tl-sm text-sm max-w-[85%] shadow-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                {testResult}
                             </div>
                        </div>
                     )}

                     {!testMessage && !testResult && !isTesting && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-2">
                            <Bot className="w-8 h-8 opacity-20" />
                            <p className="text-xs">在下方输入内容开始测试</p>
                        </div>
                     )}
                  </div>

                  {/* 输入区域 */}
                  <div className="flex-shrink-0">
                    <div className="relative">
                        <textarea
                          value={testMessage}
                          onChange={(e) => setTestMessage(e.target.value)}
                          placeholder="输入测试消息..."
                          className="w-full h-24 p-3 pr-12 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white resize-none shadow-sm transition-all"
                          onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleTest();
                              }
                          }}
                        />
                        <button
                          onClick={handleTest}
                          disabled={isTesting || !testMessage.trim()}
                          className={`absolute bottom-3 right-3 p-2 rounded-lg transition-all ${
                            isTesting || !testMessage.trim() 
                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
                          }`}
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 text-center">按 Enter 发送，Shift + Enter 换行</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/30">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Bot className="w-10 h-10 text-blue-200" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">选择一个智能体</h3>
            <p className="text-sm text-gray-500 max-w-xs text-center leading-relaxed">
                在左侧列表中选择一个 AI Agent 进行配置或测试。您可以修改其系统提示词和模型参数。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage({ currentProduct }) {
  const [activeTab, setActiveTab] = useState('team') // 'team' | 'agents' | 'orchestration'

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header with Tabs as Title */}
      <div className="flex-shrink-0 border-b border-gray-200 px-6 h-16 flex bg-white sticky top-0 z-20">
        <div className="flex space-x-8 h-full">
          <button
            onClick={() => setActiveTab('team')}
            className={`h-full border-b-2 transition-all duration-200 flex items-center gap-2 px-1 ${
              activeTab === 'team' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-base font-semibold">团队管理</span>
          </button>
          
          <button
            onClick={() => setActiveTab('agents')}
            className={`h-full border-b-2 transition-all duration-200 flex items-center gap-2 px-1 ${
              activeTab === 'agents' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Bot className="w-5 h-5" />
            <span className="text-base font-semibold">Agent 管理</span>
          </button>

          <button
            onClick={() => setActiveTab('orchestration')}
            className={`h-full border-b-2 transition-all duration-200 flex items-center gap-2 px-1 ${
              activeTab === 'orchestration' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <GitBranch className="w-5 h-5" />
            <span className="text-base font-semibold">Agent 编排逻辑</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full bg-white overflow-hidden">
          {activeTab === 'team' && <TeamMemberPage currentProduct={currentProduct} />}
          {activeTab === 'agents' && <AgentManager />}
          {activeTab === 'orchestration' && <AgentOrchestration />}
        </div>
      </div>
    </div>
  )
}
