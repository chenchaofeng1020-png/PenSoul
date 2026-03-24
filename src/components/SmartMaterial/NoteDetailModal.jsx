import React, { useState, useEffect } from 'react';
import { X, Copy, Code, Eye, Edit2, Check, Image, Sparkles, Loader2, Wand2, Edit3, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useUI } from '../../context/UIContext';
import { XiaohongshuPreview } from './XiaohongshuPreview';
import { MermaidRenderer } from './RequirementDoc/MermaidRenderer';
import { StructuredMarkdownContent } from './RequirementDoc/StructuredMarkdownContent';
import { SmartEstimationReportView } from './SmartEstimation/SmartEstimationReportView';

export function NoteDetailModal({ note, onClose, onUpdate }) {
  const { showToast } = useUI();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'code'

  // 智能配图相关状态
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [imagePlans, setImagePlans] = useState([]);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editedDescriptions, setEditedDescriptions] = useState({});

  // 悬浮菜单状态
  const [showFabMenu, setShowFabMenu] = useState(false);

  const parseRequirementDocContent = (rawContent) => {
    if (!rawContent) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawContent);
      if (parsed && Array.isArray(parsed.sections)) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  };

  const parseSmartEstimationContent = (rawContent) => {
    if (!rawContent) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawContent);
      if (parsed && (parsed.overview || parsed.functions || parsed.roleBreakdown)) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  };

  // 从 localStorage 加载缓存的配图数据
  useEffect(() => {
    setContent(note.content);
    if (note.type === 'xiaohongshu') {
      loadGeneratedImages();
      loadCachedImageData();
    }
  }, [note]);

  // 加载缓存的配图数据
  const loadCachedImageData = () => {
    try {
      const cacheKey = `xiaohongshu_image_data_${note.id}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        if (data.imagePlans && data.imagePlans.length > 0) {
          setImagePlans(data.imagePlans);
        }
        // 加载缓存的已生成图片
        if (data.generatedImages && data.generatedImages.length > 0) {
          setGeneratedImages(data.generatedImages);
        }
      }
    } catch (e) {
      console.error('加载缓存失败:', e);
    }
  };

  // 保存配图数据到缓存
  const saveImageDataToCache = (plans, images = null) => {
    try {
      const cacheKey = `xiaohongshu_image_data_${note.id}`;
      const existing = localStorage.getItem(cacheKey);
      const existingData = existing ? JSON.parse(existing) : {};
      
      localStorage.setItem(cacheKey, JSON.stringify({
        imagePlans: plans || existingData.imagePlans || [],
        generatedImages: images || existingData.generatedImages || [],
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('保存缓存失败:', e);
    }
  };

  // 加载已生成的图片
  const loadGeneratedImages = async () => {
    try {
      const res = await fetch(`http://localhost:3002/api/smart/notes/${note.id}/images`);
      const data = await res.json();
      if (data.images) {
        setGeneratedImages(data.images);
      }
    } catch (e) {
      console.error('加载图片失败:', e);
    }
  };

  // 分析文案生成配图方案
  const handleAnalyzeForImages = async () => {
    // 如果已经有配图方案，直接切换面板显示/隐藏
    if (imagePlans.length > 0 || generatedImages.length > 0) {
      setShowImagePanel(!showImagePanel);
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const res = await fetch('http://localhost:3002/api/smart/xiaohongshu/image-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: note.content })
      });
      const data = await res.json();
      if (data.plans) {
        setImagePlans(data.plans);
        saveImageDataToCache(data.plans);
        setShowImagePanel(true);
        showToast('配图方案生成完成', 'success');
      }
    } catch (e) {
      console.error('分析文案失败:', e);
      showToast('分析文案失败', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 生成图片
  const handleGenerateImage = async (plan) => {
    setSelectedPlan(plan);
    setIsGeneratingImage(true);
    try {
      const res = await fetch('http://localhost:3002/api/smart/xiaohongshu/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: plan.prompt,
          noteId: note.id 
        })
      });
      const data = await res.json();
      if (data.imageUrl) {
        setGeneratedImages(prev => [{
          id: Date.now(),
          image_url: data.imageUrl,
          prompt: plan.prompt,
          created_at: data.createdAt
        }, ...prev]);
        showToast('图片生成成功', 'success');
      } else {
        throw new Error('No image URL returned');
      }
    } catch (e) {
      console.error('生成图片失败:', e);
      showToast('生成图片失败', 'error');
    } finally {
      setIsGeneratingImage(false);
      setSelectedPlan(null);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`http://localhost:3002/api/smart/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      onUpdate(data.data);
      setIsEditing(false);
      showToast('保存成功', 'success');
    } catch {
      showToast('保存失败', 'error');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    showToast('已复制到剪贴板', 'success');
  };

  // Check if content looks like HTML or React code
  const isCode = content && (
    content.trim().startsWith('<') || 
    content.includes('import React') || 
    content.includes('export default') || 
    content.includes('```html') || 
    content.includes('```jsx') ||
    content.includes('<!DOCTYPE html>') ||
    content.includes('<html') ||
    content.includes('<div') ||
    content.includes('<script') ||
    content.includes('<link') ||
    content.includes('tailwind')
  );

  const getCleanCode = (raw) => {
    if (!raw) return '';
    
    // First try to extract HTML from markdown code blocks
    const codeBlockMatch = raw.match(/```(?:html|jsx)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    
    // If content contains DOCTYPE or html tag, extract from there to the end
    const doctypeMatch = raw.match(/<!DOCTYPE html>[\s\S]*/i);
    if (doctypeMatch) {
      return doctypeMatch[0].trim();
    }
    
    const htmlMatch = raw.match(/<html[\s\S]*/i);
    if (htmlMatch) {
      return htmlMatch[0].trim();
    }
    
    // Try to extract content between any HTML tags
    const anyTagMatch = raw.match(/<[a-zA-Z][^>]*>[\s\S]*<\/[a-zA-Z][^>]*>/);
    if (anyTagMatch) {
      return anyTagMatch[0];
    }
    
    // Default: remove markdown code blocks if present
    return raw.replace(/```(html|jsx|javascript|react)?/g, '').replace(/```/g, '').trim();
  };

  const renderPreview = () => {
    if (note.type === 'smart_estimation') {
      const smartEstimation = parseSmartEstimationContent(content);

      if (!smartEstimation) {
        return (
          <div className="prose prose-sm max-w-none p-6 bg-white rounded-lg h-full overflow-y-auto shadow-sm">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        );
      }

      return (
        <div className="h-full overflow-y-auto bg-slate-50">
          <SmartEstimationReportView report={smartEstimation} />
        </div>
      );
    }

    if (note.type === 'requirement_doc') {
      const requirementDoc = parseRequirementDocContent(content);

      if (!requirementDoc) {
        return (
          <div className="prose prose-sm max-w-none p-6 bg-white rounded-lg h-full overflow-y-auto shadow-sm">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        );
      }

      return (
        <div className="h-full overflow-y-auto bg-slate-50 p-6">
          <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h1 className="text-2xl font-semibold text-slate-900">
                {requirementDoc.title || note.title}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                共 {requirementDoc.sections?.length || 0} 个章节
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {(requirementDoc.sections || []).map((section, index) => (
                <section key={`${section.title}-${index}`} className="px-6 py-5">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
                      {section.subsections?.length > 0 && (
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          {section.subsections.join(' / ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {section.content ? (
                    <StructuredMarkdownContent
                      content={section.content}
                      sectionTitle={section.title}
                    />
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-400">
                      该章节暂无正文内容
                    </div>
                  )}

                  {section.flowchart && (
                    <div className="mt-5">
                      <MermaidRenderer code={section.flowchart} title="流程图" />
                    </div>
                  )}

                  {section.prototype && (
                    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="text-sm font-medium text-slate-800">页面原型补充</div>
                      <div className="mt-3">
                        <StructuredMarkdownContent content={section.prototype} />
                      </div>
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (isCode) {
      const cleanCode = getCleanCode(content);
      
      // Simple heuristic to detect if it's a full HTML document or fragment
      let htmlContent = cleanCode;
      
      // Check if it's already a complete HTML document
      const hasDocType = cleanCode.toLowerCase().includes('<!doctype html>');
      const hasHtmlTag = cleanCode.toLowerCase().includes('<html');
      const hasHeadTag = cleanCode.toLowerCase().includes('<head>');
      
      if (!hasDocType && !hasHtmlTag) {
        // Wrap fragment with Tailwind CDN
        htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    /* Custom scrollbar */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  </style>
</head>
<body class="p-6 bg-gray-50 min-h-screen">
${cleanCode}
</body>
</html>`;
      } else if (hasHtmlTag && !hasHeadTag) {
        // Has <html> but no <head> - inject head with charset
        htmlContent = cleanCode.replace(
          /<html[^>]*>/i,
          match => `${match}\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>`
        );
      } else if (hasHeadTag) {
        // Has <head> - ensure charset is present
        const hasCharset = cleanCode.toLowerCase().includes('charset');
        if (!hasCharset) {
          htmlContent = cleanCode.replace(
            /<head[^>]*>/i,
            match => `${match}\n  <meta charset="UTF-8">`
          );
        }
      }
      
      return (
        <iframe 
          srcDoc={htmlContent} 
          className="w-full h-full border-0 rounded-lg bg-white shadow-inner" 
          title="Preview" 
          sandbox="allow-scripts"
        />
      );
    }
    
    // 小红书文案使用真机预览
    if (note.type === 'xiaohongshu') {
      return (
        <div className="w-full h-full overflow-y-auto bg-gray-100 p-6">
          <div className="flex gap-6 justify-center">
            {/* 小红书预览 */}
            <div className="flex-shrink-0">
              <XiaohongshuPreview 
                content={content} 
                images={generatedImages} 
              />
            </div>
            
            {/* 智能配图方案卡片 - 并排显示在右侧 */}
            {showImagePanel && (imagePlans.length > 0 || generatedImages.length > 0) && (
              <div className="w-80 flex-shrink-0 space-y-3">
                {/* 已生成的图片 */}
                {generatedImages.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-3">
                    <h4 className="text-xs font-medium text-gray-500 mb-2 flex items-center">
                      <Sparkles className="w-3 h-3 mr-1 text-pink-500" />
                      已生成图片
                    </h4>
                    <div className="space-y-2">
                      {generatedImages.slice(0, 3).map((img, idx) => (
                        <div key={img.id || idx} className="relative group">
                          <img 
                            src={img.image_url} 
                            alt={`Generated ${idx + 1}`}
                            className="w-full h-20 object-cover rounded-lg border border-gray-200"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <a 
                              href={img.image_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-white text-xs hover:underline"
                            >
                              查看
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 配图方案 */}
                {imagePlans.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-3">
                    <h4 className="text-xs font-medium text-gray-500 mb-2 flex items-center">
                      <Wand2 className="w-3 h-3 mr-1 text-pink-500" />
                      配图方案
                    </h4>
                    <div className="space-y-2">
                      {imagePlans.map((plan) => (
                        <div 
                          key={plan.id} 
                          className="p-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-pink-300 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h5 className="font-medium text-gray-800 text-xs truncate flex-1">{plan.title}</h5>
                            <button
                              onClick={() => handleGenerateImage(plan)}
                              disabled={isGeneratingImage}
                              className="ml-2 flex items-center px-2 py-1 bg-pink-500 text-white text-xs rounded hover:bg-pink-600 transition-colors disabled:opacity-50"
                            >
                              {isGeneratingImage && selectedPlan?.id === plan.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Image className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-gray-600">{editedDescriptions[plan.id] || plan.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Markdown Preview
    return (
      <div className="prose prose-sm max-w-none p-6 bg-white rounded-lg h-full overflow-y-auto shadow-sm">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white shadow-2xl w-full max-w-4xl h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center">
            <h2 className="text-lg font-bold text-gray-800 mr-3 truncate max-w-md">
              {note.title}
            </h2>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full font-medium uppercase tracking-wide border border-indigo-100">
              {note.type}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <>
                <div className="flex bg-gray-100 rounded-lg p-1 mr-2">
                  <button 
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'preview' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <Eye className="w-4 h-4 inline mr-1.5" />预览
                  </button>
                  <button 
                    onClick={() => setActiveTab('code')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'code' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <Code className="w-4 h-4 inline mr-1.5" />源码
                  </button>
                </div>
              </>
            ) : (
              <button onClick={handleSave} className="flex items-center space-x-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-200">
                <Check className="w-4 h-4" />
                <span>保存修改</span>
              </button>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full ml-2 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-gray-50">
          <div className="flex flex-col h-full">
            {/* 主内容区 */}
            <div className="flex-1 overflow-hidden relative">
              {isEditing ? (
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-full p-6 bg-white border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-sm leading-relaxed resize-none"
                  spellCheck={false}
                />
              ) : (
                <div className="h-full w-full overflow-auto">
                  {activeTab === 'preview' ? renderPreview() : (
                    <pre className="w-full h-full p-6 bg-slate-900 text-slate-50 overflow-auto font-mono text-sm custom-scrollbar">
                      <code>{content}</code>
                    </pre>
                  )}
                </div>
              )}

              {/* 悬浮操作按钮 */}
              {!isEditing && (
                <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2">
                  {/* 智能配图按钮 - 仅小红书文案显示，独立悬浮 */}
                  {note.type === 'xiaohongshu' && (
                    <button
                      onClick={() => showImagePanel ? setShowImagePanel(false) : handleAnalyzeForImages()}
                      disabled={isAnalyzing}
                      className="flex items-center gap-2 px-4 py-2 bg-white text-pink-600 rounded-full shadow-lg hover:shadow-xl transition-all text-sm font-medium border border-pink-100 mb-2"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4" />
                      )}
                      {isAnalyzing ? '分析中...' : (showImagePanel ? '隐藏配图' : (imagePlans.length > 0 || generatedImages.length > 0) ? '展开配图' : '智能配图')}
                    </button>
                  )}
                  
                  {/* 展开的菜单项 */}
                  {showFabMenu && (
                    <div className="flex flex-col gap-2 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      {/* 复制 */}
                      <button
                        onClick={() => {
                          handleCopy();
                          setShowFabMenu(false);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all text-sm font-medium border border-gray-200"
                      >
                        <Copy className="w-4 h-4" />
                        复制
                      </button>
                      {/* 编辑 */}
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowFabMenu(false);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-full shadow-lg hover:shadow-xl transition-all text-sm font-medium border border-indigo-100"
                      >
                        <Edit2 className="w-4 h-4" />
                        编辑
                      </button>
                    </div>
                  )}
                  {/* 主按钮 */}
                  <button
                    onClick={() => setShowFabMenu(!showFabMenu)}
                    className={`w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center ${
                      showFabMenu 
                        ? 'bg-gray-800 text-white rotate-45' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
