// hooks/teacher/useQRScanner.ts
import { useState, useRef, useCallback, useEffect } from "react";
import { BrowserQRCodeReader } from "@zxing/library";
import { useAttendanceStore } from "@/store/teacher/attendance-store";
import { useNotifications } from "@/store/shared/ui-store";
import { initSounds, cleanupSounds, playSound } from "@/lib/sounds";

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
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<
    "idle" | "success" | "error" | "wrong-session"
  >("idle");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserQRCodeReader | null>(null);
  const scanningRef = useRef(false);

  const { scanQRCode } = useAttendanceStore();
  const { showError, showSuccess } = useNotifications();

  // Initialize sounds when hook mounts
  useEffect(() => {
    initSounds();
    return () => {
      cleanupSounds();
    };
  }, []);

  // Check if browser supports camera access
  const checkCameraSupport = useCallback((): boolean => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError(
        "Camera not supported on this device. Please use a modern browser like Chrome, Safari, or Firefox.",
      );
      showError(
        "Camera Not Supported",
        "Your browser doesn't support camera access. Please use Chrome, Safari, or Firefox.",
      );
      return false;
    }
    return true;
  }, [showError]);

  // Request camera permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    // Check browser support first
    if (!checkCameraSupport()) {
      return false;
    }

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
  }, [facingMode, showError, checkCameraSupport]);

  // Handle successful QR code detection
  const handleQRDetection = useCallback(
    async (qrData: string) => {
      // Prevent duplicate scans of the same code
      if (qrData === lastScannedCode) {
        return;
      }

      setLastScannedCode(qrData);

      // Reset after 3 seconds to allow rescanning
      setTimeout(() => setLastScannedCode(null), 3000);

      try {
        if (sessionId) {
          // Use store to process the QR code
          const result = await scanQRCode(qrData);

          if (result.success) {
            // Play sound and set visual status based on attendance status
            if (result.status === "PRESENT") {
              setScanStatus("success");
              playSound("success");
              showSuccess("Attendance Marked", "Student marked present");
            } else if (result.status === "WRONG_SESSION") {
              setScanStatus("wrong-session");
              playSound("wrong-session");
              showSuccess("Wrong Session", "Student marked in wrong session");
            } else {
              // Fallback for any other status
              setScanStatus("success");
              playSound("success");
              showSuccess("Attendance Marked", "QR code scanned successfully");
            }

            // Reset status after animation
            setTimeout(() => setScanStatus("idle"), 500);
            onScanSuccess?.(qrData);
          } else {
            // Failed to process QR code
            setScanStatus("error");
            playSound("error");
            showError("Scan Failed", "Failed to process QR code");
            setTimeout(() => setScanStatus("idle"), 500);
            onScanError?.("Failed to process QR code");
          }
        } else {
          // No session selected, just return the QR data
          onScanSuccess?.(qrData);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "QR processing failed";
        setScanStatus("error");
        playSound("error");
        showError("QR Scan Error", errorMessage);
        setTimeout(() => setScanStatus("idle"), 500);
        onScanError?.(errorMessage);
      }
    },
    [
      sessionId,
      scanQRCode,
      showSuccess,
      showError,
      onScanSuccess,
      onScanError,
      lastScannedCode,
    ],
  );

  // Start video stream and scanning
  const startScanning = useCallback(async (): Promise<boolean> => {
    // Check browser support first
    if (!checkCameraSupport()) {
      return false;
    }

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    if (!videoRef.current) {
      setError("Video element not available");
      return false;
    }

    try {
      setIsInitializing(true);
      setError(null);

      // Initialize QR code reader
      const codeReader = new BrowserQRCodeReader();
      codeReaderRef.current = codeReader;

      // Get available video devices
      const videoInputDevices = await codeReader.listVideoInputDevices();

      if (videoInputDevices.length === 0) {
        throw new Error("No camera devices found");
      }

      // Find the appropriate camera based on facingMode
      let selectedDeviceId = videoInputDevices[0].deviceId;

      // Try to find rear camera for 'environment' mode
      if (facingMode === "environment") {
        const rearCamera = videoInputDevices.find(
          (device) =>
            device.label.toLowerCase().includes("back") ||
            device.label.toLowerCase().includes("rear") ||
            device.label.toLowerCase().includes("environment"),
        );
        if (rearCamera) {
          selectedDeviceId = rearCamera.deviceId;
        }
      } else {
        // Try to find front camera for 'user' mode
        const frontCamera = videoInputDevices.find(
          (device) =>
            device.label.toLowerCase().includes("front") ||
            device.label.toLowerCase().includes("user") ||
            device.label.toLowerCase().includes("face"),
        );
        if (frontCamera) {
          selectedDeviceId = frontCamera.deviceId;
        }
      }

      // Start decoding from video device
      scanningRef.current = true;
      setIsScanning(true);

      codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, error) => {
          if (!scanningRef.current) {
            return;
          }

          if (result) {
            const qrText = result.getText();
            console.log("QR Code detected:", qrText);
            handleQRDetection(qrText);
          }

          // Suppress routine scanning errors (ChecksumException, FormatException, NotFoundException)
          // These are normal and expected during continuous QR scanning
          if (
            error &&
            error.name !== "NotFoundException" &&
            error.name !== "ChecksumException" &&
            error.name !== "FormatException"
          ) {
            console.warn("QR scan error:", error);
          }
        },
      );

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
  }, [
    hasPermission,
    requestPermission,
    facingMode,
    showError,
    handleQRDetection,
    checkCameraSupport,
  ]);

  // Stop video stream and scanning
  const stopScanning = useCallback(() => {
    scanningRef.current = false;

    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
        codeReaderRef.current = null;
      } catch (error) {
        console.warn("Failed to reset QR scanner:", error);
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
    setError(null);
    setLastScannedCode(null);
    setScanStatus("idle");
  }, []);

  // Manual QR code input (for testing or manual entry)
  const processQRCode = useCallback(
    async (qrData: string) => {
      await handleQRDetection(qrData);
    },
    [handleQRDetection],
  );

  // Switch camera (front/back)
  const switchCamera = useCallback(async () => {
    if (isScanning) {
      stopScanning();
      // Wait a bit for cleanup, then restart with new facing mode
      setTimeout(() => {
        // This would require reinitializing with new facing mode
        // For now, just inform the user to restart
        showError("Camera Switch", "Please restart scanning to switch camera");
      }, 100);
    }
  }, [isScanning, stopScanning, showError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  // Check initial permission state and browser support (best effort)
  useEffect(() => {
    const checkPermission = async () => {
      // Check if browser supports camera first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(
          "Camera not supported. Please use Chrome, Safari, or Firefox.",
        );
        return;
      }

      try {
        // Try to check if we already have permission
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");

        // If we can see device labels, we likely have permission
        if (videoDevices.length > 0 && videoDevices[0].label) {
          setHasPermission(true);
        }
      } catch (error) {
        // Permission check failed, will request when starting scan
        console.warn("Permission check failed:", error);
      }
    };

    checkPermission();
  }, []);

  return {
    // State
    isScanning,
    hasPermission,
    error,
    isInitializing,
    scanStatus,

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
    canScan: !isInitializing,

    // Camera info
    facingMode,
  };
}
