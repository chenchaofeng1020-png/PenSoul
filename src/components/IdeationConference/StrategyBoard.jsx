import React from 'react';
import TopicCard from './TopicCard';
import { LayoutGrid } from 'lucide-react';

const StrategyBoard = ({ topics, onScheduleTopic }) => {
  return (
    <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between h-14">
        <div className="flex items-center space-x-2">
          <LayoutGrid className="w-4 h-4 text-gray-500" />
          <span className="font-semibold text-gray-800 text-sm">策略看板</span>
        </div>
        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-500 font-medium">
          {topics.length} 方案
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {topics.map(topic => (
          <TopicCard 
            key={topic.id} 
            topic={topic} 
            onSchedule={onScheduleTopic}
          />
        ))}
        
        {topics.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center px-4">
            <LayoutGrid className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">暂无选题方案</p>
            <p className="text-xs mt-1 opacity-70">请在左侧与诸葛对话，生成新的策划案</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategyBoard;
