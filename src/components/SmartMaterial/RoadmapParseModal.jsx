import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, AlertCircle, Calendar, MapPin, FileText, Sparkles } from 'lucide-react';

export function RoadmapParseModal({ isOpen, onClose, sources, onConfirm }) {
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('[RoadmapModal] isOpen:', isOpen, 'sources:', sources.length, 'parsedData:', parsedData);
    if (isOpen && sources.length > 0 && !parsedData) {
      parseRoadmap();
    }
  }, [isOpen, sources]);

  const parseRoadmap = async () => {
    setIsParsing(true);
    setError(null);

    try {
      console.log('[RoadmapModal] sources:', sources);
      console.log('[RoadmapModal] sources length:', sources.length);
      
      const sourceContent = sources.map(s => s.content).join('\n\n');
      console.log('[RoadmapModal] sourceContent length:', sourceContent.length);
      console.log('[RoadmapModal] sourceContent preview:', sourceContent.substring(0, 500));
      
      const response = await fetch('http://localhost:3002/api/smart/roadmap/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: sourceContent })
      });

      if (!response.ok) {
        throw new Error('解析失败');
      }

      const result = await response.json();
      setParsedData(result);
    } catch (err) {
      console.error('解析路线图失败:', err);
      setError('解析失败: ' + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirm = () => {
    if (parsedData) {
      onConfirm(parsedData);
      onClose();
    }
  };

  const handleRetry = () => {
    setParsedData(null);
    parseRoadmap();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">AI 解析产品路线图</h2>
              <p className="text-sm text-gray-500">
                {isParsing ? '正在分析数据源...' : parsedData ? `已解析 ${parsedData.versions?.length || 0} 个版本` : '准备解析'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isParsing ? (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-gray-600">AI 正在分析数据源...</p>
                <p className="text-sm text-gray-400 mt-2">请稍候，这可能需要几秒钟</p>
              </div>
            </div>
          ) : error ? (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  重新解析
                </button>
              </div>
            </div>
          ) : parsedData ? (
            <div className="space-y-6">
              {parsedData.versions?.map((version, index) => (
                <div key={version.id || index} className="bg-gray-50 rounded-xl p-5">
                  {/* 版本标题 */}
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: version.color || '#3B82F6' }}
                    />
                    <h3 className="text-lg font-bold text-gray-800">{version.name}</h3>
                    <span className="text-sm text-gray-500">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {version.startDate} 至 {version.endDate}
                    </span>
                  </div>

                  {/* 功能列表 */}
                  <div className="space-y-3">
                    {version.features?.map((feature, fIndex) => (
                      <div key={feature.id || fIndex} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800 mb-1">{feature.name}</h4>
                            {feature.description && (
                              <p className="text-sm text-gray-600">{feature.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {feature.priority === 'high' && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">高优先级</span>
                            )}
                            {feature.priority === 'medium' && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">中优先级</span>
                            )}
                            {feature.status === 'completed' && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                        </div>
                        {feature.owner && (
                          <div className="mt-2 text-xs text-gray-500">
                            负责人: {feature.owner}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">暂无数据</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!parsedData || isParsing}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            生成路线图
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoadmapParseModal;
