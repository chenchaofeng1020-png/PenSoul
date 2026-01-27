import React from 'react';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';

const SessionNavigator = ({ 
  sessions, 
  currentSessionId, 
  onSelectSession, 
  onCreateSession,
  onDeleteSession
}) => {
  return (
    <div className="w-64 border-r border-gray-200 bg-white flex flex-col h-full">
      <div className="p-4 border-b border-gray-100">
        <button 
          onClick={onCreateSession}
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">新建策划</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.map(session => (
          <div 
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`group flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
              currentSessionId === session.id 
                ? 'bg-blue-50 text-blue-700' 
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <MessageSquare className={`w-4 h-4 mr-3 flex-shrink-0 ${
              currentSessionId === session.id ? 'text-blue-500' : 'text-gray-400'
            }`} />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium truncate">{session.title}</h3>
              <p className="text-xs text-gray-400 truncate">
                {new Date(session.updated_at).toLocaleDateString()}
              </p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if(confirm('确定删除此会话吗？')) onDeleteSession(session.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 hover:text-red-500 rounded transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            暂无历史策划
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionNavigator;
