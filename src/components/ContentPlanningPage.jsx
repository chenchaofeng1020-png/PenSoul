import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Plus, ChevronLeft, ChevronRight, ChevronDown, Edit, FileText, Trash2 } from 'lucide-react'
import { getContentItems, createContentItem, updateContentItem, deleteContentItem, getContentItem } from '../services/api'
import { useUI } from '../context/UIContext'
import { PLATFORMS, PLATFORM_MAP } from '../constants/platforms'
import PlatformBadge from './PlatformBadge'
import AddContentItemModalEnhanced from './AddContentItemModalEnhanced'
import RichTextEditor from './RichTextEditor'
import AiTopicGenerator from './AiTopicGenerator'
import AiDraftAssistant from './AiDraftAssistant'

const platforms = PLATFORMS

export default function ContentPlanningPage({ currentProduct, initialPlanData, onPlanCreated }) {
  const { confirm, showToast } = useUI()
  const [view, _setView] = useState('calendar')
  const [items, setItems] = useState([])
  const [platform, setPlatform] = useState('all')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [preFillDate, setPreFillDate] = useState(null)
  const [preFillItem, setPreFillItem] = useState(null) // Data from TrendRadar
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [composeItem, setComposeItem] = useState(null)
  const [composeTitle, setComposeTitle] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    if (initialPlanData) {
      // Convert initialPlanData to a format suitable for the modal
      const today = new Date()
      const formattedDate = formatDate(today)
      setPreFillDate(formattedDate)
      setPreFillItem({
        topic_title: initialPlanData.title,
        core_view: initialPlanData.core_view,
        outline: typeof initialPlanData.outline === 'string' 
            ? initialPlanData.outline 
            : JSON.stringify(initialPlanData.outline),
        platform: '', // Let user choose, or could infer
        status: 'not_started'
      })
      setIsAddOpen(true)
    }
  }, [initialPlanData])

  async function openCompose(it){
    setComposeItem(it)
    setComposeTitle(it.title || '')
    
    if (it.body !== undefined) {
      setComposeBody(it.body || '')
    } else {
      setComposeBody('')
      try {
        const fullItem = await getContentItem(it.id)
        if (fullItem) {
          setComposeItem(fullItem)
          setComposeBody(fullItem.body || '')
          // 更新列表中的数据，避免下次重新加载
          setItems(prev => {
            if (!Array.isArray(prev)) return prev
            return prev.map(x => x.id === it.id ? fullItem : x)
          })
        }
      } catch (e) {
        console.error('Failed to load content body', e)
      }
    }
    setIsComposeOpen(true)
  }

  function closeCompose(){
    setIsComposeOpen(false)
    setComposeItem(null)
    setComposeTitle('')
    setComposeBody('')
  }

  async function handleDeleteContentItem(it){
    if (!it?.id) return
    if (!await confirm({ title: '删除内容计划', message: '确认删除该内容计划？' })) return
    try {
      await deleteContentItem(it.id)
      showToast('删除成功', 'success')
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
      showToast('删除失败，请稍后重试', 'error')
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
        const res = await getContentItems(currentProduct.id, { platform: platform === 'all' ? null : platform, from, to, minimal: true })
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
  }, [currentProduct?.id, platform, currentMonth, refreshTrigger])
  useEffect(() => {
    if (!selectedDate) return
    const handler = (e) => {
      if (e.key === 'Escape') setSelectedDate(null)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [selectedDate?.date])
  useEffect(() => {
    setSelectedDate(null)
  }, [platform, currentMonth])

  const filtered = items

  const monthDays = useMemo(() => buildMonthGrid(currentMonth), [currentMonth])
  const groupedByDate = useMemo(() => groupByDate(filtered), [filtered])
  const isCurrentMonth = isSameMonth(currentMonth, new Date())

  return (
    <div className="bg-white rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 border-b border-gray-200 px-6 h-16 flex items-center justify-between">
        {isComposeOpen ? (
          <>
            <div className="flex items-center">
              <button onClick={closeCompose} className="text-sm font-semibold text-gray-500 hover:text-gray-700 underline-offset-2 hover:underline">排期公告板</button>
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
              <div className="text-lg font-semibold text-gray-900">排期公告板</div>
            </div>
            <div className="flex items-center gap-3">
              <AiTopicGenerator currentProduct={currentProduct} onContentCreated={() => setRefreshTrigger(t => t + 1)} />
              <button onClick={()=>setIsAddOpen(true)} className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <Plus className="w-3 h-3" />
                <span className="text-sm">新建计划</span>
              </button>
            </div>
          </>
        )}
      </div>

      <div className={`flex-1 p-6 hide-scrollbar ${isComposeOpen ? 'overflow-hidden flex flex-col' : 'overflow-auto'}`}>
        {isComposeOpen ? (
          <div className="flex flex-col gap-6 h-full">
            <div className="grid grid-cols-3 gap-6 h-full min-h-0">
              <div className="col-span-2 flex flex-col gap-4 h-full min-h-0">
                <div className="flex-shrink-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
                  <input value={composeTitle} onChange={(e)=>setComposeTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="输入内容标题" />
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">正文</label>
                  <RichTextEditor initialContent={composeBody} onChange={setComposeBody} className="flex-1 flex flex-col min-h-0" height="100%" />
                </div>
              </div>
              <div className="md:sticky top-4 h-full overflow-y-auto hide-scrollbar">
                {composeItem && (
                  <div className="rounded-xl p-4 bg-gray-50 mb-4">
                    <div className="text-xs font-medium text-gray-500 mb-2">选题方向</div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-semibold text-gray-900 leading-5">{getTopic(composeItem)}</div>
                      <span className="text-xs px-2 py-1 rounded inline-flex items-center gap-1" style={{ backgroundColor: brandBg(composeItem.platform), color: brandText(composeItem.platform) }}>
                        <PlatformBadge id={composeItem.platform} size={14} />
                        <span>{PLATFORM_MAP[composeItem.platform]?.name || composeItem.platform || '未选择平台'}</span>
                      </span>
                    </div>
                  </div>
                )}
                <div className="mb-4">
                  <AiDraftAssistant 
                    currentProduct={currentProduct} 
                    composeItem={composeItem}
                    topic={composeTitle || getTopic(composeItem)}
                    platform={composeItem?.platform}
                    onDraftGenerated={(draft) => setComposeBody(draft)}
                  />
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
                      className={`border rounded-lg p-1 min-h-[110px] ${selectedDate?.date === key ? 'ring-2 ring-blue-500 border-transparent z-10' : inMonth?'border-gray-200 bg-white':'border-gray-200 bg-gray-50'} relative group transition-all cursor-pointer`}
                      onClick={() => setSelectedDate(prev => (prev?.date === key ? null : { date: key, items: dayItems }))}
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
                          <div className="h-1 bg-blue-500" style={{ flexBasis: 0, flexGrow: dist.pending_publish }} />
                          <div className="h-1 bg-green-500" style={{ flexBasis: 0, flexGrow: dist.published }} />
                        </div>
                      )}
                    
                  </div>
                )
              })}
              </div>
              <div className="flex items-center space-x-4 text-xs text-gray-600">
                <div className="flex items-center space-x-1"><span className="w-3 h-3 bg-gray-400 rounded-sm"></span><span>未开始</span></div>
                <div className="flex items-center space-x-1"><span className="w-3 h-3 bg-yellow-400 rounded-sm"></span><span>撰写中</span></div>
                <div className="flex items-center space-x-1"><span className="w-3 h-3 bg-blue-500 rounded-sm"></span><span>待发布</span></div>
                <div className="flex items-center space-x-1"><span className="w-3 h-3 bg-green-500 rounded-sm"></span><span>已发布</span></div>
              </div>
            </div>
            <div className="col-span-1">
              <div className="bg-gray-50 rounded-xl p-4 h-[calc(100vh-180px)] sticky top-0 flex flex-col">
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-gray-900">{selectedDate ? '当日内容' : '本月内容'}</div>
                    {selectedDate && (
                      <button onClick={()=>setSelectedDate(null)} className="text-xs text-gray-700 hover:bg-gray-100 px-2 py-1 rounded">清除选择</button>
                    )}
                  </div>
                  <div className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">{
                    selectedDate 
                      ? (groupedByDate.get(selectedDate.date)?.length || 0)
                      : Array.from(groupedByDate.keys()).filter(k => isSameMonth(new Date(k), currentMonth)).reduce((acc,k)=> acc + (groupedByDate.get(k)?.length || 0), 0)
                  }</div>
                </div>
                <div className="relative flex-1 min-h-0">
                  {(!isLoading && hasLoaded && filtered.length === 0) ? null : (
                    <div className="absolute left-2.5 top-2 bottom-0 w-px bg-blue-100"></div>
                  )}
                  <div className="space-y-4 h-full overflow-y-auto pr-2 content-plan-scroll">
                    {isLoading ? (
                  <div className="space-y-8 pl-7 relative">
                    <div className="absolute left-2.5 top-2 bottom-0 w-px bg-blue-100"></div>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-center mb-2">
                          <div className="w-3 h-3 rounded-full bg-gray-200 border border-white relative -ml-6 mr-3"></div>
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </div>
                        <div className="space-y-3">
                          {[1, 2].map((j) => (
                            <div key={j} className="border border-gray-100 rounded-lg bg-white p-4 space-y-3">
                              <div className="flex justify-between items-start">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-8"></div>
                              </div>
                              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                              <div className="flex gap-2">
                                <div className="h-5 bg-gray-200 rounded w-16"></div>
                                <div className="h-5 bg-gray-200 rounded w-12"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                      <>
                    {Object.entries(Object.fromEntries(groupedByDate))
                          .filter(([date]) => {
                            if (selectedDate) return date === selectedDate.date
                            return isSameMonth(new Date(date), currentMonth)
                          })
                          .sort((a,b)=>{
                            const maxA = Math.max(...(a[1]||[]).map(x=> new Date(pickUpdatedAt(x) || x.created_at).getTime()))
                            const maxB = Math.max(...(b[1]||[]).map(x=> new Date(pickUpdatedAt(x) || x.created_at).getTime()))
                            return maxB - maxA
                          })
                          .map(([date, dayItems]) => (
                          <div key={date} className="pl-7">
                            <div className="flex items-center mb-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-500 relative -ml-6 mr-3"></div>
                              <div className="text-sm font-semibold text-blue-700">{date}</div>
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
                                  st==='pending_publish' ? 'bg-blue-100 text-blue-700' :
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
                                          <span>{PLATFORM_MAP[it.platform]?.name || it.platform || '未选择平台'}</span>
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
                      {it.body && stripHtml(it.body) && (
                        <div className="absolute left-0 right-0 mt-1 z-10 bg-white border border-gray-200 rounded shadow p-2 text-[12px] text-gray-700 hidden group-hover:block max-h-48 overflow-y-auto">
                          {stripHtml(it.body || '')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                        {selectedDate && (!groupedByDate.get(selectedDate.date) || (groupedByDate.get(selectedDate.date)?.length || 0) === 0) && (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                          <CalendarDays className="w-8 h-8 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">暂无数据</h3>
                        <p className="text-sm text-gray-500 mb-6">该日期暂未安排内容，点击新建计划进行安排</p>
                        <button 
                          onClick={() => { setPreFillDate(selectedDate.date); setIsAddOpen(true) }}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          新建计划
                        </button>
                      </div>
                    )}
                        {!isLoading && hasLoaded && filtered.length === 0 && !selectedDate && (
                      <div className="flex flex-col items-center justify-center py-16 text中心">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items中心 justify中心 mb-4">
                          <CalendarDays className="w-8 h-8 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">暂无内容计划</h3>
                        <p className="text-sm text-gray-500 mb-6">这个月还没有安排任何内容，开始规划吧！</p>
                        <button 
                          onClick={() => setIsAddOpen(true)}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          创建新计划
                        </button>
                      </div>
                    )}
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
              {(!isLoading && hasLoaded && filtered.length === 0) ? null : (
                <div className="absolute left-2.5 top-2 bottom-0 w-px bg-blue-100"></div>
              )}
              <div className="space-y-4">
                {isLoading ? (
                  <div className="space-y-8 pl-7 relative">
                    <div className="absolute left-2.5 top-2 bottom-0 w-px bg-blue-100"></div>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-center mb-2">
                          <div className="w-3 h-3 rounded-full bg-gray-200 border border-white relative -ml-6 mr-3"></div>
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </div>
                        <div className="space-y-3">
                          {[1, 2].map((j) => (
                            <div key={j} className="border border-gray-100 rounded-lg bg-white p-4 space-y-3">
                              <div className="flex justify-between items-start">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-8"></div>
                              </div>
                              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                              <div className="flex gap-2">
                                <div className="h-5 bg-gray-200 rounded w-16"></div>
                                <div className="h-5 bg-gray-200 rounded w-12"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {Object.entries(Object.fromEntries(groupedByDate))
                      .sort((a,b)=>{
                        const maxA = Math.max(...(a[1]||[]).map(x=> new Date(pickUpdatedAt(x) || x.created_at).getTime()))
                        const maxB = Math.max(...(b[1]||[]).map(x=> new Date(pickUpdatedAt(x) || x.created_at).getTime()))
                        return maxB - maxA
                      })
                      .map(([date, dayItems]) => (
                      <div key={date} className="pl-7">
                        <div className="flex items-center mb-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-500 relative -ml-6 mr-3"></div>
                          <div className="text-sm font-semibold text-blue-700">{date}</div>
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
                              st==='pending_publish' ? 'bg-blue-100 text-blue-700' :
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
                                      <span>{PLATFORM_MAP[it.platform]?.name || it.platform || '未选择平台'}</span>
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
                                    {it.body && stripHtml(it.body) && (
                                      <div className="absolute left-0 right-0 mt-1 z-10 bg-white border border-gray-200 rounded shadow p-2 text-[12px] text-gray-700 hidden group-hover:block max-h-48 overflow-y-auto">
                                        {stripHtml(it.body || '')}
                                      </div>
                                    )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    {!isLoading && hasLoaded && filtered.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                          <CalendarDays className="w-8 h-8 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">暂无内容计划</h3>
                        <p className="text-sm text-gray-500 mb-6">这个月还没有安排任何内容，开始规划吧！</p>
                        <button 
                          onClick={() => setIsAddOpen(true)}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          创建新计划
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {isAddOpen && (
        <AddContentItemModalEnhanced 
          onClose={()=>{
            setIsAddOpen(false)
            if (onPlanCreated) onPlanCreated() // Clear parent state on close
          }}
          onSubmit={async (form)=>{
            const created = await createContentItem({ product_id: currentProduct.id, platform: form.platform, schedule_at: form.schedule_at, status: form.status, topic_title: form.topic_title })
            
            // If we have initialPlanData with content (outline/body), update the item immediately
            let finalItem = created
            if (initialPlanData && initialPlanData.outline) {
               const outlineHtml = `
                 <h2>核心观点</h2><p>${initialPlanData.core_view}</p>
                 <h2>大纲</h2><ul>${initialPlanData.outline.map(line => `<li>${line}</li>`).join('')}</ul>
               `
               const updated = await updateContentItem(created.id, { body: outlineHtml })
               finalItem = updated
            }

            const createdWithTopic = {
              ...finalItem,
              topic_title: typeof finalItem?.topic_title !== 'undefined' ? finalItem.topic_title : (form.topic_title || '')
            }
            setItems(prev => {
              const matchPlatform = platform === 'all' || createdWithTopic.platform === platform
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
            setPreFillItem(null)
            if (onPlanCreated) onPlanCreated()
          }}
          currentProduct={currentProduct}
          defaultScheduleAt={preFillDate || ''}
          initialItem={preFillItem}
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
  if (it.summary) return it.summary
  return stripHtml(it.body || '')
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
