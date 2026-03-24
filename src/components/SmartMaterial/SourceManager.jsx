import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Trash2, Loader2, Plus, CheckSquare, Square, Image, Type } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useSmartEstimation } from '../../context/SmartEstimationContext';
import { ProductDataSelectorModal } from './ProductDataSelectorModal';
import { DocumentDetailModal } from './DocumentDetailModal';
import { TextSourceDrawer } from './TextSourceDrawer';
import { dataSourceParser } from '../../services/estimation/DataSourceParser';

function buildFunctionSelectionKey(item = {}) {
  return [
    item.module || '未分类模块',
    item.name || '未命名功能',
    item.description || ''
  ].join('::').toLowerCase();
}

export function SourceManager({ productId, sources, setSources, onSelectionChange, currentStudioMode }) {
  const { showToast } = useUI();
  const { state: smartEstimationState, dispatch: smartEstimationDispatch } = useSmartEstimation();
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isTextDrawerOpen, setIsTextDrawerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isParsingFunctions, setIsParsingFunctions] = useState(false);
  
  // 选中的来源ID列表，默认不选中
  const [selectedSourceIds, setSelectedSourceIds] = useState([]);
  const isSmartEstimationMode = currentStudioMode === 'smart_estimation';

  // 当 sources 变化时，保持当前选中状态（不自动全选）
  useEffect(() => {
    // 只保留仍然存在的 source 的选中状态
    const validIds = sources.map(s => s.id);
    setSelectedSourceIds(prev => prev.filter(id => validIds.includes(id)));
  }, [sources]);

  // 当选中项变化时，通知父组件
  useEffect(() => {
    if (onSelectionChange) {
      const selectedSources = sources.filter(s => selectedSourceIds.includes(s.id));
      onSelectionChange(selectedSources);
    }
  }, [selectedSourceIds, sources, onSelectionChange]);

  useEffect(() => {
    let isCancelled = false;

    if (!isSmartEstimationMode) {
      return undefined;
    }

    const selectedSources = sources.filter(source => selectedSourceIds.includes(source.id));
    if (selectedSources.length === 0) {
      smartEstimationDispatch({ type: 'SET_PARSED_FUNCTIONS', payload: [] });
      return undefined;
    }

    setIsParsingFunctions(true);

    void dataSourceParser.parseSources(selectedSources)
      .then((parsedFunctions) => {
        if (isCancelled) {
          return;
        }

        const normalizedFunctions = parsedFunctions.map((item) => ({
          ...item,
          selectionKey: buildFunctionSelectionKey(item)
        }));

        smartEstimationDispatch({
          type: 'SET_PARSED_FUNCTIONS',
          payload: normalizedFunctions
        });
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }
        console.error('[SourceManager] Parse smart estimation functions failed:', error);
        showToast('解析待评功能失败，请检查资料内容', 'error');
      })
      .finally(() => {
        if (!isCancelled) {
          setIsParsingFunctions(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [currentStudioMode, selectedSourceIds, showToast, smartEstimationDispatch, sources, isSmartEstimationMode]);

  // 上传本地文件
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let content = '';
      const fileExt = file.name.split('.').pop().toLowerCase();
      
      // 处理不同类型的文件
      if (file.type === 'application/pdf') {
        content = `[PDF文件: ${file.name}]`;
      } else if (fileExt === 'xlsx' || fileExt === 'xls') {
        // Excel 文件使用专用解析
        content = await parseExcelFile(file);
      } else {
        // 文本文件直接读取
        content = await file.text();
      }

      const res = await fetch('http://localhost:3002/api/smart/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          fileName: file.name,
          fileType: fileExt,
          content
        })
      });
      
      const result = await res.json();
      if (result.data) {
        setSources([...sources, result.data]);
        showToast('上传成功', 'success');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast('上传失败: ' + error.message, 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 解析 Excel 文件
  const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          // 使用 SheetJS 库解析 Excel
          // 这里先简单处理，将二进制数据转为 base64
          const base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
          resolve(`[EXCEL:${file.name}:${base64}]`);
        } catch {
          reject(new Error('Excel 解析失败'));
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  };

  // 上传图片
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 检查是否为图片
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'error');
      return;
    }

    setIsUploading(true);
    try {
      // 将图片转换为 base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('http://localhost:3002/api/smart/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          fileName: file.name,
          fileType: 'image',
          content: base64
        })
      });
      
      const result = await res.json();
      if (result.data) {
        setSources([...sources, result.data]);
        showToast('图片上传成功', 'success');
      }
    } catch {
      showToast('图片上传失败', 'error');
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // 删除资料
  const handleDelete = async (id) => {
    try {
      await fetch(`http://localhost:3002/api/smart/sources/${id}`, { method: 'DELETE' });
      setSources(sources.filter(s => s.id !== id));
      setSelectedSourceIds(prev => prev.filter(sid => sid !== id));
      showToast('已删除', 'success');
    } catch {
      showToast('删除失败', 'error');
    }
  };

  // 添加产品规划资料
  const handleAddProductData = async (data) => {
    try {
      console.log('Adding product data:', data);
      const res = await fetch('http://localhost:3002/api/smart/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          fileName: data.fileName,
          fileType: 'product_data',
          content: data.content,
          displayTitle: data.displayTitle,
          displaySubtitle: data.displaySubtitle
        })
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API error:', res.status, errorText);
        showToast(`添加失败: ${res.status}`, 'error');
        return;
      }
      
      const result = await res.json();
      console.log('API response:', result);
      
      if (result.data) {
        setSources([...sources, result.data]);
        showToast('添加成功', 'success');
      } else {
        console.error('No data in response:', result);
        showToast('添加失败: 服务器返回数据异常', 'error');
      }
    } catch (e) {
      console.error('Add product data error:', e);
      showToast('添加失败: ' + (e.message || '网络错误'), 'error');
    }
  };

  // 添加文本资料
  const handleAddTextSource = async (data) => {
    try {
      console.log('Adding text source:', data);
      const res = await fetch('http://localhost:3002/api/smart/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          fileName: data.fileName,
          fileType: 'text',
          content: data.content,
          displayTitle: data.displayTitle,
          displaySubtitle: data.displaySubtitle
        })
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API error:', res.status, errorText);
        throw new Error(`添加失败: ${res.status}`);
      }
      
      const result = await res.json();
      console.log('API response:', result);
      
      if (result.data) {
        setSources([...sources, result.data]);
        showToast('添加成功', 'success');
      } else {
        console.error('No data in response:', result);
        throw new Error('服务器返回数据异常');
      }
    } catch (e) {
      console.error('Add text source error:', e);
      throw e;
    }
  };

  // 查看详情
  const openDetail = (doc) => {
    setSelectedDoc(doc);
    setIsDetailOpen(true);
  };

  // 切换选中状态
  const toggleSelection = (id) => {
    setSelectedSourceIds(prev => 
      prev.includes(id) 
        ? prev.filter(sid => sid !== id)
        : [...prev, id]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedSourceIds.length === sources.length) {
      setSelectedSourceIds([]);
    } else {
      setSelectedSourceIds(sources.map(s => s.id));
    }
  };

  const toggleFunctionSelection = (selectionKey) => {
    const currentKeys = smartEstimationState.selectedFunctionKeys || [];
    const nextKeys = currentKeys.includes(selectionKey)
      ? currentKeys.filter(key => key !== selectionKey)
      : [...currentKeys, selectionKey];

    smartEstimationDispatch({
      type: 'SET_SELECTED_FUNCTION_KEYS',
      payload: nextKeys
    });
  };

  const toggleSelectAllFunctions = () => {
    const allKeys = (smartEstimationState.parsedFunctions || []).map(item => item.selectionKey);
    const nextKeys = smartEstimationState.selectedFunctionKeys.length === allKeys.length ? [] : allKeys;
    smartEstimationDispatch({
      type: 'SET_SELECTED_FUNCTION_KEYS',
      payload: nextKeys
    });
  };

  // 分类显示
  const productDocs = sources.filter(s => s.file_type === 'product_data');
  const fileDocs = sources.filter(s => s.file_type !== 'product_data');

  return (
    <div className="flex flex-col h-full bg-gray-50/30 border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-800">来源管理</h2>
        <div className="flex items-center gap-2">
          {sources.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
              title={selectedSourceIds.length === sources.length ? '取消全选' : '全选'}
            >
              {selectedSourceIds.length === sources.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>{selectedSourceIds.length}/{sources.length}</span>
            </button>
          )}
          <FileText className="w-4 h-4 text-gray-400" />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {/* 产品规划资料 */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase">产品规划资料</span>
            <button
              onClick={() => setIsSelectorOpen(true)}
              disabled={!productId}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              添加
            </button>
          </div>
          
          {productDocs.length === 0 ? (
            <div className="text-center py-4 text-xs text-gray-400 bg-gray-50 rounded border border-dashed">
              <p>暂无资料</p>
              <p className="mt-0.5">点击添加</p>
            </div>
          ) : (
            <div className="space-y-2">
              {productDocs.map(doc => (
                <DocItem 
                  key={doc.id} 
                  doc={doc} 
                  isSelected={selectedSourceIds.includes(doc.id)}
                  onToggle={() => toggleSelection(doc.id)}
                  onView={() => openDetail(doc)}
                  onDelete={() => handleDelete(doc.id)}
                  color="indigo"
                />
              ))}
            </div>
          )}
        </div>

        <div className="h-px bg-gray-100 mx-4 my-2" />

        {/* 本地文件 */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase">本地文件</span>
            <span className="text-xs text-gray-400">{fileDocs.length}</span>
          </div>
          
          {fileDocs.length === 0 ? (
            <div className="text-center py-4 text-xs text-gray-400 bg-gray-50 rounded border border-dashed">
              <p>暂无文件</p>
            </div>
          ) : (
            <div className="space-y-2">
              {fileDocs.map(doc => (
                <DocItem 
                  key={doc.id} 
                  doc={doc} 
                  isSelected={selectedSourceIds.includes(doc.id)}
                  onToggle={() => toggleSelection(doc.id)}
                  onView={() => openDetail(doc)}
                  onDelete={() => handleDelete(doc.id)}
                  color="blue"
                />
              ))}
            </div>
          )}
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-dashed border-gray-300 hover:border-indigo-400 text-gray-500 hover:text-indigo-600 px-3 py-2.5 rounded text-xs font-medium"
              title="支持 .txt, .md, .csv 格式"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              上传文件
            </button>
            <button 
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-dashed border-gray-300 hover:border-pink-400 text-gray-500 hover:text-pink-600 px-3 py-2.5 rounded text-xs font-medium"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
              上传图片
            </button>
          </div>
          
          {/* 添加文本按钮 */}
          <button 
            onClick={() => setIsTextDrawerOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-white border border-dashed border-gray-300 hover:border-blue-400 text-gray-500 hover:text-blue-600 px-3 py-2.5 rounded text-xs font-medium mt-2"
          >
            <Type className="w-4 h-4" />
            添加文本
          </button>
        </div>

        {isSmartEstimationMode && (
          <>
            <div className="h-px bg-gray-100 mx-4 my-2" />
            <div className="p-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">待评功能</span>
                  <div className="mt-1 text-[11px] text-gray-400">
                    先勾资料，再勾真正要评估的功能
                  </div>
                </div>
                {(smartEstimationState.parsedFunctions || []).length > 0 ? (
                  <button
                    onClick={toggleSelectAllFunctions}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
                    title={smartEstimationState.selectedFunctionKeys.length === smartEstimationState.parsedFunctions.length ? '取消全选功能' : '全选功能'}
                  >
                    {smartEstimationState.selectedFunctionKeys.length === smartEstimationState.parsedFunctions.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    <span>{smartEstimationState.selectedFunctionKeys.length}/{smartEstimationState.parsedFunctions.length}</span>
                  </button>
                ) : null}
              </div>

              {isParsingFunctions ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-indigo-200 bg-indigo-50 px-3 py-3 text-xs text-indigo-700">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  正在从已勾选资料里解析功能项...
                </div>
              ) : selectedSourceIds.length === 0 ? (
                <div className="text-center py-4 text-xs text-gray-400 bg-gray-50 rounded border border-dashed">
                  先勾选左侧资料，系统才会识别可评估功能
                </div>
              ) : (smartEstimationState.parsedFunctions || []).length === 0 ? (
                <div className="text-center py-4 text-xs text-gray-400 bg-gray-50 rounded border border-dashed">
                  当前资料里还没识别出清晰功能，可直接在聊天区补充
                </div>
              ) : (
                <div className="space-y-2">
                  {smartEstimationState.parsedFunctions.map((item) => {
                    const isSelected = smartEstimationState.selectedFunctionKeys.includes(item.selectionKey);
                    return (
                      <button
                        key={item.selectionKey}
                        onClick={() => toggleFunctionSelection(item.selectionKey)}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all ${
                          isSelected
                            ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-indigo-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 flex-shrink-0">
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-indigo-600" />
                            ) : (
                              <Square className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-medium text-indigo-600">{item.module || '未分类模块'}</span>
                              <span className="text-sm font-medium text-gray-800">{item.name}</span>
                            </div>
                            {item.description ? (
                              <div className="mt-1 line-clamp-2 text-[11px] leading-5 text-gray-500">
                                {item.description}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <ProductDataSelectorModal
        productId={productId}
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onConfirm={handleAddProductData}
      />

      <DocumentDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        document={selectedDoc}
      />

      <TextSourceDrawer
        isOpen={isTextDrawerOpen}
        onClose={() => setIsTextDrawerOpen(false)}
        onSave={handleAddTextSource}
      />

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".txt,.md,.csv,.xlsx,.xls"
        onChange={handleFileUpload}
      />

      <input 
        type="file" 
        ref={imageInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleImageUpload} 
      />
    </div>
  );
}

// 文档项组件
function DocItem({ doc, isSelected, onToggle, onView, onDelete, color }) {
  const borderColor = color === 'indigo' ? 'hover:border-indigo-300' : 'hover:border-blue-300';
  
  // 获取显示标题和副标题
  const displayTitle = doc.display_title || doc.file_name;
  const displaySubtitle = doc.display_subtitle || getDefaultSubtitle(doc);
  
  function getDefaultSubtitle(doc) {
    if (doc.file_type === 'product_data') return '产品规划资料';
    if (doc.file_type === 'image') return '图片';
    return doc.file_type;
  }
  
  return (
    <div className={`group flex items-start p-2.5 bg-white rounded-lg border border-gray-200 ${borderColor} hover:shadow-sm ${isSelected ? 'ring-1 ring-indigo-300 border-indigo-300' : ''}`}>
      {/* 勾选框 */}
      <button
        onClick={onToggle}
        className="flex-shrink-0 mr-2 p-1 rounded hover:bg-gray-100 transition-colors mt-0.5"
      >
        {isSelected ? (
          <CheckSquare className="w-4 h-4 text-indigo-600" />
        ) : (
          <Square className="w-4 h-4 text-gray-400" />
        )}
      </button>
      
      {/* 内容区域（点击查看详情） */}
      <div 
        className="flex items-center overflow-hidden flex-1 cursor-pointer"
        onClick={onView}
      >
        <div className="min-w-0 flex-1">
          <span className="text-sm text-gray-700 truncate font-medium block" title={displayTitle}>
            {displayTitle}
          </span>
          <span className="text-[10px] text-gray-500">
            {displaySubtitle}
          </span>
        </div>
      </div>
      
      {/* 删除按钮 */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-red-50 flex-shrink-0 ml-2 mt-0.5"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
