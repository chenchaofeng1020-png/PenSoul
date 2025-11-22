import { useState, useEffect, lazy, Suspense } from 'react'
import { X, Lightbulb, Clock, Globe, ChevronDown } from 'lucide-react'
const RichTextEditorLazy = lazy(() => import('./RichTextEditor'))
import { PLATFORMS } from '../constants/platforms'

// 预设内容主题数据
const CONTENT_THEMES = {
  'beauty': [
    { id: 1, title: '产品试用分享', platforms: ['xiaohongshu', 'douyin'], timeSlots: ['20:00-22:00'], contentType: 'video', description: '真实体验产品效果，适合视觉化展示' },
    { id: 2, title: '化妆教程步骤', platforms: ['xiaohongshu', 'bilibili'], timeSlots: ['14:00-16:00'], contentType: 'image', description: '详细的化妆步骤教学，适合长图文' },
    { id: 3, title: '成分科普解析', platforms: ['wechat_mp', 'zhihu'], timeSlots: ['12:00-13:00'], contentType: 'article', description: '专业成分分析，适合深度内容' },
    { id: 4, title: '用户前后对比', platforms: ['douyin', 'weibo'], timeSlots: ['19:00-21:00'], contentType: 'video', description: '用户使用前后效果对比' }
  ],
  'saas': [
    { id: 5, title: '产品功能更新', platforms: ['wechat_mp', 'weibo'], timeSlots: ['10:00-11:00'], contentType: 'article', description: '新功能介绍和使用说明' },
    { id: 6, title: '客户成功案例', platforms: ['wechat_mp', 'xiaohongshu'], timeSlots: ['14:00-15:00'], contentType: 'article', description: '客户使用效果和反馈分享' },
    { id: 7, title: '行业趋势解读', platforms: ['zhihu', 'wechat_mp'], timeSlots: ['21:00-22:00'], contentType: 'article', description: '行业分析和趋势预测' },
    { id: 8, title: '使用技巧分享', platforms: ['douyin', 'bilibili'], timeSlots: ['20:00-21:00'], contentType: 'video', description: '产品使用技巧和最佳实践' }
  ],
  'food': [
    { id: 9, title: '菜品制作过程', platforms: ['douyin', 'xiaohongshu'], timeSlots: ['18:00-19:00'], contentType: 'video', description: '美食制作过程展示' },
    { id: 10, title: '店铺环境展示', platforms: ['xiaohongshu', 'weibo'], timeSlots: ['11:00-12:00'], contentType: 'image', description: '餐厅环境和氛围展示' },
    { id: 11, title: '顾客用餐反馈', platforms: ['xiaohongshu', 'douyin'], timeSlots: ['12:30-13:30'], contentType: 'video', description: '顾客真实用餐体验和评价' },
    { id: 12, title: '特色菜品推荐', platforms: ['wechat_mp', 'xiaohongshu'], timeSlots: ['17:00-18:00'], contentType: 'image', description: '招牌菜品介绍和推荐' }
  ]
}

// 节日营销日历
const FESTIVAL_CALENDAR = [
  { date: '2024-03-08', name: '妇女节', type: 'festival', contentDirections: ['女性力量', '产品女性用户故事', '女性相关功能'], platforms: ['all'], preparationDays: 7 },
  { date: '2024-05-01', name: '劳动节', type: 'festival', contentDirections: ['劳动精神', '团队工作日常', '产品制作过程'], platforms: ['all'], preparationDays: 5 },
  { date: '2024-06-18', name: '618购物节', type: 'shopping', contentDirections: ['促销活动', '产品优惠', '用户抢购'], platforms: ['xiaohongshu', 'douyin', 'weibo'], preparationDays: 14 },
  { date: '2024-11-11', name: '双11购物节', type: 'shopping', contentDirections: ['年度大促', '产品推荐', '用户反馈'], platforms: ['all'], preparationDays: 21 }
]

// 平台最佳发布时间
const PLATFORM_TIMING = {
  'wechat_mp': [
    { timeSlot: '08:00-09:00', dayType: 'weekday', description: '通勤时间，阅读率高' },
    { timeSlot: '12:00-13:00', dayType: 'weekday', description: '午休时间，碎片化阅读' },
    { timeSlot: '20:00-22:00', dayType: 'all', description: '晚间休闲时间，深度阅读' }
  ],
  'xiaohongshu': [
    { timeSlot: '07:30-09:00', dayType: 'weekday', description: '上班路上，刷手机时间' },
    { timeSlot: '12:00-14:00', dayType: 'weekday', description: '午休时间，浏览种草' },
    { timeSlot: '19:30-22:30', dayType: 'all', description: '晚间休息时间，活跃高峰' }
  ],
  'douyin': [
    { timeSlot: '07:00-08:30', dayType: 'weekday', description: '早晨通勤，短视频时间' },
    { timeSlot: '12:00-13:00', dayType: 'weekday', description: '午休时间，轻松娱乐' },
    { timeSlot: '21:00-24:00', dayType: 'all', description: '晚间娱乐时间，流量高峰' }
  ],
  'weibo': [
    { timeSlot: '08:00-10:00', dayType: 'weekday', description: '早晨热点关注时间' },
    { timeSlot: '12:00-14:00', dayType: 'weekday', description: '午休刷微博时间' },
    { timeSlot: '20:00-23:00', dayType: 'all', description: '晚间社交活跃时间' }
  ]
}

export default function AddContentItemModalEnhanced({ onClose, onSubmit, currentProduct, mode = 'create', initialItem = null }){
  const [form, setForm] = useState({ platform:'', title:'', body:'', schedule_at:'', status:'writing' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showThemeSuggestions, setShowThemeSuggestions] = useState(false)
  const [showTimeSuggestions, setShowTimeSuggestions] = useState(false)
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [suggestedThemes, setSuggestedThemes] = useState([])
  const [upcomingFestivals, setUpcomingFestivals] = useState([])
  const [scheduleConflicts, setScheduleConflicts] = useState([])

  // 获取当前产品相关的节日
  useEffect(() => {
    const today = new Date()
    const next30Days = FESTIVAL_CALENDAR.filter(festival => {
      const festivalDate = new Date(festival.date)
      const diffTime = festivalDate - today
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= 30
    })
    setUpcomingFestivals(next30Days)
  }, [])

  // 根据行业获取内容主题建议
  const getThemeSuggestions = (industry) => {
    if (!industry || !CONTENT_THEMES[industry]) return []
    return CONTENT_THEMES[industry]
  }

  // 应用主题建议到表单
  const applyThemeSuggestion = (theme) => {
    setForm({
      ...form,
      title: theme.title,
      body: theme.description,
      platform: theme.platforms[0] // 默认选择第一个推荐平台
    })
    setShowThemeSuggestions(false)
  }

  // 获取平台最佳发布时间建议
  const getTimeSuggestions = (platform) => {
    if (!platform || !PLATFORM_TIMING[platform]) return []
    return PLATFORM_TIMING[platform]
  }

  // 应用时间建议到表单
  const applyTimeSuggestion = (timeSlot, dayType) => {
    const today = new Date()
    let targetDate = new Date(today)
    
    if (dayType === 'weekday') {
      // 找到下一个工作日
      while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
        targetDate.setDate(targetDate.getDate() + 1)
      }
    }
    
    const [startTime] = timeSlot.split('-')
    const [hours, minutes] = startTime.split(':')
    targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    
    // 格式化日期时间为datetime-local输入格式
    const formattedDateTime = targetDate.toISOString().slice(0, 16)
    setForm({ ...form, schedule_at: formattedDateTime })
    setShowTimeSuggestions(false)
  }

  // 检测内容排期冲突
  const checkScheduleConflicts = async (dateTime, platform) => {
    if (!dateTime || !platform || !currentProduct?.id) return null
    
    try {
      const response = await fetch(`/api/content-plans-conflicts?datetime=${dateTime}&platform=${platform}&product_id=${currentProduct.id}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        setScheduleConflicts(result.data.conflicts || [])
        return result.data.has_conflict
      }
      return false
    } catch (error) {
      console.log('检查冲突失败:', error)
      return false
    }
  }

  // 监听时间变化，自动检查冲突
  useEffect(() => {
    if (form.schedule_at && form.platform) {
      checkScheduleConflicts(form.schedule_at, form.platform)
    }
  }, [form.schedule_at, form.platform, checkScheduleConflicts])

  // 预填充编辑模式表单
  useEffect(() => {
    if (mode === 'edit' && initialItem) {
      const toInput = (ts) => {
        if (!ts) return ''
        const d = new Date(ts)
        const y = d.getFullYear()
        const m = String(d.getMonth()+1).padStart(2,'0')
        const day = String(d.getDate()).padStart(2,'0')
        const hh = String(d.getHours()).padStart(2,'0')
        const mm = String(d.getMinutes()).padStart(2,'0')
        return `${y}-${m}-${day}T${hh}:${mm}`
      }
      setForm({
        platform: initialItem.platform || '',
        title: initialItem.title || '',
        body: initialItem.body || '',
        schedule_at: toInput(initialItem.schedule_at),
        status: initialItem.status || 'writing',
      })
    }
  }, [mode, initialItem])

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="text-lg font-semibold">{mode==='edit' ? '编辑内容计划' : '新建内容计划'}</div>
          <button onClick={isSubmitting ? undefined : onClose} disabled={isSubmitting} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"><X className="w-4 h-4"/></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6">
        <div className="mt-3 mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">内容灵感建议</span>
          </div>
          
          {/* 行业选择 */}
          <div className="mb-3">
            <label className="text-sm text-gray-700 mb-1 block">选择您的行业</label>
            <select 
              value={selectedIndustry} 
              onChange={(e) => {
                setSelectedIndustry(e.target.value)
                const themes = getThemeSuggestions(e.target.value)
                setSuggestedThemes(themes)
                setShowThemeSuggestions(themes.length > 0)
              }} 
              className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">选择行业获取内容建议</option>
              <option value="beauty">美妆护肤</option>
              <option value="saas">SaaS软件</option>
              <option value="food">餐饮美食</option>
            </select>
          </div>

          {/* 主题建议 */}
          {showThemeSuggestions && suggestedThemes.length > 0 && (
            <div className="mb-3">
              <label className="text-sm text-gray-700 mb-2 block">推荐内容主题</label>
              <div className="space-y-2">
                {suggestedThemes.map(theme => (
                  <div key={theme.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-100">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{theme.title}</div>
                      <div className="text-xs text-gray-600">{theme.description}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {PLATFORMS.find(p => p.id === theme.platforms[0])?.name}
                        </span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          {theme.timeSlots[0]}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => applyThemeSuggestion(theme)}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      使用
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 节日营销提醒 */}
          {upcomingFestivals.length > 0 && (
            <div className="mb-3">
              <label className="text-sm text-gray-700 mb-2 block">近期节日营销机会</label>
              <div className="space-y-2">
                {upcomingFestivals.map(festival => {
                  const daysUntil = Math.ceil((new Date(festival.date) - new Date()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={festival.date} className="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-100">
                      <div>
                        <div className="font-medium text-sm">{festival.name}</div>
                        <div className="text-xs text-gray-600">{daysUntil}天后 · {festival.contentDirections.join('、')}</div>
                      </div>
                      <button 
                        onClick={() => {
                          setForm({
                            ...form,
                            title: `${festival.name}营销活动`,
                            body: festival.contentDirections[0] || '节日营销内容'
                          })
                        }}
                        className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700"
                      >
                        创建
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          {/* 平台选择 + 时间建议 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-700 mb-1 block">平台</label>
              <div className="relative">
                <select 
                  value={form.platform} 
                  onChange={(e) => {
                    setForm({...form, platform: e.target.value})
                    if (e.target.value) {
                      const timeSuggestions = getTimeSuggestions(e.target.value)
                      // 自动填充推荐时间
                      if (timeSuggestions.length > 0) {
                        const firstSuggestion = timeSuggestions[0]
                        applyTimeSuggestion(firstSuggestion.timeSlot, firstSuggestion.dayType)
                      }
                    }
                  }} 
                  className="w-full border border-gray-100 rounded-lg px-3 py-2"
                >
                  <option value="">选择平台</option>
                  {PLATFORMS.map(p=> (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="text-sm text-gray-700 mb-1 block flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                发布时间
                {form.platform && (
                  <button 
                    onClick={() => setShowTimeSuggestions(!showTimeSuggestions)}
                    className="ml-2 text-xs text-blue-600 hover:text-blue-700"
                  >
                    查看建议
                  </button>
                )}
              </label>
              <input 
                type="datetime-local" 
                value={form.schedule_at} 
                onChange={(e)=>setForm({...form, schedule_at: e.target.value})} 
                className={`w-full border rounded-lg px-3 py-2 ${
                  scheduleConflicts.length > 0 ? 'border-red-200 bg-red-50' : 'border-gray-100'
                }`}
              />
              
              {/* 冲突警告 */}
              {scheduleConflicts.length > 0 && (
                <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium text-red-800">时间冲突警告</span>
                  </div>
                  <div className="text-xs text-red-700 mt-1">
                    {scheduleConflicts.map(conflict => (
                      <div key={conflict.id}>
                        「{conflict.title}」{conflict.time_diff_hours > 0 ? `晚${conflict.time_diff_hours}小时` : `早${Math.abs(conflict.time_diff_hours)}小时`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 时间建议下拉框 */}
              {showTimeSuggestions && form.platform && (
                <div className="absolute z-10 mt-1 w-64 bg-white border border-gray-100 rounded-lg shadow-lg">
                  <div className="p-2">
                    <div className="text-sm font-medium text-gray-700 mb-2">{PLATFORMS.find(p => p.id === form.platform)?.name} 最佳发布时间</div>
                    {getTimeSuggestions(form.platform).map((timing, index) => (
                      <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                        <div>
                          <div className="font-medium text-sm">{timing.timeSlot}</div>
                          <div className="text-xs text-gray-600">{timing.description}</div>
                        </div>
                        <button 
                          onClick={() => applyTimeSuggestion(timing.timeSlot, timing.dayType)}
                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          应用
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-700 mb-1 block">计划状态</label>
            <select 
              value={form.status}
              onChange={(e)=> setForm({ ...form, status: e.target.value })}
              className="w-full border border-gray-100 rounded-lg px-3 py-2"
            >
              <option value="writing">撰写中</option>
              <option value="review">待审核</option>
              <option value="published">已发布</option>
            </select>
          </div>

          {/* 平台适配提醒 */}
          {form.platform && (
            <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Globe className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">平台适配提醒</span>
              </div>
              <div className="text-sm text-yellow-700">
                {form.platform === 'wechat_mp' && (
                  <div>
                    <div>• 标题建议10-20字，避免标题党</div>
                    <div>• 封面图建议900×500像素</div>
                    <div>• 正文字数1500-3000字为佳</div>
                  </div>
                )}
                {form.platform === 'xiaohongshu' && (
                  <div>
                    <div>• 标题要包含关键词，可加emoji</div>
                    <div>• 图片比例3:4，首图要精美</div>
                    <div>• 正文前20字很重要</div>
                  </div>
                )}
                {form.platform === 'douyin' && (
                  <div>
                    <div>• 视频时长15-60秒最佳</div>
                    <div>• 竖版9:16比例</div>
                    <div>• 封面要吸引人</div>
                  </div>
                )}
                {form.platform === 'weibo' && (
                  <div>
                    <div>• 文字+配图形式</div>
                    <div>• 可添加话题标签</div>
                    <div>• 适合热点讨论</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm text-gray-700">标题</label>
            <input 
              value={form.title} 
              onChange={(e)=>setForm({...form, title: e.target.value})} 
              placeholder="输入内容标题"
              className="w-full border border-gray-100 rounded-lg px-3 py-2"
            />
          </div>
          
          <div>
            <label className="text-sm text-gray-700">正文</label>
            <div className="border border-gray-100 rounded-lg">
              <Suspense fallback={<div className="p-3 text-sm text-gray-500">编辑器加载中...</div>}>
                <RichTextEditorLazy
                  initialContent={form.body}
                  onChange={(content) => setForm({...form, body: content})}
                  placeholder="输入内容正文，支持富文本格式"
                  height="200px"
                />
              </Suspense>
            </div>
          </div>
        </div>
        </div>
        
        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-100">
          <button onClick={isSubmitting ? undefined : onClose} disabled={isSubmitting} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50">
            取消
          </button>
          <button 
            onClick={async ()=>{
              if (isSubmitting) return
              setIsSubmitting(true)
              try {
                if (onSubmit) await onSubmit(form)
              } finally {
                setIsSubmitting(false)
              }
            }} 
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? (mode==='edit' ? '保存中...' : '创建中...') : (mode==='edit' ? '保存' : '创建')}
          </button>
        </div>
      </div>
    </div>
  )
}
