import { Camera, Upload, Eye, Trash2, Plus, Grid, List } from 'lucide-react'
import { useState } from 'react'

const CompetitorScreenshots = ({ 
  competitorId,
  screenshots = [],
  onUpload,
  onDelete,
  onView
}) => {
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [selectedImages, setSelectedImages] = useState([])
  const [showUploadModal, setShowUploadModal] = useState(false)

  // 直接使用传入的截图数据，不再使用模拟数据
  const displayScreenshots = screenshots

  const handleImageSelect = (imageId) => {
    setSelectedImages(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    )
  }

  const handleBatchDelete = () => {
    if (selectedImages.length > 0 && window.confirm(`确定要删除选中的 ${selectedImages.length} 张截图吗？`)) {
      selectedImages.forEach(id => onDelete && onDelete(id))
      setSelectedImages([])
    }
  }

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files)
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        onUpload && onUpload(file)
      }
    })
    setShowUploadModal(false)
  }

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-6">
      {/* 标题和操作栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-3 sm:space-y-0">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Camera className="w-5 h-5 mr-2 text-blue-600" />
          系统截图
          <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            {displayScreenshots.length}
          </span>
        </h3>
        
        <div className="flex items-center space-x-3">
          {/* 视图切换 */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors duration-200 ${
                viewMode === 'grid' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors duration-200 ${
                viewMode === 'list' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          
          {/* 批量操作 */}
          {selectedImages.length > 0 && (
            <button
              onClick={handleBatchDelete}
              className="flex items-center space-x-2 px-3 py-2 text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-colors duration-200"
            >
              <Trash2 className="w-4 h-4" />
              <span>删除选中 ({selectedImages.length})</span>
            </button>
          )}
          
          {/* 上传按钮 */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Upload className="w-4 h-4" />
            <span>上传截图</span>
          </button>
        </div>
      </div>

      {/* 截图展示区域 */}
      {displayScreenshots.length === 0 ? (
        <div className="text-center py-12">
          <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">还没有上传任何截图</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Upload className="w-4 h-4" />
            <span>上传第一张截图</span>
          </button>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            /* 网格视图 */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {displayScreenshots.map((screenshot) => (
                <div key={screenshot.id} className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
                  {/* 选择框 */}
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedImages.includes(screenshot.id)}
                      onChange={() => handleImageSelect(screenshot.id)}
                      className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* 图片 */}
                  <div className="aspect-video bg-gray-100 relative overflow-hidden">
                    <img
                      src={screenshot.url}
                      alt={screenshot.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    
                    {/* 悬浮操作按钮 */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => onView && onView(screenshot)}
                        className="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete && onDelete(screenshot.id)}
                        className="p-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* 信息区域 */}
                  <div className="p-3">
                    <h4 className="font-medium text-gray-900 text-sm mb-1 truncate">{screenshot.title}</h4>
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">{screenshot.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{screenshot.uploadDate}</span>
                      <span>{screenshot.size}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* 列表视图 */
            <div className="space-y-3 mb-6">
              {displayScreenshots.map((screenshot) => (
                <div key={screenshot.id} className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-all duration-200">
                  <input
                    type="checkbox"
                    checked={selectedImages.includes(screenshot.id)}
                    onChange={() => handleImageSelect(screenshot.id)}
                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                  />
                  
                  <div className="w-16 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={screenshot.url}
                      alt={screenshot.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{screenshot.title}</h4>
                    <p className="text-sm text-gray-500 truncate">{screenshot.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                      <span>{screenshot.category}</span>
                      <span>•</span>
                      <span>{screenshot.uploadDate}</span>
                      <span>•</span>
                      <span>{screenshot.size}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onView && onView(screenshot)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete && onDelete(screenshot.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* 查看全部按钮 */}
          <div className="text-center">
            <button 
              onClick={() => alert('查看全部截图功能开发中')}
              className="inline-flex items-center space-x-2 px-6 py-2 text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors duration-200"
            >
              <Camera className="w-4 h-4" />
              <span>查看全部截图</span>
            </button>
          </div>
        </>
      )}

      {/* 上传模态框 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">上传截图</h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-all duration-200">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">拖拽图片到此处上传，或点击选择文件</p>
              <p className="text-sm text-gray-500 mb-4">支持 JPG、PNG、GIF 格式，单个文件不超过 10MB</p>
              
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="screenshot-upload"
              />
              
              <label
                htmlFor="screenshot-upload"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>选择文件</span>
              </label>
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CompetitorScreenshots