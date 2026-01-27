import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Link as LinkIcon, MessageSquare, Flame, Check, Sparkles, Loader2, ChevronRight, FileText, X, Lightbulb } from 'lucide-react';
import { useUI } from '../../context/UIContext';

// API helpers (mock for now if not imported)
const API_BASE = import.meta.env.VITE_API_BASE || '';

const InspirationInbox = ({ currentUser, selectedMaterials, onSelectionChange }) => {
  const { showToast } = useUI();
  const [inboxItems, setInboxItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all, trend, pain_point
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [inputType, setInputType] = useState('pain_point'); // pain_point, article
  const [itemToDelete, setItemToDelete] = useState(null);
  const [analyzingIds, setAnalyzingIds] = useState([]);
  const [viewingMaterial, setViewingMaterial] = useState(null);
  const [processingItem, setProcessingItem] = useState(null); // New state for processing item

  // Fetch Inbox Items
  useEffect(() => {
    fetchInbox();
  }, [currentUser]);

  const fetchInbox = async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/inbox/list?user_id=${currentUser.id}`);
      const json = await res.json();
      if (json.data) {
        // Sort by created_at desc to ensure newest first
        const sorted = json.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setInboxItems(sorted);
      }
    } catch (err) {
      console.error('Fetch inbox error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Add Item
  const handleAdd = async () => {
    if (!newContent.trim()) return;
    
    // Set processing state for visual feedback immediately
    if (inputType === 'article') {
      setProcessingItem({
        type: 'article',
        content: newContent,
        created_at: new Date().toISOString()
      });
      setIsAdding(false); // Close the add form
    }

    try {
      const res = await fetch(`${API_BASE}/api/inbox/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          type: inputType,
          content: newContent,
          source: 'manual'
        })
      });
      const json = await res.json();
      if (json.data) {
        setInboxItems([json.data, ...inboxItems]);
        if (inputType !== 'article') {
             setNewContent('');
             setIsAdding(false);
        } else {
             setNewContent('');
        }
        showToast('素材添加成功', 'success');
      }
    } catch (err) {
      showToast('添加失败', 'error');
    } finally {
      setProcessingItem(null); // Clear processing state
    }
  };

  // Analyze Item
  const handleAnalyze = async (id, e) => {
    e.stopPropagation();
    if (analyzingIds.includes(id)) return;
    
    setAnalyzingIds(prev => [...prev, id]);
    try {
        const res = await fetch(`${API_BASE}/api/inbox/${id}/analyze`, { method: 'POST' });
        const json = await res.json();
        if (json.data) {
            setInboxItems(prev => prev.map(item => item.id === id ? json.data : item));
            showToast('AI 分析完成', 'success');
        } else {
             showToast('AI 分析失败', 'error');
        }
    } catch (err) {
        showToast('AI 分析出错', 'error');
    } finally {
        setAnalyzingIds(prev => prev.filter(aid => aid !== id));
    }
  };

  // Delete Item
  const handleDeleteClick = (id, e) => {
    e.stopPropagation();
    setItemToDelete(id);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const id = itemToDelete;
    
    try {
      await fetch(`${API_BASE}/api/inbox/${id}`, { method: 'DELETE' });
      setInboxItems(inboxItems.filter(i => i.id !== id));
      // Deselect if selected
      if (selectedMaterials.find(m => m.id === id)) {
        onSelectionChange(selectedMaterials.filter(m => m.id !== id));
      }
      showToast('删除成功', 'success');
    } catch (err) {
      showToast('删除失败', 'error');
    } finally {
      setItemToDelete(null);
    }
  };

  // Toggle Selection
  const toggleSelection = (item) => {
    const isSelected = selectedMaterials.find(m => m.id === item.id);
    if (isSelected) {
      onSelectionChange(selectedMaterials.filter(m => m.id !== item.id));
    } else {
      if (selectedMaterials.length >= 3) {
        showToast('最多选择3个素材进行组合', 'warning');
        return;
      }
      onSelectionChange([...selectedMaterials, item]);
    }
  };

  const filteredItems = activeTab === 'all' 
    ? inboxItems 
    : inboxItems.filter(i => i.type === activeTab || (activeTab === 'trend' && i.type === 'trend'));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="pt-4 px-4 pb-0 border-b border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2 text-gray-800 font-bold text-lg">
            <div className="p-1.5 bg-violet-100 rounded-lg text-violet-600 shadow-sm">
              <Lightbulb className="w-4 h-4" />
            </div>
            <span>灵感素材收集箱</span>
            <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{inboxItems.length}</span>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            title="添加素材"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Quick Add Form */}
        {isAdding && (
          <div className="mb-4 bg-blue-50/50 p-3 rounded-xl border border-blue-100 animate-in slide-in-from-top-2">
            <div className="flex space-x-2 mb-2">
              <button 
                onClick={() => setInputType('pain_point')}
                className={`text-xs px-2 py-1 rounded ${inputType === 'pain_point' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
              >
                痛点/评论
              </button>
              <button 
                onClick={() => setInputType('article')}
                className={`text-xs px-2 py-1 rounded ${inputType === 'article' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
              >
                文章链接
              </button>
            </div>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={inputType === 'pain_point' ? "粘贴用户评论或痛点描述..." : "粘贴文章链接..."}
              className="w-full text-sm p-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 mb-2 min-h-[60px]"
            />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setIsAdding(false)} className="text-xs text-gray-500 hover:text-gray-700">取消</button>
              <button onClick={handleAdd} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">确认添加</button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-4 text-sm">
          {['all', 'trend', 'pain_point'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-1 relative ${activeTab === tab ? 'text-blue-600 font-medium' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {tab === 'all' ? '全部' : tab === 'trend' ? '热点' : '痛点'}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col space-y-3 hover-scrollbar">
        {processingItem && (
            <div className="relative p-3 rounded-xl border border-blue-200 bg-white shadow-sm flex flex-col overflow-hidden">
                {/* Progress Bar Animation */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-blue-100">
                    <div className="h-full bg-blue-500 animate-[shimmer_2s_infinite] w-1/3" />
                </div>
                
                <div className="flex justify-between items-start mb-2 shrink-0 mt-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-50 text-blue-600 flex items-center border border-blue-100">
                        <Loader2 size={10} className="animate-spin mr-1" />
                        正在智能解析...
                    </span>
                </div>
                <div className="mb-2">
                    <p className="text-sm text-gray-500 line-clamp-1 leading-relaxed italic">
                        {processingItem.content}
                    </p>
                    <div className="mt-2 flex items-center space-x-2">
                         <div className="h-2 w-16 bg-gray-100 rounded animate-pulse" />
                         <div className="h-2 w-24 bg-gray-100 rounded animate-pulse delay-75" />
                         <div className="h-2 w-12 bg-gray-100 rounded animate-pulse delay-150" />
                    </div>
                </div>
            </div>
        )}

        {isLoading ? (
          <div className="col-span-2 text-center py-8 text-gray-400 text-sm">加载中...</div>
        ) : filteredItems.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-gray-400 text-sm flex flex-col items-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 text-2xl">🍃</div>
            <p>还没有灵感素材</p>
            <p className="text-xs mt-1 opacity-70">去热点雷达看看，或者手动添加</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const isSelected = !!selectedMaterials.find(m => m.id === item.id);
            return (
              <div 
                key={item.id}
                onClick={() => toggleSelection(item)}
                className={`
                  group relative p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md flex flex-col
                  ${isSelected ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/20 scale-[0.99]' : 'border-gray-100 bg-white hover:border-blue-200'}
                `}
              >
                {/* Type Badge & Delete */}
                <div className="flex justify-between items-start mb-2 shrink-0 pr-7">
                  <span className={`
                    text-[10px] px-1.5 py-0.5 rounded font-medium
                    ${item.type === 'trend' ? 'bg-orange-50 text-orange-600' : 
                      item.type === 'pain_point' ? 'bg-purple-50 text-purple-600' : 
                      'bg-green-50 text-green-600'}
                  `}>
                    {item.type === 'trend' ? '🔥 热点' : item.type === 'pain_point' ? '💬 痛点' : '🔗 文章'}
                  </span>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* View Details Button (if analyzed) */}
                    {item.meta_data?.ai_analysis && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setViewingMaterial(item);
                            }}
                            className="text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded p-1 transition-all"
                            title="查看详细分析报告"
                        >
                            <FileText size={14} />
                        </button>
                    )}

                    {/* Analyze Button */}
                    <button
                        onClick={(e) => handleAnalyze(item.id, e)}
                        className={`p-1 rounded transition-all ${
                            analyzingIds.includes(item.id) 
                            ? 'text-indigo-500 bg-indigo-50 cursor-wait opacity-100' 
                            : 'text-gray-300 hover:text-indigo-500 hover:bg-indigo-50'
                        }`}
                        title={item.meta_data?.ai_analysis ? "重新分析" : "AI 深度分析"}
                        disabled={analyzingIds.includes(item.id)}
                    >
                        {analyzingIds.includes(item.id) ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Sparkles size={14} />
                        )}
                    </button>
                    
                    {/* Delete Button */}
                    <button 
                      onClick={(e) => handleDeleteClick(item.id, e)}
                      className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded p-1 transition-all"
                      title="删除素材"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="mb-2">
                  {item.meta_data?.full_text ? (
                    <>
                      <h3 className="text-sm font-bold text-gray-800 mb-1 line-clamp-2">{item.content}</h3>
                      <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed mb-2">
                        {item.meta_data.full_text}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-700 line-clamp-4 leading-relaxed mb-2">
                      {item.content}
                    </p>
                  )}
                  
                  {/* AI Analysis Preview */}
                  {item.meta_data?.ai_analysis && (
                    <div 
                        className="mt-2 bg-indigo-50/50 rounded-lg p-2 text-xs border border-indigo-100 hover:bg-indigo-50 hover:border-indigo-200 transition-colors cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            setViewingMaterial(item);
                        }}
                    >
                        <div className="flex items-center justify-between text-indigo-700 font-bold mb-1">
                            <span className="flex items-center"><span className="mr-1">🤖</span> AI 深度分析</span>
                            <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-indigo-100 text-indigo-500 flex items-center shadow-sm">
                                查看详情 <ChevronRight size={10} className="ml-0.5" />
                            </span>
                        </div>
                        <div className="space-y-1 text-gray-600">
                            <p><span className="font-semibold text-indigo-600">核心观点：</span>{item.meta_data.ai_analysis.core_view}</p>
                            <p><span className="font-semibold text-indigo-600">为什么好：</span>{item.meta_data.ai_analysis.why_good}</p>
                        </div>
                    </div>
                  )}
                </div>

                {/* Source & Time */}
                <div className="flex justify-between items-center text-[10px] text-gray-400 shrink-0 mt-auto pt-2 border-t border-gray-50">
                  <div className="flex items-center space-x-2">
                    <span>{item.source === 'manual' ? '手动录入' : item.source}</span>
                    {item.meta_data?.url && (
                      <a 
                        href={item.meta_data.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center text-blue-400 hover:text-blue-600"
                        title="查看原文"
                      >
                        <LinkIcon size={10} className="mr-0.5" /> 原文
                      </a>
                    )}
                  </div>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>

                {/* Checkbox for visual confirmation */}
                <div className={`
                  absolute top-3 right-3 w-5 h-5 rounded-full border flex items-center justify-center transition-all shadow-sm
                  ${isSelected ? 'bg-blue-500 border-blue-500 text-white scale-110' : 'border-gray-200 text-transparent bg-white'}
                `}>
                  <Check size={12} strokeWidth={3} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Analysis Drawer */}
      {viewingMaterial && (
        <AnalysisDrawer 
            material={viewingMaterial} 
            onClose={() => setViewingMaterial(null)} 
        />
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-[320px] animate-in zoom-in-95 duration-200 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-2">确认删除？</h3>
            <p className="text-sm text-gray-500 mb-6">删除后无法恢复，该素材将从收集箱中移除。</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg shadow-sm transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

const AnalysisDrawer = ({ material, onClose }) => {
    if (!material || !material.meta_data?.ai_analysis) return null;

    const analysis = material.meta_data.ai_analysis;
    
    const sections = [
        { title: '现象', key: 'phenomenon', color: 'bg-blue-50 text-blue-700 border-blue-100' },
        { title: '核心观点', key: 'core_view', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
        { title: '底层逻辑', key: 'logic', color: 'bg-purple-50 text-purple-700 border-purple-100' },
        { title: '论证论据', key: 'arguments', color: 'bg-gray-50 text-gray-700 border-gray-100' },
        { title: '结论', key: 'conclusion', color: 'bg-green-50 text-green-700 border-green-100' },
        { title: '手法/金句', key: 'technique', color: 'bg-amber-50 text-amber-700 border-amber-100' },
        { title: '情绪点', key: 'emotion_points', color: 'bg-rose-50 text-rose-700 border-rose-100' },
        { title: '为什么好', key: 'why_good', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
        { title: '不足之处', key: 'shortcomings', color: 'bg-red-50 text-red-700 border-red-100' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            
            {/* Drawer */}
            <div className="relative w-[480px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center">
                            <span className="mr-2">🤖</span> AI 深度分析报告
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 max-w-[360px]">
                            针对：{material.content}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 hover-scrollbar">
                    {sections.map((section) => (
                        <div key={section.key} className="space-y-2">
                            <h4 className="text-sm font-bold text-gray-800 flex items-center">
                                <span className={`w-1.5 h-4 rounded-full mr-2 ${section.color.split(' ')[0].replace('bg-', 'bg-')}`}></span>
                                {section.title}
                            </h4>
                            <div className={`p-4 rounded-xl border text-sm leading-relaxed ${section.color}`}>
                                {analysis[section.key] || '暂无分析内容'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InspirationInbox;
