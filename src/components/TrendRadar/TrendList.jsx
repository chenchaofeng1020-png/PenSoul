import React, { useState, useEffect } from 'react'
import { TrendingUp, Activity, Zap, RotateCcw, Plus, ExternalLink, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react'

// Platform Icons Map
const PlatformBadge = ({ source }) => {
  const badges = {
    zhihu: { icon: <Activity className="w-3 h-3" />, color: 'text-blue-600 bg-blue-50 border-blue-100', label: '知' },
    weibo: { icon: <TrendingUp className="w-3 h-3" />, color: 'text-red-600 bg-red-50 border-red-100', label: '微' },
    '36kr': { icon: <Zap className="w-3 h-3" />, color: 'text-amber-600 bg-amber-50 border-amber-100', label: '36' },
    baidu: { icon: <ExternalLink className="w-3 h-3" />, color: 'text-blue-700 bg-blue-50 border-blue-200', label: '度' }
  }
  const config = badges[source] || { icon: null, color: 'text-gray-500 bg-gray-50 border-gray-100', label: source.slice(0, 1).toUpperCase() }
  
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border ${config.color} shadow-sm`} title={source}>
      {config.label}
    </span>
  )
}

// Relative time formatter
function formatRelativeTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟内`
  if (diffH < 24) return `${diffH} 小时内`
  if (diffD === 1) return '昨天'
  if (diffD < 7) return `${diffD} 天前`
  return d.toLocaleDateString()
}

export default function TrendList({ trends, loading, onRefresh, newCount }) {
  const [cooldown, setCooldown] = useState(0)
  const [platformFilter, setPlatformFilter] = useState(new Set())
  const [categoryFilter, setCategoryFilter] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 20

  useEffect(() => {
    setCurrentPage(1)
  }, [platformFilter, categoryFilter, trends])

  const filteredTrends = React.useMemo(() => {
    return trends
      .filter(t => platformFilter.size === 0 || (t.platforms || [t.source]).some(p => platformFilter.has(p)))
      .filter(t => !categoryFilter || t.category === categoryFilter)
  }, [trends, platformFilter, categoryFilter])
  
  // Custom Fetch State
  const [showFetchModal, setShowFetchModal] = useState(false)
  const [fetchPlatform, setFetchPlatform] = useState('zhihu')
  const [fetchCategory, setFetchCategory] = useState('')
  const [fetchingCustom, setFetchingCustom] = useState(false)

  useEffect(() => {
    let timer
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [cooldown])

  const handleRefresh = () => {
    if (cooldown > 0 || loading) return
    if (onRefresh) onRefresh()
    setCooldown(60) // 60s cooldown
  }

  const handleCustomFetch = async () => {
    setFetchingCustom(true)
    try {
      const res = await fetch('/api/trends/fetch-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: fetchPlatform, category: fetchCategory })
      })
      const json = await res.json()
      if (json.data && json.data.length > 0) {
        if (onRefresh) onRefresh() // Refresh to see new data
        setShowFetchModal(false)
      } else {
        alert(json.message || '未找到相关热点')
      }
    } catch (err) {
      console.error(err)
      alert('获取失败，请重试')
    } finally {
      setFetchingCustom(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white w-full flex-shrink-0 z-10 relative">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 px-6 h-16 flex items-center justify-between bg-white">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-900">全网热点</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFetchModal(!showFetchModal)}
            className="p-2 rounded-full bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200 shadow-sm transition-colors"
            title="手动获取特定热点"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefresh}
            disabled={cooldown > 0 || loading}
            className={`p-2 rounded-full transition-colors ${
              cooldown > 0 || loading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200 shadow-sm'
            }`}
            title="刷新热点 (60s冷却)"
          >
            {cooldown > 0 ? (
              <span className="text-xs font-mono font-medium w-4 h-4 flex items-center justify-center">{cooldown}</span>
            ) : (
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            )}
          </button>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="px-6 py-3 border-b border-gray-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            AI 实时聚合 <span className="font-semibold text-gray-700">{trends.length}</span> 个高价值话题
            {newCount > 0 && (
              <span className="ml-2 text-[11px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                新增 {newCount} 条
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Platform Filter */}
          {['zhihu','weibo','36kr','baidu'].map(p => (
            <button
              key={p}
              className={`inline-flex items-center px-2 py-1 rounded text-xs border ${
                platformFilter.has(p) ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => {
                const next = new Set(platformFilter)
                if (next.has(p)) next.delete(p); else next.add(p)
                setPlatformFilter(next)
              }}
            >
              {p === 'baidu' ? '百度' : p}
            </button>
          ))}
          {/* Category Filter */}
          <select
            className="text-xs bg-white border border-gray-200 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            value={categoryFilter || ''}
            onChange={e => setCategoryFilter(e.target.value || null)}
          >
            <option value="">全部分类</option>
            {[...new Set(trends.map(t => t.category).filter(Boolean))].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Fetch Modal Popover */}
      {showFetchModal && (
        <div className="absolute top-16 right-6 z-50 bg-white border border-gray-200 shadow-xl rounded-lg p-4 w-64 animate-in fade-in zoom-in duration-200">
          <h3 className="text-sm font-bold text-gray-800 mb-3">获取特定热点</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">平台</label>
              <select 
                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={fetchPlatform}
                onChange={e => setFetchPlatform(e.target.value)}
              >
                <option value="zhihu">知乎</option>
                <option value="weibo">微博</option>
                <option value="36kr">36Kr</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">分类/标签</label>
              <select 
                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={fetchCategory}
                onChange={e => setFetchCategory(e.target.value)}
              >
                <option value="">默认 (全部)</option>
                <option value="科技">科技/数码</option>
                <option value="娱乐">娱乐</option>
                <option value="社会">社会</option>
                <option value="体育">体育</option>
              </select>
            </div>
            <button
              onClick={handleCustomFetch}
              disabled={fetchingCustom}
              className="w-full py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {fetchingCustom ? '获取中...' : '立即获取'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-indigo-100 border-t-indigo-600"></div>
            <p className="text-xs text-gray-400">正在同步全网数据...</p>
          </div>
        ) : (
          <>
            <div className="flex-1 p-6">
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredTrends
                  .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                  .map((trend, index) => {
                  // Calculate actual index for ranking
                  const actualIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;
                  return (
                    <li
                      key={trend.id}
                      className="relative group p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-md transition-all duration-200 flex flex-col h-full"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {/* Rank Badge */}
                        <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center text-xs font-bold rounded font-mono ${
                          actualIndex < 3 
                            ? 'text-red-600 bg-red-50' 
                            : 'text-gray-400 bg-gray-100'
                        }`}>
                          {actualIndex + 1}
                        </span>

                        <h3 className="text-base font-medium leading-snug text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
                          {trend.title}
                        </h3>
                      </div>
                      
                      <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-50">
                        <div className="flex items-center gap-2 flex-wrap">
                          {(trend.platforms || [trend.source]).map(p => (
                            <PlatformBadge key={p} source={p} />
                          ))}
                          {/* Category Tag */}
                          {trend.category && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-500 border border-gray-100">
                              {trend.category}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {/* Time Tag */}
                            {trend.cluster_time && (
                            <span className="text-[11px] text-gray-400 whitespace-nowrap">
                                {formatRelativeTime(trend.cluster_time)}
                            </span>
                            )}
                            {/* External Link */}
                            {trend.url && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(trend.url, '_blank');
                                }}
                                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
                                title="查看原文"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Pagination Controls */}
            {filteredTrends.length > ITEMS_PER_PAGE && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
                <span className="text-xs text-gray-500">
                  显示 {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredTrends.length)} 条，共 {filteredTrends.length} 条
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium text-gray-700">
                    {currentPage} / {Math.ceil(filteredTrends.length / ITEMS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTrends.length / ITEMS_PER_PAGE), p + 1))}
                    disabled={currentPage >= Math.ceil(filteredTrends.length / ITEMS_PER_PAGE)}
                    className="p-1.5 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
