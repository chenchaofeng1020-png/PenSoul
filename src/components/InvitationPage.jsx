import React, { useState, useEffect } from 'react'
import { productDuckLogo } from '../assets/logos'
import { UserPlus, Shield, Edit, Eye, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

const InvitationPage = ({ token, onLogin }) => {
  const [invitation, setInvitation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    // 检查用户登录状态
    const userToken = localStorage.getItem('token')
    if (userToken) {
      fetchCurrentUser(userToken)
    }
    
    // 获取邀请信息
    fetchInvitation()
  }, [token])

  const fetchCurrentUser = async (userToken) => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCurrentUser(data.data)
      }
    } catch (err) {
      console.error('获取用户信息失败:', err)
    }
  }

  const fetchInvitation = async () => {
    try {
      setLoading(true)
      const response = await fetch(`http://localhost:8000/api/invitations/${token}`)
      
      if (response.ok) {
        const data = await response.json()
        setInvitation(data.data)
      } else {
        const errorData = await response.json()
        setError(errorData.message || '邀请不存在或已过期')
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvitation = async () => {
    if (!currentUser) {
      // 未登录，提示用户登录
      alert('请先登录后再接受邀请')
      return
    }

    try {
      setProcessing(true)
      const userToken = localStorage.getItem('token')
      const response = await fetch(`http://localhost:8000/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        // 接受成功，刷新页面回到主应用
        alert('成功加入团队！')
        window.location.href = '/'
      } else {
        const errorData = await response.json()
        setError(errorData.message || '接受邀请失败')
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
      const response = await fetch(`http://localhost:8000/api/invitations/${token}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        alert('已拒绝邀请')
        window.location.href = '/'
      } else {
        const errorData = await response.json()
        setError(errorData.message || '拒绝邀请失败')
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setProcessing(false)
    }
  }

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
