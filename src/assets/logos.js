// 产品鸭 Logo
export const productDuckLogo = `data:image/svg+xml;base64,${btoa(`
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#2E7CF6" />
        <stop offset="100%" stop-color="#6AA7FF" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="20" fill="url(#bg)" />
    <ellipse cx="50" cy="68" rx="26" ry="18" fill="#FFFFFF" />
    <circle cx="44" cy="42" r="16" fill="#FFFFFF" />
    <ellipse cx="54" cy="42" rx="7" ry="4" fill="#FF8A00" />
    <circle cx="38" cy="38" r="3" fill="#1F2937" />
    <rect x="68" y="64" width="4" height="10" rx="1" fill="#1E40AF" opacity="0.85" />
    <rect x="74" y="60" width="4" height="14" rx="1" fill="#2563EB" opacity="0.85" />
    <rect x="80" y="66" width="4" height="8" rx="1" fill="#60A5FA" opacity="0.85" />
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
