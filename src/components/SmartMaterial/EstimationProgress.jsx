import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, Clock, BarChart3 } from 'lucide-react';
import { EstimationService } from '../../services/estimation/EstimationService';

export function EstimationProgress({ taskId, onComplete, onError }) {
  const [progress, setProgress] = useState({
    status: 'running',
    progress: 0,
    currentBatch: 0,
    totalBatches: 0,
    completedFunctions: 0,
    totalFunctions: 0
  });
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    if (!taskId || !isPolling) return;

    const poll = async () => {
      try {
        const data = await EstimationService.getProgress(taskId);
        setProgress(data);

        if (data.status === 'completed') {
          setIsPolling(false);
          if (onComplete) {
            onComplete(data);
          }
        } else if (data.status === 'error') {
          setIsPolling(false);
          if (onError) {
            onError(new Error(data.error || '评估出错'));
          }
        } else if (data.status === 'cancelled') {
          setIsPolling(false);
          if (onError) {
            onError(new Error('评估已取消'));
          }
        } else {
          // 继续轮询
          setTimeout(poll, 1000);
        }
      } catch (error) {
        console.error('Poll progress error:', error);
        setIsPolling(false);
        if (onError) {
          onError(error);
        }
      }
    };

    poll();

    return () => {
      setIsPolling(false);
    };
  }, [taskId, isPolling, onComplete, onError]);

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case 'error':
      case 'cancelled':
        return <AlertCircle className="w-12 h-12 text-red-500" />;
      default:
        return <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />;
    }
  };

  const getStatusText = () => {
    switch (progress.status) {
      case 'completed':
        return '评估完成';
      case 'error':
        return '评估出错';
      case 'cancelled':
        return '已取消';
      default:
        return `正在评估第 ${progress.currentBatch}/${progress.totalBatches} 批...`;
    }
  };

  return (
    <div className="py-12 text-center">
      {/* Status Icon */}
      <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
        {getStatusIcon()}
      </div>

      {/* Status Text */}
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{getStatusText()}</h3>
      <p className="text-sm text-gray-500 mb-8">
        {progress.status === 'running' 
          ? 'AI 正在逐条评估功能工作量，请稍候...'
          : progress.status === 'completed'
          ? `已完成 ${progress.totalFunctions} 个功能的评估`
          : progress.error || '请重试'}
      </p>

      {/* Progress Stats */}
      <div className="flex items-center justify-center gap-8 mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <BarChart3 className="w-4 h-4" />
          <span>已完成: <strong className="text-blue-600">{progress.completedFunctions}</strong> / {progress.totalFunctions}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>批次: <strong className="text-blue-600">{progress.currentBatch}</strong> / {progress.totalBatches}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-md mx-auto">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progress.status === 'completed' 
                ? 'bg-green-500' 
                : progress.status === 'error' || progress.status === 'cancelled'
                ? 'bg-red-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${progress.progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-gray-400">0%</span>
          <span className={`text-sm font-medium ${
            progress.status === 'completed' 
              ? 'text-green-600' 
              : progress.status === 'error' || progress.status === 'cancelled'
              ? 'text-red-600'
              : 'text-blue-600'
          }`}>
            {progress.progress}%
          </span>
          <span className="text-xs text-gray-400">100%</span>
        </div>
      </div>
    </div>
  );
}

export default EstimationProgress;
