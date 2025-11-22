// 产品鸭 Logo
export const productDuckLogo = `data:image/svg+xml;base64,${btoa(`
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="duckGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#FFA500;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#duckGradient)" rx="20"/>
    <ellipse cx="50" cy="65" rx="25" ry="20" fill="#FFFFFF"/>
    <circle cx="50" cy="35" r="18" fill="#FFFFFF"/>
    <ellipse cx="58" cy="35" rx="8" ry="4" fill="#FF6B35"/>
    <circle cx="45" cy="30" r="3" fill="#333333"/>
    <rect x="35" y="50" width="30" height="8" fill="#4A90E2" rx="4"/>
    <text x="50" y="56" font-family="Arial, sans-serif" font-size="6" fill="white" text-anchor="middle">PRODUCT</text>
  </svg>
`)}`;

// 本地SVG图标数据
export const logoSvgs = {
  axure: `data:image/svg+xml;base64,${btoa(`
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="60" rx="12" fill="#3b82f6"/>
      <text x="30" y="38" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">A</text>
    </svg>
  `)}`,
  figma: `data:image/svg+xml;base64,${btoa(`
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="60" rx="12" fill="#10b981"/>
      <text x="30" y="38" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">F</text>
    </svg>
  `)}`,
  sketch: `data:image/svg+xml;base64,${btoa(`
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="60" rx="12" fill="#f59e0b"/>
      <text x="30" y="38" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">S</text>
    </svg>
  `)}`
}

// 生成默认Logo的函数
export const generateDefaultLogo = (name, color = '#3b82f6') => {
  const firstLetter = (name || '').charAt(0).toUpperCase()
  const svgContent = `
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="60" rx="12" fill="${color}"/>
      <text x="30" y="38" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">${firstLetter}</text>
    </svg>
  `
  return `data:image/svg+xml,${encodeURIComponent(svgContent)}`
}