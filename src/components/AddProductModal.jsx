import { useState } from 'react'
import { X, Upload } from 'lucide-react'

const AddProductModal = ({ isOpen, onClose, onSubmit, editMode = false, initialData = null }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    logo: null
  })
  const [logoPreview, setLogoPreview] = useState(initialData?.logo_url || initialData?.logo || null)
  const [errors, setErrors] = useState({})

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // 清除对应字段的错误
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          logo: '请选择图片文件'
        }))
        return
      }
      
      // 验证文件大小 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          logo: '图片大小不能超过5MB'
        }))
        return
      }

      setFormData(prev => ({
        ...prev,
        logo: file
      }))
      
      // 创建预览
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target.result)
      }
      reader.readAsDataURL(file)
      
      // 清除logo错误
      if (errors.logo) {
        setErrors(prev => ({
          ...prev,
          logo: ''
        }))
      }
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = '产品名称不能为空'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (validateForm()) {
      onSubmit(formData)
      handleClose()
    }
  }

  const handleClose = () => {
    setFormData({ name: '', logo: null })
    setLogoPreview(null)
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* 弹窗头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{editMode ? '编辑产品' : '新建产品'}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 弹窗内容 */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* 产品名称 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              产品名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="请输入产品名称"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all duration-200 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* 产品Logo */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              产品Logo
            </label>
            
            {logoPreview ? (
               /* 已上传状态 */
               <div className="relative inline-block">
                <div className="w-24 h-24 rounded-xl border-2 border-gray-200 overflow-hidden bg-white shadow-sm">
                  <img
                    src={logoPreview}
                    alt="Logo预览"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="mt-3">
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 cursor-pointer transition-all duration-200"
                  >
                    <Upload size={16} className="mr-2" />
                    重新选择
                  </label>
                </div>
              </div>
            ) : (
               /* 未上传状态 */
               <div>
                <label
               htmlFor="logo-upload"
               className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-primary-400 transition-all duration-200 group"
             >
                   <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center group-hover:bg-primary-200 transition-colors duration-200 mb-2">
                     <Upload size={16} className="text-primary-600" />
                   </div>
                   <p className="text-xs font-medium text-gray-700 group-hover:text-primary-600 transition-colors duration-200 text-center">
                     点击上传Logo
                   </p>
                 </label>
                 <div className="mt-3 text-left">
                   <p className="text-xs text-gray-500">
                      支持 JPG、PNG、GIF 格式，文件大小不超过 5MB
                    </p>
                 </div>
              </div>
            )}
            
            <input
              type="file"
              id="logo-upload"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
            
            {errors.logo && (
              <p className="mt-1 text-sm text-red-500">{errors.logo}</p>
            )}
          </div>

          {/* 按钮组 */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
            >
              {editMode ? '保存修改' : '创建产品'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddProductModal
