import { useState } from 'react'
import { X, Upload, Plus, Minus } from 'lucide-react'
import { generateDefaultLogo } from '../assets/logos'

const AddCompetitorModal = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    slogan: '',
    description: '',
    website: '',
    helpDocUrl: '',
    apiDocUrl: '',
    logo: '',
    logoPreview: '',
    mainCustomers: [''],
    recentUpdates: ['']
  })

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleArrayChange = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }))
  }

  const addArrayItem = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }))
  }

  const removeArrayItem = (field, index) => {
    if (formData[field].length > 1) {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index)
      }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('表单提交被触发')
    
    // 验证必填字段
    if (!formData.name.trim()) {
      alert('请填写竞品名称')
      return
    }
    
    if (!formData.description.trim()) {
      alert('请填写产品介绍')
      return
    }

    // 过滤空值
    const cleanedData = {
      ...formData,
      logo: formData.logo || '', // 如果没有提供logo URL，发送空字符串给后端
      website: formData.website || '',
      mainCustomers: (formData.mainCustomers || []).filter(customer => customer.trim()),
      recentUpdates: (formData.recentUpdates || []).filter(update => update.trim())
    }
    
    // 移除logoPreview字段，不需要保存到最终数据中
    delete cleanedData.logoPreview

    console.log('准备调用onAdd，数据:', cleanedData)
    onAdd(cleanedData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden relative">
        {/* 模态框头部 - 固定定位 */}
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-200 z-10">
          <h2 className="text-lg font-semibold text-gray-900">添加竞品</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* 表单内容 - 可滚动区域 */}
        <div className="overflow-y-auto max-h-[calc(90vh-8rem)] pb-20">
          <form id="competitor-form" onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本信息 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">基本信息</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                产品名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="请输入产品名称"
                required
              />
            </div>
            
            {/* Logo上传 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                产品logo
              </label>
              
              {formData.logoPreview ? (
                 /* 已上传状态 */
                 <div className="relative inline-block">
                  <div className="w-24 h-24 rounded-xl border-2 border-gray-200 overflow-hidden bg-white shadow-sm">
                    <img
                      src={formData.logoPreview}
                      alt="Logo预览"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        logo: '',
                        logoPreview: ''
                      }))
                    }}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <X size={14} />
                  </button>
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
                onChange={(e) => {
                  const file = e.target.files[0]
                  if (file) {
                    // 检查文件类型
                    if (!file.type.startsWith('image/')) {
                      alert('请选择图片文件')
                      return
                    }
                    
                    // 检查文件大小 (限制为5MB)
                    if (file.size > 5 * 1024 * 1024) {
                      alert('图片大小不能超过5MB')
                      return
                    }
                    
                    const reader = new FileReader()
                    reader.onload = (e) => {
                      setFormData(prev => ({
                        ...prev,
                        logo: e.target.result,
                        logoPreview: e.target.result
                      }))
                    }
                    reader.readAsDataURL(file)
                  }
                }}
                className="hidden"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                产品slogan
              </label>
              <input
                type="text"
                value={formData.slogan}
                onChange={(e) => handleInputChange('slogan', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="请输入产品标语（可选）"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                官网地址
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="请输入官网链接"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                帮助文档地址
              </label>
              <input
                type="url"
                value={formData.helpDocUrl || ''}
                onChange={(e) => handleInputChange('helpDocUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="请输入帮助文档链接"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                接口文档地址
              </label>
              <input
                type="url"
                value={formData.apiDocUrl || ''}
                onChange={(e) => handleInputChange('apiDocUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="请输入接口文档链接"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                产品介绍 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                placeholder="请输入产品详细介绍"
                required
              />
            </div>
          </div>

          {/* 主要客户 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">主要客户</h3>
              <button
                type="button"
                onClick={() => addArrayItem('mainCustomers')}
                className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>添加客户</span>
              </button>
            </div>
            
            {formData.mainCustomers.map((customer, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={customer}
                  onChange={(e) => handleArrayChange('mainCustomers', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder={`客户 ${index + 1}`}
                />
                {formData.mainCustomers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('mainCustomers', index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>



          </form>
        </div>
        
        {/* 表单按钮 - 绝对定位在底部 */}
        <div className="absolute bottom-0 left-0 right-0 bg-white flex items-center justify-end space-x-3 py-4 px-6 border-t border-gray-200 z-10 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
          >
            取消
          </button>
          <button
             type="submit"
             form="competitor-form"
             className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors duration-200"
           >
             保存
           </button>
         </div>
       </div>
     </div>
   )
}

export default AddCompetitorModal