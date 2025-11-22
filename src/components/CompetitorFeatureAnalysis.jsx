import { useState, useRef } from 'react'
import { 
  Target, 
  Plus, 
  Minus, 
  Edit, 
  Save, 
  X, 
  Check, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  StarOff,
  Filter,
  Search,
  Download,
  Upload,
  FileText,
  BarChart3,
  PieChart,
  Activity,
  Lightbulb,
  Zap,
  Shield,
  Users,
  Clock,
  DollarSign,
  Smartphone,
  Monitor,
  Globe
} from 'lucide-react'

const CompetitorFeatureAnalysis = ({ 
  competitorId, 
  features: initialFeatures = [], 
  onFeatureAdd, 
  onFeatureUpdate, 
  onFeatureDelete,
  onAnalysisGenerate,
  onRequirementGenerate
}) => {
  const [features, setFeatures] = useState(initialFeatures)
  const [showAddFeature, setShowAddFeature] = useState(false)
  const [editingFeature, setEditingFeature] = useState(null)
  const [filterCategory, setFilterCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [showRequirementModal, setShowRequirementModal] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [requirementResult, setRequirementResult] = useState(null)
  const [selectedFeatures, setSelectedFeatures] = useState([])
  const [newFeature, setNewFeature] = useState({
    name: '',
    category: 'core',
    description: '',
    priority: 'medium',
    status: 'available',
    rating: 3,
    pros: [],
    cons: [],
    platforms: [],
    pricing: 'free',
    userFeedback: '',
    competitorAdvantage: '',
    improvementSuggestion: ''
  })

  // 移除写死的模拟功能数据，直接使用传入的 initialFeatures

  // 功能分类
  const categories = {
    all: '全部功能',
    core: '核心功能',
    collaboration: '协作功能',
    analytics: '分析功能',
    localization: '本地化',
    integration: '集成功能',
    security: '安全功能',
    performance: '性能优化',
    ui: '用户界面',
    mobile: '移动端功能'
  }

  // 优先级颜色
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  // 状态颜色
  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-700'
      case 'beta': return 'bg-blue-100 text-blue-700'
      case 'planned': return 'bg-purple-100 text-purple-700'
      case 'deprecated': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // 平台图标
  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'web': return Globe
      case 'mobile': return Smartphone
      case 'desktop': return Monitor
      case 'api': return FileText
      default: return Globe
    }
  }

  // 添加功能
  const handleAddFeature = () => {
    if (newFeature.name.trim()) {
      const feature = {
        ...newFeature,
        id: Date.now(),
        lastUpdated: new Date().toISOString().split('T')[0],
        isStarred: false
      }
      setFeatures(prev => [feature, ...prev])
      if (onFeatureAdd) onFeatureAdd(feature)
      setNewFeature({
        name: '',
        category: 'core',
        description: '',
        priority: 'medium',
        status: 'available',
        rating: 3,
        pros: [],
        cons: [],
        platforms: [],
        pricing: 'free',
        userFeedback: '',
        competitorAdvantage: '',
        improvementSuggestion: ''
      })
      setShowAddFeature(false)
    }
  }

  // 更新功能
  const handleUpdateFeature = (featureId, updates) => {
    setFeatures(prev => prev.map(feature => 
      feature.id === featureId 
        ? { ...feature, ...updates, lastUpdated: new Date().toISOString().split('T')[0] }
        : feature
    ))
    if (onFeatureUpdate) onFeatureUpdate(featureId, updates)
  }

  // 删除功能
  const handleDeleteFeature = (featureId) => {
    if (window.confirm('确定要删除这个功能吗？')) {
      setFeatures(prev => prev.filter(feature => feature.id !== featureId))
      if (onFeatureDelete) onFeatureDelete(featureId)
    }
  }

  // 切换收藏
  const toggleStar = (featureId) => {
    handleUpdateFeature(featureId, { 
      isStarred: !features.find(f => f.id === featureId)?.isStarred 
    })
  }

  // 生成分析报告
  const generateAnalysis = () => {
    const selectedFeatureData = features.filter(f => selectedFeatures.includes(f.id))
    
    const analysis = {
      summary: {
        totalFeatures: selectedFeatureData.length,
        highPriority: selectedFeatureData.filter(f => f.priority === 'high').length,
        averageRating: (selectedFeatureData.reduce((sum, f) => sum + f.rating, 0) / selectedFeatureData.length).toFixed(1),
        topCategories: Object.entries(
          selectedFeatureData.reduce((acc, f) => {
            acc[f.category] = (acc[f.category] || 0) + 1
            return acc
          }, {})
        ).sort(([,a], [,b]) => b - a).slice(0, 3)
      },
      strengths: [
        '功能覆盖面广，满足多样化需求',
        '核心功能表现优秀，用户满意度高',
        '技术架构先进，扩展性强'
      ],
      weaknesses: [
        '部分功能学习成本较高',
        '移动端体验有待提升',
        '性能优化空间较大'
      ],
      opportunities: [
        'AI技术集成潜力巨大',
        '国际化市场拓展机会',
        '开发者生态建设'
      ],
      threats: [
        '竞争对手技术迭代快',
        '用户需求变化迅速',
        '新兴技术冲击'
      ],
      recommendations: [
        '优先优化高频使用功能的用户体验',
        '加强移动端功能开发和优化',
        '建立用户反馈收集和处理机制',
        '投入AI和机器学习技术研发'
      ]
    }
    
    setAnalysisResult(analysis)
    setShowAnalysisModal(true)
    if (onAnalysisGenerate) onAnalysisGenerate(analysis)
  }

  // 生成需求文档
  const generateRequirements = () => {
    const selectedFeatureData = features.filter(f => selectedFeatures.includes(f.id))
    
    const requirements = {
      projectInfo: {
        name: '竞品功能对标项目',
        version: '1.0.0',
        date: new Date().toISOString().split('T')[0],
        features: selectedFeatureData.length
      },
      functionalRequirements: selectedFeatureData.map(feature => ({
        id: `FR-${feature.id}`,
        name: feature.name,
        description: feature.description,
        priority: feature.priority,
        category: feature.category,
        acceptanceCriteria: [
          `实现${feature.name}的基础功能`,
          `支持${feature.platforms.join('、')}平台`,
          `用户满意度达到${feature.rating}/5星以上`
        ],
        dependencies: [],
        estimatedEffort: feature.priority === 'high' ? '高' : feature.priority === 'medium' ? '中' : '低'
      })),
      nonFunctionalRequirements: [
        {
          id: 'NFR-001',
          type: '性能要求',
          description: '系统响应时间不超过2秒',
          priority: 'high'
        },
        {
          id: 'NFR-002',
          type: '可用性要求',
          description: '系统可用性达到99.9%',
          priority: 'high'
        },
        {
          id: 'NFR-003',
          type: '安全要求',
          description: '数据传输加密，用户隐私保护',
          priority: 'high'
        }
      ],
      technicalRequirements: [
        '前端：React/Vue.js框架',
        '后端：Node.js/Python/Java',
        '数据库：MySQL/PostgreSQL',
        '缓存：Redis',
        '部署：Docker + Kubernetes'
      ],
      timeline: {
        planning: '2周',
        development: '8-12周',
        testing: '2-3周',
        deployment: '1周'
      }
    }
    
    setRequirementResult(requirements)
    setShowRequirementModal(true)
    if (onRequirementGenerate) onRequirementGenerate(requirements)
  }

  // 过滤功能
  const filteredFeatures = features.filter(feature => {
    const matchesCategory = filterCategory === 'all' || feature.category === filterCategory
    const matchesSearch = (feature.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (feature.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200">

      

      
      {/* 添加功能模态框 */}
      {showAddFeature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">添加新功能</h3>
              <button
                onClick={() => setShowAddFeature(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">功能名称</label>
                  <input
                    type="text"
                    value={newFeature.name}
                    onChange={(e) => setNewFeature(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入功能名称"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">功能分类</label>
                  <select
                    value={newFeature.category}
                    onChange={(e) => setNewFeature(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.entries(categories).filter(([key]) => key !== 'all').map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">功能描述</label>
                <textarea
                  value={newFeature.description}
                  onChange={(e) => setNewFeature(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="详细描述功能特点和用途"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                  <select
                    value={newFeature.priority}
                    onChange={(e) => setNewFeature(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <select
                    value={newFeature.status}
                    onChange={(e) => setNewFeature(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="available">可用</option>
                    <option value="beta">测试</option>
                    <option value="planned">计划</option>
                    <option value="deprecated">已废弃</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">评分</label>
                  <select
                    value={newFeature.rating}
                    onChange={(e) => setNewFeature(prev => ({ ...prev, rating: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {[1, 2, 3, 4, 5].map(rating => (
                      <option key={rating} value={rating}>{rating} 星</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddFeature(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  取消
                </button>
                <button
                  onClick={handleAddFeature}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
                >
                  添加功能
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 分析结果模态框 */}
      {showAnalysisModal && analysisResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">功能分析报告</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const content = JSON.stringify(analysisResult, null, 2)
                    const blob = new Blob([content], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'feature-analysis.json'
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowAnalysisModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* 概览 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{analysisResult.summary.totalFeatures}</div>
                  <div className="text-sm text-blue-700">分析功能数</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{analysisResult.summary.highPriority}</div>
                  <div className="text-sm text-red-700">高优先级</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{analysisResult.summary.averageRating}</div>
                  <div className="text-sm text-yellow-700">平均评分</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{analysisResult.summary.topCategories.length}</div>
                  <div className="text-sm text-green-700">主要分类</div>
                </div>
              </div>
              
              {/* SWOT分析 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      优势 (Strengths)
                    </h4>
                    <ul className="space-y-1">
                      {analysisResult.strengths.map((strength, index) => (
                        <li key={index} className="text-sm text-green-700 flex items-start">
                          <Check className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                      <Lightbulb className="w-4 h-4 mr-2" />
                      机会 (Opportunities)
                    </h4>
                    <ul className="space-y-1">
                      {analysisResult.opportunities.map((opportunity, index) => (
                        <li key={index} className="text-sm text-blue-700 flex items-start">
                          <Plus className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />
                          {opportunity}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2 flex items-center">
                      <TrendingDown className="w-4 h-4 mr-2" />
                      劣势 (Weaknesses)
                    </h4>
                    <ul className="space-y-1">
                      {analysisResult.weaknesses.map((weakness, index) => (
                        <li key={index} className="text-sm text-red-700 flex items-start">
                          <AlertCircle className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />
                          {weakness}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-800 mb-2 flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      威胁 (Threats)
                    </h4>
                    <ul className="space-y-1">
                      {analysisResult.threats.map((threat, index) => (
                        <li key={index} className="text-sm text-orange-700 flex items-start">
                          <Minus className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />
                          {threat}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* 建议 */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-3 flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  改进建议
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analysisResult.recommendations.map((recommendation, index) => (
                    <div key={index} className="bg-white p-3 rounded border border-purple-200">
                      <div className="text-sm text-purple-700">{recommendation}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 需求文档模态框 */}
      {showRequirementModal && requirementResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">需求文档</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const content = JSON.stringify(requirementResult, null, 2)
                    const blob = new Blob([content], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'requirements.json'
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowRequirementModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* 项目信息 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-3">项目信息</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">项目名称</div>
                    <div className="font-medium">{requirementResult.projectInfo.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">版本</div>
                    <div className="font-medium">{requirementResult.projectInfo.version}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">创建日期</div>
                    <div className="font-medium">{requirementResult.projectInfo.date}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">功能数量</div>
                    <div className="font-medium">{requirementResult.projectInfo.features}</div>
                  </div>
                </div>
              </div>
              
              {/* 功能需求 */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">功能需求</h4>
                <div className="space-y-3">
                  {requirementResult.functionalRequirements.map((req, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900">{req.id}: {req.name}</h5>
                        <span className={`px-2 py-1 rounded-full text-xs border ${getPriorityColor(req.priority)}`}>
                          {req.priority === 'high' ? '高' : req.priority === 'medium' ? '中' : '低'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{req.description}</p>
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">验收标准:</div>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {req.acceptanceCriteria.map((criteria, idx) => (
                            <li key={idx} className="flex items-start">
                              <Check className="w-3 h-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                              {criteria}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 非功能需求 */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">非功能需求</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {requirementResult.nonFunctionalRequirements.map((req, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900">{req.id}</h5>
                        <span className={`px-2 py-1 rounded-full text-xs border ${getPriorityColor(req.priority)}`}>
                          {req.priority === 'high' ? '高' : req.priority === 'medium' ? '中' : '低'}
                        </span>
                      </div>
                      <div className="text-sm text-blue-600 mb-1">{req.type}</div>
                      <p className="text-sm text-gray-600">{req.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 技术需求 */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">技术需求</h4>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <ul className="space-y-2">
                    {requirementResult.technicalRequirements.map((req, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <Check className="w-3 h-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {/* 时间计划 */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">时间计划</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(requirementResult.timeline).map(([phase, duration]) => (
                    <div key={phase} className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                      <div className="text-sm text-gray-600 mb-1">
                        {phase === 'planning' ? '规划阶段' :
                         phase === 'development' ? '开发阶段' :
                         phase === 'testing' ? '测试阶段' : '部署阶段'}
                      </div>
                      <div className="text-lg font-semibold text-gray-900">{duration}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CompetitorFeatureAnalysis