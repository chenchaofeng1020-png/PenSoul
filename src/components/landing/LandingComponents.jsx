import React, { useState } from 'react';
import { Menu, X, ArrowRight, CheckCircle, BarChart2, Layers, Calendar, Users, Target } from 'lucide-react';

export const Navbar = ({ onLoginClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-sky-500 rounded-lg flex items-center justify-center text-white">
                <svg className="w-5 h-5" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M75 55C75 74.33 59.33 90 40 90C20.67 90 5 74.33 5 55C5 35.67 20.67 20 40 20C50 20 58.5 24 65 30" stroke="white" strokeWidth="8" strokeLinecap="round"/>
                   <path d="M65 30C75 30 85 35 85 45C85 50 80 55 75 55" stroke="white" strokeWidth="8" strokeLinecap="round"/>
                   <path d="M85 45H95" stroke="white" strokeWidth="8" strokeLinecap="round"/>
                   <circle cx="45" cy="45" r="6" fill="white"/>
                </svg>
              </div>
              <span className="font-bold text-xl text-slate-900">Product Duck</span>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#about" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">关于我们</a>
            <button 
              onClick={onLoginClick}
              className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
            >
              登录
            </button>
            <button 
              onClick={onLoginClick}
              className="bg-blue-600 text-white px-5 py-2 rounded-full font-medium hover:bg-blue-700 transition-all hover:shadow-lg hover:shadow-blue-500/30 active:scale-95"
            >
              免费开始
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 shadow-lg">
          <div className="px-4 pt-2 pb-6 space-y-2">
            <a href="#about" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md" onClick={() => setIsMenuOpen(false)}>关于我们</a>
            <div className="pt-4 flex flex-col space-y-3">
              <button 
                onClick={() => { onLoginClick(); setIsMenuOpen(false); }}
                className="w-full text-center px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md border border-gray-200"
              >
                登录
              </button>
              <button 
                onClick={() => { onLoginClick(); setIsMenuOpen(false); }}
                className="w-full text-center px-3 py-2 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-md"
              >
                免费注册
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export const HeroSection = ({ onLoginClick }) => {
  return (
    <div className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-3xl opacity-60 mix-blend-multiply animate-blob" />
        <div className="absolute top-40 -left-20 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl opacity-60 mix-blend-multiply animate-blob animation-delay-2000" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-8 animate-fade-in-up">
          <span className="flex h-2 w-2 relative mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          从创意到增长
        </div>
        
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-tight">
          构建不仅好用<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-600">而且好卖的产品</span>
        </h1>
        
        <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-600 mb-10 leading-relaxed">
          告别混乱的文档与表格。在一个地方管理你的<span className="font-semibold text-slate-800">产品定义</span>、<span className="font-semibold text-slate-800">竞品分析</span>和<span className="font-semibold text-slate-800">营销计划</span>。让产品与市场无缝连接。
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16">
          <button 
            onClick={onLoginClick}
            className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-xl shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group"
          >
            免费开始使用
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={() => window.location.href = '#features'}
            className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-lg hover:bg-slate-50 hover:border-slate-300 transition-all duration-300"
          >
            了解更多
          </button>
        </div>

        {/* Product-to-Marketing Workflow Mockup */}
        <div className="relative max-w-5xl mx-auto mt-12 rounded-2xl p-2 bg-gradient-to-b from-slate-200/50 to-white/50 border border-slate-200/60 shadow-2xl backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-sky-500/5 rounded-2xl" />
          <div className="relative rounded-xl overflow-hidden bg-white shadow-inner border border-slate-100 aspect-[16/10] flex flex-col">
             {/* Header */}
             <div className="h-12 border-b border-slate-100 flex items-center px-4 justify-between bg-slate-50/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                   <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                      <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                   </div>
                   <div className="h-4 w-px bg-slate-300 mx-1"></div>
                   <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      <span className="text-slate-400">项目</span>
                      <span className="text-slate-300">/</span>
                      <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">工作流</span>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                      实时同步
                   </div>
                </div>
             </div>
             
             {/* Main Workflow Area */}
             <div className="flex-1 bg-slate-50 p-6 flex items-center justify-center relative overflow-hidden">
                {/* Background Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                
                <div className="flex items-center gap-4 w-full max-w-3xl relative z-10 px-4">
                    
                    {/* Left: Product Features (Source) */}
                    <div className="flex-1 bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 p-4 flex flex-col gap-3 relative group transition-all hover:-translate-y-1 hover:shadow-xl">
                         <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-1">
                             <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <span className="text-lg">📦</span> 产品功能规划
                             </div>
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                         </div>
                         
                         {/* Feature Item (Active) */}
                         <div className="p-3 rounded-lg border-2 border-blue-500 bg-blue-50/30 shadow-sm relative">
                             <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rotate-45 border-r border-t border-white"></div>
                             <div className="flex items-center justify-between mb-1">
                                <div className="font-bold text-sm text-slate-800">AI 智能分析</div>
                                <div className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">核心</div>
                             </div>
                             <div className="text-[10px] text-slate-500 line-clamp-2">
                                针对用户留存指标，自动生成深度洞察报告。
                             </div>
                         </div>

                         {/* Feature Item (Inactive) */}
                         <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 opacity-60">
                             <div className="flex justify-between mb-2">
                                <div className="h-4 w-24 bg-slate-200 rounded"></div>
                             </div>
                             <div className="h-2 w-full bg-slate-200 rounded"></div>
                         </div>
                    </div>

                    {/* Center: The "Bridge" Animation */}
                    <div className="flex flex-col items-center justify-center gap-3 w-16 md:w-32 shrink-0">
                        <div className="relative w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-[shimmer_2s_infinite_linear]"></div>
                        </div>
                        
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-600 flex items-center justify-center text-white shadow-xl shadow-blue-200 transform hover:scale-110 transition-transform">
                            <span className="text-xl">✨</span>
                        </div>
                        
                        <div className="text-[10px] font-bold text-blue-600 text-center bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                            AI 一键生成
                        </div>

                        <div className="relative w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                             <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-sky-500 to-transparent animate-[shimmer_2s_infinite_linear] delay-100"></div>
                        </div>
                    </div>

                    {/* Right: Marketing Content (Output) */}
                    <div className="flex-1 bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 p-4 flex flex-col gap-3 transition-all hover:-translate-y-1 hover:shadow-xl">
                         <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-1">
                             <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <span className="text-lg">📣</span> 内容营销计划
                             </div>
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                         </div>
                         
                         {/* Generated Item 1: Twitter */}
                         <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-sm hover:border-sky-300 transition-colors cursor-pointer group/item">
                             <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded bg-sky-100 text-sky-600 flex items-center justify-center text-xs">🐦</div>
                                <div className="text-xs font-bold text-slate-700 group-hover/item:text-sky-600">社媒推广文案</div>
                             </div>
                             <div className="space-y-1.5">
                                <div className="h-2 w-full bg-slate-100 rounded"></div>
                                <div className="h-2 w-3/4 bg-slate-100 rounded"></div>
                             </div>
                             <div className="mt-2 flex gap-1">
                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded">#数据分析</span>
                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded">#效率工具</span>
                             </div>
                         </div>

                         {/* Generated Item 2: Blog */}
                         <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-sm hover:border-orange-300 transition-colors cursor-pointer group/item">
                             <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded bg-orange-100 text-orange-600 flex items-center justify-center text-xs">📝</div>
                                <div className="text-xs font-bold text-slate-700 group-hover/item:text-orange-600">深度博客文章</div>
                             </div>
                             <div className="space-y-1.5">
                                <div className="h-2 w-full bg-slate-100 rounded"></div>
                                <div className="h-2 w-2/3 bg-slate-100 rounded"></div>
                             </div>
                         </div>
                    </div>
                    
                </div>
             </div>
             
             {/* Overlay Text for Mobile */}
             <div className="absolute inset-0 flex items-center justify-center bg-black/5 md:bg-transparent md:hidden">
                 <p className="text-slate-500 font-medium bg-white/90 px-4 py-2 rounded-full shadow-sm">桌面端预览</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FeatureSection = () => {
  const features = [
    {
      id: 'definition',
      title: '深度产品定义',
      desc: '结构化梳理你的产品思维。从愿景、Slogan 到用户画像与痛点，确保团队对产品价值主张的理解高度一致，不再迷失方向。',
      icon: <Target className="w-6 h-6 text-white" />,
      color: 'bg-blue-500',
      align: 'left'
    },
    {
      id: 'competitor',
      title: '竞品情报追踪',
      desc: '知己知彼，百战不殆。建立专属的竞品情报库，系统化记录竞品截图、优势劣势与差异化分析，随时调阅对比，寻找突破口。',
      icon: <BarChart2 className="w-6 h-6 text-white" />,
      color: 'bg-blue-500',
      align: 'right'
    },
    {
      id: 'marketing',
      title: '营销内容日历',
      desc: '让功能直接转化为卖点。关联产品特性生成营销灵感，通过可视化的内容日历规划多渠道发布计划，让产品发布井井有条。',
      icon: <Calendar className="w-6 h-6 text-white" />,
      color: 'bg-sky-500',
      align: 'left'
    }
  ];

  return (
    <div id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-base font-bold text-blue-600 tracking-wide uppercase mb-2">核心功能</h2>
          <p className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">全生命周期的产品管理工具</p>
          <p className="text-lg text-slate-600">从最初的一个想法，到最终推向市场，Product Duck 陪你走过每一步。</p>
        </div>

        <div className="space-y-24">
          {features.map((feature, index) => (
            <div key={feature.id} className={`flex flex-col md:flex-row gap-12 items-center ${feature.align === 'right' ? 'md:flex-row-reverse' : ''}`}>
              {/* Text Content */}
              <div className="flex-1 space-y-6">
                <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center shadow-lg shadow-blue-500/20`}>
                  {feature.icon}
                </div>
                <h3 className="text-3xl font-bold text-slate-900">{feature.title}</h3>
                <p className="text-lg text-slate-600 leading-relaxed">
                  {feature.desc}
                </p>
                <ul className="space-y-3 pt-2">
                  {[1, 2, 3].map((item) => (
                    <li key={item} className="flex items-center text-slate-700">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span>{
                        feature.id === 'definition' ? 
                          ['用户画像管理 (Personas)', '价值主张画布', '电梯演讲生成器'][item-1] :
                        feature.id === 'competitor' ?
                          ['竞品截图墙', 'SWOT 分析', '功能对比矩阵'][item-1] :
                          ['营销卖点提炼', '多渠道发布计划', 'AI 文案辅助'][item-1]
                      }</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Image / Visual */}
              <div className="flex-1 w-full">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-100 bg-slate-50 aspect-[4/3] group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-500/5 transition-opacity group-hover:opacity-0" />
                  
                  {/* Abstract UI representation for each feature */}
                  <div className="w-full h-full p-8 flex items-center justify-center">
                    {feature.id === 'definition' && (
                        <div className="w-full h-full bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden flex flex-col items-center justify-center">
                           <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
                           {/* User Persona Card */}
                           <div className="w-48 bg-white border border-slate-100 shadow-lg rounded-xl p-4 transform rotate-[-6deg] mb-[-20px] z-10">
                               <div className="flex items-center gap-3 mb-3">
                                   <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">👤</div>
                                   <div>
                                       <div className="w-20 h-2 bg-slate-800 rounded mb-1"></div>
                                       <div className="w-12 h-1.5 bg-slate-300 rounded"></div>
                                   </div>
                               </div>
                               <div className="space-y-2">
                                   <div className="w-full h-1.5 bg-slate-100 rounded"></div>
                                   <div className="w-full h-1.5 bg-slate-100 rounded"></div>
                                   <div className="w-3/4 h-1.5 bg-slate-100 rounded"></div>
                               </div>
                           </div>
                           
                           {/* Value Prop Canvas */}
                           <div className="w-64 bg-white border border-slate-200 shadow-md rounded-xl p-4 transform rotate-[3deg] z-0">
                               <div className="flex justify-between items-center mb-4">
                                   <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-50 flex items-center justify-center text-blue-500 text-xs">🎁</div>
                                   <div className="w-8 h-1 bg-slate-200 rounded"></div>
                                   <div className="w-8 h-8 rounded-full border-2 border-green-500 bg-green-50 flex items-center justify-center text-green-500 text-xs">😊</div>
                               </div>
                               <div className="grid grid-cols-2 gap-2">
                                   <div className="h-16 bg-blue-50 rounded border border-blue-100"></div>
                                   <div className="h-16 bg-green-50 rounded border border-green-100"></div>
                               </div>
                           </div>
                        </div>
                    )}
                    {feature.id === 'competitor' && (
                        <div className="w-full h-full bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden flex flex-col">
                           <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
                           <div className="flex items-center justify-between mb-6">
                               <div className="font-bold text-slate-700">竞品对比矩阵</div>
                               <div className="flex gap-2">
                                   <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                   <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                               </div>
                           </div>
                           <div className="flex-1 flex items-end justify-between gap-4 px-2">
                               {[
                                   { label: '我们', v1: 90, v2: 0 },
                                   { label: '竞品A', v1: 45, v2: 0 },
                                   { label: '竞品B', v1: 60, v2: 0 },
                                   { label: '竞品C', v1: 30, v2: 0 },
                               ].map((item, i) => (
                                   <div key={i} className="flex flex-col items-center gap-2 w-full">
                                       <div className="w-full relative h-32 flex items-end justify-center">
                                           <div className={`w-full rounded-t-sm transition-all duration-1000 ${i === 0 ? 'bg-blue-500' : 'bg-slate-200'}`} style={{height: `${item.v1}%`}}>
                                                {i === 0 && <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] px-2 py-1 rounded shadow-sm whitespace-nowrap">遥遥领先</div>}
                                           </div>
                                       </div>
                                       <div className="text-xs text-slate-400 font-medium">{item.label}</div>
                                   </div>
                               ))}
                           </div>
                        </div>
                    )}
                    {feature.id === 'marketing' && (
                         <div className="w-full h-full bg-white rounded-xl shadow-sm border border-slate-200 p-4 relative overflow-hidden flex flex-col">
                             <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-sky-400 to-sky-600"></div>
                             <div className="flex items-center justify-between mb-4">
                                 <div className="text-sm font-bold text-slate-700">营销日历</div>
                                 <div className="w-20 h-6 bg-slate-100 rounded-md"></div>
                             </div>
                             <div className="grid grid-cols-7 gap-1 h-full">
                                 {['一','二','三','四','五','六','日'].map((d, i) => (
                                     <div key={i} className="text-center text-[10px] text-slate-400 font-medium mb-1">{d}</div>
                                 ))}
                                 {Array.from({length: 28}).map((_, i) => (
                                     <div key={i} className={`rounded border relative group transition-all hover:scale-105 ${[3, 8, 15, 17, 22, 24].includes(i) ? 'bg-sky-50 border-sky-100' : 'bg-white border-slate-50'}`}>
                                         <div className="absolute top-0.5 left-1 text-[8px] text-slate-300">{i + 1}</div>
                                         {[3, 8, 15, 17, 22, 24].includes(i) && (
                                             <div className="w-full h-full flex flex-col items-center justify-center pt-2">
                                                 <div className={`w-3 h-3 rounded-full ${[3, 15, 24].includes(i) ? 'bg-blue-400' : [8, 22].includes(i) ? 'bg-pink-400' : 'bg-sky-400'} mb-1`}></div>
                                             </div>
                                         )}
                                     </div>
                                 ))}
                             </div>
                             
                             {/* Floating Card */}
                             <div className="absolute bottom-4 right-4 bg-white shadow-lg border border-slate-100 rounded-lg p-3 w-40 animate-bounce-slow">
                                 <div className="flex items-center gap-2 mb-2">
                                     <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                     <div className="text-xs text-slate-600 font-medium">准备发布</div>
                                 </div>
                                 <div className="w-full h-2 bg-slate-100 rounded mb-1"></div>
                                 <div className="w-2/3 h-2 bg-slate-100 rounded"></div>
                             </div>
                         </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4 text-white">
                <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-sky-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                       <path d="M75 55C75 74.33 59.33 90 40 90C20.67 90 5 74.33 5 55C5 35.67 20.67 20 40 20C50 20 58.5 24 65 30" stroke="white" strokeWidth="8" strokeLinecap="round"/>
                       <circle cx="45" cy="45" r="6" fill="white"/>
                    </svg>
                </div>
                <span className="font-bold text-xl">Product Duck</span>
            </div>
            <p className="text-sm text-slate-400">
              构建不仅好用，而且好卖的产品。
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-4">产品</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">功能特性</a></li>
              <li><a href="#" className="hover:text-white transition-colors">解决方案</a></li>
              <li><a href="#" className="hover:text-white transition-colors">更新日志</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-4">资源</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">博客</a></li>
              <li><a href="#" className="hover:text-white transition-colors">社区</a></li>
              <li><a href="#" className="hover:text-white transition-colors">帮助中心</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-4">公司</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">关于我们</a></li>
              <li><a href="#" className="hover:text-white transition-colors">联系方式</a></li>
              <li><a href="#" className="hover:text-white transition-colors">隐私政策</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Product Duck. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            {/* Social Icons Placeholder */}
            <span className="cursor-pointer hover:text-white">Twitter</span>
            <span className="cursor-pointer hover:text-white">GitHub</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
