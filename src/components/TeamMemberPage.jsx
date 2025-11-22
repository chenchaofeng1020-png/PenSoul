import React, { useState, useEffect } from 'react'
import { Users, UserPlus, Shield, Eye, Edit, Trash2, Copy, Clock, CheckCircle, XCircle, MoreVertical } from 'lucide-react'
import InviteMemberModal from './InviteMemberModal'
import MemberDetailModal from './MemberDetailModal'

const TeamMemberPage = ({ currentProduct }) => {
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('members')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showMemberDetail, setShowMemberDetail] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)

  useEffect(() => {
    if (currentProduct?.id) {
      loadMembers()
      loadInvitations()
    }
  }, [currentProduct])

  const loadMembers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:8000/api/products/${currentProduct.id}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMembers(data.data.members || [])
      } else {
        const errorData = await response.json()
        setError(errorData.message || '获取团队成员失败')
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const loadInvitations = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:8000/api/products/${currentProduct.id}/invitations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setInvitations(data.data.invitations || [])
      }
    } catch (err) {
      console.error('获取邀请列表失败:', err)
    }
  }

  const handleInviteMember = async (inviteData) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:8000/api/products/${currentProduct.id}/members/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inviteData)
      })

      if (response.ok) {
        const data = await response.json()
        setShowInviteModal(false)
        loadInvitations() // 刷新邀请列表
        
        // 显示邀请链接
        navigator.clipboard.writeText(data.data.invite_url)
        alert('邀请链接已创建并复制到剪贴板！')
      } else {
        const errorData = await response.json()
        alert(errorData.message || '创建邀请失败')
      }
    } catch (err) {
      alert('网络错误，请稍后重试')
    }
  }

  const handleUpdateMemberRole = async (memberId, newRole) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:8000/api/products/${currentProduct.id}/members/${memberId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      })

      if (response.ok) {
        loadMembers() // 刷新成员列表
        alert('成员角色更新成功')
      } else {
        const errorData = await response.json()
        alert(errorData.message || '更新成员角色失败')
      }
    } catch (err) {
      alert('网络错误，请稍后重试')
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!confirm('确定要移除该成员吗？')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:8000/api/products/${currentProduct.id}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        loadMembers() // 刷新成员列表
        alert('成员移除成功')
      } else {
        const errorData = await response.json()
        alert(errorData.message || '移除成员失败')
      }
    } catch (err) {
      alert('网络错误，请稍后重试')
    }
  }

  const copyInviteLink = (inviteUrl) => {
    navigator.clipboard.writeText(inviteUrl)
    alert('邀请链接已复制到剪贴板')
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
      case 'admin': return <Shield className="w-4 h-4 text-red-500" />
      case 'member': return <Edit className="w-4 h-4 text-blue-500" />
      case 'viewer': return <Eye className="w-4 h-4 text-gray-500" />
      default: return <Users className="w-4 h-4 text-gray-400" />
    }
  }

  const getRoleText = (role) => {
    switch (role) {
      case 'owner':
      case 'admin': return '管理员'
      case 'member': return '成员'
      case 'viewer': return '查看者'
      default: return '未知'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'accepted': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'declined': return <XCircle className="w-4 h-4 text-red-500" />
      case 'expired': return <XCircle className="w-4 h-4 text-gray-500" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '待处理'
      case 'accepted': return '已接受'
      case 'declined': return '已拒绝'
      case 'expired': return '已过期'
      default: return '未知'
    }
  }



  if (!currentProduct) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">请先选择一个产品</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pl-6 pr-6">
      {/* 页面标题 */}
      <div className="border-b border-gray-200 pb-4 pt-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-gray-900">团队成员</h1>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center space-x-1 bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-3 h-3" />
          <span>邀请成员</span>
        </button>
      </div>

      {/* 标签页 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'members'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            团队成员 ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invitations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            邀请记录 ({invitations.length})
          </button>
        </nav>
      </div>

      {/* 团队成员标签页 */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-xl p-1">
          {/* 成员列表 */}
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">暂无团队成员</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      成员
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      角色
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      加入时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      最后活跃
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {(member.full_name || member.username || '').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{member.full_name || member.username}</div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(member.role)}
                          <span className="text-sm text-gray-900">{getRoleText(member.role)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.last_active ? new Date(member.last_active).toLocaleDateString() : '从未'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setSelectedMember(member)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            查看
                          </button>
                          {member.role !== 'admin' && member.role !== 'owner' && (
                            <>
                              <select
                                value={member.role}
                                onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                                className="text-sm border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="admin">管理员</option>
                                <option value="member">成员</option>
                                <option value="viewer">查看者</option>
                              </select>
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 邀请记录标签页 */}
      {activeTab === 'invitations' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  过期时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invitations.map((invitation) => (
                <tr key={invitation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(invitation.role)}
                      <span className="text-sm text-gray-900">{getRoleText(invitation.role)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(invitation.status)}
                      <span className="text-sm text-gray-900">{getStatusText(invitation.status)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invitation.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invitation.expires_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {invitation.status === 'pending' && (
                      <button
                        onClick={() => copyInviteLink(invitation.invite_url)}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-900"
                      >
                        <Copy className="w-4 h-4" />
                        <span>复制链接</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 邀请成员弹窗 */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSubmit={handleInviteMember}
      />

      {/* 成员详情弹窗 */}
      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  )
}

export default TeamMemberPage