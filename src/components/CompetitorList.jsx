import { Search, Plus, Eye, Calendar, Users, Zap, ChevronLeft, ChevronRight, Globe, BookOpen, Code, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { useState, useMemo, useEffect, useRef } from 'react'

const CompetitorList = ({ competitors, searchTerm, onSearchChange, onViewDetail, onAddCompetitor, currentProduct, selectedCategory }) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [openDropdownId, setOpenDropdownId] = useState(null)
  const dropdownRef = useRef(null)
  const itemsPerPage = 6 // 每页显示6个竞品

  // 调试日志
  console.log('CompetitorList rendered with:', {
    competitors: competitors,
    competitorsLength: competitors?.length,
    currentProduct: currentProduct,
    searchTerm: searchTerm
  })

  // 计算分页数据
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return competitors.slice(startIndex, endIndex)
  }, [competitors, currentPage, itemsPerPage])

  const totalPages = Math.ceil(competitors.length / itemsPerPage)

  // 分页控制函数
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  // 当搜索条件改变时重置到第一页
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // 切换下拉菜单
  const toggleDropdown = (competitorId) => {
    setOpenDropdownId(openDropdownId === competitorId ? null : competitorId)
  }

  // 处理编辑
  const handleEdit = (competitor) => {
    console.log('编辑竞品:', competitor)
    setOpenDropdownId(null)
  }

  // 处理删除
  const handleDelete = (competitor) => {
    console.log('删除竞品:', competitor)
    setOpenDropdownId(null)
  }

  return (
    <div className="space-y-6 pl-6 pr-6">
      {/* 页面标题和添加竞品按钮 */}
      <div className="border-b border-gray-200 pb-6 pt-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{selectedCategory || '竞品管理'}</h1>
          <p className="text-gray-600 mt-2">管理和分析您的竞品信息</p>
        </div>
        <button
          onClick={onAddCompetitor}
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          <span>添加竞品</span>
        </button>
      </div>

      {/* 搜索框 */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="搜索竞品名称、标语或描述..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
          />
        </div>
      </div>

      {/* 竞品网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {paginatedData.map((competitor) => (
          <div key={competitor.id} className="bg-white rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 overflow-hidden group">
            {/* 卡片头部 */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {competitor.logo_url ? (
                    <img
                      src={competitor.logo_url}
                      alt={`${competitor.name} logo`}
                      className="w-14 h-14 rounded-xl object-cover border-2 border-gray-100 shadow-sm"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIHZpZXdCb3g9IjAgMCA1NiA1NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iMTIiIGZpbGw9IiNGOUZBRkIiLz4KPHBhdGggZD0iTTI4IDE4QzIzLjU4MTcgMTggMjAgMjEuNTgxNyAyMCAyNkMyMCAzMC40MTgzIDIzLjU4MTcgMzQgMjggMzRDMzIuNDE4MyAzNCAzNiAzMC40MTgzIDM2IDI2QzM2IDIxLjU4MTcgMzIuNDE4MyAxOCAyOCAxOFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+Cg=='
                      }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl border-2 border-gray-100 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center shadow-sm">
                      <svg width="24" height="24" viewBox="0 0 24 24" className="text-gray-400" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="10" r="6" fill="currentColor"></circle>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-200">{competitor.name}</h3>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2 leading-relaxed">{competitor.slogan || '暂无标语'}</p>
                </div>
              </div>
            </div>

            {/* 描述 */}
            <div className="px-6 pb-5">
              <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
                {competitor.description || '暂无描述信息'}
              </p>
            </div>

            {/* 链接按钮 */}
            <div className="px-6 pb-5">
              <div className="flex items-center space-x-4">
                {competitor.website_url && (
                  <a
                    href={competitor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors duration-200 hover:bg-blue-50 px-3 py-2 rounded-lg"
                  >
                    <Globe className="w-4 h-4" />
                    <span>官网</span>
                  </a>
                )}
                {competitor.documentation_url && (
                  <a
                    href={competitor.documentation_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-green-600 hover:text-green-700 text-sm font-medium transition-colors duration-200 hover:bg-green-50 px-3 py-2 rounded-lg"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>文档</span>
                  </a>
                )}
                {competitor.api_doc_url && (
                  <a
                    href={competitor.api_doc_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 text-sm font-medium transition-colors duration-200 hover:bg-purple-50 px-3 py-2 rounded-lg"
                  >
                    <Code className="w-4 h-4" />
                    <span>API</span>
                  </a>
                )}
              </div>
            </div>

            {/* 主要客户 */}
            <div className="px-6 pb-5">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-gray-800">主要客户</span>
              </div>
              <div className="flex flex-wrap gap-2" title={competitor.main_customers || ''}>
                {competitor.main_customers ? competitor.main_customers.split(',').slice(0, 4).map((customer, index) => (
                  <span key={index} className="inline-block bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-full border border-gray-200 font-medium">
                    {customer.trim()}
                  </span>
                )) : (
                  <span className="inline-block bg-gray-50 text-gray-500 text-xs px-3 py-1.5 rounded-full border border-gray-200">
                    暂无客户信息
                  </span>
                )}
                {competitor.main_customers && competitor.main_customers.split(',').length > 4 && (
                  <span className="inline-block bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-full border border-blue-200 font-medium">
                    +{competitor.main_customers.split(',').length - 4}
                  </span>
                )}
              </div>
            </div>

            {/* 近期更新 */}
            <div className="px-6 pb-6">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-yellow-600" />
                </div>
                <span className="text-sm font-semibold text-gray-800">近期更新</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0"></div>
                  <span className="text-xs text-gray-600">暂无更新信息</span>
                </div>
              </div>
            </div>

            {/* 卡片底部 */}
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>最近更新 {competitor.updated_at ? new Date(competitor.updated_at).toLocaleDateString() : '未知'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => onViewDetail(competitor)}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-semibold transition-all duration-200 hover:bg-blue-50 px-3 py-2 rounded-lg"
                  >
                    <Eye className="w-4 h-4" />
                    <span>查看详情</span>
                  </button>
                  <div className="relative" ref={openDropdownId === competitor.id ? dropdownRef : null}>
                    <button
                      onClick={() => toggleDropdown(competitor.id)}
                      className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all duration-200 shadow-sm"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {openDropdownId === competitor.id && (
                       <div className="absolute right-0 top-full mt-2 w-36 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                        <button
                          onClick={() => handleEdit(competitor)}
                          className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                        >
                          <Edit className="w-4 h-4" />
                          <span>编辑</span>
                        </button>
                        <button
                          onClick={() => handleDelete(competitor)}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>删除</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 分页组件 */}
      {competitors.length > 0 && totalPages > 1 && (
        <div className="flex justify-end mt-8">
          <div className="flex items-center space-x-2">
            {/* 上一页按钮 */}
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors duration-200 ${
                currentPage === 1
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* 页码按钮 */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber
              if (totalPages <= 5) {
                pageNumber = i + 1
              } else if (currentPage <= 3) {
                pageNumber = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i
              } else {
                pageNumber = currentPage - 2 + i
              }

              return (
                <button
                  key={pageNumber}
                  onClick={() => goToPage(pageNumber)}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors duration-200 ${
                    currentPage === pageNumber
                      ? 'border-primary-500 bg-primary-50 text-primary-600'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  {pageNumber}
                </button>
              )
            })}

            {/* 下一页按钮 */}
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors duration-200 ${
                currentPage === totalPages
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {competitors.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">未找到竞品</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? '尝试调整搜索条件' : '开始添加您的第一个竞品'}
          </p>
          {!searchTerm && (
            <button
              onClick={onAddCompetitor}
              className="inline-flex items-center space-x-1 bg-primary-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-primary-700 transition-colors duration-200"
            >
              <Plus className="w-3 h-3" />
              <span>添加竞品</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default CompetitorList