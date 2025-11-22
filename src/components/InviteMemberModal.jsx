import React, { useState } from 'react'
import { X, UserPlus, Shield, Edit, Eye, Calendar, Link } from 'lucide-react'

const InviteMemberModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    role: 'member',
    expires_in_days: 7
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await onSubmit(formData)
      // 重置表单
      setFormData({
        role: 'member',
        expires_in_days: 7
      })
    } catch (error) {
      console.error('邀请失败:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4 text-red-500" />
      case 'member': return <Edit className="w-4 h-4 text-blue-500" />
      case 'viewer': return <Eye className="w-4 h-4 text-gray-500" />
      default: return <Edit className="w-4 h-4 text-blue-500" />
    }
  }

  const getRoleDescription = (role) => {
    switch (role) {
      case 'admin':
        return '拥有完全管理权限，可以邀请/移除成员、修改产品设置等'
      case 'member':
        return '可以查看和编辑产品内容，但不能管理团队成员'
      case 'viewer':
        return '只能查看产品内容，无法进行编辑操作'
      default:
        return ''
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* 弹窗头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <UserPlus className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">邀请团队成员</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 弹窗内容 */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* 邀请说明 */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <Link className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-900 mb-1">分享邀请链接</h3>
                <p className="text-sm text-blue-700">
                  系统将生成一个邀请链接，您可以将链接分享给需要邀请的成员。
                  成员点击链接并登录后即可加入团队。
                </p>
              </div>
            </div>
          </div>

          {/* 角色选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              选择角色
            </label>
            <div className="space-y-3">
              {['admin', 'member', 'viewer'].map((role) => (
                <label key={role} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={formData.role === role}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {getRoleIcon(role)}
                      <span className="text-sm font-medium text-gray-900">
                        {role === 'admin' ? '管理员' : role === 'member' ? '成员' : '查看者'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {getRoleDescription(role)}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 过期时间 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              邀请链接有效期
            </label>
            <select
              name="expires_in_days"
              value={formData.expires_in_days}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={1}>1天</option>
              <option value={3}>3天</option>
              <option value={7}>7天</option>
              <option value={14}>14天</option>
              <option value={30}>30天</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              邀请链接将在指定时间后自动过期
            </p>
          </div>

          {/* 按钮组 */}
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>创建中...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>创建邀请链接</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InviteMemberModal