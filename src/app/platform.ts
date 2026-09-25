export type PlatformInfo = {
  userAgent: string
  platform: string
  maxTouchPoints: number
}

/** iPhone, iPod или iPad. Новите iPad-и се представят като Mac с тъч екран. */
export function isIosDevice({ userAgent, platform, maxTouchPoints }: PlatformInfo): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true
  return platform === 'MacIntel' && maxTouchPoints > 1
}

export function currentPlatform(): PlatformInfo {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
  }
}

/** Дали приложението е отворено от иконата на началния екран, а не в браузъра. */
export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}
