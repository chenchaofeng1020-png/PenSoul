import React, { useState, useEffect } from 'react';
import { X, Users, Sparkles, ArrowRight, User } from 'lucide-react';
import { getPersonas } from '../../services/api';

export function PersonaSelectorModal({ isOpen, onClose, onSelect, initialPersonaId }) {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(initialPersonaId || null);
  const [previewPersona, setPreviewPersona] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadPersonas();
    }
  }, [isOpen]);

  const loadPersonas = async () => {
    setLoading(true);
    try {
      const data = await getPersonas();
      setPersonas(data || []);
      // 如果有初始选中值，设置预览
      if (initialPersonaId) {
        const initial = data?.find(p => p.id === initialPersonaId);
        if (initial) {
          setPreviewPersona(initial);
        }
      }
    } catch (e) {
      console.error('Failed to load personas', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (persona) => {
    setSelectedId(persona.id);
    setPreviewPersona(persona);
  };

  const handleConfirm = () => {
    if (selectedId && previewPersona) {
      onSelect(previewPersona);
      onClose();
    }
  };

  const handleGoToPersonaLab = () => {
    // 跳转到人设实验室
    window.location.hash = '#/personas';
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl m-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">选择创作人设</h3>
            <p className="text-sm text-gray-500 mt-0.5">选择一个人设风格来生成内容</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Persona List */}
          <div className="w-1/2 border-r border-gray-100 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {personas.map(persona => (
                  <div
                    key={persona.id}
                    onClick={() => handleSelect(persona)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedId === persona.id
                        ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300'
                        : 'bg-white border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                        selectedId === persona.id
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                          : 'bg-gradient-to-br from-gray-400 to-gray-500'
                      }`}>
                        {persona.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{persona.name}</h4>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                          {persona.role_definition || '暂无描述'}
                        </p>
                        {/* Style Tags */}
                        {persona.style_profile && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {persona.style_profile.tone && (
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                {persona.style_profile.tone.substring(0, 8)}
                              </span>
                            )}
                            {persona.style_profile.keywords?.slice(0, 2).map((kw, idx) => (
                              <span key={idx} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                                {kw.substring(0, 6)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Create New Persona Card */}
                <div
                  onClick={handleGoToPersonaLab}
                  className="p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer transition-all text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-gray-500 hover:text-indigo-600">
                    <Users className="w-6 h-6" />
                    <span className="text-sm font-medium">去人设实验室创建新风格</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Preview */}
          <div className="w-1/2 bg-gray-50 overflow-y-auto p-4">
            {previewPersona ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {previewPersona.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{previewPersona.name}</h4>
                    <p className="text-xs text-gray-500">创作风格预览</p>
                  </div>
                </div>

                {previewPersona.style_profile ? (
                  <div className="space-y-3 text-sm">
                    {/* Identity */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="text-xs font-medium text-gray-500 uppercase">身份定位</span>
                      <p className="text-gray-800 mt-1">{previewPersona.style_profile.identity}</p>
                    </div>

                    {/* Tone */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="text-xs font-medium text-gray-500 uppercase">语气特征</span>
                      <p className="text-gray-800 mt-1">{previewPersona.style_profile.tone}</p>
                    </div>

                    {/* Sentence Style */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="text-xs font-medium text-gray-500 uppercase">句式特点</span>
                      <p className="text-gray-800 mt-1">{previewPersona.style_profile.sentence_style}</p>
                    </div>

                    {/* Keywords */}
                    {previewPersona.style_profile.keywords?.length > 0 && (
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="text-xs font-medium text-gray-500 uppercase">高频词汇</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {previewPersona.style_profile.keywords.map((kw, idx) => (
                            <span key={idx} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Structure */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="text-xs font-medium text-gray-500 uppercase">文章结构</span>
                      <p className="text-gray-800 mt-1">{previewPersona.style_profile.structure}</p>
                    </div>

                    {/* Avoid */}
                    {previewPersona.style_profile.avoid?.length > 0 && (
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="text-xs font-medium text-gray-500 uppercase">避免事项</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {previewPersona.style_profile.avoid.map((item, idx) => (
                            <span key={idx} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Emoji Usage */}
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <span className="text-xs font-medium text-gray-500 uppercase">Emoji使用</span>
                      <p className="text-gray-800 mt-1">{previewPersona.style_profile.emoji_usage}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">该人设暂无风格档案</p>
                    <p className="text-xs mt-1">将使用默认风格进行创作</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <User className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-sm">选择左侧人设查看详情</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <span className="text-sm text-gray-500">
            {selectedId ? '已选择人设' : '请选择一个人设'}
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
              disabled={!selectedId}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <span>确认使用</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
