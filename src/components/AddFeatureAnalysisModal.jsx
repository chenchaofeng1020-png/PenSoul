import { useState, lazy, Suspense } from 'react'
import { X, Calendar, Type, Maximize2, Minimize2, FileText, Star, Eye, Upload, Link } from 'lucide-react'
const RichTextEditorLazy = lazy(() => import('./RichTextEditor'))

const AddFeatureAnalysisModal = ({ isOpen, onClose, onSubmit, competitorId }) => {
  const [formData, setFormData] = useState({
    featureName: '',
    launchDate: '',
    content: '',
    rating: 3,
    visibility: 'private',
    attachments: []
  })
  const [errors, setErrors] = useState({})
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // 新增：附件输入状态
  const [newAttachmentName, setNewAttachmentName] = useState('')
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('')

  // 重置表单
  const resetForm = () => {
    setFormData({
      featureName: '',
      launchDate: '',
      content: '',
      rating: 3,
      visibility: 'private',
      attachments: []
    })
    setErrors({})
    setIsFullscreen(false)
    setNewAttachmentName('')
    setNewAttachmentUrl('')
  }

  // 关闭弹窗
  const handleClose = () => {
    resetForm()
    onClose()
  }

  // 表单验证
  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.featureName.trim()) {
      newErrors.featureName = '功能名称不能为空'
    }
    
    if (!formData.launchDate) {
      newErrors.launchDate = '上线时间不能为空'
    }
    // 可选校验：评分范围
    if (formData.rating && (formData.rating < 1 || formData.rating > 5)) {
      newErrors.rating = '评分需为1-5之间的整数'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 处理表单提交
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    if (!competitorId) {
      alert('缺少竞品ID，无法保存')
      return
    }

    setIsSubmitting(true)

    try {
      // 准备提交到后端的数据
      const submitData = {
        title: formData.featureName.trim(),
        content: formData.content.trim() || '暂无详细内容', // 确保content不为空
        analysis_type: 'feature',
        tags: [],
        attachments: formData.attachments,
        rating: formData.rating,
        visibility: formData.visibility
      }

      // 调用API保存数据
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:8000/api/competitors/${competitorId}/analyses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API错误响应:', errorData)
        
        // 如果有详细的验证错误信息，显示具体错误
        if (errorData.data && typeof errorData.data === 'object') {
          const errorMessages = Object.values(errorData.data).join('\n')
          throw new Error(`数据验证失败:\n${errorMessages}`)
        }
        
        throw new Error(errorData.message || '保存失败')
      }

      const result = await response.json()
      
      // 调用父组件的回调函数，传递保存成功的数据
      const callbackData = {
        ...formData,
        id: result.data.id,
        category: '功能分析',
        createdAt: new Date().toISOString(),
        launchDate: formData.launchDate
      }

      onSubmit(callbackData)
      handleClose()
      
    } catch (error) {
      console.error('保存功能分析失败:', error)
      alert('保存失败: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 处理输入变化
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  // 处理富文本内容变化
  const handleContentChange = (content) => {
    handleInputChange('content', content)
  }

  // 新增：添加附件链接
  const handleAddAttachmentLink = () => {
    const name = newAttachmentName.trim()
    const url = newAttachmentUrl.trim()
    if (!name || !url) {
      alert('请填写附件名称和链接URL')
      return
    }
    setFormData(prev => ({
      ...prev,
      attachments: [
        ...prev.attachments,
        { name, url, type: 'link' }
      ]
    }))
    setNewAttachmentName('')
    setNewAttachmentUrl('')
  }

  // 新增：上传图片附件
  const handleUploadAttachments = async (files) => {
    if (!files || files.length === 0) return
    const token = localStorage.getItem('token')
    for (const file of files) {
      const form = new FormData()
      form.append('image', file)
      try {
        const resp = await fetch('http://localhost:8000/api/upload/image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: form
        })
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}))
          throw new Error(err.message || `上传失败: ${file.name}`)
        }
        const data = await resp.json()
        const url = data?.data?.url || data?.url || ''
        if (!url) {
          throw new Error('返回数据缺少文件URL')
        }
        setFormData(prev => ({
          ...prev,
          attachments: [
            ...prev.attachments,
            { name: file.name, url, type: 'image' }
          ]
        }))
      } catch (e) {
        console.error('上传附件失败:', e)
        alert(e.message)
      }
    }
  }

  // 切换全屏模式
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg shadow-xl transition-all duration-300 ${
        isFullscreen 
          ? 'w-full h-full m-0 rounded-none' 
          : 'w-full max-w-4xl max-h-[90vh] m-4'
      }`}>
        {/* 弹窗头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">添加功能分析</h2>
            </div>
          </div>
          {/* 操作按钮 */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={isFullscreen ? "退出全屏" : "全屏编辑"}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 弹窗内容 */}
        <div className={`overflow-y-auto ${isFullscreen ? 'h-[calc(100vh-140px)]' : 'max-h-[calc(90vh-140px)]'}`}> 
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 功能名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Type className="w-4 h-4 inline mr-1" />
                  功能名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.featureName}
                  onChange={(e) => handleInputChange('featureName', e.target.value)}
                  placeholder="请输入功能名称"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${
                    errors.featureName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.featureName && (
                  <p className="mt-1 text-sm text-red-600">{errors.featureName}</p>
                )}
              </div>
              {/* 上线时间 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  上线时间 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.launchDate}
                  onChange={(e) => handleInputChange('launchDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${
                    errors.launchDate ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.launchDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.launchDate}</p>
                )}
              </div>
            </div>

            {/* 评分与可见性 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 评分 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Star className="w-4 h-4 inline mr-1 text-yellow-500" />
                  评分（1-5）
                </label>
                <select
                  value={formData.rating}
                  onChange={(e) => handleInputChange('rating', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors border-gray-300"
                >
                  {[1,2,3,4,5].map(r => (
                    <option key={r} value={r}>{r} 星</option>
                  ))}
                </select>
                {errors.rating && (
                  <p className="mt-1 text-sm text-red-600">{errors.rating}</p>
                )}
              </div>
              {/* 可见性 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Eye className="w-4 h-4 inline mr-1" />
                  可见性
                </label>
                <div className="flex items-center space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={formData.visibility === 'public'}
                      onChange={(e) => handleInputChange('visibility', e.target.value)}
                      className="mr-2"
                    />
                    公开
                  </label>
                </div>
              </div>
            </div>

            {/* 富文本编辑器 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分析内容
              </label>
              <div className={isFullscreen ? 'h-[400px]' : 'h-[300px]'}>
                <Suspense fallback={<div className="text-sm text-gray-500">编辑器加载中...</div>}>
                  <RichTextEditorLazy
                    initialContent={formData.content}
                    onSave={handleContentChange}
                    placeholder="请输入功能分析内容，支持富文本编辑和图片上传..."
                    height="100%"
                  />
                </Suspense>
              </div>
            </div>

            {/* 附件 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                附件
              </label>
              {/* 添加附件链接 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <input
                  type="text"
                  value={newAttachmentName}
                  onChange={(e) => setNewAttachmentName(e.target.value)}
                  placeholder="附件名称"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors border-gray-300"
                />
                <input
                  type="text"
                  value={newAttachmentUrl}
                  onChange={(e) => setNewAttachmentUrl(e.target.value)}
                  placeholder="附件链接URL"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors border-gray-300"
                />
                <button
                  type="button"
                  onClick={handleAddAttachmentLink}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <Link className="w-4 h-4 mr-2" /> 添加链接
                </button>
              </div>
              {/* 上传图片附件 */}
              <div className="flex items-center space-x-3 mb-3">
                <label className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer inline-flex items-center">
                  <Upload className="w-4 h-4 mr-2" /> 上传图片
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleUploadAttachments(e.target.files)}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500">支持多选上传，成功后自动加入附件列表</p>
              </div>
              {/* 附件列表 */}
              {Array.isArray(formData.attachments) && formData.attachments.length > 0 ? (
                <div className="border rounded-lg divide-y">
                  {formData.attachments.map((att, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{att.name || '未命名附件'}</div>
                          <div className="text-xs text-gray-500">类型：{att.type || '未知'} | URL：<a href={att.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{att.url}</a></div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-700 text-sm"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          attachments: prev.attachments.filter((_, i) => i !== idx)
                        }))}
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">暂无附件</p>
              )}
            </div>
          </form>
        </div>

        {/* 弹窗底部 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? '提交中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddFeatureAnalysisModal