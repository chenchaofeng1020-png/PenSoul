import { X, Calendar, Users, Lightbulb, ExternalLink, Tag } from 'lucide-react'

const CompetitorDetailModal = ({ competitor, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 模态框头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <img
              src={competitor.logo}
              alt={`${competitor.name} logo`}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{competitor.name}</h2>
              <p className="text-primary-600">{competitor.slogan}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 详情内容 */}
        <div className="p-6 space-y-8">
          {/* 基本信息卡片 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Tag className="w-5 h-5 mr-2 text-primary-600" />
              产品概述
            </h3>
            <p className="text-gray-700 leading-relaxed">{competitor.description}</p>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-2" />
              <span>最后更新：{competitor.lastUpdated}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 主要客户 */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-green-600" />
                主要客户
                <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  {competitor.mainCustomers.length}
                </span>
              </h3>
              <div className="space-y-3">
                {competitor.mainCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-semibold">
                        {(customer || '').charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{customer}</p>
                      <p className="text-sm text-gray-500">重要合作伙伴</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 近期更新 */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Lightbulb className="w-5 h-5 mr-2 text-yellow-600" />
                近期更新功能
                <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                  {competitor.recentUpdates.length}
                </span>
              </h3>
              <div className="space-y-3">
                {competitor.recentUpdates.map((update, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium">{update}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        功能更新 #{index + 1}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 竞品分析指标 */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">竞品分析指标</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900">市场影响力</h4>
                <p className="text-sm text-gray-600 mt-1">基于客户数量评估</p>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{width: `${Math.min(competitor.mainCustomers.length * 20, 100)}%`}}></div>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Lightbulb className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900">创新活跃度</h4>
                <p className="text-sm text-gray-600 mt-1">基于更新频率评估</p>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{width: `${Math.min(competitor.recentUpdates.length * 25, 100)}%`}}></div>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-8 h-8 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-900">更新频率</h4>
                <p className="text-sm text-gray-600 mt-1">最近更新时间</p>
                <div className="mt-2">
                  <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                    {competitor.lastUpdated}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 操作建议 */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">分析建议</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">优势分析</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 拥有 {competitor.mainCustomers.length} 个重要客户</li>
                  <li>• 近期推出 {competitor.recentUpdates.length} 项新功能</li>
                  <li>• 产品定位：{competitor.slogan}</li>
                </ul>
              </div>
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">关注重点</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 持续关注产品功能更新</li>
                  <li>• 分析客户反馈和市场表现</li>
                  <li>• 监控定价策略变化</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            竞品ID: {competitor.id} | 添加时间: {competitor.lastUpdated}
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors duration-200">
              <ExternalLink className="w-4 h-4" />
              <span>访问官网</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors duration-200"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompetitorDetailModal