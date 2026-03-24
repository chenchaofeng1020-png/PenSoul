import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, Plus, FileText, Package, Users, Target, MessageSquare, Lightbulb } from 'lucide-react';
import { 
  getProductSellingPoints, 
  getProductFeatures, 
  getProductStories, 
  getProductFaqs, 
  getProductMessaging,
  getProductFeatureCards,
  getProductPersonas,
  getProductDetails
} from '../../services/api';

const SECTIONS = [
  {
    id: 'product_definition',
    label: '产品定义',
    icon: Package,
    description: '产品基础信息、核心卖点、功能特性',
    types: ['product_definition_full']
  },
  {
    id: 'user_personas',
    label: '用户画像',
    icon: Users,
    description: '目标用户画像卡片',
    types: ['personas']
  },
  {
    id: 'user_stories',
    label: '用户故事',
    icon: Target,
    description: '用户故事卡片',
    types: ['stories']
  },
  {
    id: 'feature_cards',
    label: '功能卡片',
    icon: Lightbulb,
    description: '功能点介绍',
    types: ['feature_cards']
  },
  {
    id: 'product_intro',
    label: '产品介绍',
    icon: MessageSquare,
    description: '宣传语和产品介绍话术',
    types: ['messaging']
  }
];

export function ProductDataSelectorModal({ productId, isOpen, onClose, onConfirm }) {
  const [loading, setLoading] = useState(true);
  const [productData, setProductData] = useState({});
  const [productInfo, setProductInfo] = useState(null);
  const [expandedSections, setExpandedSections] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    if (isOpen && productId) {
      loadProductData();
    }
  }, [isOpen, productId]);

  const loadProductData = async () => {
    setLoading(true);
    try {
      console.log('Loading product data for:', productId);
      const [info, sellingPoints, features, stories, faqs, messaging, featureCards, personas] = await Promise.all([
        getProductDetails(productId, 'name, description, tagline, positioning, target_audience, pain_point, product_category, key_benefit, core_competitor, differentiation, overview_short, website_url, industry, status, version'),
        getProductSellingPoints(productId),
        getProductFeatures(productId),
        getProductStories(productId),
        getProductFaqs(productId),
        getProductMessaging(productId),
        getProductFeatureCards(productId),
        getProductPersonas(productId)
      ]);

      console.log('Loaded data:', { info, sellingPoints, features, stories, messaging, featureCards, personas });

      setProductInfo(info);
      const newData = {
        product_definition_full: info ? [{
          id: 'product_definition_full',
          title: '产品定义完整资料',
          content: info,
          sellingPoints: sellingPoints || [],
          features: features || []
        }] : [],
        selling_points: sellingPoints || [],
        features: features || [],
        stories: stories || [],
        faqs: faqs || [],
        messaging: messaging || [],
        feature_cards: featureCards || [],
        personas: personas || []
      };
      console.log('Setting productData:', newData);
      setProductData(newData);
    } catch (e) {
      console.error('Failed to load product data:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId) => {
    if (expandedSections.includes(sectionId)) {
      setExpandedSections(expandedSections.filter(id => id !== sectionId));
    } else {
      setExpandedSections([...expandedSections, sectionId]);
    }
  };

  const isItemSelected = (item) => {
    return selectedItems.some(selected => 
      selected.type === item.type && selected.id === item.id
    );
  };

  const toggleItem = (item) => {
    if (isItemSelected(item)) {
      setSelectedItems(selectedItems.filter(selected => 
        !(selected.type === item.type && selected.id === item.id)
      ));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const getItemsForSection = (section) => {
    const items = [];
    section.types.forEach(type => {
      const typeItems = productData[type] || [];
      typeItems.forEach(item => {
        items.push({
          ...item,
          type,
          displayTitle: getItemDisplayTitle(item, type),
          displayContent: getItemDisplayContent(item, type)
        });
      });
    });
    return items;
  };

  const getItemDisplayTitle = (item, type) => {
    switch (type) {
      case 'product_definition_full':
        return '产品定义完整资料';
      case 'basic_info':
        return item.title || '产品基础信息';
      case 'selling_points':
        return item.title || item.selling_point || '核心卖点';
      case 'features':
        return item.name || '功能特性';
      case 'personas':
        return item.name || '用户画像';
      case 'stories':
        return item.who || '用户故事';
      case 'feature_cards':
        return item.title || '功能卡片';
      case 'messaging':
        return item.anchor_message || item.content?.substring(0, 30) || '营销文案';
      default:
        return item.title || item.name || '未命名';
    }
  };

  const getItemDisplayContent = (item, type) => {
    switch (type) {
      case 'product_definition_full':
        const info = item.content || {};
        return `产品名称：${info.name || ''} | 定位：${info.positioning?.substring(0, 50) || ''}...`;
      case 'basic_info':
        return item.content || '';
      case 'selling_points':
        return item.description || '';
      case 'features':
        return item.description || '';
      case 'personas':
        return `${item.role_tag || ''}\n${item.quote || ''}`;
      case 'stories':
        return `目标：${item.user_goal || ''}\n痛点：${item.max_pain || ''}\n方案：${item.our_solution || ''}`;
      case 'feature_cards':
        return [item.intro_source, item.intro_scenario, item.intro_problem, item.intro_solution, item.intro_effect]
          .filter(Boolean)
          .join(' | ') || item.description || '';
      case 'messaging':
        return item.content || `${item.pain || ''}\n${item.anchor_message || ''}\n${item.benefit || ''}`;
      default:
        return item.description || item.content || '';
    }
  };

  // 获取类型对应的 Tab 名称
  const getTypeTabName = (type) => {
    const typeMap = {
      'product_definition_full': '产品定义',
      'basic_info': '产品定义',
      'selling_points': '产品定义',
      'features': '产品定义',
      'personas': '用户画像',
      'stories': '用户故事',
      'feature_cards': '功能卡片',
      'messaging': '产品介绍'
    };
    return typeMap[type] || '产品规划';
  };

  const handleConfirm = () => {
    if (selectedItems.length === 0) {
      return;
    }
    
    // 将选择的内容生成文档
    const documentContent = generateDocument(selectedItems, productInfo);
    
    // 生成显示标题（第一个选中项的名称 + 时间）
    const firstItem = selectedItems[0];
    const timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const displayTitle = `${firstItem.displayTitle}_${timeStr}`;
    
    // 生成副标题（所有涉及的 Tab 名称）
    const tabNames = [...new Set(selectedItems.map(item => getTypeTabName(item.type)))];
    const displaySubtitle = tabNames.join(' · ');
    
    onConfirm({
      fileName: `${displayTitle}.md`,
      fileType: 'product_data',
      content: documentContent,
      selectedItems: selectedItems,
      displayTitle: displayTitle,
      displaySubtitle: displaySubtitle
    });
    onClose();
    setSelectedItems([]);
  };

  const generateDocument = (items, productInfo) => {
    let doc = `# ${productInfo?.name || '产品'}规划资料\n\n`;
    doc += `生成时间：${new Date().toLocaleString()}\n\n`;
    doc += `---\n\n`;

    // 按类型分组
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    }, {});

    // 产品定义（完整版）
    if (grouped.product_definition_full) {
      grouped.product_definition_full.forEach(item => {
        const info = item.content || {};
        const sellingPoints = item.sellingPoints || [];
        const features = item.features || [];
        
        doc += `## 产品定义\n\n`;
        
        // 基础信息
        doc += `### 基础信息\n\n`;
        if (info.name) doc += `- **产品名称**：${info.name}\n`;
        if (info.description) doc += `- **产品描述**：${info.description}\n`;
        if (info.tagline) doc += `- **宣传语**：${info.tagline}\n`;
        if (info.positioning) doc += `- **产品定位**：${info.positioning}\n`;
        if (info.target_audience) doc += `- **目标客户**：${info.target_audience}\n`;
        if (info.pain_point) doc += `- **核心痛点**：${info.pain_point}\n`;
        if (info.product_category) doc += `- **产品品类**：${info.product_category}\n`;
        if (info.key_benefit) doc += `- **产品价值**：${info.key_benefit}\n`;
        if (info.core_competitor) doc += `- **主要竞品**：${info.core_competitor}\n`;
        if (info.differentiation) doc += `- **差异化优势**：${info.differentiation}\n`;
        if (info.overview_short) doc += `- **一句话介绍**：${info.overview_short}\n`;
        if (info.website_url) doc += `- **官网链接**：${info.website_url}\n`;
        if (info.industry) doc += `- **所属行业**：${info.industry}\n`;
        if (info.status) doc += `- **产品状态**：${info.status}\n`;
        if (info.version) doc += `- **版本号**：${info.version}\n`;
        doc += `\n`;
        
        // 核心卖点
        if (sellingPoints.length > 0) {
          doc += `### 核心卖点\n\n`;
          sellingPoints.forEach((sp, idx) => {
            doc += `${idx + 1}. **${sp.title || sp.selling_point || '卖点'}**\n`;
            if (sp.description) doc += `   ${sp.description}\n`;
            doc += `\n`;
          });
        }
        
        // 功能特性
        if (features.length > 0) {
          doc += `### 功能特性\n\n`;
          features.forEach((f, idx) => {
            doc += `${idx + 1}. **${f.name || '功能'}**\n`;
            if (f.description) doc += `   ${f.description}\n`;
            doc += `\n`;
          });
        }
      });
    }
    
    // 产品定义（旧版本兼容）
    if (grouped.basic_info || grouped.selling_points || grouped.features) {
      doc += `## 产品定义\n\n`;
      
      if (grouped.basic_info) {
        doc += `### 产品基础信息\n\n`;
        grouped.basic_info.forEach(item => {
          doc += `${item.content}\n\n`;
        });
      }
      
      if (grouped.selling_points) {
        doc += `### 核心卖点\n\n`;
        grouped.selling_points.forEach((item, idx) => {
          doc += `${idx + 1}. **${item.title || item.selling_point}**\n`;
          if (item.description) doc += `   ${item.description}\n`;
          doc += `\n`;
        });
      }
      
      if (grouped.features) {
        doc += `### 功能特性\n\n`;
        grouped.features.forEach((item, idx) => {
          doc += `${idx + 1}. **${item.name}**\n`;
          if (item.description) doc += `   ${item.description}\n`;
          doc += `\n`;
        });
      }
    }

    // 用户画像
    if (grouped.personas) {
      doc += `## 用户画像\n\n`;
      grouped.personas.forEach((item, idx) => {
        doc += `### ${item.name}${item.is_primary ? '（主要目标）' : ''}\n\n`;
        if (item.role_tag) doc += `- 角色：${item.role_tag}\n`;
        if (item.quote) doc += `- 语录："${item.quote}"\n`;
        doc += `\n`;
      });
    }

    // 用户故事
    if (grouped.stories) {
      doc += `## 用户故事\n\n`;
      grouped.stories.forEach((item, idx) => {
        doc += `### ${item.who}${item.is_primary ? '（主要场景）' : ''}\n\n`;
        if (item.role_tag) doc += `- 角色：${item.role_tag}\n`;
        if (item.user_goal) doc += `- 目标：${item.user_goal}\n`;
        if (item.max_pain) doc += `- 痛点：${item.max_pain}\n`;
        if (item.our_solution) doc += `- 解决方案：${item.our_solution}\n`;
        doc += `\n`;
      });
    }

    // 功能卡片
    if (grouped.feature_cards) {
      doc += `## 功能卡片\n\n`;
      grouped.feature_cards.forEach((item, idx) => {
        doc += `### ${item.title || '功能点'}\n\n`;
        if (item.description) doc += `${item.description}\n\n`;
        if (item.intro_source) doc += `- 功能介绍：${item.intro_source}\n`;
        if (item.intro_scenario) doc += `- 使用场景：${item.intro_scenario}\n`;
        if (item.intro_problem) doc += `- 解决的问题：${item.intro_problem}\n`;
        if (item.intro_solution) doc += `- 如何解决的：${item.intro_solution}\n`;
        if (item.intro_effect) doc += `- 效果：${item.intro_effect}\n`;
        if (item.icon) doc += `- 所属模块：${item.icon}\n`;
        doc += `\n`;
      });
    }

    // 产品介绍
    if (grouped.messaging) {
      doc += `## 产品介绍\n\n`;
      grouped.messaging.forEach((item, idx) => {
        doc += `### 话术 ${idx + 1}\n\n`;
        if (item.pain) doc += `- 痛点：${item.pain}\n`;
        if (item.anchor_message) doc += `- 核心信息：${item.anchor_message}\n`;
        if (item.benefit) doc += `- 收益：${item.benefit}\n`;
        if (item.evidence) doc += `- 证据：${item.evidence}\n`;
        if (item.content) doc += `${item.content}\n`;
        doc += `\n`;
      });
    }

    return doc;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">从产品规划选择资料</h3>
            <p className="text-sm text-gray-500 mt-0.5">选择需要作为输入数据源的内容</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {SECTIONS.map(section => {
                const items = getItemsForSection(section);
                if (items.length === 0) return null;
                
                const isExpanded = expandedSections.includes(section.id);
                const selectedCount = items.filter(item => isItemSelected(item)).length;
                
                return (
                  <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Section Header */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <section.icon className="w-5 h-5 text-gray-600" />
                        <div className="text-left">
                          <span className="font-medium text-gray-900">{section.label}</span>
                          <p className="text-xs text-gray-500">{section.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedCount > 0 && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                            已选 {selectedCount}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Section Items */}
                    {isExpanded && (
                      <div className="p-4 space-y-2 bg-white">
                        {items.map(item => {
                          const selected = isItemSelected(item);
                          return (
                            <div
                              key={`${item.type}-${item.id}`}
                              onClick={() => toggleItem(item)}
                              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                selected 
                                  ? 'bg-indigo-50 border border-indigo-200' 
                                  : 'hover:bg-gray-50 border border-transparent'
                              }`}
                            >
                              <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                                selected 
                                  ? 'bg-indigo-600 border-indigo-600' 
                                  : 'border-gray-300 bg-white'
                              }`}>
                                {selected && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-900 truncate">
                                  {item.displayTitle}
                                </div>
                                {item.displayContent && (
                                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {item.displayContent}
                                  </div>
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
              
              {!loading && Object.values(productData).every(arr => arr.length === 0) && (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>暂无产品规划资料</p>
                  <p className="text-sm mt-1">请先在产品规划板块添加数据</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <span className="text-sm text-gray-600">
            已选择 <span className="font-medium text-indigo-600">{selectedItems.length}</span> 项
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedItems.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加为文档
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
