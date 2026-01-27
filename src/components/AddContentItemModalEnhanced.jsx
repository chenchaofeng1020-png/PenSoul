import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Clock, ChevronDown, Check } from 'lucide-react'
import { PLATFORMS } from '../constants/platforms'

// 预设内容主题数据（移除以统一编辑与新建字段）
const CONTENT_THEMES = {}

// 节日营销日历
const FESTIVAL_CALENDAR = []

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

function PlatformSelect({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef(null)
  const [dropdownStyle, setDropdownStyle] = useState({})

  // 更新下拉菜单位置
  const updatePosition = () => {
    if (buttonRef.current && isOpen) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        zIndex: 9999
      })
    }
  }

  useEffect(() => {
    if (isOpen) {
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen])

  // 点击外部关闭逻辑
  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(event) {
      // 如果点击的是按钮本身，不处理（由按钮的onClick处理）
      if (buttonRef.current && buttonRef.current.contains(event.target)) {
        return
      }
      // 如果点击的是下拉菜单内部（虽然是在Portal中，但事件冒泡机制不同，这里直接通过全局关闭）
      // 实际上由于Portal渲染在body，ref判断会比较麻烦，这里简单处理：
      // 只要点击发生，且不是在按钮上，就尝试关闭。
      // 为了防止误触下拉菜单内部项导致关闭（虽然内部项有自己的onClick），
      // 我们在下拉菜单的最外层div阻止冒泡即可。
      setIsOpen(false)
    }
    // 使用capture阶段捕获，或者在Portal内部阻止冒泡
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const selectedPlatform = PLATFORMS.find(p => p.id === value)

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 transition-colors"
      >
        <span className={selectedPlatform ? 'text-gray-900' : 'text-gray-500'}>
          {selectedPlatform ? selectedPlatform.name : '选择平台'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div 
          style={dropdownStyle}
          className="bg-white border border-gray-100 rounded-lg shadow-xl max-h-60 overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-100"
          onMouseDown={(e) => e.stopPropagation()} // 阻止点击菜单内部触发外部关闭
        >
          {PLATFORMS.map(p => (
            <div
              key={p.id}
              onClick={() => {
                onChange(p.id)
                setIsOpen(false)
              }}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer text-sm ${
                value === p.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{p.name}</span>
              {value === p.id && <Check className="w-4 h-4" />}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

export default function AddContentItemModalEnhanced({ onClose, onSubmit, currentProduct, mode = 'create', initialItem = null, defaultScheduleAt = '' }){
  const [form, setForm] = useState({ platform:'', topic_title:'', schedule_at:'', status:'not_started' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showTimeSuggestions, setShowTimeSuggestions] = useState(false)
  const [scheduleConflicts, setScheduleConflicts] = useState([])

  

  // 获取平台最佳发布时间建议
  const getTimeSuggestions = (platform) => {
    if (!platform || !PLATFORM_TIMING[platform]) return []
    return PLATFORM_TIMING[platform]
  }

  const normalizePlatform = (value) => {
    if (!value) return ''
    const v = String(value).trim()
    const byId = PLATFORMS.find(p => (p.id || '').toLowerCase() === v.toLowerCase())
    if (byId) return byId.id
    const byName = PLATFORMS.find(p => p.name === v)
    if (byName) return byName.id
    const byAbbr = PLATFORMS.find(p => (p.abbr || '').toLowerCase() === v.toLowerCase())
    if (byAbbr) return byAbbr.id
    return ''
  }

  // 应用时间建议到表单
  const applyTimeSuggestion = (timeSlot, dayType) => {
    // 优先使用已有的日期（来自日历格预填或用户选择），仅覆盖时间
    const base = form.schedule_at || defaultScheduleAt
    let targetDate
    if (base && typeof base === 'string') {
      // base 形如 YYYY-MM-DD 或 YYYY-MM-DDTHH:mm
      const [datePart] = base.split('T')
      const [y, m, d] = datePart.split('-').map(n => parseInt(n, 10))
      targetDate = new Date(y, (m - 1), d)
    } else {
      const today = new Date()
      targetDate = new Date(today)
      if (dayType === 'weekday') {
        // 找到下一个工作日
        while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
          targetDate.setDate(targetDate.getDate() + 1)
        }
      }
    }

    const [startTime] = timeSlot.split('-')
    const [hours, minutes] = startTime.split(':')
    targetDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0)

    const formattedDateTime = new Date(targetDate.getTime() - targetDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    setForm(f => ({ ...f, schedule_at: formattedDateTime }))
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

  // 预填充编辑模式表单或来自日历的默认日期
  useEffect(() => {
    if (initialItem) {
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
        platform: normalizePlatform(initialItem.platform) || '',
        topic_title: (initialItem.topic_title || initialItem.title || ''),
        schedule_at: initialItem.schedule_at ? toInput(initialItem.schedule_at) : (form.schedule_at || ''),
        status: initialItem.status || 'not_started',
      })
    } 
    
    if (defaultScheduleAt && !form.schedule_at && !initialItem?.schedule_at) {
      // defaultScheduleAt: 形如 YYYY-MM-DD
      const [y, m, d] = defaultScheduleAt.split('-').map(n => parseInt(n, 10))
      const base = new Date(y, (m - 1), d)
      const formatted = new Date(base.getTime() - base.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      setForm(f => ({ ...f, schedule_at: formatted }))
    }
  }, [mode, initialItem])

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="text-lg font-semibold">{mode==='edit' ? '编辑选题' : '新建计划'}</div>
          <button onClick={isSubmitting ? undefined : onClose} disabled={isSubmitting} className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"><X className="w-4 h-4"/></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 overflow-visible">
        
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-700">选题内容</label>
            <input 
              value={form.topic_title} 
              onChange={(e)=>setForm(f=>({ ...f, topic_title: e.target.value }))} 
              placeholder={'输入选题方向/主题'}
              className="w-full border border-gray-100 rounded-lg px-3 py-2"
            />
          </div>

          {/* 平台选择 + 时间建议 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-700 mb-1 block">平台</label>
              <PlatformSelect 
                value={form.platform} 
                onChange={(newPlatformId) => {
                  setForm(f => ({ ...f, platform: newPlatformId }))
                  if (newPlatformId) {
                    const timeSuggestions = getTimeSuggestions(newPlatformId)
                    // 自动填充推荐时间
                    if (timeSuggestions.length > 0) {
                      const firstSuggestion = timeSuggestions[0]
                      applyTimeSuggestion(firstSuggestion.timeSlot, firstSuggestion.dayType)
                    }
                  }
                }}
              />
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
                onChange={(e)=>setForm(f => ({ ...f, schedule_at: e.target.value }))} 
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
              onChange={(e)=> setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full border border-gray-100 rounded-lg px-3 py-2"
            >
              <option value="not_started">未开始</option>
              <option value="writing">撰写中</option>
              <option value="pending_publish">待发布</option>
              <option value="published">已发布</option>
            </select>
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
                if (!form.platform) {
                  alert('请选择平台')
                  return
                }
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
