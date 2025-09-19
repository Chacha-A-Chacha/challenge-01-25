// types/mobile.ts

export interface CameraPermission {
  granted: boolean
  denied: boolean
  prompt: () => Promise<boolean>
  checkPermission: () => Promise<PermissionState>
}

export interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  hasCamera: boolean
  hasTouch: boolean
  orientation: 'portrait' | 'landscape'
  userAgent: string
  platform: string
}

export interface PWAInstallPrompt {
    canInstall: boolean
    showPrompt: () => Promise<boolean>
    isInstalled: boolean
    installEvent?: BeforeInstallPromptEvent
}

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[]
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>
    prompt(): Promise<void>
}

export interface NotificationPermission {
  granted: boolean
  denied: boolean
  canRequest: boolean
  request: () => Promise<NotificationPermission>
}

export interface GeolocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

export interface NetworkStatus {
  isOnline: boolean
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown'
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g'
  downlink: number
  rtt: number
}
