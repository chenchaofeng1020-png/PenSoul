import React from 'react';
import { Calendar } from 'lucide-react';

const TopicCard = ({ topic, onSchedule }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-700 border-green-200';
      case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'published': return '已发布';
      case 'scheduled': return '已排期';
      default: return '待定';
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex justify-between items-start mb-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(topic.status)}`}>
          {getStatusLabel(topic.status)}
        </span>
        {topic.angle && (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
            {topic.angle}
          </span>
        )}
      </div>
      
      <h3 className="text-sm font-bold text-gray-900 mb-2 line-clamp-2 leading-snug">
        {topic.title}
      </h3>
      
      <p className="text-xs text-gray-500 mb-3 line-clamp-3">
        {topic.hook || topic.rationale || '暂无详细描述'}
      </p>
      
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        {topic.schedule_date ? (
          <div className="flex items-center text-xs text-blue-600 font-medium">
            <Calendar className="w-3 h-3 mr-1" />
            {new Date(topic.schedule_date).toLocaleDateString()}
          </div>
        ) : (
          <div className="text-xs text-gray-400">未排期</div>
        )}
        
        <button 
          onClick={() => onSchedule(topic)}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors opacity-0 group-hover:opacity-100"
        >
          {topic.status === 'scheduled' ? '修改日期' : '加入排期'}
        </button>
      </div>
    </div>
  );
};

export default TopicCard;
