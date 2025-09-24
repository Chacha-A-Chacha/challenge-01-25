// src/types/declarations.d.ts

/**
 * Type declaration for 'qrcode' package
 * Resolves TS7016 error for dynamic imports
 */

declare module 'qrcode' {
  // QR code generation options interface
  interface QRCodeOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    type?: 'image/png' | 'image/jpeg' | 'image/webp'
    quality?: number
    margin?: number
    scale?: number
    width?: number
    color?: {
      dark?: string
      light?: string
    }
  }

  // Main QR code generator interface
  interface QRCodeGenerator {
    /**
     * Generate QR code as data URL
     */
    toDataURL(
      text: string | Buffer,
      options?: QRCodeOptions
    ): Promise<string>

    /**
     * Generate QR code as string (optional - if you need it later)
     */
    toString?(
      text: string | Buffer,
      options?: QRCodeOptions & { type?: 'terminal' | 'utf8' | 'svg' }
    ): Promise<string>
  }

  // Default export matches the actual qrcode package structure
  const QRCode: QRCodeGenerator
  export default QRCode
}
