// store/student/qr-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  BaseStoreState,
  QRCodeData
} from '@/types'

// ============================================================================
// TYPES - Only what's needed for QR state
// ============================================================================

interface QRSettings {
  size: number
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H'
  darkColor: string
  lightColor: string
}

// QR generation options interface (matches our declaration)
interface QRCodeOptions {
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  type?: 'image/png' | 'image/jpeg' | 'image/webp'
  quality?: number
  margin?: number
  width?: number
  color?: {
    dark?: string
    light?: string
  }
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface QRState extends BaseStoreState {
  // Core QR data
  qrCodeDataUrl: string | null
  qrData: QRCodeData | null

  // Simple generation state
  isGenerating: boolean

  // Basic settings
  settings: QRSettings

  // Actions
  generateQRCode: (data: QRCodeData) => Promise<void>
  regenerateQRCode: () => Promise<void>
  clearQRCode: () => void
  updateSettings: (settings: Partial<QRSettings>) => void
  downloadQRCode: (filename?: string) => void

  // Utils
  reset: () => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_SETTINGS: QRSettings = {
  size: 256,
  errorCorrectionLevel: 'M',
  darkColor: '#000000',
  lightColor: '#FFFFFF'
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function validateQRData(data: QRCodeData): boolean {
  return !!(data.uuid && data.student_id)
}

function createDownloadLink(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useQRStore = create<QRState>()(
  persist(
    (set, get) => ({
      // Base state
      isLoading: false,
      error: null,
      lastUpdated: null,

      // Core QR data
      qrCodeDataUrl: null,
      qrData: null,

      // Generation state
      isGenerating: false,

      // Settings
      settings: DEFAULT_SETTINGS,

      // ============================================================================
      // ACTIONS
      // ============================================================================

      generateQRCode: async (data) => {
        set({ isGenerating: true, error: null })

        try {
          // Validate QR data
          if (!validateQRData(data)) {
            throw new Error('Invalid QR data: missing uuid or student_id')
          }

          // Dynamic import with proper typing (resolves TS7016)
          const QRCode = (await import('qrcode')).default
          const { settings } = get()

          const qrDataString = JSON.stringify(data)

          // Type-safe QR generation options
          const qrOptions: QRCodeOptions = {
            errorCorrectionLevel: settings.errorCorrectionLevel,
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            width: settings.size,
            color: {
              dark: settings.darkColor,
              light: settings.lightColor
            }
          }

          const dataUrl = await QRCode.toDataURL(qrDataString, qrOptions)

          set({
            qrCodeDataUrl: dataUrl,
            qrData: data,
            isGenerating: false,
            lastUpdated: new Date()
          })

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to generate QR code'
          set({
            error: errorMessage,
            isGenerating: false
          })
        }
      },

      regenerateQRCode: async () => {
        const { qrData } = get()
        if (qrData) {
          await get().generateQRCode(qrData)
        }
      },

      clearQRCode: () => {
        set({
          qrCodeDataUrl: null,
          qrData: null,
          error: null,
          lastUpdated: new Date()
        })
      },

      updateSettings: (newSettings) => {
        set(state => ({
          settings: { ...state.settings, ...newSettings },
          lastUpdated: new Date()
        }))
      },

      downloadQRCode: (filename = 'attendance-qr-code.png') => {
        const { qrCodeDataUrl } = get()

        if (!qrCodeDataUrl) {
          set({ error: 'No QR code to download' })
          return
        }

        try {
          createDownloadLink(qrCodeDataUrl, filename)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Download failed'
          set({ error: errorMessage })
        }
      },

      // ============================================================================
      // UTILITIES
      // ============================================================================

      reset: () => {
        set({
          qrCodeDataUrl: null,
          qrData: null,
          isGenerating: false,
          settings: DEFAULT_SETTINGS,
          isLoading: false,
          error: null,
          lastUpdated: null
        })
      }
    }),
    {
      name: 'qr-store',
      partialize: (state) => ({
        // Only persist user preferences
        settings: state.settings
        // Don't persist QR data, generation state, or errors
      })
    }
  )
)

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for QR code data and generation
 */
export function useQRCode() {
  return useQRStore(state => ({
    dataUrl: state.qrCodeDataUrl,
    data: state.qrData,
    isGenerating: state.isGenerating,
    error: state.error,
    generateQRCode: state.generateQRCode,
    regenerateQRCode: state.regenerateQRCode,
    clearQRCode: state.clearQRCode,
    downloadQRCode: state.downloadQRCode
  }))
}

/**
 * Hook for QR settings
 */
export function useQRSettings() {
  return useQRStore(state => ({
    settings: state.settings,
    updateSettings: state.updateSettings
  }))
}
