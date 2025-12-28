// hooks/teacher/useQRScanner.ts
import { useState, useRef, useCallback, useEffect } from "react";
import { useAttendanceStore } from "@/store/teacher/attendance-store";
import { useNotifications } from "@/store/shared/ui-store";

interface QRScannerOptions {
  sessionId?: string;
  facingMode?: "user" | "environment";
  onScanSuccess?: (result: string) => void;
  onScanError?: (error: string) => void;
}

/**
 * QR Scanner hook for camera/hardware interaction
 * Handles camera permissions, video stream management, and QR detection
 * Uses attendance store for actual QR processing
 */
export function useQRScanner(options: QRScannerOptions = {}) {
  const {
    sessionId,
    facingMode = "environment",
    onScanSuccess,
    onScanError,
  } = options;

  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<{ reset?: () => void } | null>(null); // For QR detection library

  const { scanQRCode } = useAttendanceStore();
  const { showError, showSuccess } = useNotifications();

  // Request camera permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setIsInitializing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
      });

      setHasPermission(true);
      setError(null);

      // Stop the test stream immediately
      stream.getTracks().forEach((track) => track.stop());

      return true;
    } catch (error) {
      setHasPermission(false);
      const errorMessage =
        error instanceof Error ? error.message : "Camera permission denied";
      setError(errorMessage);
      showError(
        "Camera Access Denied",
        "Please allow camera access to scan QR codes",
      );
      return false;
    } finally {
      setIsInitializing(false);
    }
  }, [facingMode, showError]);

  // Start video stream and scanning
  const startScanning = useCallback(async (): Promise<boolean> => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    try {
      setIsInitializing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
        setError(null);

        // Start video playback
        await videoRef.current.play();
      }

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to start camera";
      setError(errorMessage);
      showError("Camera Error", errorMessage);
      return false;
    } finally {
      setIsInitializing(false);
    }
  }, [hasPermission, requestPermission, facingMode, showError]);

  // Stop video stream and scanning
  const stopScanning = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (scannerRef.current) {
      // Stop QR detection if using a library like @zxing/library
      try {
        scannerRef.current.reset?.();
      } catch (error) {
        console.warn("Failed to reset QR scanner:", error);
      }
    }

    setIsScanning(false);
    setError(null);
  }, []);

  // Handle successful QR code detection
  const handleQRDetection = useCallback(
    async (qrData: string) => {
      try {
        if (sessionId) {
          // Use store to process the QR code
          const success = await scanQRCode(qrData);
          if (success) {
            showSuccess("Attendance Marked", "QR code scanned successfully");
            onScanSuccess?.(qrData);
          } else {
            onScanError?.("Failed to process QR code");
          }
        } else {
          // No session selected, just return the QR data
          onScanSuccess?.(qrData);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "QR processing failed";
        showError("QR Scan Error", errorMessage);
        onScanError?.(errorMessage);
      }
    },
    [sessionId, scanQRCode, showSuccess, showError, onScanSuccess, onScanError],
  );

  // Manual QR code input (for testing or manual entry)
  const processQRCode = useCallback(
    async (qrData: string) => {
      await handleQRDetection(qrData);
    },
    [handleQRDetection],
  );

  // Switch camera (front/back)
  const switchCamera = useCallback(async () => {
    const newFacingMode = facingMode === "environment" ? "user" : "environment";

    if (isScanning) {
      stopScanning();
      // Wait a bit for cleanup
      setTimeout(() => {
        // This would require reinitializing with new facing mode
        // For now, just inform the user to restart
        showError(
          "Camera Switch",
          "Please stop and restart scanning to switch camera",
        );
      }, 100);
    }
  }, [facingMode, isScanning, stopScanning, showError]);

  // Initialize QR detection when scanning starts
  useEffect(() => {
    if (isScanning && videoRef.current) {
      // Here you would initialize a QR detection library like @zxing/library
      // Example pattern:
      /*
      import { BrowserQRCodeReader } from '@zxing/library'

      const codeReader = new BrowserQRCodeReader()
      scannerRef.current = codeReader

      codeReader.decodeFromVideoDevice(
        undefined, // Use default camera
        videoRef.current,
        (result, error) => {
          if (result) {
            handleQRDetection(result.getText())
          }
          // Continue scanning even after successful detection
        }
      )
      */

      // For now, we'll just set up the reference
      scannerRef.current = {
        reset: () => {}, // Placeholder
      };
    }

    return () => {
      if (scannerRef.current?.reset) {
        try {
          scannerRef.current.reset();
        } catch (error) {
          console.warn("QR scanner cleanup error:", error);
        }
      }
    };
  }, [isScanning, handleQRDetection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  // Check initial permission state
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const permission = await navigator.permissions.query({
          name: "camera" as PermissionName,
        });
        setHasPermission(permission.state === "granted");

        // Listen for permission changes
        permission.addEventListener("change", () => {
          setHasPermission(permission.state === "granted");
          if (permission.state === "denied" && isScanning) {
            stopScanning();
          }
        });
      } catch (error) {
        // Permissions API not supported, will check on first use
        console.warn("Permissions API not supported");
      }
    };

    checkPermission();
  }, [isScanning, stopScanning]);

  return {
    // State
    isScanning,
    hasPermission,
    error,
    isInitializing,

    // Refs for UI components
    videoRef,

    // Actions
    startScanning,
    stopScanning,
    requestPermission,
    processQRCode,
    switchCamera,

    // Helpers
    clearError: () => setError(null),
    canScan: hasPermission && !isInitializing,

    // Camera info
    facingMode,
  };
}
