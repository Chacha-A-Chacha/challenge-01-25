"use client";

import { cn } from "@/lib/utils";

type ScanStatus = "idle" | "success" | "error" | "wrong-session";

interface ScannerOverlayProps {
  isScanning: boolean;
  scanStatus: ScanStatus;
  className?: string;
}

export function ScannerOverlay({
  isScanning,
  scanStatus,
  className,
}: ScannerOverlayProps) {
  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {/* Flash Border Animation */}
      <div
        className={cn(
          "absolute inset-0 rounded-lg border-2 transition-all duration-100",
          scanStatus === "success" &&
            "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.8)]",
          scanStatus === "error" &&
            "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]",
          scanStatus === "wrong-session" &&
            "border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.8)]",
          scanStatus === "idle" && "border-transparent",
        )}
      />

      {/* Center Reticle - Only show when scanning */}
      {isScanning && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div
            className={cn(
              "w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 border-2 border-white/50 rounded-lg relative",
              scanStatus === "idle" && "animate-spin-slow",
            )}
            style={
              scanStatus === "idle" ? { animationDuration: "8s" } : undefined
            }
          >
            {/* Horizontal crosshair */}
            <div className="absolute top-1/2 left-1/4 right-1/4 h-px bg-white/50 -translate-y-1/2" />

            {/* Vertical crosshair */}
            <div className="absolute left-1/2 top-1/4 bottom-1/4 w-px bg-white/50 -translate-x-1/2" />

            {/* Center dot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white/70 rounded-full" />
          </div>
        </div>
      )}

      {/* Scan Line - Only show when scanning */}
      {isScanning && (
        <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
          {/* Main scan line (sharp and bright) */}
          <div className="absolute left-0 right-0 h-0.5 top-0 bg-gradient-to-r from-transparent via-green-400 to-transparent shadow-[0_0_12px_rgba(34,197,94,0.9)] animate-[scan-line_4s_ease-in-out_infinite]" />
        </div>
      )}

      {/* Status Icon Overlay */}
      {scanStatus !== "idle" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center backdrop-blur-sm animate-in fade-in zoom-in duration-200",
              scanStatus === "success" && "bg-green-500/90",
              scanStatus === "error" && "bg-red-500/90",
              scanStatus === "wrong-session" && "bg-orange-500/90",
            )}
          >
            {scanStatus === "success" && (
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}

            {scanStatus === "error" && (
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}

            {scanStatus === "wrong-session" && (
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
