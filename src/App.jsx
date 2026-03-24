import { useState, useEffect } from 'react'
import { TrendingUp, Map, GitBranch } from 'lucide-react'
import Sidebar from './components/Sidebar'
 
import { logoSvgs, productDuckLogo } from './assets/logos'
 
import SettingsPage from './components/SettingsPage'
import InvitationPage from './components/InvitationPage'
import ContentPlanningPage from './components/ContentPlanningPage'
import PlatformLogoTest from './components/PlatformLogoTest'
import ProductDataManager from './components/ProductDataManager'
import UserProfilePage from './components/UserProfilePage'
import IdeaIncubator from './components/IdeaIncubator'
import SharedIdeaPage from './components/SharedIdeaPage'
import TrendRadarPage from './components/TrendRadar/TrendRadarPage'
import SmartTopicWorkbench from './components/SmartTopic/SmartTopicWorkbench'
import IdeationConference from './components/IdeationConference'
import PersonaLab from './components/PersonaLab'
import SmartMaterialPage from './pages/SmartMaterialPage'
import LandingPage from './pages/LandingPage'
import EstimationReportPage from './pages/EstimationReportPage'
import ProductRoadmap from './components/ProductRoadmap'
import { register as apiRegister, login as apiLogin, getProducts, addProduct as apiAddProduct, getUser as apiGetUser, uploadProductLogo, updateProduct, acceptInvitation, updateUser as apiUpdateUser } from './services/api'
import { translateAuthError } from './services/authErrors'
import { useUI } from './context/UIContext'

// 登录页面组件
  const LoginPage = ({ onLogin, onBack }) => {
    const { showToast } = useUI()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [isRegisterMode, setIsRegisterMode] = useState(false)
    const [invitationInfo, setInvitationInfo] = useState(null)
    const [showPassword, setShowPassword] = useState(false)
    const [invitationCode, setInvitationCode] = useState('')

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const invitationCode = searchParams.get('invitation')
    if (invitationCode) {
      setInvitationInfo({
        code: invitationCode,
        productName: searchParams.get('product') || '产品',
        productId: searchParams.get('pid'),
        role: searchParams.get('role')
      })
      setIsRegisterMode(true)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (isRegisterMode) {
        // 注册逻辑
        if (!email || !username || !password || !invitationCode) {
          throw new Error('请填写所有字段（包括邀请码）')
        }
        if (password.length < 6) {
          throw new Error('密码长度至少6位')
        }

        await apiRegister({ username, email, password, invitationCode })

        // 如果是邀请注册，自动登录并接受邀请
        if (invitationInfo) {
           const { user, token, username: returnedUsername } = await apiLogin({ login: email, password })
           localStorage.setItem('isLoggedIn', 'true')
           localStorage.setItem('username', returnedUsername)
           if (user && user.id) {
             localStorage.setItem('user_id', user.id)
           }
           if (user && user.email) localStorage.setItem('email', user.email)
           if (token) localStorage.setItem('token', token)
           
           await acceptInvitation(invitationInfo.code, { username: returnedUsername, email: user?.email })
           
           if (invitationInfo.productId) {
             localStorage.setItem('last_product_id', invitationInfo.productId)
           }
           
           // 清除URL参数
           window.history.replaceState({}, document.title, '/')
           
           showToast(`注册成功！已自动加入【${invitationInfo.productName}】团队`, 'success')
           onLogin(returnedUsername, user?.email, user?.id)
           return
        }

        // 注册成功，切换到登录模式
        setIsRegisterMode(false)
        setError('')
        setUsername('')
        setEmail('')
        setPassword('')
        showToast('注册成功！请登录', 'success')
      } else {
        // 登录逻辑
        if (!username || !password) {
          throw new Error('请输入用户名和密码')
        }

        const { user, token, username: returnedUsername } = await apiLogin({ login: username, password })
        localStorage.setItem('isLoggedIn', 'true')
        localStorage.setItem('username', returnedUsername)
        if (user && user.id) {
          localStorage.setItem('user_id', user.id)
        }
        if (user && user.email) localStorage.setItem('email', user.email)
        if (token) localStorage.setItem('token', token)
        onLogin(returnedUsername, user?.email, user?.id)
      }
    } catch (error) {
      setError(translateAuthError(error.message))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {onBack && (
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 z-20 flex items-center text-slate-500 hover:text-blue-600 transition-colors font-medium"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          返回官网
        </button>
      )}
      {/* 现代感背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] rounded-full bg-gradient-to-br from-blue-500/10 to-blue-500/10 blur-3xl opacity-60 mix-blend-multiply animate-blob" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-blue-500/10 to-cyan-500/10 blur-3xl opacity-60 mix-blend-multiply animate-blob animation-delay-2000" />
        <div className="absolute top-[40%] left-[30%] w-[600px] h-[600px] rounded-full bg-gradient-to-r from-sky-500/10 to-cyan-500/10 blur-3xl opacity-40 mix-blend-multiply animate-blob animation-delay-4000" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div 
          className={`flex flex-row items-center justify-center gap-5 ${onBack ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
          onClick={onBack}
          title={onBack ? "点击返回官网" : ""}
        >
            {/* 新设计的 Duck Logo - 更现代、简洁 */}
            <div className="h-14 w-14 bg-gradient-to-tr from-blue-600 via-blue-500 to-sky-500 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 transform hover:scale-105 transition-all duration-300 ring-4 ring-white/50">
                <svg className="w-9 h-9 text-white" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* 鸭子主体 */}
                  <path d="M75 55C75 74.33 59.33 90 40 90C20.67 90 5 74.33 5 55C5 35.67 20.67 20 40 20C50 20 58.5 24 65 30" stroke="white" strokeWidth="6" strokeLinecap="round"/>
                  {/* 头部和嘴巴 */}
                  <path d="M65 30C75 30 85 35 85 45C85 50 80 55 75 55" stroke="white" strokeWidth="6" strokeLinecap="round"/>
                  <path d="M85 45H95" stroke="white" strokeWidth="6" strokeLinecap="round"/>
                  {/* 眼睛 */}
                  <circle cx="45" cy="45" r="5" fill="white"/>
                </svg>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-sans">
              Product Duck
            </h2>
        </div>
        {/* 副标题已移除 */}
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[440px] relative z-10">
        <div className="bg-white/90 backdrop-blur-md py-10 px-8 shadow-2xl shadow-slate-200/50 border border-white/60 rounded-3xl sm:px-12 transition-all hover:shadow-blue-500/10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isRegisterMode ? (
                <div className="space-y-5">
                    <div>
                        <label htmlFor="username" className="block text-sm font-semibold text-slate-700 ml-1 mb-2">用户名 / 邮箱</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input id="username" type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                                className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 sm:text-sm font-medium" 
                                placeholder="请输入您的账号" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 ml-1">密码</label>
                            <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors">忘记密码?</a>
                        </div>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input id="password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 sm:text-sm font-medium" 
                                placeholder="请输入您的密码" />
                            <button
                              type="button"
                              onClick={() => setShowPassword(prev => !prev)}
                              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                              aria-label={showPassword ? '隐藏密码' : '显示密码'}
                            >
                              {showPassword ? (
                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                                  <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                  <path d="M10.73 5.08A9.77 9.77 0 0112 5c5 0 9 3.5 10 7-0.33 1.22-1.05 2.4-2.08 3.42M6.1 6.1C4.19 7.4 2.83 9.08 2 12c1 3.5 5 7 10 7 1.03 0 2.02-.16 2.96-.45" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              ) : (
                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                                  <path d="M12 5c5 0 9 3.5 10 7-1 3.5-5 7-10 7S3 15.5 2 12c1-3.5 5-7 10-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                              )}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="username" className="block text-sm font-semibold text-slate-700 ml-1 mb-1">用户名</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input id="username" type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                                className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 sm:text-sm font-medium" 
                                placeholder="设置用户名" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-slate-700 ml-1 mb-1">邮箱</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                            </div>
                            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 sm:text-sm font-medium" 
                                placeholder="your@email.com" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-semibold text-slate-700 ml-1 mb-1">密码</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input id="password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 sm:text-sm font-medium" 
                                placeholder="设置密码" />
                            <button
                              type="button"
                              onClick={() => setShowPassword(prev => !prev)}
                              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                              aria-label={showPassword ? '隐藏密码' : '显示密码'}
                            >
                              {showPassword ? (
                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                                  <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                  <path d="M10.73 5.08A9.77 9.77 0 0112 5c5 0 9 3.5 10 7-0.33 1.22-1.05 2.4-2.08 3.42M6.1 6.1C4.19 7.4 2.83 9.08 2 12c1 3.5 5 7 10 7 1.03 0 2.02-.16 2.96-.45" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              ) : (
                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                                  <path d="M12 5c5 0 9 3.5 10 7-1 3.5-5 7-10 7S3 15.5 2 12c1-3.5 5-7 10-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                              )}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="invitationCode" className="block text-sm font-semibold text-slate-700 ml-1 mb-1">邀请码 <span className="text-red-500">*</span></label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input id="invitationCode" type="text" required value={invitationCode} onChange={(e) => setInvitationCode(e.target.value)}
                                className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 sm:text-sm font-medium" 
                                placeholder="请输入邀请码" />
                        </div>
                    </div>
                </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 p-4 border border-red-100 flex items-start">
                <svg className="h-5 w-5 text-red-400 mt-0.5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            )}

            <div>
              <button type="submit" disabled={isLoading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/30 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:shadow-none transition-all duration-300 transform hover:-translate-y-0.5 active:scale-[0.98]">
                {isLoading ? (
                    <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        处理中...
                    </span>
                ) : (isRegisterMode ? '立即注册' : '登录系统')}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-500 font-medium">
                  {isRegisterMode ? '已有账户？' : '还没有账户？'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => {
                    setIsRegisterMode(!isRegisterMode)
                    setError('')
                    setUsername('')
                    setPassword('')
                    setEmail('')
                }}
                className="w-full inline-flex justify-center py-3.5 px-4 border border-slate-200 rounded-xl shadow-sm bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 focus:outline-none transition-all duration-200"
              >
                {isRegisterMode ? '返回登录' : '免费注册账户'}
              </button>
            </div>
          </div>
        </div>
        
        {/* 底部版权信息 */}
        <p className="mt-8 text-center text-xs text-slate-400/80 font-medium">
            &copy; {new Date().getFullYear()} Product Duck. All rights reserved.
        </p>
      </div>
    </div>
  )
}

function App() {
  useEffect(() => {
    document.title = '产品鸭'
    let link = document.querySelector("link[rel='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      link.type = 'image/svg+xml'
      document.head.appendChild(link)
    }
    link.href = productDuckLogo
  }, [])
  const { showToast } = useUI()
  const [competitors, setCompetitors] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(() => {
    let v = localStorage.getItem('selectedCategory') || '产品规划'
    v = (v || '').trim()
    if (['产品路线图', '竞品管理'].includes(v)) {
      v = '产品规划'
    }
    if (v === '趋势雷达') {
      v = '热点内容'
    }
    if (v === '内容规划') {
      v = '排期公告板'
    }
    return v
  })
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedCompetitor, setSelectedCompetitor] = useState(() => {
    const saved = localStorage.getItem('selectedCompetitor')
    return saved ? JSON.parse(saved) : null
  })
  const [showDetailPage, setShowDetailPage] = useState(() => {
    return localStorage.getItem('showDetailPage') === 'true'
  })
  const [currentProductId, setCurrentProductId] = useState(() => {
    const pid = localStorage.getItem('last_product_id')
    return pid || null
  })
  const [currentProduct, setCurrentProduct] = useState(() => {
    const pid = localStorage.getItem('last_product_id')
    if (!pid) return null
    // 优先从通用缓存读取
    const tryGetFromKey = (key) => {
      try {
        const cached = localStorage.getItem(key)
        if (!cached) return null
        const arr = JSON.parse(cached)
        if (Array.isArray(arr)) {
          return arr.find(p => String(p.id) === String(pid)) || null
        }
        if (arr && Array.isArray(arr.data)) {
          return arr.data.find(p => String(p.id) === String(pid)) || null
        }
      } catch { return null }
      return null
    }
    let found = tryGetFromKey('products_cache')
    if (!found) {
      // 尝试所有用户缓存键
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('products_cache_user_')) {
            const maybe = tryGetFromKey(key)
            if (maybe) { found = maybe; break }
          }
        }
      } catch { void 0 }
    }
    return found || { id: pid }
  })
  const [userProducts, setUserProducts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true'
  })
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('username') || ''
  })
  const [currentUserId, setCurrentUserId] = useState(() => {
    return localStorage.getItem('user_id') || ''
  })
  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem('email') || ''
  })
  const [userAvatar, setUserAvatar] = useState(() => {
    return localStorage.getItem('user_avatar') || ''
  })

  // 检查URL中是否有邀请token
  const urlParams = new URLSearchParams(window.location.search)
  const invitationToken = urlParams.get('invitation')
  const sharedIdeaId = urlParams.get('share_idea')

  // 当selectedCategory改变时，保存到localStorage
  useEffect(() => {
    const v = (selectedCategory || '').trim()
    localStorage.setItem('selectedCategory', v)
  }, [selectedCategory])

  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isCreatingProduct, setIsCreatingProduct] = useState(false)
  const [trendPlanData, setTrendPlanData] = useState(null)
  const [sources, setSources] = useState([])
  // 初始化时，如果URL中有邀请码，则默认显示登录页；否则显示官网
  const [isLoginPageVisible, setIsLoginPageVisible] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return !!params.get('invitation')
  })

  // 加载产品数据源
  useEffect(() => {
    if (currentProductId) {
      fetch(`http://localhost:3002/api/smart/sources?productId=${currentProductId}`)
        .then(res => res.json())
        .then(data => setSources(data.data || []))
        .catch(console.error)
    }
  }, [currentProductId])

  useEffect(() => {
    if (isLoggedIn && currentUser) {
      loadUserProducts()
    }
    // 如果已登录，尝试获取用户信息（头像等）
    if (isLoggedIn) {
      apiGetUser().then(user => {
        if (user) {
          if (user.id && user.id !== currentUserId) {
            setCurrentUserId(user.id)
            localStorage.setItem('user_id', user.id)
          }
          if (user.email && !userEmail) {
            setUserEmail(user.email)
            localStorage.setItem('email', user.email)
          }
          const meta = user.user_metadata || {}
          if (meta.avatar && meta.avatar !== userAvatar) {
            setUserAvatar(meta.avatar)
            localStorage.setItem('user_avatar', meta.avatar)
          }
          if (meta.username && meta.username !== currentUser) {
            setCurrentUser(meta.username)
            localStorage.setItem('username', meta.username)
          }
        }
      }).catch(() => {})
    }
  }, [isLoggedIn, currentUser, userEmail])

  useEffect(() => {
    if (showDetailPage && !selectedCompetitor) {
      setShowDetailPage(false)
      localStorage.removeItem('showDetailPage')
      localStorage.removeItem('selectedCompetitor')
    }
  }, [showDetailPage, selectedCompetitor])

  const handleLogin = (username, email, userId) => {
    setIsLoggedIn(true)
    setCurrentUser(username)
    if (email) setUserEmail(email)
    if (userId) {
      setCurrentUserId(userId)
      localStorage.setItem('user_id', userId)
    }
    setSelectedCategory('产品规划')
  }

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('username')
    localStorage.removeItem('email')
    localStorage.removeItem('token')
    localStorage.removeItem('showDetailPage')
    localStorage.removeItem('selectedCompetitor')
    setIsLoggedIn(false)
    setIsLoginPageVisible(true)
    setCurrentUser('')
    setUserEmail('')
    setCurrentUserId('')
    localStorage.removeItem('user_id')
    setCurrentProductId(null)
    setCurrentProduct(null)
    setUserProducts([])
    setCompetitors([])
    setShowDetailPage(false)
    setSelectedCompetitor(null)
  }

  // 处理产品切换
  const handleProductChange = (product) => {
    setCurrentProduct(product)
    setCurrentProductId(product.id)
    try { localStorage.setItem('last_product_id', String(product.id)) } catch { void 0 }
  }

  // 处理添加产品
  const handleAddProduct = async (productData, editId = null) => {
    try {
      if (editId) {
        showToast('暂未实现产品更新，后续由 Supabase 行级安全下完成', 'warning')
      } else {
        setIsCreatingProduct(true)
        const created = await apiAddProduct({ name: productData.name, description: productData.description, website: productData.website, logo: '' })
        if (created?.id) {
          setUserProducts(prev => [created, ...(Array.isArray(prev) ? prev : [])])
          setCurrentProduct(created)
          setCurrentProductId(created.id)
          try { localStorage.setItem('last_product_id', String(created.id)) } catch { void 0 }
        }
        showToast('产品创建成功！', 'success')
        
        // 上传Logo (如果存在)
        if (productData.logo && created?.id) {
          try {
            const { url } = await uploadProductLogo(productData.logo, created.id)
            if (url) {
              await updateProduct(created.id, { logo_url: url })
            }
          } catch (e) {
            console.error('Failed to upload logo during creation:', e)
            showToast('Logo上传失败，但产品已创建', 'warning')
          }
        }
        
        await loadUserProducts()
        setIsCreatingProduct(false)
      }
    } catch (error) {
      console.error(editId ? '更新产品失败:' : '创建产品失败:', error)
      showToast(editId ? '更新产品失败，请检查网络连接' : '创建产品失败，请检查网络连接', 'error')
      setIsCreatingProduct(false)
    }
  }

  // 处理产品更新
  const handleUpdateProduct = (updatedProduct) => {
    // 更新 userProducts 列表
    setUserProducts(prevProducts => 
      prevProducts.map(p => p.id === updatedProduct.id ? updatedProduct : p)
    )
    
    // 如果更新的是当前选中的产品，更新 currentProduct
    if (currentProduct?.id === updatedProduct.id) {
      setCurrentProduct(updatedProduct)
      // 更新缓存
      try {
        const cacheKey = `product_details_cache_${updatedProduct.id}`
        localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: updatedProduct }))
        
        // 更新列表缓存
        const uid = currentUserId || (typeof currentUser === 'string' ? currentUser : currentUser?.id)
        const listCacheKey = uid ? `products_cache_user_${uid}` : 'products_cache'
        // 由于这里获取不到完整的 user id，我们只更新 currentProduct 和 userProducts 状态
        // 下次 loadUserProducts 时会覆盖
      } catch { void 0 }
    }
  }

  // 加载用户产品列表
  const loadUserProducts = async () => {
    if (isLoadingProducts) return []
    setIsLoadingProducts(true)
    try {
      console.time('loadUserProducts')
      console.log('Starting product data fetch...')
      let products = []
      try {
        const user = await apiGetUser()
        const cacheKey = user?.id ? `products_cache_user_${user.id}` : 'products_cache'
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log('Loaded products from cache:', parsed)
            setUserProducts(parsed)
          }
        }
        products = await getProducts()
        console.log('Fetched product data from API:', products)
        if (Array.isArray(products)) {
          localStorage.setItem(cacheKey, JSON.stringify(products))
        }
      } catch (e) {
        console.warn('Failed to fetch user specific products, falling back to all products', e)
        products = await getProducts()
      }

      if (Array.isArray(products)) {
        setUserProducts(products)
        
        // 如果当前有选中的产品ID但没有详情，尝试从列表中恢复
        if (currentProductId && !currentProduct) {
          const found = products.find(p => String(p.id) === String(currentProductId))
          if (found) setCurrentProduct(found)
        }
      }
      console.timeEnd('loadUserProducts')
      return products || []
    } catch (error) {
      console.error('Failed to load products:', error)
      showToast('加载产品列表失败', 'error')
      return []
    } finally {
      setIsLoadingProducts(false)
    }
  }

  // 处理从灵感转化创建的产品
  const handleProductCreatedFromIdea = async (productId) => {
    // 强制刷新列表
    const products = await loadUserProducts()
    // 查找新产品
    const newProduct = products.find(p => String(p.id) === String(productId))
    
    if (newProduct) {
      handleProductChange(newProduct)
      setSelectedCategory('产品规划')
      showToast('已切换到新创建的产品空间', 'success')
    } else {
      // 如果列表刷新没找到（可能是异步延迟），尝试手动构建一个临时对象并切换
      // 或者再次尝试获取
      console.warn('New product not found in list immediately, trying to fetch directly...')
      // 这里如果 getProducts 还没包含新数据，可能需要后端确保数据一致性
      // 暂时假设 loadUserProducts 能获取到
    }
  }

  

  const handleUpdateUser = async (userData) => {
    const updates = {}
    if (userData.username) {
      setCurrentUser(userData.username)
      localStorage.setItem('username', userData.username)
      updates.username = userData.username
    }
    if (userData.avatar) {
      setUserAvatar(userData.avatar)
      localStorage.setItem('user_avatar', userData.avatar)
      updates.avatar = userData.avatar
    }
    
    // Save to backend
    if (Object.keys(updates).length > 0) {
      try {
        await apiUpdateUser(updates)
      } catch (e) {
        console.error('Failed to update user profile', e)
      }
    }
  }

  const handleCreatePlanFromTrend = (planData) => {
    setTrendPlanData(planData)
    setSelectedCategory('排期公告板')
  }

  const normalizedSelectedCategory = (selectedCategory || '').trim()
  

  // 如果URL中有邀请token且已登录，显示邀请页面确认加入
  if (invitationToken && isLoggedIn) {
    return <InvitationPage token={invitationToken} onLogin={handleLogin} />
  }

  // 公开分享灵感路由 - 拦截登录检查
  if (sharedIdeaId) {
    return <SharedIdeaPage ideaId={sharedIdeaId} />
  }

  // 人天评估报告分享路由 - 拦截登录检查
  const hash = window.location.hash
  const estimationMatch = hash.match(/^#\/estimation\/(.+)$/)
  if (estimationMatch) {
    const reportId = estimationMatch[1]
    return <EstimationReportPage reportId={reportId} />
  }

  if (!isLoggedIn) {
    if (isLoginPageVisible) {
      return <LoginPage onLogin={handleLogin} onBack={() => setIsLoginPageVisible(false)} />
    }
    return <LandingPage onLoginClick={() => setIsLoginPageVisible(true)} />
  }

  

  return (
    <div className="flex h-screen bg-gray-50">
      {normalizedSelectedCategory !== '灵感工作台' && (
        <Sidebar 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          
          currentUser={currentUser}
          userAvatar={userAvatar}
          onLogout={handleLogout}
          currentProduct={currentProduct}
          userProducts={userProducts}
          onProductChange={handleProductChange}
          onAddProduct={handleAddProduct}
          isLoadingProducts={isLoadingProducts}
          onRefresh={loadUserProducts}
        />
      )}
      
      <main className={`flex-1 ${normalizedSelectedCategory === '灵感工作台' ? 'bg-gray-100' : 'bg-gray-50'} p-4 overflow-hidden`}>
        <div className={'bg-white rounded-xl shadow-sm h-full overflow-hidden'}>
        {normalizedSelectedCategory === '系统设置' ? (
          <SettingsPage currentProduct={currentProduct} />
        ) : normalizedSelectedCategory === '排期公告板' ? (
          <ContentPlanningPage 
            currentProduct={currentProduct} 
            initialPlanData={trendPlanData}
            onPlanCreated={() => setTrendPlanData(null)}
          />
        ) : normalizedSelectedCategory === '灵感工作台' ? (
          <IdeaIncubator 
            currentUser={{ 
              id: currentUserId || currentUser, 
              name: currentUser,
              email: userEmail,
              user_metadata: { username: currentUser }
            }} 
            onExit={() => setSelectedCategory('产品规划')}
            onProductCreated={handleProductCreatedFromIdea}
          />
        ) : normalizedSelectedCategory === '热点雷达' ? (
          <TrendRadarPage 
            productContext={currentProduct ? {
              name: currentProduct.name,
              positioning: currentProduct.positioning || currentProduct.description || '暂无定位',
              target_audience: currentProduct.target_audience || '暂无受众'
            } : null}
            onCreatePlan={handleCreatePlanFromTrend}
          />
        ) : normalizedSelectedCategory === '智能选题' ? (
          <SmartTopicWorkbench 
            currentUser={{ id: currentUserId }} 
            productContext={currentProduct}
            onCreatePlan={handleCreatePlanFromTrend}
          />
        ) : normalizedSelectedCategory === 'AI工作台' ? (
          <SmartMaterialPage currentProduct={currentProduct} />
        ) : normalizedSelectedCategory === '选题会议室' ? (
          <IdeationConference 
            currentUser={{ id: currentUserId }}
            currentProduct={currentProduct}
          />
        ) : normalizedSelectedCategory === '人设实验室' ? (
          <PersonaLab 
            currentUser={{ id: currentUserId }}
          />
        ) : normalizedSelectedCategory === '平台Logo测试' ? (
          <PlatformLogoTest />
        ) : normalizedSelectedCategory === '个人信息' ? (
          <UserProfilePage currentUser={currentUser} email={userEmail} onUpdateUser={handleUpdateUser} />
        ) : normalizedSelectedCategory === '产品路线图' ? (
          <ProductRoadmap currentProduct={currentProduct} sources={sources} />
        ) : (normalizedSelectedCategory === '产品规划' || normalizedSelectedCategory === '产品资料管理' || normalizedSelectedCategory === '产品资料') ? (
          <ProductDataManager currentProduct={currentProduct} onUpdateProduct={handleUpdateProduct} />
        ) : (
          <ProductDataManager currentProduct={currentProduct} onUpdateProduct={handleUpdateProduct} />
        )}
        </div>
      </main>

      
      {isCreatingProduct && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl px-6 py-4 flex items-center space-x-3">
            <div className="w-5 h-5 animate-spin">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="#6366F1" strokeWidth="4" fill="none" opacity="0.2"/>
                <path d="M22 12a10 10 0 0 0-10-10" stroke="#6366F1" strokeWidth="4" fill="none"/>
              </svg>
            </div>
            <span className="text-sm text-gray-700">正在创建产品...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
