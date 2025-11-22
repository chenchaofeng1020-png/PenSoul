import { ArrowLeft, Calendar, Users, Lightbulb, ExternalLink, Tag, Edit, Trash2, MoreVertical, Copy, Share } from 'lucide-react'
import { useState } from 'react'

const CompetitorBasicInfo = ({ 
  competitor, 
  onBack, 
  onEdit, 
  onDelete,
  onViewWebsite,
  onCopy,
  onShare,
  hideHeader = false
}) => {
  const [showDropdown, setShowDropdown] = useState(false)



  return (
    <div className="space-y-6">
      {/* 顶部标题和返回按钮 - 根据hideHeader属性决定是否显示 */}
      {!hideHeader && (
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
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  <button 
                    onClick={() => {
                      onEdit(competitor)
                      setShowDropdown(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    编辑竞品信息
                  </button>
                <button 
                  onClick={() => {
                    onCopy && onCopy(competitor)
                    setShowDropdown(false)
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  复制竞品
                </button>
                <button 
                  onClick={() => {
                    onShare && onShare(competitor)
                    setShowDropdown(false)
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Share className="w-4 h-4 mr-2" />
                  分享竞品
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button 
                  onClick={() => {
                    onDelete(competitor.id)
                    setShowDropdown(false)
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除竞品
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      <div className="h-px bg-gray-200"></div>

      {/* 产品基础信息 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-6 lg:space-y-0">
          {/* 左侧：头像和基本信息 */}
          <div className="flex items-start space-x-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {(competitor.name || '').charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{competitor.name}</h1>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                  {competitor.category}
                </span>
              </div>
              <p className="text-gray-600 mb-4 leading-relaxed">{competitor.slogan}</p>

            </div>
          </div>

          {/* 右侧：操作按钮组 */}
          <div className="flex flex-col sm:flex-row lg:flex-col space-y-3 sm:space-y-0 sm:space-x-3 lg:space-x-0 lg:space-y-3">
            <button 
              onClick={() => onViewWebsite(competitor.website)}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <ExternalLink className="w-4 h-4" />
              <span>访问官网</span>
            </button>
            <button 
              onClick={() => onEdit(competitor)}
              className="flex items-center justify-center space-x-2 px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors duration-200"
            >
              <Edit className="w-4 h-4" />
              <span>编辑信息</span>
            </button>
          </div>
        </div>
      </div>

      {/* 产品介绍 */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">产品介绍</h3>
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-700 leading-relaxed">
            {competitor.description || '暂无产品介绍信息'}
          </p>
        </div>
      </div>

      
    </div>
  )
}

export default CompetitorBasicInfo