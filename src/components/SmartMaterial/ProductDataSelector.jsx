import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Check, Circle, CheckCircle2, Loader2, FileText, Tag, Users, Target, HelpCircle } from 'lucide-react';
import { 
  getProductSellingPoints, 
  getProductFeatures, 
  getProductStories, 
  getProductFaqs, 
  getProductMessaging,
  getProductFeatureCards
} from '../../services/api';

const MODULES = [
  { id: 'basic_info', label: '产品基础信息', icon: FileText, description: '包含产品名称、Slogan、定位和描述' },
  { id: 'selling_points', label: '核心卖点', icon: Tag, description: '产品的关键竞争优势' },
  { id: 'features', label: '功能特性', icon: CheckCircle2, description: '具体的功能点列表' },
  { id: 'personas', label: '用户画像', icon: Users, description: '目标用户群体及其痛点' },
  { id: 'stories', label: '用户故事', icon: Target, description: '典型的用户使用场景' },
  { id: 'faqs', label: '常见问题', icon: HelpCircle, description: '产品相关的 FAQ' }
];

export function ProductDataSelector({ productId, onConfirm, onCancel, initialConfig }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});
  const [selection, setSelection] = useState(initialConfig?.modules || {
    basic_info: ['all'],
    selling_points: [],
    features: [],
    personas: [], // Currently personas API is not ready in mockup, handle gracefully
    stories: [],
    faqs: []
  });
  const [expanded, setExpanded] = useState(['selling_points', 'features']);

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sp, feat, stories, faqs, msg] = await Promise.all([
        getProductSellingPoints(productId),
        getProductFeatures(productId),
        getProductStories(productId),
        getProductFaqs(productId),
        getProductMessaging(productId)
      ]);
      
      setData({
        selling_points: sp || [],
        features: feat || [],
        stories: stories || [],
        faqs: faqs || [],
        basic_info: [{ id: 'all', title: '基础信息 (名称/定位/Slogan)' }], // Virtual item
        personas: [] // Placeholder
      });
      
      // If initial config is empty (new link), default select all available items
      if (!initialConfig) {
        setSelection({
           basic_info: ['all'],
           selling_points: sp?.map(i => i.id) || [],
           features: feat?.map(i => i.id) || [],
           stories: stories?.map(i => i.id) || [],
           faqs: faqs?.map(i => i.id) || [],
           personas: []
        });
      }
    } catch (e) {
      console.error('Failed to load product data', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId) => {
    if (expanded.includes(moduleId)) {
      setExpanded(expanded.filter(id => id !== moduleId));
    } else {
      setExpanded([...expanded, moduleId]);
    }
  };

  const toggleItem = (moduleId, itemId) => {
    const current = selection[moduleId] || [];
    let newSelection;
    if (current.includes(itemId)) {
      newSelection = current.filter(id => id !== itemId);
    } else {
      newSelection = [...current, itemId];
    }
    setSelection({ ...selection, [moduleId]: newSelection });
  };

  const toggleAllInModule = (moduleId) => {
    const moduleItems = data[moduleId] || [];
    const currentSelection = selection[moduleId] || [];
    
    if (currentSelection.length === moduleItems.length) {
      // Unselect all
      setSelection({ ...selection, [moduleId]: [] });
    } else {
      // Select all
      setSelection({ ...selection, [moduleId]: moduleItems.map(i => i.id) });
    }
  };

  const getSelectionSummary = () => {
    let count = 0;
    Object.values(selection).forEach(arr => count += arr.length);
    return count;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
        <p className="text-gray-500 text-sm">正在获取产品资料...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-gray-800">关联产品资料</h3>
          <p className="text-xs text-gray-500 mt-0.5">勾选需要 AI 参考的资料模块，实时同步最新内容</p>
        </div>
        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-xs font-medium">
          已选 {getSelectionSummary()} 项
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {MODULES.map(module => {
          const items = data[module.id] || [];
          if (items.length === 0 && module.id !== 'basic_info') return null;

          const isExpanded = expanded.includes(module.id);
          const selectedCount = (selection[module.id] || []).length;
          const isAllSelected = items.length > 0 && selectedCount === items.length;
          const isPartiallySelected = selectedCount > 0 && selectedCount < items.length;

          return (
            <div key={module.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div 
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => toggleModule(module.id)}
              >
                <div className="flex items-center space-x-3">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  <div className="p-1.5 bg-white rounded-md border border-gray-200 text-gray-500">
                    <module.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-800">{module.label}</h4>
                    <p className="text-[10px] text-gray-400">{module.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3" onClick={e => e.stopPropagation()}>
                  <span className="text-xs text-gray-400">{selectedCount} / {items.length}</span>
                  <div 
                    onClick={() => toggleAllInModule(module.id)}
                    className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                      isAllSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 
                      isPartiallySelected ? 'bg-indigo-50 border-indigo-300 text-indigo-600' : 
                      'bg-white border-gray-300 text-transparent hover:border-indigo-300'
                    }`}
                  >
                    {isAllSelected && <Check className="w-3.5 h-3.5" />}
                    {isPartiallySelected && <div className="w-2 h-2 bg-current rounded-sm" />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="bg-white p-2 space-y-1">
                  {items.map(item => {
                    const isSelected = (selection[module.id] || []).includes(item.id);
                    return (
                      <div 
                        key={item.id} 
                        className="group flex items-start p-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => toggleItem(module.id, item.id)}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mr-3 transition-colors ${
                          isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 hover:border-indigo-400'
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                            {item.title || item.name || item.question || item.content?.slice(0, 30)}
                          </p>
                          {(item.description || item.answer || item.selling_point) && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                              {item.description || item.answer || item.selling_point}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50/30">
        <button 
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          取消
        </button>
        <button 
          onClick={() => onConfirm(selection)}
          className="px-6 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors font-medium"
        >
          确认关联
        </button>
      </div>
    </div>
  );
}
