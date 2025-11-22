import { useState, useEffect } from 'react'
import { 
  FileText, 
  BarChart3, 
  Search, 
  Bell, 
  Settings, 
  Plus,
  Edit3,
  Trash2,
  Eye,
  ExternalLink,
  Calendar,
  User,
  Tag
} from 'lucide-react'

const CompetitorAnalysisPage = ({ 
  currentProduct, 
  currentUser, 
  onLogout 
}) => {
  const [activeCategory, setActiveCategory] = useState('竞品分析')
  const [searchTerm, setSearchTerm] = useState('')
  const [analysisData, setAnalysisData] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // 功能分类配置
  const categories = [
    { id: '竞品分析', name: '竞品分析', icon: BarChart3, color: 'bg-blue-500' },
    { id: '产品分析', name: '产品分析', icon: FileText, color: 'bg-green-500' },
    { id: '产品调研', name: '产品调研', icon: Search, color: 'bg-purple-500' },
    { id: '更新动态', name: '更新动态', icon: Bell, color: 'bg-orange-500' },
    { id: '产品文档', name: '产品文档', icon: FileText, color: 'bg-red-500' },
    { id: '产品管理', name: '产品管理', icon: Settings, color: 'bg-indigo-500' },
    { id: '竞品文档', name: '竞品文档', icon: FileText, color: 'bg-teal-500' }
  ]

  // 移除写死的模拟数据，analysisData 将由外部/后端加载
  // 保持 analysisData 默认空

  // 筛选数据
  const filteredData = analysisData.filter(item =>
    (item.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 处理编辑
  const handleEdit = (item) => {
    console.log('编辑项目:', item)
    // 这里可以打开编辑模态框或跳转到编辑页面
  }

  // 处理删除
  const handleDelete = (item) => {
    if (window.confirm('确定要删除这个项目吗？')) {
      console.log('删除项目:', item)
      // 这里调用删除API
    }
  }

  // 处理查看详情
  const handleViewDetail = (item) => {
    console.log('查看详情:', item)
    // 这里可以打开详情模态框或跳转到详情页面
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* 品牌标识区域 */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">飞</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">飞书文档</h1>
            </div>
            <div className="text-sm text-gray-500">
              飞书文档是一款支持多人协作的文档、表格、幻灯片等一体化的办公套件，支持多人实时协作编辑，
              支持插入富媒体，所见即所得的编辑体验，还支持多维表格、思维导图、流程图、
              画板等多样化的内容形式。
            </div>
          </div>

          {/* 导航功能区域 */}
          <div className="flex items-center space-x-3">
            <button className="px-3 py-1.5 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 transition-colors">
              首页
            </button>
            <button className="px-3 py-1.5 text-gray-600 text-sm hover:text-gray-900 transition-colors">
              插件文档
            </button>
            <button className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">
              帮助文档
            </button>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>{currentUser}</span>
              <button 
                onClick={onLogout}
                className="text-red-600 hover:text-red-700 ml-2"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className="px-6 py-6">
        {/* 功能导航模块 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">竞品追踪</h2>
          <div className="grid grid-cols-7 gap-4">
            {categories.map((category) => {
              const IconComponent = category.icon
              const isActive = activeCategory === category.id
              
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    isActive 
                      ? 'border-purple-200 bg-purple-50 shadow-md' 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <div className={`w-10 h-10 ${category.color} rounded-lg flex items-center justify-center`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <span className={`text-sm font-medium ${
                      isActive ? 'text-purple-700' : 'text-gray-700'
                    }`}>
                      {category.name}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 搜索和操作区域 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h3 className="text-xl font-semibold text-gray-900">{activeCategory}</h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索内容..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            <Plus className="w-4 h-4" />
            <span>新建{activeCategory}</span>
          </button>
        </div>

        {/* 内容展示区域 */}
        <div className="space-y-4">
          {filteredData.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无{activeCategory}内容</h3>
              <p className="text-gray-500 mb-4">开始创建您的第一个{activeCategory}项目</p>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                立即创建
              </button>
            </div>
          ) : (
            filteredData.map((item, index) => (
              <div key={`${item.category}-${item.id ?? index}`} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                {/* 卡片内容 */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h4 className="text-lg font-semibold text-gray-900">{item.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.status === '已完成' ? 'bg-green-100 text-green-700' :
                        item.status === '进行中' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-4 leading-relaxed">{item.description}</p>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{item.author}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{item.date}</span>
                      </div>
                      {item.tags && (
                        <div className="flex items-center space-x-2">
                          <Tag className="w-4 h-4" />
                          <div className="flex space-x-1">
                            {item.tags.map((tag, index) => (
                              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {item.externalLink && (
                        <a 
                          href={item.externalLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 text-purple-600 hover:text-purple-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>查看详情</span>
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {/* 操作按钮 */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleViewDetail(item)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default CompetitorAnalysisPage