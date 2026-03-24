import React from 'react';
import { List, Play, CheckCircle, Circle, Loader2 } from 'lucide-react';
import { useRequirementDoc, DOC_STATES } from '../../../context/RequirementDocContext';

export function TaskList() {
  const { state, dispatch } = useRequirementDoc();

  if (!state.tasks || state.tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <span className="text-sm">正在拆解任务...</span>
      </div>
    );
  }

  const handleConfirm = () => {
    dispatch({ type: 'START_WRITING' });
  };

  const completedTasks = state.tasks.filter(t => t.status === 'completed').length;
  const totalTasks = state.tasks.length;
  const progress = (completedTasks / totalTasks) * 100;

  return (
    <div className="p-5 space-y-5">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
            <List className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">写作任务</h3>
            <p className="text-xs text-slate-500">{completedTasks}/{totalTasks} 已完成</p>
          </div>
        </div>
        <button
          onClick={handleConfirm}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Play className="w-4 h-4" />
          开始撰写
        </button>
      </div>

      {/* 进度条 */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-slate-900 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm font-medium text-slate-700">{Math.round(progress)}%</span>
      </div>

      {/* 任务列表 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {state.tasks.map((task, index) => (
            <div 
              key={index}
              className={`flex items-center gap-3 px-4 py-3 ${
                task.status === 'completed' ? 'bg-slate-50/50' : 
                task.status === 'writing' ? 'bg-blue-50/30' : ''
              }`}
            >
              <div className="flex-shrink-0">
                {task.status === 'completed' ? (
                  <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                ) : task.status === 'writing' ? (
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center">
                    <span className="text-xs text-slate-400">{index + 1}</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{task.section}</p>
                {task.content && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {task.content.substring(0, 100)}...
                  </p>
                )}
              </div>

              {task.status === 'completed' && (
                <span className="text-[10px] text-slate-500">已完成</span>
              )}
              {task.status === 'writing' && (
                <span className="text-[10px] text-blue-600">撰写中</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
