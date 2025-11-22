import React, { useState, useEffect } from 'react'
import { ArrowLeft, Edit, Share2, Download, Trash2, ExternalLink, Copy, Star, MessageCircle, Eye, Calendar, Tag, User, Building, Globe, TrendingUp, Users, BarChart3, Heart, ThumbsUp, AlertCircle, MoreHorizontal, Clock, FileText, Plus } from 'lucide-react'
import Sidebar from './Sidebar'
import AddFeatureAnalysisModal from './AddFeatureAnalysisModal'
import FeatureAnalysisDetailDrawer from './FeatureAnalysisDetailDrawer'
import CommentSystem from './CommentSystem'
import CompetitorScreenshots from './CompetitorScreenshots'
import { listScreenshots, uploadScreenshot, deleteScreenshot } from '../services/api'

const NewCompetitorDetailPage = ({
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
  const [activeTab, setActiveTab] = useState('全部')
  const [isEditing, setIsEditing] = useState(false)
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailDrawer, setShowDetailDrawer] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [screenshots, setScreenshots] = useState([])

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showActionMenu && !event.target.closest('.action-menu-container')) {
        setShowActionMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showActionMenu])

  useEffect(() => {
    const loadScreenshots = async () => {
      if (!competitor?.id || !currentProduct?.id) return
      try {
        const data = await listScreenshots(currentProduct.id, competitor.id)
        const mapped = (data || []).map((row) => ({
          id: row.id,
          url: row.signedUrl || '',
          title: competitor?.name || '截图',
          description: competitor?.description || '',
          uploadDate: row.created_at ? new Date(row.created_at).toLocaleString('zh-CN') : '',
          size: '',
        }))
        setScreenshots(mapped)
      } catch (e) {
        console.error('加载截图失败:', e)
      }
    }
    loadScreenshots()
  }, [competitor?.id, currentProduct?.id])

  // 根据设计稿的正确功能分类
  const functionCategories = [
    { id: '全部', name: '全部', icon: Eye, color: 'bg-gray-500' },
    { id: '功能分析', name: '功能分析', icon: BarChart3, color: 'bg-blue-500' },
    { id: '调研报告', name: '调研报告', icon: Users, color: 'bg-purple-500' },
    { id: '产品文档', name: '产品文档', icon: MessageCircle, color: 'bg-cyan-500' },
    { id: '系统截图', name: '系统截图', icon: Copy, color: 'bg-pink-500' }
  ]

  // 根据设计稿的内容结构，移除写死的模拟数据，只保留后端返回的数据
  const [contentData, setContentData] = useState({
    '全部': [], // 全部分类下展示不同分类下的竞品追踪内容
    '功能分析': [],
    '调研报告': [],
    '产品文档': [],
    '系统截图': []
  })

  // 作者映射和头像组件
  const mapAuthor = (record) => ({
    id: record?.author_id || record?.created_by_id || record?.user_id || null,
    name: record?.author_name || record?.author || record?.created_by_name || '匿名用户',
    avatar: record?.author_avatar || record?.avatar_url || null,
  })

  const AnalysisUserAvatar = ({ user }) => (
    <div className="flex items-center text-sm text-gray-600">
      {user?.avatar ? (
        <img src={user.avatar} alt={user?.name || '用户'} className="w-5 h-5 rounded-full mr-2" />
      ) : (
        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center mr-2">
          <User className="w-3 h-3 text-gray-500" />
        </div>
      )}
      <span>{user?.name || '匿名用户'}</span>
    </div>
  )

  // 加载功能分析数据
  const loadFeatureAnalyses = async () => {
    if (!competitor?.id) return

    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:8000/api/competitors/${competitor.id}/analyses`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        const payload = result.data
        const analyses = Array.isArray(payload) ? payload : (payload && payload.analyses) ? payload.analyses : []
        
        // 转换后端数据格式为前端显示格式
        const formattedAnalyses = analyses.map(analysis => ({
          id: analysis.id,
          title: analysis.title,
          content: analysis.content_html || analysis.content || '暂无详细内容',
          category: '功能分析',
          type: analysis.analysis_type || analysis.type || 'feature',
          author: mapAuthor(analysis),
          createdAt: analysis.created_at ? new Date(analysis.created_at).toLocaleString('zh-CN') : '',
          updatedAt: analysis.updated_at ? new Date(analysis.updated_at).toLocaleString('zh-CN') : null,
          tags: Array.isArray(analysis.tags)
            ? analysis.tags
            : (typeof analysis.tags === 'string'
                ? analysis.tags.split(',').map(t => t.trim()).filter(Boolean)
                : []),
          // 新增扩展字段
          attachments: Array.isArray(analysis.attachments) ? analysis.attachments : [],
          rating: typeof analysis.rating === 'number' ? analysis.rating : null,
          visibility: typeof analysis.visibility !== 'undefined' ? analysis.visibility : (typeof analysis.is_public !== 'undefined' ? (analysis.is_public ? 'public' : 'private') : null),
          actions: ['编辑', '删除', '查看详情', '分享', '下载']
        }))

        // 默认按创建时间倒序
        const sortedAnalyses = formattedAnalyses.sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return tb - ta
        })

        setContentData(prev => ({
          ...prev,
          '功能分析': sortedAnalyses
        }))
      }
    } catch (error) {
      console.error('加载功能分析数据失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 组件加载时获取数据
  useEffect(() => {
    loadFeatureAnalyses()
  }, [competitor?.id])

  // 处理编辑功能
  const handleEdit = () => {
    alert('编辑竞品功能开发中')
  }

  // 处理分享功能
  const handleShare = async () => {
    const shareData = {
      title: competitor?.name || '竞品详情',
      text: '查看该竞品的详情信息',
      url: window.location.href
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (e) {
        console.error('分享失败:', e)
        alert('分享失败，请稍后再试')
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url)
        alert('链接已复制到剪贴板')
      } catch (e) {
        alert('分享功能不可用')
      }
    }
  }

  // 处理下载功能
  const handleDownload = () => {
    try {
      const data = JSON.stringify(competitor || {}, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${(competitor?.name || 'competitor')}-详情.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
    } catch (e) {
      console.error('下载失败:', e)
      alert('下载失败，请稍后再试')
    }
  }

  // 处理删除功能
  const handleDelete = () => {
    if (window.confirm('确定要删除这个竞品吗？')) {
      console.log('删除竞品')
      onBack() // 删除后返回列表页
    }
  }

  // 处理添加功能分析
  const handleAddFeatureAnalysis = (formData) => {
    // 由于AddFeatureAnalysisModal已经处理了API调用
    // 这里只需要刷新数据列表
    loadFeatureAnalyses()
    
    // 切换到功能分析标签页
    setActiveTab('功能分析')
  }

  // 截取富文本内容的前3行
  const truncateContent = (htmlContent, maxLines = 3) => {
    if (!htmlContent) return '暂无内容'
    
    // 移除HTML标签，获取纯文本
    const textContent = htmlContent.replace(/<[^>]*>/g, '')
    const lines = textContent.split('\n').filter(line => line.trim())
    
    if (lines.length <= maxLines) {
      return textContent
    }
    
    return lines.slice(0, maxLines).join('\n') + '...'
  }

  // 打开详情抽屉
  const openDetailDrawer = (item) => {
    setSelectedItem(item)
    setShowDetailDrawer(true)
  }

  // 关闭详情抽屉
  const closeDetailDrawer = () => {
    setShowDetailDrawer(false)
    setSelectedItem(null)
  }

  // 处理删除操作
  const handleDeleteItem = (itemId, category) => {
    setContentData(prev => ({
      ...prev,
      [category]: prev[category].filter(item => item.id !== itemId)
    }))
  }

  // 渲染内容卡片
  const renderContentCards = () => {
    let currentContent = []
    
    if (activeTab === '全部') {
      // 全部分类下展示所有分类的数据
      currentContent = [
        ...contentData['功能分析'],
        ...contentData['调研报告'],
        ...contentData['产品文档'],
        ...contentData['系统截图']
      ]
    } else {
      currentContent = contentData[activeTab] || []
    }
    
    return (
      <div className="space-y-4">
        {currentContent.map((item, index) => {
          // 功能分析类型使用特殊布局
          if (item.category === '功能分析' || activeTab === '功能分析') {
            return (
              <div key={`${item.category}-${item.id ?? index}`} className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 overflow-hidden group">
                {/* 功能分析头部 */}
                <div className="px-4 pt-4 pb-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            {item.category}
                          </span>
                          <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 leading-tight flex-1 min-w-0">
                            {item.title}
                          </h3>
                          {Number.isFinite(item.rating) && item.rating > 0 && (
                            <div className="flex items-center space-x-1">
                              {[...Array(Math.min(item.rating, 5))].map((_, i) => (
                                <Star key={`star-${i}`} className="w-3 h-3 text-yellow-400 fill-current" />
                              ))}
                              <span className="text-xs font-semibold text-gray-700 ml-1">
                                {item.rating}/5
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center flex-wrap gap-x-6 gap-y-2">
                        </div>
                        
                        {/* 内容预览 - 移到这里 */}
                        <div className="mt-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
                          <div className="text-gray-700 text-sm leading-relaxed">
                            <div className="line-clamp-2">
                              {truncateContent(item.content)}
                            </div>
                            {item.content && item.content.length > 200 && (
                              <button
                                onClick={() => openDetailDrawer(item)}
                                className="text-blue-600 hover:text-blue-700 text-xs mt-2 inline-flex items-center font-medium transition-colors duration-200"
                              >
                                展开查看完整内容
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* 时间信息 - 移到这里 */}
                        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-3 mb-1.5">
                          <AnalysisUserAvatar user={item.author} />
                          <div className="flex items-center text-xs text-gray-600">
                            <Calendar className="w-3 h-3 mr-1" />
                            <span className="font-medium">创建: {item.createdAt}</span>
                          </div>
                          {item.updatedAt && (
                            <div className="flex items-center text-xs text-gray-600">
                              <Clock className="w-3 h-3 mr-1" />
                              <span className="font-medium">更新: {item.updatedAt}</span>
                            </div>
                          )}
                          {Array.isArray(item.attachments) && item.attachments.length > 0 && (
                            <div className="flex items-center text-xs text-gray-600">
                              <FileText className="w-3 h-3 mr-1" />
                              <span className="font-medium">{item.attachments.length} 个附件</span>
                            </div>
                          )}
                        </div>
                        {/* 标签和可见性 */}
                        {((item.visibility || item.visibility === false) || (item.tags && item.tags.length > 0)) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(item.visibility === 'public' || item.visibility === true) && (
                              <span className="inline-flex items-center space-x-1 bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full border border-green-200 font-medium">
                                <Globe className="w-3 h-3" />
                                <span>公开</span>
                              </span>
                            )}
                            {item.tags && item.tags.length > 0 && (
                              item.tags.slice(0, 3).map((tag, idx) => (
                                <span key={idx} className="inline-block bg-gray-50 text-gray-700 text-xs px-2 py-1 rounded-full border border-gray-200 font-medium">
                                  {tag}
                                </span>
                              ))
                            )}
                            {item.tags && item.tags.length > 3 && (
                              <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-200 font-medium">
                                +{item.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* 操作按钮 */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => openDetailDrawer(item)}
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-semibold transition-all duration-200 hover:bg-blue-50 px-3 py-2 rounded-lg"
                      >
                        <Eye className="w-4 h-4" />
                        <span>查看详情</span>
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => {/* TODO: 实现下拉菜单 */}}
                          className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all duration-200 shadow-sm"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          }
          
          // 其他类型使用优化后的布局
          return (
            <div key={`${item.category}-${item.id ?? index}`} className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full bg-gray-50 text-gray-700 border border-gray-200">
                        {item.category}
                      </span>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 leading-tight flex-1 min-w-0">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {item.actions && item.actions.map((action, actionIndex) => (
                      <button
                        key={actionIndex}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-all duration-200 hover:bg-blue-50 px-3 py-2 rounded-lg"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="px-6 pb-5">
                <p className="text-gray-700 leading-relaxed line-clamp-3">{item.content}</p>
              </div>
              
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span className="font-medium">{item.createdAt || item.timestamp}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {item.tags.slice(0, 2).map((tag, idx) => (
                          <span key={idx} className="inline-block bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-full border border-blue-200 font-medium">
                            {tag}
                          </span>
                        ))}
                        {item.tags.length > 2 && (
                          <span className="inline-block bg-gray-50 text-gray-600 text-xs px-3 py-1.5 rounded-full border border-gray-200 font-medium">
                            +{item.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                    {item.link && (
                      <a 
                        href={item.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 hover:bg-blue-50 px-3 py-2 rounded-lg"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        查看链接
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        
        {currentContent.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <MessageCircle className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">暂无内容</h3>
            <p className="text-gray-600 text-lg">该分类下暂时没有相关内容</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏 */}
      <Sidebar 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={(label) => {
          try {
            setSelectedCategory(label)
            onBack()
          } catch (e) {
            console.error('切换分类并返回失败:', e)
          }
        }}
        currentUser={currentUser}
        onLogout={onLogout}
        currentProduct={currentProduct}
        userProducts={userProducts}
        onProductChange={onProductChange}
        onAddProduct={onAddProduct}
        widthClass="w-44"
      />
      
      {/* 主内容区域 - 与列表页保持一致的框架结构 */}
      <main className="flex-1 overflow-hidden bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
          {/* 固定的页面头部区域 */}
          <div className="flex-shrink-0 border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              {/* 左侧：返回按钮 */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={onBack}
                  className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  返回
                </button>
              </div>
              
              {/* 中间：页面标题 */}
              <div className="flex-1 text-center">
                <div className="text-sm text-gray-900">竞品详情</div>
              </div>
              
              {/* 右侧：主导航按钮 */}
              <div className="flex items-center space-x-2">
              </div>
            </div>
          </div>

          {/* 可滚动的内容区域 - 左右布局 */}
          <div className="flex-1 overflow-hidden flex">
            {/* 左侧：产品基本信息和操作按钮 (30%) */}
            <div className="w-[30%] border-r border-gray-200 overflow-auto">
              {/* 产品信息区域 */}
              <div className="px-6 py-6">
                {/* 产品基本信息 */}
                <div className="flex flex-col space-y-4">
                  <div className="w-16 h-16 bg-[#3762e3] rounded-xl flex items-center justify-center flex-shrink-0 mx-auto">
                    <span className="text-white font-bold text-xl">{competitor?.name?.[0] || '产'}</span>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 mb-2">{competitor?.name || '产品名称'}</div>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                      {competitor?.description || '产品描述信息'}
                    </p>
                    <div className="flex flex-col space-y-2 text-xs text-gray-500 mb-4">
                      <div className="flex items-center justify-center">
                        <Building className="w-3 h-3 mr-1" />
                        {competitor?.company || '公司名称'}
                      </div>
                      <div className="flex items-center justify-center">
                        <Globe className="w-3 h-3 mr-1" />
                        创始人
                      </div>
                      <div className="flex items-center justify-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        更新于 {competitor?.updated_at || '2023-11-15'}
                      </div>
                    </div>
                    
                    {/* 产品介绍 */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-100 mb-4">
                      <div className="text-gray-700 text-xs leading-relaxed">
                        <div className={`${!isDescriptionExpanded ? 'line-clamp-5' : ''}`}>
                          {competitor?.name || '该产品'}是一款专注于提升团队协作效率的创新型产品，致力于为用户提供简洁、高效的工作体验。
                          通过整合多种办公场景和工作流程，帮助团队成员更好地沟通协作，提升整体工作效率。
                          产品核心功能包括实时协作编辑、智能任务管理、多端同步、数据安全保护等特性。
                          采用现代化的设计理念，注重用户体验，为不同规模的团队提供灵活的解决方案。
                          目前已服务超过数万家企业用户，在提升团队协作效率、降低沟通成本、优化工作流程等方面获得了用户的广泛认可。
                          未来将继续深耕协作领域，为用户创造更大价值。
                        </div>
                        <button
                          onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                          className="mt-2 text-[#3762e3] hover:text-[#2f55c6] text-xs font-medium transition-colors"
                        >
                          {isDescriptionExpanded ? '收起' : '展开查看全部'}
                        </button>
                      </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className="flex flex-col space-y-2">
                      <button className="flex items-center justify-center space-x-2 px-3 py-3 text-xs font-medium text-white bg-[#3762e3] rounded-md hover:bg-[#2f55c6] transition-colors" onClick={() => competitor?.website ? window.open(competitor.website, '_blank') : alert('暂无官网链接')}>
                        <Globe className="w-3 h-3" />
                        <span>官网</span>
                      </button>
                      <button className="flex items-center justify-center space-x-2 px-3 py-3 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors" onClick={() => alert('帮助文档功能开发中')}>
                        <MessageCircle className="w-3 h-3" />
                        <span>帮助文档</span>
                      </button>
                      <button className="flex items-center justify-center space-x-2 px-3 py-3 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors" onClick={() => alert('接口文档功能开发中')}>
                        <ExternalLink className="w-3 h-3" />
                        <span>接口文档</span>
                      </button>
                      <div className="relative action-menu-container">
                        <button
                          onClick={() => setShowActionMenu(!showActionMenu)}
                          className="w-full p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4 mx-auto" />
                        </button>
                        
                        {/* 操作菜单下拉 */}
                        {showActionMenu && (
                          <div className="absolute right-0 top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                            <button
                              onClick={() => {
                                handleEdit()
                                setShowActionMenu(false)
                              }}
                              className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center"
                            >
                              <Edit className="w-3 h-3 mr-2" />
                              编辑
                            </button>
                            <button
                              onClick={() => {
                                handleShare()
                                setShowActionMenu(false)
                              }}
                              className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center"
                            >
                              <Share2 className="w-3 h-3 mr-2" />
                              分享
                            </button>
                            <button
                              onClick={() => {
                                handleDownload()
                                setShowActionMenu(false)
                              }}
                              className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center"
                            >
                              <Download className="w-3 h-3 mr-2" />
                              下载
                            </button>
                            <button
                              onClick={() => {
                                handleDelete()
                                setShowActionMenu(false)
                              }}
                              className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center"
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
                              删除
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：功能分类导航和内容展示区域 (70%) */}
             <div className="w-[70%] overflow-auto">
              {/* 标题和添加按钮区域 */}
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">竞品追踪</h2>
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center px-4 py-2 bg-[#3762e3] text-white rounded-lg hover:bg-[#2f55c6] transition-colors text-sm font-medium"
                  >
                    <span className="mr-1">+</span>
                    添加
                  </button>
                </div>
              </div>
              
              {/* 功能分类区域 - 竞品追踪功能导航 */}
              <div className="px-6 pt-5 pb-2">
                <div className="flex flex-wrap gap-3">
                  {functionCategories.map((category) => {
                    const IconComponent = category.icon
                    return (
                      <button
                        key={category.id}
                        onClick={() => setActiveTab(category.id)}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          activeTab === category.id
                            ? 'bg-[#e8efff] text-[#3762e3] border-2 border-[#c9d6ff]'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 ${category.color}`}>
                          <IconComponent className="w-3 h-3 text-white" />
                        </div>
                        {category.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 内容展示区域 */}
              <div className="px-6 pt-3 pb-6">
                <div className="max-w-4xl mx-auto">
                  {activeTab === '系统截图' ? (
                    <CompetitorScreenshots
                      competitorId={competitor?.id}
                      screenshots={screenshots}
                      onUpload={async (file) => {
                        try {
                          if (!currentProduct?.id || !competitor?.id) return
                          await uploadScreenshot(file, { productId: currentProduct.id, competitorId: competitor.id })
                          const data = await listScreenshots(currentProduct.id, competitor.id)
                          const mapped = (data || []).map((row) => ({
                            id: row.id,
                            url: row.signedUrl || '',
                            title: competitor?.name || '截图',
                            description: competitor?.description || '',
                            uploadDate: row.created_at ? new Date(row.created_at).toLocaleString('zh-CN') : '',
                            size: '',
                          }))
                          setScreenshots(mapped)
                        } catch (e) {
                          alert(e.message || '上传失败')
                        }
                      }}
                      onDelete={async (id) => {
                        try {
                          await deleteScreenshot(id)
                          setScreenshots((prev) => prev.filter((s) => s.id !== id))
                        } catch (e) {
                          alert(e.message || '删除失败')
                        }
                      }}
                      onView={(s) => window.open(s.url, '_blank')}
                    />
                  ) : (
                    renderContentCards()
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 添加功能分析弹窗 */}
      <AddFeatureAnalysisModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddFeatureAnalysis}
        competitorId={competitor?.id}
      />

      {/* 功能分析详情抽屉 */}
      <FeatureAnalysisDetailDrawer
        isOpen={showDetailDrawer}
        onClose={closeDetailDrawer}
        item={selectedItem}
        currentUser={currentUser}
        onEdit={(item) => {
          // 编辑功能 - 可以打开编辑弹窗
          console.log('编辑功能分析:', item)
          closeDetailDrawer()
          // TODO: 实现编辑功能
        }}
        onDelete={(item) => {
          // 删除功能
          if (confirm('确定要删除这个功能分析吗？')) {
            handleDeleteItem(item.id, item.category || '功能分析')
            closeDetailDrawer()
          }
        }}
        onCreateRequirement={(item) => {
          // 创建需求功能
          console.log('创建需求:', item)
          closeDetailDrawer()
          // TODO: 实现创建需求功能
        }}
      />
    </div>
  )
}
  
  export default NewCompetitorDetailPage