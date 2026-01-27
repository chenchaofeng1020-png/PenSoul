import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, ArrowRight, Trash2, LogOut } from 'lucide-react';
import { getIdeas, createIdea, deleteIdea } from '../../services/api';
import { useUI } from '../../context/UIContext';

export default function IdeaList({ onSelectIdea, currentUser, onExit }) {
  const [ideas, setIdeas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const { showToast } = useUI();

  useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    setIsLoading(true);
    try {
      const data = await getIdeas(currentUser?.id || 'mock-user-1'); // Fallback for dev
      setIdeas(data);
    } catch (error) {
      console.error('Failed to load ideas:', error);
      showToast('加载灵感列表失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newIdeaTitle.trim()) return;
    
    setIsCreating(true);
    try {
      const newIdea = await createIdea({ 
        title: newIdeaTitle,
        owner_id: currentUser?.id || 'mock-user-1'
      });
      
      // Enrich with current user info for immediate display
      const enrichedIdea = {
        ...newIdea,
        owner_username: currentUser?.user_metadata?.username || currentUser?.email || 'Demo User',
        owner_avatar_url: currentUser?.user_metadata?.avatar_url
      };
      
      setIdeas([enrichedIdea, ...ideas]);
      setNewIdeaTitle('');
      showToast('灵感创建成功', 'success');
    } catch (error) {
      showToast('创建失败', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('确定要删除这个灵感吗？')) return;
    
    try {
      await deleteIdea(id);
      setIdeas(ideas.filter(i => i.id !== id));
      showToast('删除成功', 'success');
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-gray-50">
      <div className="relative flex items-center justify-center mb-10">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">
            灵感孵化器
          </h1>
          <p className="text-gray-500 mt-2 text-lg">记录并孵化你的下一个改变世界的产品想法</p>
        </div>
        {onExit && (
          <button 
            onClick={onExit}
            className="absolute right-0 top-1/2 -translate-y-1/2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-600 rounded-lg transition-all flex items-center gap-2 shadow-sm hover:shadow"
          >
            <LogOut className="w-4 h-4" />
            <span>退出</span>
          </button>
        )}
      </div>

      {/* Create Input */}
      <div className="bg-white p-2 rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 mb-10 max-w-3xl mx-auto transform transition-all hover:scale-[1.01]">
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={newIdeaTitle}
            onChange={(e) => setNewIdeaTitle(e.target.value)}
            placeholder="✨ 我有一个新想法... (例如：一个帮我自动记账的AI助手)"
            className="flex-1 px-6 py-4 bg-transparent border-none focus:outline-none text-lg placeholder-gray-400"
          />
          <button 
            type="submit" 
            disabled={isCreating || !newIdeaTitle.trim()}
            className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>新建</span>
          </button>
        </form>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-40 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-orange-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <span className="text-4xl">💡</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">还没有灵感？</h3>
          <p className="text-gray-500">每一个伟大的产品都始于一个简单的想法。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-10">
          {ideas.map(idea => (
            <div 
              key={idea.id}
              onClick={() => onSelectIdea(idea)}
              className="group bg-white rounded-2xl border border-gray-100 hover:border-amber-200 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col h-40"
            >
              <div className="p-4 flex flex-col h-full z-10">
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full tracking-wide uppercase ${
                    idea.status === 'converted' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {idea.status === 'converted' ? '已转化' : '孵化中'}
                  </span>
                  <button 
                    onClick={(e) => handleDelete(e, idea.id)}
                    className="text-gray-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <h3 className="text-base font-bold text-gray-800 mb-2 line-clamp-2 leading-snug group-hover:text-amber-600 transition-colors">
                  {idea.title}
                </h3>
                
                <div className="mt-auto flex items-end justify-between w-full">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      {idea.owner_avatar_url ? (
                        <img src={idea.owner_avatar_url} className="w-4 h-4 rounded-full object-cover border border-gray-100" alt="" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-50 flex items-center justify-center text-[9px] text-amber-600 font-bold border border-white shadow-sm">
                          {(idea.owner_username || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-[11px] text-gray-600 font-medium truncate max-w-[80px]" title={idea.owner_username}>
                        {idea.owner_username || 'Unknown'}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium pl-0.5">
                      最近更新：{idea.updated_at ? new Date(idea.updated_at).toLocaleString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '刚刚'}
                    </div>
                  </div>
                  
                  <div className="flex items-center text-amber-600 font-bold text-xs opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300 mb-0.5">
                    <span>进入</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                  </div>
                </div>
              </div>
              
              {/* Decorative background shape */}
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-amber-50 to-orange-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
