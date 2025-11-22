import PlatformBadge from './PlatformBadge'
import { PLATFORMS } from '../constants/platforms'

export default function PlatformLogoTest() {
  // 分离有logo和无logo的平台
  const platformsWithLogos = PLATFORMS.filter(p => p.hasLogo)
  const platformsWithoutLogos = PLATFORMS.filter(p => !p.hasLogo)

  return (
    <div className="p-8 bg-white min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">平台Logo功能测试</h1>
      
      {/* 有Logo的平台 */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-gray-700">有Logo的平台 ({platformsWithLogos.length}个)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {platformsWithLogos.map(platform => (
            <div key={platform.id} className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
              <PlatformBadge id={platform.id} size={48} showLogo={true} />
              <span className="mt-2 text-sm font-medium text-gray-700">{platform.name}</span>
              <span className="text-xs text-gray-500">{platform.id}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 无Logo的平台 */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-gray-700">无Logo的平台 ({platformsWithoutLogos.length}个)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {platformsWithoutLogos.map(platform => (
            <div key={platform.id} className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
              <PlatformBadge id={platform.id} size={48} showLogo={true} />
              <span className="mt-2 text-sm font-medium text-gray-700">{platform.name}</span>
              <span className="text-xs text-gray-500">{platform.id}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 对比测试 */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-gray-700">Logo vs 颜色徽章对比</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {platformsWithLogos.slice(0, 6).map(platform => (
            <div key={platform.id} className="p-6 border rounded-lg">
              <h3 className="text-lg font-medium mb-4 text-gray-800">{platform.name}</h3>
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <PlatformBadge id={platform.id} size={32} showLogo={true} />
                  <p className="mt-2 text-sm text-gray-600">Logo模式</p>
                </div>
                <div className="text-center">
                  <PlatformBadge id={platform.id} size={32} showLogo={false} />
                  <p className="mt-2 text-sm text-gray-600">颜色模式</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 不同尺寸测试 */}
      <section>
        <h2 className="text-2xl font-semibold mb-6 text-gray-700">不同尺寸测试</h2>
        <div className="space-y-6">
          {[16, 24, 32, 48, 64].map(size => (
            <div key={size} className="flex items-center space-x-4">
              <span className="w-16 text-sm font-medium text-gray-600">{size}px:</span>
              <div className="flex space-x-3">
                {platformsWithLogos.slice(0, 5).map(platform => (
                  <PlatformBadge key={platform.id} id={platform.id} size={size} showLogo={true} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}