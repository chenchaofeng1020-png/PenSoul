import React, { useState, useEffect } from 'react';
import { getPersonas, createPersona, updatePersona, deletePersona } from '../../services/api';
import StyleWorkbench from './StyleWorkbench';
import { MessageSquare, Users, FlaskConical, Plus, Trash2, Edit2, ArrowLeft, Save } from 'lucide-react';

const PersonaLab = () => {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'workbench'
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPersona, setEditingPersona] = useState(null);

  useEffect(() => {
    if (activeTab === 'list') {
        loadPersonas();
        setEditingPersona(null);
    }
  }, [activeTab]); // Reload when switching back to list

  const loadPersonas = async () => {
    try {
      setLoading(true);
      const data = await getPersonas();
      setPersonas(data || []);
    } catch (e) {
      console.error('Failed to load personas', e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (persona) => {
      setEditingPersona(persona);
      setActiveTab('workbench');
  };

  const handleSavePersona = async (personaData) => {
      try {
          if (personaData.id) {
              await updatePersona(personaData.id, personaData);
          } else {
              await createPersona(personaData);
          }
          setActiveTab('list');
      } catch (e) {
          console.error('Failed to save persona', e);
          alert('保存失败: ' + e.message);
      }
  };

  const handleDelete = async (id, name) => {
      if (!confirm(`确定要删除人设 "${name}" 吗？此操作不可恢复。`)) {
          return;
      }
      try {
          await deletePersona(id);
          setPersonas(personas.filter(p => p.id !== id));
      } catch (e) {
          console.error('Failed to delete persona', e);
          alert('删除失败: ' + e.message);
      }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Users className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
                {activeTab === 'list' ? '人设实验室 (Persona Lab)' : (editingPersona ? '编辑人设' : '新建人设 / 风格提取')}
            </h1>
            <p className="text-xs text-gray-500">MACC 核心组件 - 管理与定制您的 AI 写手团队</p>
          </div>
        </div>
        
        {/* Header Actions - only show in workbench mode */}
        {activeTab === 'workbench' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回列表</span>
            </button>
            <button
              onClick={() => {
                // Trigger save via ref or context if needed
                // For now, we'll pass this to StyleWorkbench
                document.dispatchEvent(new CustomEvent('save-persona'));
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>保存风格</span>
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'list' ? (
            <div className="h-full overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Create Card */}
                    <div 
                        onClick={() => { setEditingPersona(null); setActiveTab('workbench'); }}
                        className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center gap-4 text-gray-400 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-all group min-h-[200px]"
                    >
                        <div className="bg-gray-100 p-4 rounded-full group-hover:bg-indigo-100 transition-colors">
                            <Plus className="w-8 h-8" />
                        </div>
                        <span className="font-medium">新建人设 / 提取风格</span>
                    </div>

                    {/* Persona Cards */}
                    {loading ? (
                        <div className="col-span-full text-center py-10 text-gray-400">Loading...</div>
                    ) : personas.map(persona => (
                        <div key={persona.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleEdit(persona); }}
                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="编辑"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(persona.id, persona.name); }}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="删除"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                                    {persona.name[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{persona.name}</h3>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="text-sm text-gray-600 line-clamp-2 min-h-[2.5em]">
                                    {persona.role_definition || "暂无详细描述"}
                                </div>
                                
                                <div className="pt-3 border-t border-gray-100">
                                    <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Style DNA</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {persona.style_dna?.tone && (
                                            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                                                {persona.style_dna.tone}
                                            </span>
                                        )}
                                        {persona.style_dna?.pacing && (
                                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                                Pacing: {persona.style_dna.pacing}
                                            </span>
                                        )}
                                        {(!persona.style_dna || Object.keys(persona.style_dna).length === 0) && (
                                            <span className="text-xs text-gray-400 italic">No DNA extracted</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ) : (
            <StyleWorkbench 
                initialPersona={editingPersona} 
                onSave={handleSavePersona}
                onBack={() => setActiveTab('list')}
            />
        )}
      </div>
    </div>
  );
};

export default PersonaLab;
