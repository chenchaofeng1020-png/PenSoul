import React, { useState, useEffect } from 'react'
import { Users, UserPlus, Shield, Eye, Edit, Trash2, Link as LinkIcon, Copy as CopyIcon, X, Check } from 'lucide-react'
import InviteMemberModal from './InviteMemberModal'
import MemberDetailDrawer from './MemberDetailDrawer'
import { useUI } from '../context/UIContext'

const TeamMemberPage = ({ currentProduct }) => {
  const { showToast, confirm } = useUI()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [showInviteResultModal, setShowInviteResultModal] = useState(false)
  const [inviteResult, setInviteResult] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedText, setCopiedText] = useState(false)
  const API_BASE = import.meta.env.VITE_API_BASE || ''

  // 获取当前用户在当前产品中的角色
  const getCurrentUserRole = () => {
    const currentUsername = localStorage.getItem('username')
    const currentEmail = localStorage.getItem('email')
    
    if (!currentUsername && !currentEmail) return null
    
    // 优先匹配邮箱
    if (currentEmail) {
      const byEmail = members.find(m => m.email === currentEmail)
      if (byEmail) return byEmail.role
    }
    
    // 其次匹配用户名
    if (currentUsername) {
      const byName = members.find(m => 
        (m.username && m.username === currentUsername) || 
        (m.full_name && m.full_name === currentUsername)
      )
      if (byName) return byName.role
    }
    
    return null
  }

  const currentUserRole = getCurrentUserRole()
  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'

  useEffect(() => {
    if (currentProduct?.id) {
      loadMembers()
    }
  }, [currentProduct])

  const loadMembers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const currentUsername = localStorage.getItem('username')
      const currentEmail = localStorage.getItem('email')
      const currentUserAvatar = localStorage.getItem('user_avatar')
      const base = API_BASE || ''
      const url = `${base}/api/products/${currentProduct.id}/members`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-User-Name': currentUsername ? encodeURIComponent(currentUsername) : '',
          'X-User-Email': currentEmail || '',
          'X-User-Avatar': currentUserAvatar || ''
        }
      })

      const ct = response.headers.get('content-type') || ''
      if (!response.ok || !ct.includes('application/json')) {
        setMembers([])
        if (!response.ok) setError('获取团队成员失败')
        return
      }
      const data = await response.json()
      
      // 兼容后端返回格式：可能是 { data: [...] } 或 { data: { members: [...] } }
      let fetchedMembers = []
      if (Array.isArray(data.data)) {
        fetchedMembers = data.data
      } else if (data.data?.members && Array.isArray(data.data.members)) {
        fetchedMembers = data.data.members
      }
      
      setMembers(fetchedMembers)
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  

  const handleInviteMember = async (inviteData) => {
    try {
      const token = localStorage.getItem('token')
      const base = API_BASE || ''
      const url = `${base}/api/products/${currentProduct.id}/members/invite`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...inviteData,
          product_name: currentProduct?.name || '',
          client_base: window.location.origin
        })
      })

      if (response.ok) {
        const data = await response.json()
        setShowInviteModal(false)
        const roleLabel = getRoleText(inviteData.role)
        const days = Number(inviteData.expires_in_days)
        const link = data?.data?.invite_url || ''
        const preset = data?.data?.share_text || ''
        const shareText = preset || `邀请加入【${currentProduct?.name || '产品'}】团队（角色：${roleLabel}），点击链接加入：${link}（有效期${days}天）`
        setInviteResult({
          invite_url: link,
          share_text: shareText,
          expires_at: data?.data?.expires_at,
          role: inviteData.role,
          days
        })
        setShowInviteResultModal(true)
      } else {
        const errorData = await response.json()
        setError(errorData.message || '创建邀请失败')
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    }
  }

  const handleUpdateMemberRole = async (memberId, newRole) => {
    try {
      const token = localStorage.getItem('token')
      const base = API_BASE || ''
      const url = `${base}/api/products/${currentProduct.id}/members/${memberId}/role`
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      })

      if (response.ok) {
        loadMembers() // 刷新成员列表
        showToast('成员角色更新成功', 'success')
      } else {
        const errorData = await response.json()
        showToast(errorData.message || '更新成员角色失败', 'error')
      }
    } catch (err) {
      showToast('网络错误，请稍后重试', 'error')
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!await confirm({ title: '移除成员', message: '确定要移除该成员吗？' })) return

    try {
      const token = localStorage.getItem('token')
      const base = API_BASE || ''
      const url = `${base}/api/products/${currentProduct.id}/members/${memberId}`
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        loadMembers() // 刷新成员列表
        showToast('成员移除成功', 'success')
      } else {
        const errorData = await response.json()
        showToast(errorData.message || '移除成员失败', 'error')
      }
    } catch (err) {
      showToast('网络错误，请稍后重试', 'error')
    }
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

  



  if (!currentProduct) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">请先选择一个产品</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">
      {/* 顶部工具栏（替代原来的大标题 Header） */}
      <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span>共 {members.length} 位成员</span>
        </div>
        {canManage && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center space-x-1 bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700 transition-colors shadow-sm"
          >
            <UserPlus className="w-3 h-3" />
            <span>邀请成员</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* 产品创建人区域 */}
        {members.find(m => m.role === 'owner') && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider px-1">产品创建人</h2>
            <div className="bg-white rounded-lg border border-blue-200 bg-blue-50/50 p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-12 w-12">
                  {members.find(m => m.role === 'owner').avatar_url ? (
                    <img className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-sm" src={members.find(m => m.role === 'owner').avatar_url} alt="" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-sm">
                      <span className="text-lg font-medium text-blue-600">
                        {(members.find(m => m.role === 'owner').full_name || members.find(m => m.role === 'owner').username || '').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="ml-4">
                  <div className="flex items-center space-x-2">
                    <div className="text-base font-semibold text-gray-900">
                      {members.find(m => m.role === 'owner').full_name || members.find(m => m.role === 'owner').username}
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                      创建人
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">{members.find(m => m.role === 'owner').email}</div>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                创建于 {new Date(members.find(m => m.role === 'owner').joined_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-1">
            <h2 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider px-1">
              团队成员 ({members.filter(m => m.role !== 'owner').length})
            </h2>
            {/* 成员列表 */}
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-500">{error}</p>
              </div>
            ) : !members.some(m => m.role === 'owner') && members.length === 0 ? (
              <div className="text-center py-12 bg-red-50 rounded-lg border border-dashed border-red-200">
                <Users className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-600 font-medium">未找到任何成员信息</p>
                <p className="text-red-400 text-sm mt-2">可能是本地数据未同步或产品ID不存在，请检查后端日志。</p>
              </div>
            ) : members.filter(m => m.role !== 'owner').length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">暂无其他团队成员</p>
                {canManage && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline"
                  >
                    立即邀请成员
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
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
                    {members.filter(m => m.role !== 'owner').map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {member.avatar_url ? (
                                <img className="h-10 w-10 rounded-full object-cover" src={member.avatar_url} alt="" />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-600">
                                    {(member.full_name || member.username || '').charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
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
                              className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                            >
                              查看
                            </button>
                            {canManage && member.role !== 'admin' && member.role !== 'owner' && (
                              <>
                                <select
                                  value={member.role}
                                  onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="admin">管理员</option>
                                  <option value="member">成员</option>
                                  <option value="viewer">查看者</option>
                                </select>
                                <button
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="text-red-600 hover:text-red-900 hover:bg-red-50 p-1 rounded transition-colors"
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
      </div>

      {/* 邀请成员弹窗 */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSubmit={handleInviteMember}
      />

      {/* 邀请结果弹窗 */}
      {showInviteResultModal && inviteResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">邀请链接已创建</div>
                  <div className="text-xs text-gray-500">将下方内容分享给你的同事</div>
                </div>
              </div>
              <button onClick={() => { setShowInviteResultModal(false); setInviteResult(null) }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邀请链接</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={inviteResult.invite_url}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-800 font-mono text-[13px]"
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteResult.invite_url); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 1500) }}
                    className={`inline-flex items-center gap-1 px-3 py-2 text-sm font-medium border rounded-lg transition-colors ${copiedLink ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                    {copiedLink ? '已复制' : '复制链接'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分享文案</label>
                <div className="flex items-start gap-2">
                  <textarea
                    readOnly
                    value={inviteResult.share_text}
                    rows={4}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-800"
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteResult.share_text); setCopiedText(true); setTimeout(() => setCopiedText(false), 1500) }}
                    className={`inline-flex items-center gap-1 px-3 py-2 text-sm font-medium border rounded-lg self-start transition-colors ${copiedText ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    {copiedText ? <Check className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                    {copiedText ? '已复制' : '复制文案'}
                  </button>
                </div>
              </div>
              {inviteResult.expires_at && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">有效期至：{new Date(inviteResult.expires_at).toLocaleString()}</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700">角色：{getRoleText(inviteResult.role)}</span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700">有效期：{inviteResult.days}天</span>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}

      {/* 成员详情抽屉 */}
      {selectedMember && (
        <MemberDetailDrawer
          member={selectedMember}
          currentProduct={currentProduct}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  )
}

export default TeamMemberPage
