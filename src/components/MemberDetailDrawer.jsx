import React, { useEffect, useState } from 'react'
import { X, User, Mail, Calendar, Clock, Shield, Edit, Eye } from 'lucide-react'

const MemberDetailDrawer = ({ member, onClose }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (member) {
      setIsVisible(true)
    }
  }, [member])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Wait for animation to finish
  }

  if (!member) return null

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Shield className="w-5 h-5 text-red-500" />
      case 'member': return <Edit className="w-5 h-5 text-blue-500" />
      case 'viewer': return <Eye className="w-5 h-5 text-gray-500" />
      default: return <User className="w-5 h-5 text-gray-400" />
    }
  }

  const getRoleText = (role) => {
    switch (role) {
      case 'admin': return '管理员'
      case 'member': return '成员'
      case 'viewer': return '查看者'
      default: return '未知'
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'member': return 'bg-blue-100 text-blue-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      {/* Overlay */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${isVisible ? 'opacity-50' : 'opacity-0'}`}
        onClick={handleClose}
      />
      
      {/* Drawer */}
      <div 
        className={`relative w-full max-w-md h-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-full flex flex-col">
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">成员详情</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* 成员头像和基本信息 */}
            <div className="flex items-center space-x-4 mb-8">
              <div className="flex-shrink-0 h-20 w-20">
                <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-2xl font-medium text-blue-600">
                    {(member.full_name || member.username || '').charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{member.full_name || member.username}</h3>
                <div className="flex items-center space-x-2 mt-2">
                  {getRoleIcon(member.role)}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                    {getRoleText(member.role)}
                  </span>
                </div>
              </div>
            </div>

            {/* 详细信息 */}
            <div className="space-y-6">
              {/* 邮箱 */}
              <div className="flex items-start space-x-4">
                <div className="mt-1">
                  <Mail className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">邮箱地址</p>
                  <p className="text-base text-gray-900">{member.email}</p>
                </div>
              </div>

              {/* 加入时间 */}
              <div className="flex items-start space-x-4">
                <div className="mt-1">
                  <Calendar className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">加入时间</p>
                  <p className="text-base text-gray-900">
                    {new Date(member.joined_at).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* 最后活跃时间 */}
              <div className="flex items-start space-x-4">
                <div className="mt-1">
                  <Clock className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">最后活跃</p>
                  <p className="text-base text-gray-900">
                    {member.last_active 
                      ? new Date(member.last_active).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '从未活跃'
                    }
                  </p>
                </div>
              </div>

              {/* 分割线 */}
              <div className="border-t border-gray-100 my-6"></div>

              {/* 权限说明 */}
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-4">当前角色权限</h4>
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                  <div className="text-sm text-gray-600 leading-relaxed">
                    {member.role === 'admin' && (
                      <ul className="space-y-3">
                        <li className="flex items-start">
                          <span className="mr-2 text-green-500">✓</span>
                          <span>管理团队成员（邀请、移除、修改角色）</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2 text-green-500">✓</span>
                          <span>修改产品设置和信息</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2 text-green-500">✓</span>
                          <span>查看和编辑所有产品内容</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2 text-green-500">✓</span>
                          <span>访问管理功能和统计数据</span>
                        </li>
                      </ul>
                    )}
                    {member.role === 'member' && (
                      <ul className="space-y-3">
                        <li className="flex items-start">
                          <span className="mr-2 text-green-500">✓</span>
                          <span>查看和编辑产品内容</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2 text-green-500">✓</span>
                          <span>添加和管理竞品信息</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2 text-green-500">✓</span>
                          <span>参与协作和讨论</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2 text-gray-400">×</span>
                          <span className="text-gray-400">无法管理团队成员</span>
                        </li>
                      </ul>
                    )}
                    {member.role === 'viewer' && (
                      <ul className="space-y-3">
                        <li className="flex items-start">
                          <span className="mr-2 text-green-500">✓</span>
                          <span>查看产品和竞品信息</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2 text-green-500">✓</span>
                          <span>浏览分析报告和数据</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2 text-gray-400">×</span>
                          <span className="text-gray-400">无法编辑任何内容</span>
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2 text-gray-400">×</span>
                          <span className="text-gray-400">无法管理团队成员</span>
                        </li>
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 底部操作区 */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleClose}
              className="w-full px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MemberDetailDrawer
