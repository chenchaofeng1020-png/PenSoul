import { useState, useRef } from 'react'
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Eye, 
  Edit, 
  Share2, 
  Search, 
  MoreVertical,
  File,
  Image,
  Video,
  Music,
  Archive,
  Star,
  StarOff,
  X
} from 'lucide-react'

const DocumentManager = ({ 
  competitorId, 
  documents: initialDocuments = [], 
  onDocumentUpload, 
  onDocumentDelete, 
  onDocumentDownload,
  onDocumentView,
  onDocumentEdit
}) => {
  const [documents, setDocuments] = useState(initialDocuments)
  const [sortBy, setSortBy] = useState('date')
  const [filterType, setFilterType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [showDropdown, setShowDropdown] = useState(null)
  const fileInputRef = useRef(null)

  // 移除写死的模拟文档数据，直接使用传入的 initialDocuments

  // 文件类型图标
  const getFileIcon = (type) => {
    switch (type) {
      case 'image':
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return Image
      case 'video':
      case 'mp4':
      case 'avi':
      case 'mov':
        return Video
      case 'audio':
      case 'mp3':
      case 'wav':
        return Music
      case 'archive':
      case 'zip':
      case 'rar':
        return Archive
      case 'pdf':
      case 'document':
      case 'docx':
      case 'doc':
      case 'txt':
        return FileText
      default:
        return File
    }
  }

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 文件上传处理
  const handleFileUpload = async (files) => {
    const fileArray = Array.from(files)
    
    for (const file of fileArray) {
      const fileId = Date.now() + Math.random()
      
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }))
      
      const newDocument = {
        id: fileId,
        name: file.name,
        type: file.type.split('/')[0] || 'other',
        size: file.size,
        uploadedAt: new Date().toLocaleString('zh-CN'),
        uploadedBy: { id: 1, name: '当前用户' },
        category: 'other',
        tags: [],
        isStarred: false,
        thumbnail: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        description: ''
      }
      
      // 模拟上传进度
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          const currentProgress = prev[fileId] || 0
          if (currentProgress >= 100) {
            clearInterval(uploadInterval)
            setDocuments(prevDocs => [newDocument, ...prevDocs])
            setUploadProgress(prev => {
              const { [fileId]: removed, ...rest } = prev
              return rest
            })
            return prev
          }
          return { ...prev, [fileId]: currentProgress + 10 }
        })
      }, 200)
      
      if (onDocumentUpload) {
        onDocumentUpload(newDocument)
      }
    }
  }

  // 删除文档
  const handleDeleteDocument = (documentId) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId))
    if (onDocumentDelete) {
      onDocumentDelete(documentId)
    }
    setShowDropdown(null)
  }

  // 切换收藏状态
  const toggleStar = (documentId) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId ? { ...doc, isStarred: !doc.isStarred } : doc
    ))
  }

  // 过滤和排序文档
  const filteredAndSortedDocuments = documents
    .filter(doc => {
      const matchesSearch = (doc.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (doc.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (doc.tags || []).some(tag => (tag || '').toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesFilter = filterType === 'all' || 
                           (filterType === 'image' && ['image', 'png', 'jpg', 'jpeg', 'gif'].includes(doc.type)) ||
                           (filterType === 'document' && ['pdf', 'document', 'docx', 'doc', 'txt'].includes(doc.type)) ||
                           (filterType === 'video' && ['video', 'mp4', 'avi', 'mov'].includes(doc.type)) ||
                           (filterType === 'other' && !['image', 'png', 'jpg', 'jpeg', 'gif', 'pdf', 'document', 'docx', 'doc', 'txt', 'video', 'mp4', 'avi', 'mov'].includes(doc.type))
      
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'size':
          return b.size - a.size
        case 'type':
          return a.type.localeCompare(b.type)
        case 'date':
        default:
          return new Date(b.uploadedAt) - new Date(a.uploadedAt)
      }
    })

  // 文档卡片组件
  const DocumentCard = ({ document }) => {
    const FileIcon = getFileIcon(document.type)
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
        {/* 文档预览 */}
        <div className="relative mb-3">
          {document.thumbnail ? (
            <img 
              src={document.thumbnail} 
              alt={document.name}
              className="w-full h-32 object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
              <FileIcon className="w-12 h-12 text-gray-400" />
            </div>
          )}
          
          {/* 收藏按钮 */}
          <button
            onClick={() => toggleStar(document.id)}
            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            {document.isStarred ? (
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
            ) : (
              <StarOff className="w-4 h-4 text-gray-400" />
            )}
          </button>
          
          {/* 操作菜单 */}
          <div className="absolute top-2 left-2">
            <button
              onClick={() => setShowDropdown(showDropdown === document.id ? null : document.id)}
              className="p-1 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <MoreVertical className="w-4 h-4 text-gray-600" />
            </button>
            
            {showDropdown === document.id && (
              <div className="absolute top-8 left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[150px]">
                <button
                  onClick={() => onDocumentView && onDocumentView(document)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <Eye className="w-4 h-4" />
                  <span>查看</span>
                </button>
                <button
                  onClick={() => onDocumentDownload && onDocumentDownload(document)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <Download className="w-4 h-4" />
                  <span>下载</span>
                </button>
                <button
                  onClick={() => onDocumentEdit && onDocumentEdit(document)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <Edit className="w-4 h-4" />
                  <span>编辑</span>
                </button>
                <button
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <Share2 className="w-4 h-4" />
                  <span>分享</span>
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => handleDeleteDocument(document.id)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>删除</span>
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* 文档信息 */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 text-sm truncate" title={document.name}>
            {document.name}
          </h4>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{formatFileSize(document.size)}</span>
            <span>{document.uploadedAt.split(' ')[0]}</span>
          </div>
          
          {document.description && (
            <p className="text-xs text-gray-600 line-clamp-2">{document.description}</p>
          )}
          
          {document.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {document.tags.slice(0, 2).map((tag, index) => (
                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {tag}
                </span>
              ))}
              {document.tags.length > 2 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  +{document.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* 头部工具栏 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">文档管理</h3>
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
              {documents.length}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <Upload className="w-4 h-4" />
              <span>上传文档</span>
            </button>
          </div>
        </div>
        
        {/* 搜索和过滤 */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文档..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">所有类型</option>
            <option value="image">图片</option>
            <option value="document">文档</option>
            <option value="video">视频</option>
            <option value="other">其他</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="date">按日期排序</option>
            <option value="name">按名称排序</option>
            <option value="size">按大小排序</option>
            <option value="type">按类型排序</option>
          </select>
        </div>
      </div>
      
      {/* 上传进度 */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <h4 className="text-sm font-medium text-gray-900 mb-2">上传进度</h4>
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>上传中...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* 文档列表 */}
      <div className="p-4">
        {filteredAndSortedDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无文档</h3>
            <p className="text-gray-500 mb-4">上传您的第一个文档开始管理</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 mx-auto"
            >
              <Upload className="w-4 h-4" />
              <span>上传文档</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedDocuments.map(document => (
              <DocumentCard key={document.id} document={document} />
            ))}
          </div>
        )}
      </div>
      
      {/* 上传模态框 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">上传文档</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors duration-200 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const files = e.dataTransfer.files
                  if (files.length > 0) {
                    handleFileUpload(files)
                    setShowUploadModal(false)
                  }
                }}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">点击上传或拖拽文件到此处</p>
                <p className="text-sm text-gray-500">支持所有常见文件格式</p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files)
                    setShowUploadModal(false)
                  }
                }}
              />
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  取消
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  选择文件
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentManager