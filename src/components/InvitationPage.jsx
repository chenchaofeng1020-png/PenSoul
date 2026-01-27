import React, { useState, useEffect } from 'react'
import { productDuckLogo } from '../assets/logos'
import { UserPlus, Shield, Edit, Eye, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { supabase, hasSupabaseConfig } from '../lib/supabaseClient'
import { useUI } from '../context/UIContext'

const InvitationPage = ({ token, onLogin }) => {
  const { showToast } = useUI()
  const [invitation, setInvitation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const API_BASE = import.meta.env.VITE_API_BASE || ''

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
    if (isLoggedIn) {
      const username = localStorage.getItem('username') || ''
      if (username) setCurrentUser({ username })
    }

    const base = API_BASE || ''
    fetch(`${base}/api/invitations/${token}`)
      .then(async (resp) => {
        if (resp.ok) {
          const data = await resp.json()
          setInvitation(data.data)
        } else {
          const ed = await resp.json().catch(() => ({}))
          setError(ed.message || '邀请不存在或已过期')
        }
      })
      .catch(() => setError('网络错误，请稍后重试'))
      .finally(() => setLoading(false))
  }, [token])

  const handleAcceptInvitation = async () => {
    if (!currentUser) {
      showToast('请先登录后再接受邀请', 'warning')
      return
    }
    try {
      setProcessing(true)
      const base = API_BASE || ''
      let username = ''
      let email = ''
      try {
        // 优先使用真实登录信息，避免占位值写入导致后续不可见
        if (hasSupabaseConfig()) {
          const u = await supabase.auth.getUser()
          const su = u?.data?.user || null
          username = su?.user_metadata?.username || ''
          email = su?.email || ''
        } else {
          const { getUser } = await import('../services/api')
          const u = await getUser()
          username = u?.user_metadata?.username || ''
          email = u?.email || ''
        }
      } catch { /* ignore */ }
      // 兜底：如果仍为空，尝试 localStorage；仍为空则阻止提交
      if (!username) username = localStorage.getItem('username') || ''
      if (!email) email = localStorage.getItem('email') || ''
      if (!username || !email) {
        showToast('缺少用户名或邮箱，请完成登录信息后重试', 'warning')
        setProcessing(false)
        return
      }
      
      if (hasSupabaseConfig() && invitation) {
        // Supabase mode: insert member directly
        const user = await supabase.auth.getUser()
        const uid = user.data.user?.id
        if (!uid) throw new Error('User ID not found')
        
        const { error: insertError } = await supabase.from('product_members').insert({
          product_id: invitation.product_id,
          user_id: uid,
          role: invitation.role
        })
        
        if (insertError) {
          // If already member, treat as success or show message
          if (insertError.code === '23505') { // Unique violation
             // Update role if needed? For now just ignore
          } else {
             throw new Error(insertError.message)
          }
        }
        
        // Also call API to consume token (optional but good for tracking)
        // But the API might fail if it tries to write to local DB and fails?
        // Let's call API anyway to mark invitation as used in local DB if possible
        try {
           await fetch(`${base}/api/invitations/${token}/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email })
          })
        } catch (e) { console.warn('API accept failed', e) }

        if (invitation?.product_id) {
          localStorage.setItem('last_product_id', String(invitation.product_id))
        }
        localStorage.setItem('selectedCategory', '产品规划')
        showToast('成功加入团队！', 'success')
        window.location.href = '/'
        return
      }

      const resp = await fetch(`${base}/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email })
      })
      if (resp.ok) {
        if (invitation?.product_id) {
          localStorage.setItem('last_product_id', String(invitation.product_id))
        }
        localStorage.setItem('selectedCategory', '产品规划')
        showToast('成功加入团队！', 'success')
        window.location.href = '/'
      } else {
        const ed = await resp.json().catch(() => ({}))
        setError(ed.message || '接受邀请失败')
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setProcessing(false)
    }
  }

  const handleDeclineInvitation = async () => {
    try {
      setProcessing(true)
      const base = API_BASE || ''
      await fetch(`${base}/api/invitations/${token}/decline`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      showToast('已拒绝邀请', 'info')
      window.location.href = '/'
    } catch {
      showToast('已拒绝邀请', 'info')
      window.location.href = '/'
    } finally {
      setProcessing(false)
    }
  }

  useEffect(() => {
    if (invitation && currentUser && !processing) {
      // 保留手动点击接受邀请，更可控
    }
  }, [invitation, currentUser, processing])

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Shield className="w-6 h-6 text-red-500" />
      case 'member': return <Edit className="w-6 h-6 text-blue-500" />
      case 'viewer': return <Eye className="w-6 h-6 text-gray-500" />
      default: return <UserPlus className="w-6 h-6 text-gray-400" />
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载邀请信息...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">邀请无效</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => { window.location.href = '/' }}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* 头部 */}
          <div className="bg-blue-600 px-8 py-6 text-center">
            <img 
              src={productDuckLogo} 
              alt="产品鸭 Logo" 
              className="w-16 h-16 mx-auto mb-4 rounded-lg"
            />
            <h1 className="text-2xl font-bold text-white mb-2">团队邀请</h1>
            <p className="text-blue-100">您被邀请加入团队</p>
          </div>

          {/* 内容 */}
          <div className="px-8 py-6">
            {/* 产品信息 */}
            <div className="text-center mb-6">
              {invitation.product_logo && (
                <img 
                  src={invitation.product_logo} 
                  alt={invitation.product_name}
                  className="w-12 h-12 mx-auto mb-3 rounded-lg"
                />
              )}
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                {invitation.product_name}
              </h2>
              <p className="text-gray-600">
                {invitation.invited_by} 邀请您加入团队
              </p>
            </div>

            {/* 角色信息 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3 mb-2">
                {getRoleIcon(invitation.role)}
                <span className="text-lg font-medium text-gray-900">
                  {getRoleText(invitation.role)}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {getRoleDescription(invitation.role)}
              </p>
            </div>

            {/* 过期时间 */}
            <div className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
              <Clock className="w-4 h-4" />
              <span>
                邀请将于 {new Date(invitation.expires_at).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })} 过期
              </span>
            </div>

            {/* 登录提示 */}
            {!currentUser && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800 mb-1">需要登录</h3>
                    <p className="text-sm text-yellow-700">
                      接受邀请前需要先登录您的账户，如果没有账户请先注册。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="space-y-3">
              <button
                onClick={handleAcceptInvitation}
                disabled={processing}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>处理中...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>{currentUser ? '接受邀请' : '登录并接受邀请'}</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleDeclineInvitation}
                disabled={processing}
                className="w-full flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="w-5 h-5" />
                <span>拒绝邀请</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvitationPage
