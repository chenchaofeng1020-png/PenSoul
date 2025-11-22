import React from 'react'
import { X, User, Mail, Calendar, Clock, Shield, Edit, Eye } from 'lucide-react'

const MemberDetailModal = ({ member, onClose }) => {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* 弹窗头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">成员详情</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 弹窗内容 */}
        <div className="p-6">
          {/* 成员头像和基本信息 */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-shrink-0 h-16 w-16">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-xl font-medium text-blue-600">
                  {(member.full_name || member.username || '').charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900">{member.full_name || member.username}</h3>
              <div className="flex items-center space-x-2 mt-1">
                {getRoleIcon(member.role)}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                  {getRoleText(member.role)}
                </span>
              </div>
            </div>
          </div>

          {/* 详细信息 */}
          <div className="space-y-4">
            {/* 邮箱 */}
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">邮箱地址</p>
                <p className="text-sm text-gray-900">{member.email}</p>
              </div>
            </div>

            {/* 加入时间 */}
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">加入时间</p>
                <p className="text-sm text-gray-900">
                  {new Date(member.joined_at).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* 最后活跃时间 */}
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">最后活跃</p>
                <p className="text-sm text-gray-900">
                  {member.last_active 
                    ? new Date(member.last_active).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : '从未活跃'
                  }
                </p>
              </div>
            </div>

            {/* 权限说明 */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">角色权限</h4>
              <div className="text-sm text-gray-600">
                {member.role === 'admin' && (
                  <ul className="list-disc list-inside space-y-1">
                    <li>管理团队成员（邀请、移除、修改角色）</li>
                    <li>修改产品设置和信息</li>
                    <li>查看和编辑所有产品内容</li>
                    <li>访问管理功能和统计数据</li>
                  </ul>
                )}
                {member.role === 'member' && (
                  <ul className="list-disc list-inside space-y-1">
                    <li>查看和编辑产品内容</li>
                    <li>添加和管理竞品信息</li>
                    <li>参与协作和讨论</li>
                    <li>无法管理团队成员</li>
                  </ul>
                )}
                {member.role === 'viewer' && (
                  <ul className="list-disc list-inside space-y-1">
                    <li>查看产品和竞品信息</li>
                    <li>浏览分析报告和数据</li>
                    <li>无法编辑任何内容</li>
                    <li>无法管理团队成员</li>
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* 关闭按钮 */}
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MemberDetailModal