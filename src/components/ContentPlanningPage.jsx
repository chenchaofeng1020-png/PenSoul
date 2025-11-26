import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Plus, ChevronLeft, ChevronRight, ChevronDown, Edit, FileText, Lightbulb, Info, Trash2 } from 'lucide-react'
import { getContentItems, createContentItem, updateContentItem, deleteContentItem } from '../services/api'
import { PLATFORMS, PLATFORM_MAP } from '../constants/platforms'
import PlatformBadge from './PlatformBadge'
import AddContentItemModalEnhanced from './AddContentItemModalEnhanced'
import RichTextEditor from './RichTextEditor'

const platforms = PLATFORMS

export default function ContentPlanningPage({ currentProduct }) {
  const [view, _setView] = useState('calendar')
  const [items, setItems] = useState([])
  const [platform, setPlatform] = useState('all')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [preFillDate, setPreFillDate] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [hoverPreview, setHoverPreview] = useState({ key: null, items: [] })
  const [selectedDate, setSelectedDate] = useState(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [composeItem, setComposeItem] = useState(null)
  const [composeTitle, setComposeTitle] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [composeIndustry, setComposeIndustry] = useState('')
  const CONTENT_THEMES = {
    'beauty': [
      { id: 1, title: '产品试用分享', description: '真实体验产品效果，适合视觉化展示' },
      { id: 2, title: '化妆教程步骤', description: '详细的化妆步骤教学，适合长图文' },
      { id: 3, title: '成分科普解析', description: '专业成分分析，适合深度内容' }
    ],
    'saas': [
      { id: 5, title: '产品功能更新', description: '新功能介绍和使用说明' },
      { id: 6, title: '客户成功案例', description: '客户使用效果和反馈分享' },
      { id: 7, title: '行业趋势解读', description: '行业分析和趋势预测' }
    ],
    'food': [
      { id: 9, title: '菜品制作过程', description: '美食制作过程展示' },
      { id: 10, title: '店铺环境展示', description: '餐厅环境和氛围展示' },
      { id: 11, title: '顾客用餐反馈', description: '顾客真实用餐体验和评价' }
    ]
  }
  const PLATFORM_TIPS = {
    'wechat_mp': '深度文章，图文为主',
    'xiaohongshu': '图文与短视频，偏种草风格',
    'douyin': '短视频为主，节奏更快',
    'weibo': '热点与短文，互动性强'
  }

  function openCompose(it){
    setComposeItem(it)
    setComposeTitle(it.title || '')
    setComposeBody(it.body || '')
    setIsComposeOpen(true)
  }

  function closeCompose(){
    setIsComposeOpen(false)
    setComposeItem(null)
    setComposeTitle('')
    setComposeBody('')
    setComposeIndustry('')
  }

  async function handleDeleteContentItem(it){
    if (!it?.id) return
    const ok = window.confirm('确认删除该内容计划？')
    if (!ok) return
    try {
      await deleteContentItem(it.id)
      setItems(prev => {
        const base = Array.isArray(prev) ? prev.slice() : []
        const next = base.filter(x => x.id !== it.id)
        next.sort((a,b)=> new Date(a.schedule_at) - new Date(b.schedule_at))
        return next
      })
      try {
        const { from, to } = getMonthRange(currentMonth)
        const keyParts = [currentProduct.id, platform === 'all' ? 'all' : platform, from, to]
        const cacheKey = `content_items_cache_${keyParts.join('_')}`
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const parsed = JSON.parse(cached)
          const arr = Array.isArray(parsed?.data) ? parsed.data : Array.isArray(parsed) ? parsed : []
          const merged = arr.filter(x => x.id !== it.id)
          merged.sort((a,b)=> new Date(a.schedule_at) - new Date(b.schedule_at))
          localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: merged }))
        }
      } catch { void 0 }
    } catch (e) {
      alert('删除失败，请稍后重试')
    }
  }

  useEffect(() => {
    if (!isComposeOpen || !composeItem) return
    const handler = setTimeout(async () => {
      try {
        const updates = { title: composeTitle, body: composeBody }
        const updated = await updateContentItem(composeItem.id, updates)
        setItems(prev => {
          const base = Array.isArray(prev) ? prev.slice() : []
          const filtered = base.filter(x => x.id !== composeItem.id)
          const matchPlatform = platform === 'all' || updated.platform === platform
          const next = matchPlatform ? [...filtered, updated] : filtered
          next.sort((a,b)=> new Date(a.schedule_at) - new Date(b.schedule_at))
          return next
        })
        try {
          const { from, to } = getMonthRange(currentMonth)
          const keyParts = [currentProduct.id, platform === 'all' ? 'all' : platform, from, to]
          const cacheKey = `content_items_cache_${keyParts.join('_')}`
          const cached = Array.isArray(items) ? items.slice() : []
          const merged = [...cached.filter(x=>x.id!==composeItem.id), updated]
          merged.sort((a,b)=> new Date(a.schedule_at) - new Date(b.schedule_at))
          localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: merged }))
        } catch { void 0 }
      } catch { void 0 }
    }, 600)
    return () => clearTimeout(handler)
  }, [composeTitle, composeBody, composeItem?.id, isComposeOpen])

  useEffect(() => {
    const load = async () => {
      if (!currentProduct?.id) return
      setIsLoading(true)
      try {
        const { from, to } = getMonthRange(currentMonth)
        const keyParts = [currentProduct.id, platform === 'all' ? 'all' : platform, from, to]
        const cacheKey = `content_items_cache_${keyParts.join('_')}`
        try {
          const cached = localStorage.getItem(cacheKey)
          if (cached) {
            const parsed = JSON.parse(cached)
            if (Array.isArray(parsed)) {
              setItems(parsed)
            } else if (parsed && typeof parsed === 'object') {
              const ttl = 10 * 60 * 1000
              if (typeof parsed.ts === 'number' && Array.isArray(parsed.data) && (Date.now() - parsed.ts) < ttl) {
                setItems(parsed.data)
              }
            }
          }
        } catch { void 0 }
        const res = await getContentItems(currentProduct.id, { platform: platform === 'all' ? null : platform, from, to })
        setItems(res)
        setHasLoaded(true)
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: res }))
        } catch { void 0 }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [currentProduct?.id, platform, currentMonth])

  const filtered = items

  const monthDays = useMemo(() => buildMonthGrid(currentMonth), [currentMonth])
  const groupedByDate = useMemo(() => groupByDate(filtered), [filtered])
  const isCurrentMonth = isSameMonth(currentMonth, new Date())

  return (
    <div className="bg-white rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        {isComposeOpen ? (
          <>
            <div className="flex items-center">
              <button onClick={closeCompose} className="text-sm font-semibold text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline">内容规划</button>
              <span className="mx-2 text-gray-400">/</span>
              <div className="text-lg font-semibold text-gray-900">内容创作</div>
            </div>
            <div className="flex items-center">
              <button onClick={closeCompose} className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                <span className="text-sm">返回</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center">
              <div className="text-lg font-semibold text-gray-900">内容日历</div>
            </div>
            <div className="flex items-center">
              <button onClick={()=>setIsAddOpen(true)} className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <Plus className="w-3 h-3" />
                <span className="text-sm">新建计划</span>
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isComposeOpen ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
                  <input value={composeTitle} onChange={(e)=>setComposeTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="输入内容标题" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">正文</label>
                  <RichTextEditor initialContent={composeBody} onChange={setComposeBody} height="520px" />
                </div>
              </div>
              <div className="md:sticky top-4">
                <div className="rounded-xl p-4 bg-gray-50 divide-y divide-gray-200">
                  {composeItem && (
                    <div className="py-3">
                      <div className="text-xs font-medium text-gray-500 mb-2">选题方向</div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-semibold text-gray-900 leading-5">{getTopic(composeItem)}</div>
                        <span className="text-xs px-2 py-1 rounded inline-flex items-center gap-1" style={{ backgroundColor: brandBg(composeItem.platform), color: brandText(composeItem.platform) }}>
                          <PlatformBadge id={composeItem.platform} size={14} />
                          <span>{PLATFORM_MAP[composeItem.platform]?.name || composeItem.platform}</span>
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="py-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      <div className="text-sm font-medium text-gray-900">内容灵感</div>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <select value={composeIndustry} onChange={(e)=>setComposeIndustry(e.target.value)} className="text-sm border border-gray-300 rounded px-2 py-1 w-full bg-white">
                        <option value="">选择行业</option>
                        <option value="saas">SaaS</option>
                        <option value="beauty">美妆</option>
                        <option value="food">餐饮</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(CONTENT_THEMES[composeIndustry] || []).map(theme => (
                        <button key={theme.id} onClick={()=>{ setComposeTitle(theme.title); setComposeBody(theme.description) }} className="text-left px-3 py-2 bg-white rounded border border-gray-200 hover:bg-gray-100 text-sm">
                          <div className="font-medium text-gray-900">{theme.title}</div>
                          <div className="text-xs text-gray-600">{theme.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-4 h-4 text-blue-600" />
                      <div className="text-sm font-medium text-gray-900">平台适配提醒</div>
                    </div>
                    {composeItem && (
                      <div className="text-sm text-gray-700">{PLATFORM_TIPS[composeItem.platform] || '根据平台进行内容形式适配'}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : view === 'calendar' ? (
          <>
          <div className="flex items-center mb-3">
            <div className="flex items-center space-x-2">
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, -1))} className="p-1.5 text-gray-700 hover:bg-gray-100 rounded-full" aria-label="上一月" title="上一月">
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              </button>
              <span className="text-sm text-gray-900 font-medium bg-gray-100 rounded-full px-3 py-0.5">
                {currentMonth.getFullYear()}年{String(currentMonth.getMonth()+1).padStart(2,'0')}月
              </span>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 text-gray-700 hover:bg-gray-100 rounded-full" aria-label="下一月" title="下一月">
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <button
                onClick={() => { const t = new Date(); setCurrentMonth(new Date(t.getFullYear(), t.getMonth(), 1)) }}
                className={`w-5 h-5 rounded-full flex items-center justify-center ${isCurrentMonth ? 'bg-gray-200 cursor-not-allowed opacity-60' : 'bg-blue-100 hover:bg-blue-200 cursor-pointer ring-1 ring-blue-300'}`}
                aria-label="回到本月"
                title="回到本月"
                disabled={isCurrentMonth}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isCurrentMonth ? 'bg-gray-400' : 'bg-blue-600'}`}></span>
              </button>
              <div className="relative inline-block ml-3">
                <select value={platform} onChange={(e)=>setPlatform(e.target.value)} className="appearance-none bg-gray-100 rounded-full px-3 py-0.5 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-300">
                  <option value="all">全部平台</option>
                  {platforms.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 pointer-events-none absolute right-[4px] top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <div className="grid grid-cols-7 gap-2 mb-1">
                {['一','二','三','四','五','六','日'].map((label, i) => (
                  <div key={i} className="text-xs text-gray-500 text-center">{label}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {monthDays.map((d, idx) => {
                  const inMonth = d.getMonth() === currentMonth.getMonth()
                  const key = formatDate(d)
                  const dayItems = groupedByDate.get(key) || []
                  const dist = statusDistribution(dayItems)
                  const total = dayItems.length
                  const lunarText = getLunarText(d)
                  const solarTerm = getSolarTerm(d)
                  const festival = getFestival(d)
                  return (
                    <div
                      key={idx}
                      className={`border rounded-lg p-1 min-h-[110px] ${inMonth?'border-gray-200 bg-white':'border-gray-200 bg-gray-50'} relative group`}
                      onMouseEnter={() => setHoverPreview({ key, items: dayItems })}
                      onMouseLeave={() => setHoverPreview({ key: null, items: [] })}
                      onClick={() => setSelectedDate({ date: key, items: dayItems })}
                    >
                      <div className={`flex items-center justify-between mb-1 ${inMonth?'text-gray-900':'text-gray-400'}`}>
                        <span className="text-xs">{d.getDate()}</span>
                        <button onClick={(e)=>{e.stopPropagation(); setPreFillDate(key); setIsAddOpen(true)}} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">+</button>
                      </div>
                      <div className="flex items-center gap-1 mb-1 min-h-[16px]">
                        {festival ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 inline-block">{festival}</span>
                        ) : solarTerm ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 inline-block">{solarTerm}</span>
                        ) : (
                          <span className="text-[10px] text-gray-500">{lunarText}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 mb-1">{total>0?`${total}篇`:''}</div>
                      {total>0 && (
                        <div className="w-full h-1 rounded overflow-hidden flex">
                          <div className="h-1 bg-gray-400" style={{ flexBasis: 0, flexGrow: dist.not_started }} />
                          <div className="h-1 bg-yellow-400" style={{ flexBasis: 0, flexGrow: dist.writing }} />
                          <div className="h-1 bg-purple-500" style={{ flexBasis: 0, flexGrow: dist.pending_publish }} />
                          <div className="h-1 bg-green-500" style={{ flexBasis: 0, flexGrow: dist.published }} />
                        </div>
                      )}
                    {hoverPreview.key === key && dayItems.length > 0 && (
                      <div className="absolute z-10 left-2 right-2 top-10 bg-white border border-gray-200 rounded-lg shadow p-2">
                        {dayItems.slice().sort((a,b)=>{
                          const ua = pickUpdatedAt(a) || a.created_at
                          const ub = pickUpdatedAt(b) || b.created_at
                          return new Date(ub) - new Date(ua)
                        }).map(it => (
                          <div key={it.id} className="text-xs text-gray-700 truncate">
                            {getTopic(it)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              </div>
              <div className="flex items-center space-x-4 text-xs text-gray-600">
                <div className="flex items-center space-x-1"><span className="w-3 h-3 bg-gray-400 rounded-sm"></span><span>未开始</span></div>
                <div className="flex items-center space-x-1"><span className="w-3 h-3 bg-yellow-400 rounded-sm"></span><span>撰写中</span></div>
                <div className="flex items-center space-x-1"><span className="w-3 h-3 bg-purple-500 rounded-sm"></span><span>待发布</span></div>
                <div className="flex items-center space-x-1"><span className="w-3 h-3 bg-green-500 rounded-sm"></span><span>已发布</span></div>
              </div>
            </div>
            <div className="col-span-1">
              <div className="bg-gray-50 rounded-xl p-4 h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-gray-900">本月内容</div>
                  <div className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">{Array.from(groupedByDate.keys()).filter(k => isSameMonth(new Date(k), currentMonth)).reduce((acc,k)=> acc + (groupedByDate.get(k)?.length || 0), 0)}</div>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200"></div>
                  <div className="space-y-4 max-h-[calc(100vh-260px)] overflow-auto pr-2">
                    {isLoading ? (
                      <div className="text-center text-gray-500 py-8">加载中...</div>
                    ) : (
                      <>
                    {Object.entries(Object.fromEntries(groupedByDate))
                          .filter(([date]) => isSameMonth(new Date(date), currentMonth))
                          .sort((a,b)=>{
                            const maxA = Math.max(...(a[1]||[]).map(x=> new Date(pickUpdatedAt(x) || x.created_at).getTime()))
                            const maxB = Math.max(...(b[1]||[]).map(x=> new Date(pickUpdatedAt(x) || x.created_at).getTime()))
                            return maxB - maxA
                          })
                          .map(([date, dayItems]) => (
                          <div key={date} className="pl-10">
                            <div className="flex items中心 mb-2">
                              <div className="w-3 h-3 rounded-full bg-gray-300 border border-gray-300 relative -ml-[30px] mr-3"></div>
                              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{date}</div>
                            </div>
                            <div className="space-y-3">
                              {dayItems.slice().sort((a,b)=>{
                                const ua = pickUpdatedAt(a) || a.created_at
                                const ub = pickUpdatedAt(b) || b.created_at
                                return new Date(ub) - new Date(ua)
                              }).map(it => {
                                const st = inferStatus(it)
                                const statusColor = 
                                  st==='published' ? 'bg-green-100 text-green-700' :
                                  st==='pending_publish' ? 'bg-purple-100 text-purple-700' :
                                  st==='writing' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                return (
                                  <div key={it.id} className="border border-gray-100 rounded-lg bg-white divide-y divide-gray-100">
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-medium text-gray-900 text-[14px] whitespace-normal break-words flex-1">{getTopic(it)}</div>
                    <div className="flex items-center gap-1">
                      <button onClick={()=>handleDeleteContentItem(it)} className="p-1 rounded hover:bg-gray-100 text-red-600 hover:text-red-700">
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <button onClick={()=>{ setEditItem(it); setIsEditOpen(true) }} className="p-1 rounded hover:bg-gray-100">
                        <Edit className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-[12px] text-gray-500 mb-2">{formatDateTime(it.schedule_at)}</div>
                                      <div className="flex items-center flex-wrap gap-2">
                                        <span className="text-[12px] px-2 py-1 rounded inline-flex items-center gap-1" style={{ backgroundColor: brandBg(it.platform), color: brandText(it.platform) }}>
                                          <PlatformBadge id={it.platform} size={14} />
                                          <span>{PLATFORM_MAP[it.platform]?.name || it.platform}</span>
                                        </span>
                                        <span className={`text-[12px] px-2 py-1 rounded ${statusColor}`}>{statusLabel(st)}</span>
                                      </div>
                                    </div>
                <div className="p-3">
                  {it.title && (
                    <div className="text-[13px] font-medium text-gray-900 mb-1 whitespace-normal break-words">{it.title}</div>
                  )}
                  <div className="flex items-center text-[12px] text-gray-500 mb-1 gap-2">
                    <span>最近更新：{formatDateTime(pickUpdatedAt(it) || it.created_at)}</span>
                  </div>
                  <div className="mt-2">
                    <div className="relative group rounded-lg p-2 bg-gray-50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[12px] text-gray-600 line-clamp-2 flex-1">
                          {getBodyExcerpt(it) || '暂无内容预览'}
                        </div>
                        <button onClick={()=>openCompose(it)} className="text-xs text-blue-600 hover:underline px-0 py-0 bg-transparent flex-shrink-0">内容创作</button>
                      </div>
                      <div className="absolute left-0 right-0 mt-1 z-10 bg-white border border-gray-200 rounded shadow p-2 text-[12px] text-gray-700 hidden group-hover:block max-h-48 overflow-y-auto">
                        {stripHtml(it.body || '')}
                      </div>
                    </div>
                  </div>
                </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                        {!isLoading && hasLoaded && filtered.length===0 && <div className="text-center text-gray-500">暂无计划</div>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="text-sm font-semibold text-gray-900">本月内容</div>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200"></div>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center text-gray-500 py-8">加载中...</div>
                ) : (
                  <>
                    {Object.entries(Object.fromEntries(groupedByDate))
                      .sort((a,b)=>{
                        const maxA = Math.max(...(a[1]||[]).map(x=> new Date(pickUpdatedAt(x) || x.created_at).getTime()))
                        const maxB = Math.max(...(b[1]||[]).map(x=> new Date(pickUpdatedAt(x) || x.created_at).getTime()))
                        return maxB - maxA
                      })
                      .map(([date, dayItems]) => (
                      <div key={date} className="pl-10">
                        <div className="flex items-center mb-2">
                          <div className="w-3 h-3 rounded满 bg-gray-300 border border-gray-300 relative -ml-[30px] mr-3"></div>
                          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{date}</div>
                        </div>
                        <div className="space-y-3">
                          {dayItems.slice().sort((a,b)=>{
                            const ua = pickUpdatedAt(a) || a.created_at
                            const ub = pickUpdatedAt(b) || b.created_at
                            return new Date(ub) - new Date(ua)
                          }).map(it => {
                            const st = inferStatus(it)
                            const statusColor = 
                              st==='published' ? 'bg-green-100 text-green-700' :
                              st==='pending_publish' ? 'bg-purple-100 text-purple-700' :
                              st==='writing' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            return (
                              <div key={it.id} className="border border-gray-100 rounded-lg bg-white divide-y divide-gray-100">
                                <div className="p-3">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="font-medium text-gray-900 text-[14px] whitespace-normal break-words flex-1">{getTopic(it)}</div>
                                    <div className="flex items-center gap-1">
                                      <button onClick={()=>handleDeleteContentItem(it)} className="p-1 rounded hover:bg-gray-100 text-red-600 hover:text-red-700">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                      <button onClick={()=>{ setEditItem(it); setIsEditOpen(true) }} className="p-1 rounded hover:bg-gray-100">
                                        <Edit className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="text-[12px] text-gray-500 mb-2">{formatDateTime(it.schedule_at)}</div>
                                  <div className="flex items-center flex-wrap gap-2">
                                    <span className="text-[12px] px-2 py-1 rounded inline-flex items-center gap-1" style={{ backgroundColor: brandBg(it.platform), color: brandText(it.platform) }}>
                                      <PlatformBadge id={it.platform} size={14} />
                                      <span>{PLATFORM_MAP[it.platform]?.name || it.platform}</span>
                                    </span>
                                    <span className={`text-[12px] px-2 py-1 rounded ${statusColor}`}>{statusLabel(st)}</span>
                                  </div>
                                </div>
                                <div className="p-3">
                                  {it.title && (
                                    <div className="text-[13px] font-medium text-gray-900 mb-1 whitespace-normal break-words">{it.title}</div>
                                  )}
                                  <div className="flex items-center text-[12px] text-gray-500 mb-1 gap-2">
                                    <span>最近更新：{formatDateTime(pickUpdatedAt(it) || it.created_at)}</span>
                                  </div>
                                  <div className="mt-2">
                                    <div className="relative group rounded-lg p-2 bg-gray-50">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="text-[12px] text-gray-600 line-clamp-2 flex-1">
                                          {getBodyExcerpt(it) || '暂无内容预览'}
                                        </div>
                                        <button onClick={()=>openCompose(it)} className="text-xs text-blue-600 hover:underline px-0 py-0 bg-transparent flex-shrink-0">内容创作</button>
                                      </div>
                                      <div className="absolute left-0 right-0 mt-1 z-10 bg-white border border-gray-200 rounded shadow p-2 text-[12px] text-gray-700 hidden group-hover:block max-h-48 overflow-y-auto">
                                        {stripHtml(it.body || '')}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    {!isLoading && hasLoaded && filtered.length===0 && <div className="text-center text-gray-500">暂无计划</div>}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {isAddOpen && (
        <AddContentItemModalEnhanced 
          onClose={()=>setIsAddOpen(false)}
          onSubmit={async (form)=>{
            const created = await createContentItem({ product_id: currentProduct.id, platform: form.platform, schedule_at: form.schedule_at, status: form.status, topic_title: form.topic_title })
            const createdWithTopic = {
              ...created,
              topic_title: typeof created?.topic_title !== 'undefined' ? created.topic_title : (form.topic_title || '')
            }
            setItems(prev => {
              const matchPlatform = platform === 'all' || created.platform === platform
              const base = Array.isArray(prev) ? prev.slice() : []
              if (!matchPlatform) return base
              const next = [...base, createdWithTopic]
              next.sort((a,b)=> new Date(a.schedule_at) - new Date(b.schedule_at))
              return next
            })
            try {
              const { from, to } = getMonthRange(currentMonth)
              const keyParts = [currentProduct.id, platform === 'all' ? 'all' : platform, from, to]
              const cacheKey = `content_items_cache_${keyParts.join('_')}`
              const cached = Array.isArray(items) ? items.slice() : []
              const merged = [...cached, createdWithTopic].sort((a,b)=> new Date(a.schedule_at) - new Date(b.schedule_at))
              localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: merged }))
            } catch { void 0 }
            setIsAddOpen(false)
            setPreFillDate(null)
          }}
          currentProduct={currentProduct}
          defaultScheduleAt={preFillDate || ''}
        />
      )}

      {isEditOpen && editItem && (
        <AddContentItemModalEnhanced 
          onClose={()=>{ setIsEditOpen(false); setEditItem(null) }}
          onSubmit={async (form)=>{
            const updates = {
              platform: form.platform,
              schedule_at: form.schedule_at,
              status: form.status,
              topic_title: form.topic_title,
            }
            const updated = await updateContentItem(editItem.id, updates)
            setItems(prev => {
              const base = Array.isArray(prev) ? prev.slice() : []
              const filtered = base.filter(x => x.id !== editItem.id)
              const matchPlatform = platform === 'all' || updated.platform === platform
              const nextItem = { 
                ...updated, 
                topic_title: typeof updates.topic_title !== 'undefined' ? updates.topic_title : updated.topic_title 
              }
              const next = matchPlatform ? [...filtered, nextItem] : filtered
              next.sort((a,b)=> new Date(a.schedule_at) - new Date(b.schedule_at))
              return next
            })
            try {
              const { from, to } = getMonthRange(currentMonth)
              const keyParts = [currentProduct.id, platform === 'all' ? 'all' : platform, from, to]
              const cacheKey = `content_items_cache_${keyParts.join('_')}`
              const cached = Array.isArray(items) ? items.slice() : []
              const mergedItem = { 
                ...updated, 
                topic_title: typeof updates.topic_title !== 'undefined' ? updates.topic_title : updated.topic_title 
              }
              const merged = [...cached.filter(x=>x.id!==editItem.id), mergedItem]
              merged.sort((a,b)=> new Date(a.schedule_at) - new Date(b.schedule_at))
              localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: merged }))
            } catch { void 0 }
            setIsEditOpen(false)
            setEditItem(null)
          }}
          currentProduct={currentProduct}
          mode="edit"
          initialItem={editItem}
        />
      )}

      {selectedDate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40" onClick={()=>setSelectedDate(null)}>
          <div className="bg-white rounded-xl w-full max-w-lg p-4" onClick={(e)=>e.stopPropagation()}>
            <div className="text-sm font-semibold text-gray-900 mb-2">{selectedDate.date}</div>
            <div className="space-y-2">
              {selectedDate.items.map(it => (
                <div key={it.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="font-medium text-gray-900">{getTopic(it)}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <PlatformBadge id={it.platform} size={16} />
                    <span className="text-xs text-gray-600">{PLATFORM_MAP[it.platform]?.name || it.platform}</span>
                  </div>
                </div>
              ))}
              {selectedDate.items.length===0 && <div className="text-sm text-gray-600">该日期暂无内容</div>}
            </div>
            <div className="mt-4 flex justify-end">
              <button className="px-3 py-1 rounded bg-gray-100 text-gray-700" onClick={()=>setSelectedDate(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function buildMonthGrid(monthStart){
  const start = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1)
  const end = new Date(monthStart.getFullYear(), monthStart.getMonth()+1, 0)
  const startWeekDay = start.getDay()
  const daysBefore = (startWeekDay + 6) % 7
  const totalDays = daysBefore + end.getDate()
  const cells = Math.ceil(totalDays/7)*7
  const firstCellDate = new Date(start)
  firstCellDate.setDate(1 - daysBefore)
  const res = []
  for(let i=0;i<cells;i++){
    const d = new Date(firstCellDate)
    d.setDate(firstCellDate.getDate()+i)
    d.setHours(0,0,0,0)
    res.push(d)
  }
  return res
}

function addMonths(d, n){
  const res = new Date(d)
  res.setMonth(res.getMonth()+n)
  return new Date(res.getFullYear(), res.getMonth(), 1)
}

function formatDate(d){
  const y = d.getFullYear()
  const m = String(d.getMonth()+1).padStart(2,'0')
  const day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}

function getMonthRange(monthStart){
  const start = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1)
  const end = new Date(monthStart.getFullYear(), monthStart.getMonth()+1, 0)
  const startISO = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-01T00:00:00`
  const endISO = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}T23:59:59`
  return { from: startISO, to: endISO }
}

function formatDateTime(ts){
  if (!ts) return ''
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth()+1).padStart(2,'0')
  const day = String(d.getDate()).padStart(2,'0')
  const hh = String(d.getHours()).padStart(2,'0')
  const mm = String(d.getMinutes()).padStart(2,'0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

function getTopic(it){
  return it?.topic_title || it?.topic || it?.plan_title || it?.title || ''
}

function pickUpdatedAt(it){
  const keys = ['updated_at','updatedAt','modified_at','modifiedAt','last_update_ts','lastUpdateTs','last_updated_at','lastUpdatedAt','updated','modified']
  for (const k of keys){
    if (it && it[k]) return it[k]
  }
  return null
}


function stripHtml(html){
  if (!html) return ''
  const tmp = html.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
  return tmp.trim().replace(/\s+/g,' ')
}

function getBodyExcerpt(it){
  const t = stripHtml(it.body || '')
  if (!t) return ''
  const s = t.slice(0, 80)
  return t.length>80 ? s + '…' : s
}

function groupByDate(items){
  const map = new Map()
  items.forEach(it => {
    const key = formatDate(new Date(it.schedule_at))
    const arr = map.get(key) || []
    arr.push(it)
    map.set(key, arr)
  })
  return map
}

function inferStatus(it){
  const s = it.status
  if (s === 'not_started' || s === 'writing' || s === 'pending_publish' || s === 'published') return s
  if (s === 'draft') return 'writing'
  const now = Date.now()
  const t = new Date(it.schedule_at).getTime()
  if (t < now) return 'published'
  return 'not_started'
}

function statusDistribution(items){
  const dist = { not_started: 0, writing: 0, pending_publish: 0, published: 0 }
  items.forEach(it => {
    const st = inferStatus(it)
    if (st === 'published') dist.published++
    else if (st === 'pending_publish') dist.pending_publish++
    else if (st === 'writing') dist.writing++
    else dist.not_started++
  })
  return dist
}

function statusLabel(st){
  if (st==='published') return '已发布'
  if (st==='pending_publish') return '待发布'
  if (st==='writing') return '撰写中'
  if (st==='not_started') return '未开始'
  return '未开始'
}

function isSameMonth(a,b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth()
}

function getLunarText(d){
  try {
    const fmt = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'long', day: 'numeric' })
    const parts = fmt.formatToParts(d)
    const m = parts.find(p=>p.type==='month')?.value || ''
    const dayPart = parts.find(p=>p.type==='day')?.value || ''
    const dayNum = parseInt(dayPart, 10)
    const n = Number.isNaN(dayNum) ? cnToNumber(dayPart) : dayNum
    const dayName = numberToCnDay(n)
    return n===1 ? `${m}${dayName}` : `${dayName}`
  } catch {
    return ''
  }
}

function getSolarTerm(d){
  const m = d.getMonth()+1
  const day = d.getDate()
  const terms = [
    { name: '小寒', m: 1, d: 5 },
    { name: '大寒', m: 1, d: 20 },
    { name: '立春', m: 2, d: 4 },
    { name: '雨水', m: 2, d: 19 },
    { name: '惊蛰', m: 3, d: 6 },
    { name: '春分', m: 3, d: 20 },
    { name: '清明', m: 4, d: 5 },
    { name: '谷雨', m: 4, d: 20 },
    { name: '立夏', m: 5, d: 5 },
    { name: '小满', m: 5, d: 21 },
    { name: '芒种', m: 6, d: 6 },
    { name: '夏至', m: 6, d: 21 },
    { name: '小暑', m: 7, d: 7 },
    { name: '大暑', m: 7, d: 22 },
    { name: '立秋', m: 8, d: 7 },
    { name: '处暑', m: 8, d: 23 },
    { name: '白露', m: 9, d: 8 },
    { name: '秋分', m: 9, d: 23 },
    { name: '寒露', m: 10, d: 8 },
    { name: '霜降', m: 10, d: 23 },
    { name: '立冬', m: 11, d: 7 },
    { name: '小雪', m: 11, d: 22 },
    { name: '大雪', m: 12, d: 7 },
    { name: '冬至', m: 12, d: 22 }
  ]
  const found = terms.find(t => t.m===m && t.d === day)
  return found?.name || ''
}

function getFestival(d){
  const gKey = `${d.getMonth()+1}-${d.getDate()}`
  const gMap = {
    '1-1': '元旦',
    '2-14': '情人节',
    '3-8': '妇女节',
    '4-1': '愚人节',
    '5-1': '劳动节',
    '6-1': '儿童节',
    '9-10': '教师节',
    '10-1': '国庆节',
    '12-25': '圣诞节'
  }
  if (gMap[gKey]) return gMap[gKey]
  try {
    const fmt = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'long', day: 'numeric' })
    const parts = fmt.formatToParts(d)
    const mStr = parts.find(p=>p.type==='month')?.value || ''
    const dayPart = parts.find(p=>p.type==='day')?.value || ''
    const lm = lunarMonthToNumber(mStr)
    const dayNum = parseInt(dayPart, 10)
    const ld = Number.isNaN(dayNum) ? cnToNumber(dayPart) : dayNum
    const lKey = `${lm}-${ld}`
    const lMap = {
      '1-1': '春节',
      '1-15': '元宵节',
      '5-5': '端午节',
      '7-7': '七夕',
      '8-15': '中秋节',
      '9-9': '重阳节'
    }
    return lMap[lKey] || ''
  } catch {
    return ''
  }
}

function lunarMonthToNumber(s){
  const map = {
    '正月': 1,
    '一月': 1,
    '二月': 2,
    '三月': 3,
    '四月': 4,
    '五月': 5,
    '六月': 6,
    '七月': 7,
    '八月': 8,
    '九月': 9,
    '十月': 10,
    '十一月': 11,
    '十二月': 12,
    '腊月': 12
  }
  return map[s] || 0
}

function getPlatformColor(id){
  return PLATFORM_MAP[id]?.color || '#3b82f6'
}

function hexToRgb(hex){
  const h = hex.replace('#','')
  const bigint = parseInt(h, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return { r, g, b }
}

function brandBg(id){
  const { r, g, b } = hexToRgb(getPlatformColor(id))
  return `rgba(${r}, ${g}, ${b}, 0.12)`
}

function brandText(id){
  return getPlatformColor(id)
}

function cnToNumber(s){
  const dm = { '一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'零':0 }
  if (!s) return NaN
  if (s === '十') return 10
  if (s.includes('十')) {
    const idx = s.indexOf('十')
    const left = s.slice(0, idx)
    const right = s.slice(idx+1)
    const l = left ? dm[left] || 0 : 1
    const r = right ? dm[right] || 0 : 0
    return l*10 + r
  }
  return dm[s] || NaN
}

function numberToCnDay(n){
  const map = {1:'一',2:'二',3:'三',4:'四',5:'五',6:'六',7:'七',8:'八',9:'九'}
  if (!n || n<1 || n>30) return ''
  if (n<=9) return `初${map[n]}`
  if (n===10) return '初十'
  if (n>=11 && n<=19) return `十${map[n-10]}`
  if (n===20) return '二十'
  if (n>=21 && n<=29) return `廿${map[n-20]}`
  return '三十'
}
