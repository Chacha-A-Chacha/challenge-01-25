// store/student/qr-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { QRCodeData, BaseStoreState } from '@/types'

interface QRState extends BaseStoreState {
  // QR Code data
  qrCodeDataUrl: string | null
  qrData: QRCodeData | null
  lastGenerated: Date | null
  
  // Generation state
  isGenerating: boolean
  generationError: string | null
  
  // Settings
  qrSettings: {
    size: number
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H'
    margin: number
    darkColor: string
    lightColor: string
  }
  
  // Usage tracking
  generateCount: number
  lastUsed: Date | null
  
  // Actions
  generateQRCode: (data: QRCodeData) => Promise<void>
  regenerateQRCode: () => Promise<void>
  clearQRCode: () => void
  updateQRSettings: (settings: Partial<QRState['qrSettings']>) => void
  downloadQRCode: (filename?: string) => void
  
  // Getters
  isQRValid: () => boolean
  getQRAge: () => number
  canRegenerate: () => boolean
}

export const useQRStore = create<QRState>()(
  persist(
    (set, get) => ({
      // Initial state
      isLoading: false,
      error: null,
      lastUpdated: null,
      
      qrCodeDataUrl: null,
      qrData: null,
      lastGenerated: null,
      
      isGenerating: false,
      generationError: null,
      
      qrSettings: {
        size: 256,
        errorCorrectionLevel: 'M',
        margin: 1,
        darkColor: '#000000',
        lightColor: '#FFFFFF'
      },
      
      generateCount: 0,
      lastUsed: null,
      
      generateQRCode: async (data) => {
        set({ isGenerating: true, generationError: null, isLoading: true })
        
        try {
          // Dynamic import to avoid SSR issues
          const QRCode = (await import('qrcode')).default
          const { qrSettings } = get()
          
          const qrDataString = JSON.stringify(data)
          
          const dataUrl = await QRCode.toDataURL(qrDataString, {
            errorCorrectionLevel: qrSettings.errorCorrectionLevel,
            type: 'image/png',
            quality: 0.92,
            margin: qrSettings.margin,
            width: qrSettings.size,
            color: {
              dark: qrSettings.darkColor,
              light: qrSettings.lightColor
            }
          })
          
          const now = new Date()
          
          set({
            qrCodeDataUrl: dataUrl,
            qrData: data,
            lastGenerated: now,
            lastUpdated: now,
            isGenerating: false,
            isLoading: false,
            generateCount: get().generateCount + 1,
            generationError: null
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to generate QR code'
          set({
            generationError: errorMessage,
            error: errorMessage,
            isGenerating: false,
            isLoading: false
          })
        }
      },
      
      regenerateQRCode: async () => {
        const { qrData } = get()
        if (qrData) {
          await get().generateQRCode(qrData)
        }
      },
      
      clearQRCode: () => set({ 
        qrCodeDataUrl: null, 
        qrData: null,
        lastGenerated: null,
        generationError: null,
        lastUpdated: new Date()
      }),
      
      updateQRSettings: (newSettings) => set((state) => ({
        qrSettings: { ...state.qrSettings, ...newSettings },
        lastUpdated: new Date()
      })),
      
      downloadQRCode: (filename = 'attendance-qr-code.png') => {
        const { qrCodeDataUrl } = get()
        if (!qrCodeDataUrl) return
        
        const link = document.createElement('a')
        link.download = filename
        link.href = qrCodeDataUrl
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        set({ lastUsed: new Date() })
      },
      
      // Getters
      isQRValid: () => {
        const { qrCodeDataUrl, lastGenerated } = get()
        if (!qrCodeDataUrl || !lastGenerated) return false
        
        // QR codes are valid for 24 hours
        const twentyFourHours = 24 * 60 * 60 * 1000
        return Date.now() - lastGenerated.getTime() < twentyFourHours
      },
      
      getQRAge: () => {
        const { lastGenerated } = get()
        if (!lastGenerated) return 0
        return Math.floor((Date.now() - lastGenerated.getTime()) / 1000) // seconds
      },
      
      canRegenerate: () => {
        const { lastGenerated } = get()
        if (!lastGenerated) return true
        
        // Allow regeneration every 5 minutes
        const fiveMinutes = 5 * 60 * 1000
        return Date.now() - lastGenerated.getTime() > fiveMinutes
      }
    }),
    {
      name: 'qr-storage',
      partialize: (state) => ({
        qrSettings: state.qrSettings,
        generateCount: state.generateCount,
        lastUsed: state.lastUsed
      })
    }
  )
)

// Selectors for performance
export const useQRCode = () => useQRStore(state => ({
  dataUrl: state.qrCodeDataUrl,
  data: state.qrData,
  isValid: state.isQRValid(),
  age: state.getQRAge()
}))

export const useQRGeneration = () => useQRStore(state => ({
  isGenerating: state.isGenerating,
  error: state.generationError,
  canRegenerate: state.canRegenerate(),
  generateQRCode: state.generateQRCode,
  regenerateQRCode: state.regenerateQRCode
}))

export const useQRSettings = () => useQRStore(state => ({
  settings: state.qrSettings,
  updateSettings: state.updateQRSettings
}))
