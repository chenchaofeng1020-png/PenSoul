import { BarChart3, Plus, BookOpen, GitBranch, Share, Edit, Download, Tag, User, Clock, ArrowLeft, MoreVertical, Trash2, ExternalLink, Copy } from 'lucide-react'
import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import CompetitorBasicInfo from './CompetitorBasicInfo'


import CompetitorAnalysis from './CompetitorAnalysis'
import CompetitorSuggestions from './CompetitorSuggestions'
import CompetitorFeatureAnalysis from './CompetitorFeatureAnalysis'

const CompetitorDetailPage = ({ 
  competitor, 
  onBack,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  currentUser,
  onLogout,
  currentProduct,
  userProducts,
  onProductChange,
  onAddProduct
}) => {
  // 状态管理
  const [loading, setLoading] = useState(false)
  const [analyses, setAnalyses] = useState([])
  const [comments, setComments] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeTab, setActiveTab] = useState('analysis')

  // API 基础 URL
  const API_BASE = 'http://localhost:8000'

  // 加载竞品相关数据
  useEffect(() => {
    if (competitor?.id) {
      loadCompetitorData()
    }
  }, [competitor?.id])

  const loadCompetitorData = async () => {
    setLoading(true)
    try {
      // 并行加载所有数据
      await Promise.all([
        loadAnalyses(),
        loadComments()
      ])
    } catch (error) {
      console.error('加载竞品数据失败:', error)
    } finally {
      setLoading(false)
    }
  }





  // 加载分析
  const loadAnalyses = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/competitor-analyses?competitor_id=${competitor.id}`)
      if (response.ok) {
        const data = await response.json()
        setAnalyses(data.data || [])
      }
    } catch (error) {
      console.error('加载分析失败:', error)
    }
  }

  // 加载评论
  const loadComments = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/comments?competitor_id=${competitor.id}`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.data || [])
      }
    } catch (error) {
      console.error('加载评论失败:', error)
    }
  }

  // 处理竞品编辑
  const handleEditCompetitor = (competitorData) => {
    alert('编辑竞品功能开发中')
  }

  // 处理竞品删除
  const handleDeleteCompetitor = (competitorId) => {
    if (window.confirm('确定要删除这个竞品吗？此操作不可恢复。')) {
      alert('删除竞品功能开发中')
    }
  }

  // 处理访问官网
  const handleViewWebsite = (url) => {
    if (url) {
      window.open(url, '_blank')
    } else {
      alert('暂无官网链接')
    }
  }

  // 处理竞品复制
  const handleCopyCompetitor = () => {
    alert('复制竞品功能开发中')
  }

  // 处理竞品分享
  const handleShareCompetitor = () => {
    alert('分享竞品功能开发中')
  }

  if (!competitor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">竞品信息加载中...</h2>
          <p className="text-gray-600">请稍候</p>
        </div>
      </div>
    )
  }

  // 确保数组字段存在
  const mainCustomers = competitor.mainCustomers || []
  const recentUpdates = competitor.recentUpdates || []

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        currentUser={currentUser}
        onLogout={onLogout}
        currentProduct={currentProduct}
        userProducts={userProducts}
        onProductChange={onProductChange}
        onAddProduct={onAddProduct}
      />
      
      <main className="flex-1 overflow-hidden bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-sm h-full overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">加载竞品数据中...</p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-hidden flex flex-col">
              {/* 顶部标题栏 - 占整个页面宽度 */}
              <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={onBack}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>返回竞品列表</span>
                  </button>
                  
                  {/* 操作下拉菜单 */}
                  <div className="relative">
                    <button 
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    {showDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <div className="py-1">
                          <button 
                            onClick={() => {
                              handleEditCompetitor(competitor)
                              setShowDropdown(false)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            编辑竞品信息
                          </button>
                          <button 
                            onClick={() => {
                              handleDeleteCompetitor(competitor.id)
                              setShowDropdown(false)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除竞品
                          </button>
                          <button 
                            onClick={() => {
                              handleViewWebsite(competitor.website)
                              setShowDropdown(false)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            访问官网
                          </button>
                          <button 
                            onClick={() => {
                              handleCopyCompetitor()
                              setShowDropdown(false)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            复制竞品
                          </button>
                          <button 
                            onClick={() => {
                              handleShareCompetitor()
                              setShowDropdown(false)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Share className="w-4 h-4 mr-2" />
                            分享竞品
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 主要内容区域 - 左右分栏 */}
              <div className="flex flex-1 overflow-hidden">
                {/* 左侧：基本信息区域 (30%) */}
                <div className="w-3/10 border-r border-gray-200 overflow-auto">
                  <div className="p-6">
                    <div className="bg-white rounded-xl shadow-sm">
                      <CompetitorBasicInfo
                        competitor={competitor}
                        hideHeader={true}
                        onEdit={handleEditCompetitor}
                        onDelete={handleDeleteCompetitor}
                        onViewWebsite={handleViewWebsite}
                        onCopy={handleCopyCompetitor}
                        onShare={handleShareCompetitor}
                      />
                    </div>
                  </div>
                </div>

                {/* 右侧：分析内容区域 (70%) */}
                <div className="w-7/10 overflow-auto">
                  <div className="p-6 space-y-6">
                    {/* 竞品分析卡片 */}
                    <div className="bg-white rounded-xl shadow-sm">
                      <CompetitorAnalysis
                        competitorId={competitor.id}
                        analyses={analyses}
                        onCreateAnalysis={() => alert('新增分析功能开发中')}
                        onEditAnalysis={(analysis) => alert('编辑分析功能开发中')}
                        onViewAnalysis={(analysis) => alert('查看分析功能开发中')}
                        onExportAnalysis={(analysis) => alert('导出分析功能开发中')}
                      />
                    </div>

                    {/* 操作建议卡片 */}
                    <div className="bg-white rounded-xl shadow-sm">
                      <CompetitorSuggestions competitor={competitor} />
                    </div>

                    {/* 功能分析卡片 */}
                    <div className="bg-white rounded-xl shadow-sm">
                      <CompetitorFeatureAnalysis 
                        competitorId={competitor.id}
                        competitorName={competitor?.name || '竞品'}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default CompetitorDetailPage