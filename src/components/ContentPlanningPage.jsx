import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Plus, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { getContentItems, createContentItem, updateContentItem } from '../services/api'
import { PLATFORMS, PLATFORM_MAP } from '../constants/platforms'
import PlatformBadge from './PlatformBadge'
import AddContentItemModalEnhanced from './AddContentItemModalEnhanced'

const platforms = PLATFORMS

export default function ContentPlanningPage({ currentProduct }) {
  const [view, _setView] = useState('calendar')
  const [items, setItems] = useState([])
  const [platform, setPlatform] = useState('all')
  const [isAddOpen, setIsAddOpen] = useState(false)
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
        <div className="flex items-center">
          <div className="text-lg font-semibold text-gray-900">内容日历</div>
        </div>
        <div className="flex items-center">
          <button onClick={()=>setIsAddOpen(true)} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            <span>新建计划</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {view === 'calendar' ? (
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
                        <button onClick={(e)=>{e.stopPropagation(); setIsAddOpen(true)}} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">+</button>
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
                          <div className="h-1 bg-green-500" style={{ flexBasis: 0, flexGrow: dist.published }} />
                          <div className="h-1 bg-yellow-400" style={{ flexBasis: 0, flexGrow: dist.writing }} />
                          <div className="h-1 bg-purple-500" style={{ flexBasis: 0, flexGrow: dist.review }} />
                        </div>
                      )}
                    {hoverPreview.key === key && dayItems.length > 0 && (
                      <div className="absolute z-10 left-2 right-2 top-10 bg-white border border-gray-200 rounded-lg shadow p-2">
                        {dayItems.map(it => (
                          <div key={it.id} className="text-xs text-gray-700 truncate">
                            {it.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              </div>
              <div className="flex items-center space-x-4 text-xs text-gray-600">
              <div className="flex items-center space-x-1"><span className="w-3 h-3 bg-green-500 rounded-sm"></span><span>已发布</span></div>
              <div className="flex items-center space-x-1"><span className="w-3 h-3 bg-yellow-400 rounded-sm"></span><span>撰写中</span></div>
              <div className="flex items-center space-x-1"><span className="w-3 h-3 bg-purple-500 rounded-sm"></span><span>待审核</span></div>
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
                    {Object.entries(Object.fromEntries(groupedByDate)).filter(([date]) => isSameMonth(new Date(date), currentMonth)).sort((a,b)=> new Date(a[0]) - new Date(b[0])).map(([date, dayItems]) => (
                          <div key={date} className="pl-10">
                            <div className="flex items-center mb-2">
                              <div className="w-3 h-3 rounded-full bg-gray-300 border border-gray-300 relative -ml-[30px] mr-3"></div>
                              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{date}</div>
                            </div>
                            <div className="space-y-3">
                              {dayItems.map(it => {
                                const st = inferStatus(it)
                                const statusColor = st==='published'?'bg-green-100 text-green-700':st==='writing'?'bg-yellow-100 text-yellow-700':'bg-purple-100 text-purple-700'
                                return (
                                  <div key={it.id} className="border border-gray-100 rounded-lg p-3 bg-white cursor-pointer" onClick={()=>{ setEditItem(it); setIsEditOpen(true) }}>
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                      <div className="font-medium text-gray-900 text-[14px] whitespace-normal break-words flex-1">{it.title}</div>
                                      <span className={`text-[12px] px-2 py-1 rounded ${statusColor}`}>{statusLabel(st)}</span>
                                    </div>
                                    <div className="text-[12px] text-gray-500 mb-1">{formatDateTime(it.created_at)}</div>
                                    <div className="flex items-center flex-wrap gap-2">
                                      <span className="text-[12px] px-2 py-1 rounded inline-flex items-center gap-1" style={{ backgroundColor: brandBg(it.platform), color: brandText(it.platform) }}>
                                        <PlatformBadge id={it.platform} size={14} />
                                        <span>{PLATFORM_MAP[it.platform]?.name || it.platform}</span>
                                      </span>
                                      {typeof it.views === 'number' && <span className="text-xs text-gray-500 ml-auto">{it.views} 阅读</span>}
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
                    {Object.entries(Object.fromEntries(groupedByDate)).sort((a,b)=> new Date(a[0]) - new Date(b[0])).map(([date, dayItems]) => (
                      <div key={date} className="pl-10">
                        <div className="flex items-center mb-2">
                          <div className="w-3 h-3 rounded-full bg-gray-300 border border-gray-300 relative -ml-[30px] mr-3"></div>
                          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{date}</div>
                        </div>
                        <div className="space-y-3">
                          {dayItems.map(it => {
                            const st = inferStatus(it)
                            const statusColor = st==='published'?'bg-green-100 text-green-700':st==='writing'?'bg-yellow-100 text-yellow-700':'bg-purple-100 text-purple-700'
                            return (
                              <div key={it.id} className="border border-gray-100 rounded-lg p-3 bg-white cursor-pointer" onClick={()=>{ setEditItem(it); setIsEditOpen(true) }}>
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="font-medium text-gray-900 text-[14px] whitespace-normal break-words flex-1">{it.title}</div>
                                  <span className={`text-[12px] px-2 py-1 rounded ${statusColor}`}>{statusLabel(st)}</span>
                                </div>
                                <div className="text-[12px] text-gray-500 mb-1">{formatDateTime(it.created_at)}</div>
                                <div className="flex items-center flex-wrap gap-2">
                                  <span className="text-[12px] px-2 py-1 rounded inline-flex items-center gap-1" style={{ backgroundColor: brandBg(it.platform), color: brandText(it.platform) }}>
                                    <PlatformBadge id={it.platform} size={14} />
                                    <span>{PLATFORM_MAP[it.platform]?.name || it.platform}</span>
                                  </span>
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
            const created = await createContentItem({ ...form, product_id: currentProduct.id })
            setItems(prev => {
              const matchPlatform = platform === 'all' || created.platform === platform
              const base = Array.isArray(prev) ? prev.slice() : []
              if (!matchPlatform) return base
              const next = [...base, created]
              next.sort((a,b)=> new Date(a.schedule_at) - new Date(b.schedule_at))
              return next
            })
            try {
              const { from, to } = getMonthRange(currentMonth)
              const keyParts = [currentProduct.id, platform === 'all' ? 'all' : platform, from, to]
              const cacheKey = `content_items_cache_${keyParts.join('_')}`
              const cached = Array.isArray(items) ? items.slice() : []
              const merged = [...cached, created].sort((a,b)=> new Date(a.schedule_at) - new Date(b.schedule_at))
              localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: merged }))
            } catch { void 0 }
            setIsAddOpen(false)
          }}
          currentProduct={currentProduct}
        />
      )}

      {isEditOpen && editItem && (
        <AddContentItemModalEnhanced 
          onClose={()=>{ setIsEditOpen(false); setEditItem(null) }}
          onSubmit={async (form)=>{
            const updates = {
              platform: form.platform,
              title: form.title,
              body: form.body,
              schedule_at: form.schedule_at,
              status: form.status,
            }
            const updated = await updateContentItem(editItem.id, updates)
            setItems(prev => {
              const base = Array.isArray(prev) ? prev.slice() : []
              const filtered = base.filter(x => x.id !== editItem.id)
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
              const merged = [...cached.filter(x=>x.id!==editItem.id), updated]
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
                  <div className="font-medium text-gray-900">{it.title}</div>
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
  if (s === 'published' || s === 'writing' || s === 'review') return s
  if (s === 'draft') return 'writing'
  const now = Date.now()
  const t = new Date(it.schedule_at).getTime()
  if (t < now) return 'published'
  return 'writing'
}

function statusDistribution(items){
  const dist = { published: 0, writing: 0, review: 0 }
  items.forEach(it => {
    const st = inferStatus(it)
    if (st === 'published') dist.published++
    else if (st === 'review') dist.review++
    else dist.writing++
  })
  const sum = dist.published + dist.writing + dist.review
  if (items.length > 0 && sum === 0) {
    dist.writing = items.length
  }
  return dist
}

function statusLabel(st){
  if (st==='published') return '已发布'
  if (st==='review') return '待审核'
  if (st==='writing') return '撰写中'
  return '撰写中'
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
  const found = terms.find(t => t.m===m && Math.abs(t.d - day) <= 1)
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
