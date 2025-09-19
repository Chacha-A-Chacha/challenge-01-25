// hooks/teacher/useQRScanner.ts
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNotifications } from '@/hooks/ui'
import { useAttendance } from './useAttendance'

/**
 * QR code scanning functionality
 */
export function useQRScanner(sessionId?: string) {
  const [isScanning, setIsScanning] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const { showError } = useNotifications()
  const { scanQRCode } = useAttendance(sessionId)

  // Request camera permission
  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      })
      
      setHasPermission(true)
      setError(null)
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop())
      
      return true
    } catch (error) {
      setHasPermission(false)
      setError('Camera permission denied')
      showError('Camera Access', 'Please allow camera access to scan QR codes')
      return false
    }
  }, [showError])

  // Start scanning
  const startScanning = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission()
      if (!granted) return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsScanning(true)
        setError(null)
      }
      
      return true
    } catch (error) {
      setError('Failed to start camera')
      showError('Camera Error', 'Failed to access camera')
      return false
    }
  }, [hasPermission, requestPermission, showError])

  // Stop scanning
  const stopScanning = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setIsScanning(false)
  }, [])

  // Handle QR code detection
  const handleQRDetection = useCallback(async (qrData: string) => {
    const success = await scanQRCode(qrData)
    
    if (success) {
      // Brief pause before allowing next scan
      setTimeout(() => {
        // Could add visual feedback here
      }, 1000)
    }
  }, [scanQRCode])

  // QR code detection using a library like @zxing/library
  const initializeScanner = useCallback(() => {
    if (!isScanning || !videoRef.current) return

    // This would typically use a QR scanning library
    // For brevity, showing the pattern
    const detectQR = async () => {
      try {
        // Simulate QR detection
        // In reality, you'd use @zxing/library or similar
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        
        if (context && videoRef.current) {
          canvas.width = videoRef.current.videoWidth
          canvas.height = videoRef.current.videoHeight
          context.drawImage(videoRef.current, 0, 0)
          
          // QR detection logic would go here
          // const result = await codeReader.decodeFromCanvas(canvas)
          // if (result) handleQRDetection(result.getText())
        }
      } catch (error) {
        // QR detection failed - continue scanning
      }
      
      if (isScanning) {
        requestAnimationFrame(detectQR)
      }
    }
    
    detectQR()
  }, [isScanning, handleQRDetection])

  // Initialize scanner when scanning starts
  useEffect(() => {
    if (isScanning) {
      initializeScanner()
    }
  }, [isScanning, initializeScanner])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [stopScanning])

  return {
    // State
    isScanning,
    hasPermission,
    error,
    videoRef,
    
    // Actions
    startScanning,
    stopScanning,
    requestPermission,
    
    // Manual QR input for testing
    processQRCode: handleQRDetection
  }
}
