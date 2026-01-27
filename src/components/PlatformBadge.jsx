import { PLATFORM_MAP } from '../constants/platforms'
import { 
  WechatLogo, 
  XiaohongshuLogo, 
  DouyinLogo, 
  BilibiliLogo, 
  WeiboLogo, 
  KuaishouLogo, 
  ZhihuLogo,
  DefaultLogo 
} from '../assets/platformLogos'

const LOGO_COMPONENTS = {
  wechat_mp: WechatLogo,
  xiaohongshu: XiaohongshuLogo,
  douyin: DouyinLogo,
  bilibili: BilibiliLogo,
  weibo: WeiboLogo,
  kuaishou: KuaishouLogo,
  zhihu: ZhihuLogo
}

export default function PlatformBadge({ id, size = 20, showLogo = true }){
  const p = PLATFORM_MAP[id]
  const LogoComponent = LOGO_COMPONENTS[id] || (showLogo ? DefaultLogo : null)
  
  // 如果显示logo且有对应的logo组件
  if (showLogo && LogoComponent) {
    return <LogoComponent size={size} className="rounded-md" />
  }
  
  // 否则显示传统的颜色徽章
  const s = { width: size, height: size, backgroundColor: p?.color || '#ccc' }
  const text = p?.abbr || ((id || '').slice(0,2).toUpperCase() || 'NA')
  return (
    <div className="rounded-md flex items-center justify-center text-white font-semibold" style={s}>
      <span style={{ fontSize: size*0.45 }}>{text}</span>
    </div>
  )
}
