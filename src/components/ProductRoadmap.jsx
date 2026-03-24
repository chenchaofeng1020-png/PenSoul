import { useState, useEffect } from 'react';
import { Calendar, Share2, Plus, Search, Filter, ChevronDown, CheckCircle, Clock, AlertCircle, Users, Tag, FileText, Sparkles, Loader2 } from 'lucide-react';

export function ProductRoadmap({ currentProduct, sources }) {
  const [roadmapData, setRoadmapData] = useState({
    versions: [],
    demandPool: []
  });
  const [selectedVersion, setSelectedVersion] = useState('all');
  const [zoomLevel, setZoomLevel] = useState('10px');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [inputData, setInputData] = useState('');

  // 生成路线图
  const generateRoadmap = async () => {
    if (!inputData.trim()) {
      setError('请输入数据源内容');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3002/api/smart/roadmap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: inputData })
      });

      if (!response.ok) {
        throw new Error('生成路线图失败');
      }

      const result = await response.json();
      setRoadmapData(result);
    } catch (err) {
      console.error('生成路线图失败:', err);
      setError('生成路线图失败: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // 当有外部数据源时自动填充
  useEffect(() => {
    if (sources && sources.length > 0) {
      const sourceContent = sources.map(s => s.content).join('\n\n');
      setInputData(sourceContent);
    }
  }, [sources]);

  // 计算时间轴范围
  const getTimeRange = () => {
    const allDates = [];
    roadmapData.versions.forEach(version => {
      allDates.push(new Date(version.startDate));
      allDates.push(new Date(version.endDate));
    });
    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    return { minDate, maxDate };
  };

  const { minDate, maxDate } = getTimeRange();

  // 生成日期刻度
  const generateDateTicks = () => {
    const ticks = [];
    const current = new Date(minDate);
    current.setDate(current.getDate() - 7); // 向前扩展一周
    
    while (current <= maxDate) {
      ticks.push(new Date(current));
      current.setDate(current.getDate() + 7); // 每周一个刻度
    }
    
    return ticks;
  };

  const dateTicks = generateDateTicks();

  // 计算功能卡片位置
  const calculateFeaturePosition = (feature, version) => {
    const start = new Date(version.startDate);
    const end = new Date(version.endDate);
    const totalDays = (end - start) / (1000 * 60 * 60 * 24);
    const left = 0; // 简化处理，实际应该根据日期计算
    const width = totalDays * 10; // 简化处理，实际应该根据日期范围计算
    return { left, width };
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 头部 */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-bold text-gray-800">产品路线图</h2>
        </div>
        
        <div className="flex items-center gap-4">
          {/* 缩放控制 */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>10px</span>
            <ChevronDown className="w-4 h-4" />
          </div>
          
          {/* 搜索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索功能"
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          
          {/* 需求池 */}
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4" />
            需求池
          </button>
          
          {/* 分享 */}
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Share2 className="w-4 h-4" />
            分享
          </button>
          
          {/* 生成路线图按钮 */}
          <button
            onClick={generateRoadmap}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                生成路线图
              </>
            )}
          </button>
        </div>
      </div>

      {/* 数据源输入 */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">数据源</h3>
        </div>
        <textarea
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          placeholder="请输入产品需求、功能清单等数据源，大模型将根据这些信息生成产品路线图..."
          className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
        />
        {error && (
          <div className="mt-2 text-sm text-red-600">{error}</div>
        )}
      </div>

      {/* 主要内容 */}
      <div className="flex-1 overflow-auto">
        {roadmapData.versions.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">暂无路线图数据</p>
              <p className="text-sm text-gray-400 mb-6">请在上方输入数据源并点击"生成路线图"按钮</p>
              <button
                onClick={generateRoadmap}
                disabled={isGenerating || !inputData.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    生成路线图
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="min-w-[1200px] p-6">
            {/* 时间轴 */}
            <div className="relative border-b border-gray-200 pb-4 mb-6">
              <div className="flex items-end">
                {/* 版本标签 */}
                <div className="w-48 flex flex-col gap-4">
                  {roadmapData.versions.map((version) => (
                    <div key={version.id} className="flex flex-col items-center">
                      <div 
                        className="px-3 py-1 rounded-full text-xs font-medium text-white mb-2"
                        style={{ backgroundColor: version.color }}
                      >
                        {version.name}
                      </div>
                      <div className="text-xs text-gray-500 text-center">
                        {version.startDate.split('-').slice(1).join('-')} - {version.endDate.split('-').slice(1).join('-')}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* 日期刻度 */}
                <div className="flex-1 relative">
                  {/* 时间轴线条 */}
                  {roadmapData.versions.map((version, index) => (
                    <div 
                      key={version.id}
                      className="absolute left-0 right-0 h-px bg-gray-200"
                      style={{ 
                        top: `${index * 60 + 15}px`,
                        backgroundColor: version.color
                      }}
                    />
                  ))}
                  
                  {/* 日期标签 */}
                  <div className="flex justify-between">
                    {dateTicks.map((date, index) => (
                      <div key={index} className="text-xs text-gray-500">
                        {date.getFullMonth() + 1}月{date.getDate()}日
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 功能卡片 */}
            <div className="relative">
              {/* 版本时间线 */}
              <div className="w-48 flex flex-col gap-4 mb-4">
                {roadmapData.versions.map((version) => (
                  <div key={version.id} className="h-16"></div>
                ))}
              </div>
              
              {/* 功能卡片区域 */}
              <div className="absolute top-0 left-48 right-0">
                {roadmapData.versions.map((version, versionIndex) => (
                  <div 
                    key={version.id}
                    className="mb-4 relative"
                    style={{ 
                      height: '64px',
                      borderLeft: `2px solid ${version.color}`
                    }}
                  >
                    <div className="flex gap-4 absolute top-0 left-4 right-0">
                      {version.features.map((feature) => {
                        const { left, width } = calculateFeaturePosition(feature, version);
                        return (
                          <div 
                            key={feature.id}
                            className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow flex-1 min-w-[200px]"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="text-sm font-medium text-gray-800">{feature.name}</h4>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                  {feature.status === 'completed' ? (
                                    <CheckCircle className="w-3 h-3 inline text-green-500" />
                                  ) : feature.status === 'in_progress' ? (
                                    <Clock className="w-3 h-3 inline text-yellow-500" />
                                  ) : (
                                    <AlertCircle className="w-3 h-3 inline text-gray-400" />
                                  )}
                                  {feature.status === 'completed' ? '已完成' : feature.status === 'in_progress' ? '进行中' : '待开始'}
                                </span>
                              </div>
                            </div>
                            {feature.description && (
                              <p className="text-xs text-gray-600 mb-2 line-clamp-1">{feature.description}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs">
                              <Users className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-500">{feature.owner || '未分配'}</span>
                              {feature.priority === 'high' && (
                                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">高</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductRoadmap;