import { useState, useEffect } from 'react'
import { TrendingUp, Map, GitBranch } from 'lucide-react'
import Sidebar from './components/Sidebar'
import CompetitorList from './components/CompetitorList'
import AddCompetitorModal from './components/AddCompetitorModal'
import CompetitorDetailModal from './components/CompetitorDetailModal'
import CompetitorDetailPage from './components/CompetitorDetailPage'
import NewCompetitorDetailPage from './components/NewCompetitorDetailPage'
import { logoSvgs } from './assets/logos'
import RoadmapPage from './components/RoadmapPage'
import TeamMemberPage from './components/TeamMemberPage'
import InvitationPage from './components/InvitationPage'
import ContentPlanningPage from './components/ContentPlanningPage'
import PlatformLogoTest from './components/PlatformLogoTest'
import ProductDataManager from './components/ProductDataManager'
import { register as apiRegister, login as apiLogin, getProducts, addProduct as apiAddProduct, getCompetitors as apiGetCompetitors, addCompetitor as apiAddCompetitor, getUser as apiGetUser } from './services/api'

// 登录页面组件
const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRegisterMode, setIsRegisterMode] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (isRegisterMode) {
        // 注册逻辑
        if (!email || !username || !password || !confirmPassword) {
          throw new Error('请填写所有字段')
        }
        if (password !== confirmPassword) {
          throw new Error('两次输入的密码不一致')
        }
        if (password.length < 6) {
          throw new Error('密码长度至少6位')
        }

        await apiRegister({ username, email, password })

        // 注册成功，切换到登录模式
        setIsRegisterMode(false)
        setError('')
        setUsername('')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        alert('注册成功！请登录')
      } else {
        // 登录逻辑
        if (!username || !password) {
          throw new Error('请输入用户名和密码')
        }

        const { token, username: returnedUsername } = await apiLogin({ login: username, password })
        localStorage.setItem('isLoggedIn', 'true')
        localStorage.setItem('username', returnedUsername)
        if (token) localStorage.setItem('token', token)
        onLogin(returnedUsername)
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* 星辰大海效果 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 闪烁的星星 */}
        {[...Array(50)].map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${2 + Math.random() * 4}s`,
              opacity: Math.random() * 0.8 + 0.2,
              boxShadow: `0 0 ${Math.random() * 6 + 2}px rgba(255, 255, 255, ${Math.random() * 0.5 + 0.3})`,
              filter: 'blur(0.3px)'
            }}
          ></div>
        ))}
        
        {/* 大一点的亮星 */}
        {[...Array(15)].map((_, i) => (
          <div
            key={`brightstar-${i}`}
            className="absolute rounded-full"
            style={{
              width: '4px',
              height: '4px',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `radial-gradient(circle, rgba(${Math.random() > 0.5 ? '34, 211, 238' : '163, 230, 53'}, 0.9) 0%, transparent 70%)`,
              animation: 'starTwinkle 3s ease-in-out infinite',
              animationDelay: `${Math.random() * 6}s`,
              boxShadow: `0 0 15px rgba(${Math.random() > 0.5 ? '34, 211, 238' : '163, 230, 53'}, 0.6)`,
            }}
          ></div>
        ))}
        
        {/* 流星效果 */}
        {[...Array(3)].map((_, i) => (
          <div
            key={`meteor-${i}`}
            className="absolute"
            style={{
              width: '2px',
              height: '100px',
              background: 'linear-gradient(to bottom, rgba(34, 211, 238, 0.8), transparent)',
              left: `${20 + Math.random() * 60}%`,
              top: '-100px',
              transform: 'rotate(45deg)',
              animation: 'meteor 8s linear infinite',
              animationDelay: `${Math.random() * 10}s`,
              filter: 'blur(0.5px)',
              boxShadow: '0 0 10px rgba(34, 211, 238, 0.6)'
            }}
          ></div>
        ))}
        
        {/* 宇宙尘埃效果 */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              radial-gradient(circle at 20% 80%, rgba(163, 230, 53, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(34, 211, 238, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 40% 40%, rgba(251, 146, 60, 0.08) 0%, transparent 50%)
            `,
            animation: 'nebula 25s ease-in-out infinite'
          }}></div>
        </div>
        
        {/* 远山星系 */}
        <div className="absolute inset-0 opacity-15">
          {[...Array(8)].map((_, i) => (
            <div
              key={`galaxy-${i}`}
              className="absolute rounded-full"
              style={{
                width: `${20 + Math.random() * 40}px`,
                height: `${20 + Math.random() * 40}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: `radial-gradient(ellipse, rgba(${Math.random() > 0.6 ? '34, 211, 238' : Math.random() > 0.3 ? '163, 230, 53' : '251, 146, 60'}, 0.3) 0%, transparent 70%)`,
                animation: 'galaxyFloat 20s ease-in-out infinite',
                animationDelay: `${Math.random() * 15}s`,
                filter: 'blur(1px)'
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* 科技感网格背景 */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(rgba(0, 255, 127, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 127, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px, 40px 40px, 100px 100px, 100px 100px',
          animation: 'techGrid 20s linear infinite'
        }}></div>
      </div>

      {/* 发光的科技线条 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 主要扫描线 */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" 
             style={{animation: 'scanLine 8s ease-in-out infinite'}}></div>
        <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-emerald-400/70 to-transparent" 
             style={{animation: 'scanLineVertical 12s ease-in-out infinite', animationDelay: '2s'}}></div>
        
        {/* 科技数据流 */}
        <div className="absolute top-1/4 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-300/60 via-teal-300/60 to-transparent" 
             style={{animation: 'dataFlow 6s ease-in-out infinite', animationDelay: '1s'}}></div>
        <div className="absolute bottom-1/3 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-lime-400/50 via-green-400/50 to-transparent" 
             style={{animation: 'dataFlow 10s ease-in-out infinite', animationDelay: '4s'}}></div>
        
        {/* 垂直数据流 */}
        <div className="absolute left-1/3 top-0 w-0.5 h-full bg-gradient-to-b from-transparent via-yellow-400/45 via-orange-400/45 to-transparent" 
             style={{animation: 'dataFlowVertical 15s ease-in-out infinite', animationDelay: '3s'}}></div>
        <div className="absolute right-1/4 top-0 w-0.5 h-full bg-gradient-to-b from-transparent via-cyan-400/40 via-blue-400/40 to-transparent" 
             style={{animation: 'dataFlowVertical 8s ease-in-out infinite', animationDelay: '6s'}}></div>
      </div>

      {/* 科技感装饰元素 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 发光圆点 */}
        <div className="absolute top-16 right-20 w-3 h-3 bg-cyan-400/80 rounded-full" 
             style={{animation: 'techPulse 3s ease-in-out infinite', boxShadow: '0 0 25px rgba(34, 211, 238, 0.6)'}}></div>
        <div className="absolute bottom-20 left-16 w-2 h-2 bg-lime-400/90 rounded-full" 
             style={{animation: 'techPulse 4s ease-in-out infinite', animationDelay: '1s', boxShadow: '0 0 20px rgba(163, 230, 53, 0.7)'}}></div>
        <div className="absolute top-1/3 left-1/5 w-2.5 h-2.5 bg-orange-400/80 rounded-full" 
             style={{animation: 'techPulse 5s ease-in-out infinite', animationDelay: '2.5s', boxShadow: '0 0 22px rgba(251, 146, 60, 0.6)'}}></div>
        
        {/* 科技方块 */}
        <div className="absolute bottom-1/4 right-1/5 w-4 h-4 border border-cyan-400/70 bg-cyan-400/20" 
             style={{animation: 'techRotate 6s linear infinite', transform: 'rotate(45deg)'}}></div>
        <div className="absolute top-3/4 right-1/3 w-3 h-3 border border-emerald-400/60 bg-emerald-400/15" 
             style={{animation: 'techRotate 8s linear infinite reverse', transform: 'rotate(45deg)', animationDelay: '2s'}}></div>
        
        {/* 科技三角形 */}
        <div className="absolute top-1/2 left-8 w-0 h-0" 
             style={{
               borderLeft: '8px solid transparent',
               borderRight: '8px solid transparent', 
               borderBottom: '12px solid rgba(34, 211, 238, 0.5)',
               animation: 'techFloat 7s ease-in-out infinite',
               filter: 'drop-shadow(0 0 15px rgba(34, 211, 238, 0.5))'
             }}></div>
        <div className="absolute bottom-1/2 right-8 w-0 h-0" 
             style={{
               borderLeft: '6px solid transparent',
               borderRight: '6px solid transparent',
               borderTop: '10px solid rgba(163, 230, 53, 0.6)',
               animation: 'techFloat 9s ease-in-out infinite',
               animationDelay: '3s',
               filter: 'drop-shadow(0 0 12px rgba(163, 230, 53, 0.5))'
             }}></div>
      </div>

      {/* 科技光环效果 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full border border-cyan-400/40" 
             style={{animation: 'techRing 12s linear infinite'}}></div>
        <div className="absolute bottom-1/3 right-1/3 w-24 h-24 rounded-full border border-lime-400/35" 
             style={{animation: 'techRing 15s linear infinite reverse', animationDelay: '4s'}}></div>
        <div className="absolute top-2/3 left-2/3 w-20 h-20 rounded-full border border-orange-400/30" 
             style={{animation: 'techRing 10s linear infinite', animationDelay: '8s'}}></div>
      </div>

      <div className="relative z-10 w-full max-w-96 transform transition-all duration-700 hover:scale-105">
        <div className="bg-slate-800/40 backdrop-blur-3xl rounded-3xl border border-white/10 p-14 relative overflow-hidden group shadow-2xl">
          {/* 多层渐变背景 */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-purple-900/20 to-slate-900/40 rounded-3xl"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-800/20 via-transparent to-violet-800/25 rounded-3xl"></div>
          <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-emerald-900/10 to-cyan-900/15 rounded-3xl"></div>
          
          {/* 顶部彩虹线 */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 via-purple-400 via-cyan-400 via-emerald-400 to-blue-400 rounded-t-3xl opacity-80"></div>
          
          {/* 动态边框光效 */}
          <div className="absolute inset-0 rounded-3xl">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-indigo-400/20 via-purple-500/30 via-cyan-500/25 to-blue-500/20 opacity-60 group-hover:opacity-90 transition-opacity duration-700"></div>
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-bl from-emerald-400/15 via-teal-400/20 to-blue-400/15 opacity-40 group-hover:opacity-70 transition-opacity duration-700 delay-200"></div>
          </div>
          
          {/* 内部装饰光点 */}
          <div className="absolute top-6 right-6 w-3 h-3 bg-indigo-400/80 rounded-full animate-pulse shadow-lg"></div>
          <div className="absolute bottom-6 left-6 w-2 h-2 bg-purple-400/80 rounded-full animate-pulse delay-1000 shadow-lg"></div>
          <div className="absolute top-8 left-8 w-1.5 h-1.5 bg-cyan-400/70 rounded-full animate-pulse delay-500 shadow-md"></div>
          <div className="absolute bottom-8 right-8 w-2.5 h-2.5 bg-emerald-400/70 rounded-full animate-pulse delay-1500 shadow-lg"></div>
          
          {/* 流动光效 */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <div className="absolute w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-2000 ease-out"></div>
          </div>
          
          <div className="relative z-10">
            {/* Logo和标题 - 增强版 */}
            <div className="text-center mb-10">
              {/* Logo和标题的水平布局 */}
              <div className="flex items-center justify-center mb-4 space-x-6">
                {/* Logo光晕效果 */}
                <div className="relative w-16 h-16 flex-shrink-0">
                  <div className="absolute -inset-2 bg-gradient-to-tr from-blue-400/40 via-violet-400/35 to-emerald-400/25 rounded-full blur-lg animate-pulse delay-500 opacity-60"></div>
                  <div className="relative w-full h-full bg-gradient-to-br from-indigo-500 via-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl border border-white/30">
                    <svg className="w-8 h-8 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                </div>
                
                {/* 产品鸭标题 */}
                <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-blue-100 via-purple-100 to-cyan-100 bg-clip-text text-transparent tracking-wide drop-shadow-lg">产品鸭</h1>
              </div>
              <p className="text-white/90 text-lg mb-8 font-medium tracking-wide drop-shadow-md">🚀 智能竞品分析平台</p>
              <div className="flex justify-center space-x-2 mb-4">
                <div className="w-20 h-1 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full"></div>
                <div className="w-12 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></div>
                <div className="w-16 h-1 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full"></div>
              </div>
            </div>

            {/* 条件渲染：登录或注册表单 */}
            {!isRegisterMode ? (
                <>
                {/* 登录表单 */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        required
                        className="login-input w-full pl-10 pr-4 py-4 bg-white/15 border border-white/30 rounded-2xl text-white placeholder-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-400/50 focus:bg-white/20 transition-all duration-500 backdrop-blur-xl shadow-xl hover:shadow-2xl hover:bg-white/18 hover:border-white/40"
                        placeholder="用户名"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        type="password"
                        required
                        className="login-input w-full pl-10 pr-4 py-4 bg-white/15 border border-white/30 rounded-2xl text-white placeholder-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-400/50 focus:bg-white/20 transition-all duration-500 backdrop-blur-xl shadow-xl hover:shadow-2xl hover:bg-white/18 hover:border-white/40"
                        placeholder="密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-200 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 via-cyan-500 to-blue-500 hover:from-indigo-600 hover:via-purple-600 hover:via-cyan-600 hover:to-blue-600 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-indigo-400/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-2xl relative overflow-hidden group"
                  >
                    {/* 增强的按钮光效 */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 via-cyan-200/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1200 ease-out"></div>
                    <div className="absolute inset-0 bg-gradient-to-l from-transparent via-indigo-200/15 to-transparent transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-1000 ease-out delay-200"></div>
                    <div className="relative z-10 flex items-center justify-center">
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="text-lg">登录中...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-lg font-bold tracking-wide">✨ 立即登录</span>
                          <svg className="w-6 h-6 ml-3 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </>
                      )}
                    </div>
                  </button>
                </form>
                
                {/* 注册入口 */}
                <div className="text-center mt-6">
                  <p className="text-white/70 text-sm">
                    还没有账户？
                    <button
                      type="button"
                      onClick={() => {
                          setIsRegisterMode(true)
                          setError('')
                          setUsername('')
                          setPassword('')
                          setEmail('')
                          setConfirmPassword('')
                        }}
                      className="text-blue-300 hover:text-blue-200 ml-1 underline transition-colors duration-200"
                    >
                      立即注册
                    </button>
                  </p>
                </div>
              </>
            ) : (
              <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20 hover:scrollbar-thumb-white/30">
                <>
                {/* 注册表单 */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        required
                        className="login-input w-full pl-10 pr-4 py-4 bg-white/15 border border-white/30 rounded-2xl text-white placeholder-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-400/50 focus:bg-white/20 transition-all duration-500 backdrop-blur-xl shadow-xl hover:shadow-2xl hover:bg-white/18 hover:border-white/40"
                        placeholder="用户名"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                      </div>
                      <input
                        type="email"
                        required
                        className="login-input w-full pl-10 pr-4 py-4 bg-white/15 border border-white/30 rounded-2xl text-white placeholder-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-400/50 focus:bg-white/20 transition-all duration-500 backdrop-blur-xl shadow-xl hover:shadow-2xl hover:bg-white/18 hover:border-white/40"
                        placeholder="邮箱"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        type="password"
                        required
                        className="login-input w-full pl-10 pr-4 py-4 bg-white/15 border border-white/30 rounded-2xl text-white placeholder-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-400/50 focus:bg-white/20 transition-all duration-500 backdrop-blur-xl shadow-xl hover:shadow-2xl hover:bg-white/18 hover:border-white/40"
                        placeholder="密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <input
                        type="password"
                        required
                        className="login-input w-full pl-10 pr-4 py-4 bg-white/15 border border-white/30 rounded-2xl text-white placeholder-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-400/50 focus:bg-white/20 transition-all duration-500 backdrop-blur-xl shadow-xl hover:shadow-2xl hover:bg-white/18 hover:border-white/40"
                        placeholder="确认密码"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-200 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 via-cyan-500 to-blue-500 hover:from-indigo-600 hover:via-purple-600 hover:via-cyan-600 hover:to-blue-600 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-indigo-400/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-2xl relative overflow-hidden group"
                  >
                    {/* 增强的按钮光效 */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 via-cyan-200/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1200 ease-out"></div>
                    <div className="absolute inset-0 bg-gradient-to-l from-transparent via-indigo-200/15 to-transparent transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-1000 ease-out delay-200"></div>
                    <div className="relative z-10 flex items-center justify-center">
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="text-lg">注册中...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-lg font-bold tracking-wide">🚀 立即注册</span>
                          <svg className="w-6 h-6 ml-3 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </>
                      )}
                    </div>
                  </button>
                </form>
                
                {/* 登录入口 */}
                <div className="text-center mt-6">
                  <p className="text-white/70 text-sm">
                    已有账户？
                    <button
                      type="button"
                      onClick={() => {
                         setIsRegisterMode(false)
                         setError('')
                         setUsername('')
                         setPassword('')
                         setEmail('')
                         setConfirmPassword('')
                       }}
                      className="text-blue-300 hover:text-blue-200 ml-1 underline transition-colors duration-200"
                    >
                      立即登录
                    </button>
                  </p>
                </div>
                </>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [competitors, setCompetitors] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(() => {
    return localStorage.getItem('selectedCategory') || '产品路线图'
  })
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedCompetitor, setSelectedCompetitor] = useState(() => {
    const saved = localStorage.getItem('selectedCompetitor')
    return saved ? JSON.parse(saved) : null
  })
  const [showDetailPage, setShowDetailPage] = useState(() => {
    return localStorage.getItem('showDetailPage') === 'true'
  })
  const [currentProductId, setCurrentProductId] = useState(null)
  const [currentProduct, setCurrentProduct] = useState(null)
  const [userProducts, setUserProducts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true'
  })
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('username') || ''
  })

  // 检查URL中是否有邀请token
  const urlParams = new URLSearchParams(window.location.search)
  const invitationToken = urlParams.get('invitation')

  // 当selectedCategory改变时，保存到localStorage
  useEffect(() => {
    localStorage.setItem('selectedCategory', selectedCategory)
  }, [selectedCategory])

  const [isLoadingProducts, setIsLoadingProducts] = useState(false)

  useEffect(() => {
    if (isLoggedIn && currentUser) {
      loadUserProducts()
    }
  }, [isLoggedIn, currentUser])

  useEffect(() => {
    if (showDetailPage && !selectedCompetitor) {
      setShowDetailPage(false)
      localStorage.removeItem('showDetailPage')
      localStorage.removeItem('selectedCompetitor')
    }
  }, [showDetailPage, selectedCompetitor])

  const handleLogin = (username) => {
    setIsLoggedIn(true)
    setCurrentUser(username)
  }

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('username')
    localStorage.removeItem('token')
    localStorage.removeItem('showDetailPage')
    localStorage.removeItem('selectedCompetitor')
    setIsLoggedIn(false)
    setCurrentUser('')
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
    loadCompetitors(product.id)
  }

  // 处理添加产品
  const handleAddProduct = async (productData, editId = null) => {
    try {
      if (editId) {
        alert('暂未实现产品更新，后续由 Supabase 行级安全下完成')
      } else {
        await apiAddProduct({ name: productData.name, description: productData.description, website: productData.website, logo: productData.logo })
        await loadUserProducts()
        alert('产品创建成功！')
      }
    } catch (error) {
      console.error(editId ? '更新产品失败:' : '创建产品失败:', error)
      alert(editId ? '更新产品失败，请检查网络连接' : '创建产品失败，请检查网络连接')
    }
  }

  // 加载用户产品列表
  const loadUserProducts = async () => {
    if (isLoadingProducts) return
    setIsLoadingProducts(true)
    try {
      console.time('loadUserProducts')
      let products = []
      try {
        const user = await apiGetUser()
        const cacheKey = user?.id ? `products_cache_user_${user.id}` : 'products_cache'
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setUserProducts(parsed)
          }
        }
        products = await getProducts()
        if (Array.isArray(products)) {
          localStorage.setItem(cacheKey, JSON.stringify(products))
        }
      } catch {
        products = await getProducts()
      }
      if (products.length > 0) {
        setUserProducts(products)
        const firstProduct = products[0]
        setCurrentProduct(firstProduct)
        setCurrentProductId(firstProduct.id)
        loadCompetitors(firstProduct.id)
      }
      console.timeEnd('loadUserProducts')
    } catch (error) {
      console.error('加载产品列表失败:', error)
    } finally {
      setIsLoadingProducts(false)
    }
  }

  // 加载竞品数据
  const loadCompetitors = async (productId) => {
    if (!productId) return
    
    try {
      setIsLoading(true)
      const cacheKey = `competitors_cache_product_${productId}`
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCompetitors(parsed)
        }
      }
      const data = await apiGetCompetitors(productId)
      if (Array.isArray(data)) {
        localStorage.setItem(cacheKey, JSON.stringify(data))
      }
      setCompetitors(data)
    } catch (error) {
      console.error('加载竞品数据失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCompetitor = async (newCompetitor) => {
    console.log('handleAddCompetitor被调用，数据:', newCompetitor)
    if (!currentProductId) {
      alert('请先选择一个产品')
      return
    }

    try {
      setIsLoading(true)
      await apiAddCompetitor(currentProductId, newCompetitor)
      await loadCompetitors(currentProductId)
      setIsAddModalOpen(false)
      alert('竞品添加成功！')
    } catch (error) {
      console.error('添加竞品失败:', error)
      alert('添加竞品失败，请检查网络连接')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCompetitor = (id) => {
    setCompetitors(competitors.filter(comp => comp.id !== id))
  }

  const handleViewCompetitorDetail = (competitor) => {
    setSelectedCompetitor(competitor)
    setShowDetailPage(true)
    // 保存状态到localStorage
    localStorage.setItem('selectedCompetitor', JSON.stringify(competitor))
    localStorage.setItem('showDetailPage', 'true')
  }

  const handleBackToList = () => {
    setShowDetailPage(false)
    setSelectedCompetitor(null)
    // 清除localStorage中的状态
    localStorage.removeItem('showDetailPage')
    localStorage.removeItem('selectedCompetitor')
  }

  const filteredCompetitors = competitors.filter(competitor => {
    const matchesSearch = (competitor.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (competitor.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === '全部' || selectedCategory === '竞品管理' || competitor.category === selectedCategory
    console.log('Filtering competitor:', competitor.name, 'matchesSearch:', matchesSearch, 'matchesCategory:', matchesCategory, 'selectedCategory:', selectedCategory)
    return matchesSearch && matchesCategory
  })
  
  console.log('Filtered competitors:', filteredCompetitors.length, 'out of', competitors.length)

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />
  }

  // 如果URL中有邀请token，显示邀请页面
  if (invitationToken) {
    return <InvitationPage token={invitationToken} onLogin={handleLogin} />
  }

  // 如果显示详情页面，则渲染详情页面
  if (showDetailPage && selectedCompetitor) {
    return (
      <NewCompetitorDetailPage 
        competitor={selectedCompetitor}
        onBack={handleBackToList}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        currentUser={currentUser}
        onLogout={handleLogout}
        currentProduct={currentProduct}
        userProducts={userProducts}
        onProductChange={handleProductChange}
        onAddProduct={handleAddProduct}
      />
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        onAddCompetitor={() => setIsAddModalOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        currentProduct={currentProduct}
        userProducts={userProducts}
        onProductChange={handleProductChange}
        onAddProduct={handleAddProduct}
        isLoadingProducts={isLoadingProducts}
      />
      
      <main className={`${selectedCategory === '产品路线图' ? 'flex-1 bg-gray-50 p-4 overflow-y-auto' : 'flex-1 bg-gray-50 p-4 overflow-hidden'}`}>
        <div className={`${selectedCategory === '产品路线图' ? 'bg-white rounded-xl shadow-sm min-h-full overflow-visible' : 'bg-white rounded-xl shadow-sm h-full overflow-hidden'}`}>
        {selectedCategory === '竞品管理' ? (
          <CompetitorList 
            competitors={filteredCompetitors}
            currentProduct={currentProduct}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onViewDetail={handleViewCompetitorDetail}
            onAddCompetitor={() => setIsAddModalOpen(true)}
          />
        ) : selectedCategory === '产品路线图' ? (
          <RoadmapPage currentProduct={currentProduct} />
        ) : selectedCategory === '团队成员' ? (
          <TeamMemberPage currentProduct={currentProduct} />
        ) : selectedCategory === '内容规划' ? (
          <ContentPlanningPage currentProduct={currentProduct} />
        ) : selectedCategory === '平台Logo测试' ? (
          <PlatformLogoTest />
        ) : selectedCategory === '产品资料管理' ? (
          <ProductDataManager currentProduct={currentProduct} />
        ) : (
          <CompetitorList 
            competitors={filteredCompetitors}
            currentProduct={currentProduct}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onViewDetail={handleViewCompetitorDetail}
            onAddCompetitor={() => setIsAddModalOpen(true)}
          />
        )}
        </div>
      </main>

      {isAddModalOpen && (
        <AddCompetitorModal 
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddCompetitor}
        />
      )}

      {selectedCompetitor && (
        <CompetitorDetailModal 
          competitor={selectedCompetitor}
          onClose={() => setSelectedCompetitor(null)}
        />
      )}
    </div>
  )
}

export default App
