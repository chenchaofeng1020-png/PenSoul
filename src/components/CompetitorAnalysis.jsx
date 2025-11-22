import { BarChart3, Plus, BookOpen, GitBranch, Share, Edit, Download, Tag, User, Clock } from 'lucide-react'
import { useState } from 'react'

const CompetitorAnalysis = ({ 
  competitorId,
  analyses,
  onCreateAnalysis,
  onEditAnalysis,
  onViewAnalysis,
  onExportAnalysis
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all')

  const categories = ['功能分析', '产品分析', '市场分析', '用户体验', '技术架构', '商业模式']
  const displayAnalyses = Array.isArray(analyses) ? analyses : []

  const filteredAnalyses = selectedCategory === 'all' 
    ? displayAnalyses 
    : displayAnalyses.filter(analysis => analysis.category === selectedCategory)

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-3 sm:space-y-0">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-purple-600" />
          竞品分析
          <span className="ml-2 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
            {displayAnalyses.length}
          </span>
        </h3>
        <button 
          onClick={() => onCreateAnalysis ? onCreateAnalysis() : alert('新增分析功能开发中')}
          className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-lg transition-colors duration-200 text-sm sm:text-base"
        >
          <Plus className="w-4 h-4" />
          <span>新增分析</span>
        </button>
      </div>
      
      {/* 分类标签 */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button 
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1 rounded-full text-sm transition-colors duration-200 ${
            selectedCategory === 'all'
              ? 'bg-purple-100 text-purple-700 border border-purple-200'
              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
          }`}
        >
          全部
        </button>
        {categories.map((category, index) => {
          const hasAnalyses = displayAnalyses.some(analysis => analysis.category === category)
          return (
            <button 
              key={index}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm transition-colors duration-200 ${
                selectedCategory === category
                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                  : hasAnalyses 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          )
        })}
      </div>
      
      {/* 分析文档列表 */}
      <div className="space-y-4 mb-6">
        {filteredAnalyses.length > 0 ? (
          filteredAnalyses.map((analysis, index) => (
            <div key={`${analysis.category}-${analysis.id ?? index}`} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-semibold text-gray-900">{analysis.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      analysis.status === '已发布' 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {analysis.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Tag className="w-3 h-3 mr-1" />
                      {analysis.category}
                    </span>
                    <span className="flex items-center">
                      <GitBranch className="w-3 h-3 mr-1" />
                      {analysis.version}
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {analysis.date}
                    </span>
                    <span className="flex items-center">
                      <User className="w-3 h-3 mr-1" />
                      {analysis.author}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button 
                    onClick={() => onViewAnalysis ? onViewAnalysis(analysis) : alert('查看分析功能开发中')}
                    className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors duration-200"
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onEditAnalysis ? onEditAnalysis(analysis) : alert('编辑分析功能开发中')}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onExportAnalysis ? onExportAnalysis(analysis) : alert('导出分析功能开发中')}
                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                  >
                    <Share className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>暂无{selectedCategory === 'all' ? '' : selectedCategory}分析</p>
            <p className="text-sm">点击"新增分析"开始创建</p>
          </div>
        )}
      </div>
      

      

    </div>
  )
}

export default CompetitorAnalysis