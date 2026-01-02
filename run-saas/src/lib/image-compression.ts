/**
 * Image Compression Utility
 *
 * Compresses images to reduce file size while maintaining quality.
 * Uses sharp for high-performance image processing.
 *
 * Features:
 * - Category-based compression profiles
 * - Automatic format conversion to WebP
 * - Dimension constraints
 * - Quality adjustment for target file size
 * - Preserves text legibility for receipts/documents
 */

import sharp from "sharp";
import { FileCategory } from "./storage/types";

export interface CompressionProfile {
  /** Maximum dimension (width or height) */
  maxDimension: number;
  /** WebP quality (1-100) */
  quality: number;
  /** Target file size in KB */
  targetKB: number;
  /** Minimum quality to try (won't go below this) */
  minQuality: number;
}

export interface CompressionResult {
  /** Compressed image buffer */
  buffer: Buffer;
  /** Original file size in bytes */
  originalSize: number;
  /** Compressed file size in bytes */
  compressedSize: number;
  /** Compression ratio (0-1) */
  compressionRatio: number;
  /** Final format used */
  format: string;
  /** Final quality used */
  quality: number;
  /** Final dimensions */
  dimensions: { width: number; height: number };
}

/**
 * Compression profiles by file category
 * - receipt: Higher quality to preserve text legibility
 * - photo: Standard quality for good balance
 * - document: Higher quality to preserve details
 */
const COMPRESSION_PROFILES: Record<FileCategory, CompressionProfile> = {
  receipt: {
    maxDimension: 1920,
    quality: 90,
    targetKB: 300,
    minQuality: 75,
  },
  photo: {
    maxDimension: 1920,
    quality: 85,
    targetKB: 200,
    minQuality: 70,
  },
  document: {
    maxDimension: 2400,
    quality: 90,
    targetKB: 400,
    minQuality: 75,
  },
};

/**
 * Check if MIME type is a compressible image
 */
export function isCompressibleImage(mimeType: string): boolean {
  const compressibleTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/tiff",
    "image/bmp",
  ];

  return compressibleTypes.includes(mimeType.toLowerCase());
}

/**
 * Compress an image buffer based on category
 *
 * @param buffer - Original image buffer
 * @param mimeType - Original MIME type
 * @param category - File category for compression profile
 * @returns Compression result with compressed buffer
 */
export async function compressImage(
  buffer: Buffer,
  mimeType: string,
  category: FileCategory
): Promise<CompressionResult> {
  const originalSize = buffer.length;

  // Check if image can be compressed
  if (!isCompressibleImage(mimeType)) {
    throw new Error(`MIME type ${mimeType} is not a compressible image`);
  }

  // Get compression profile for category
  const profile = COMPRESSION_PROFILES[category];

  try {
    // Load image and get metadata
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Could not read image dimensions");
    }

    // Calculate resize dimensions while maintaining aspect ratio
    let { width, height } = metadata;
    const maxDim = profile.maxDimension;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    // Start with target quality
    let quality = profile.quality;
    let compressedBuffer: Buffer;
    let finalQuality = quality;

    // Compress with initial quality
    compressedBuffer = await image
      .resize(width, height, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer();

    // If still too large, reduce quality iteratively
    const targetBytes = profile.targetKB * 1024;
    let attempts = 0;
    const maxAttempts = 5;

    while (
      compressedBuffer.length > targetBytes &&
      quality > profile.minQuality &&
      attempts < maxAttempts
    ) {
      // Reduce quality by 5% each iteration
      quality -= 5;
      finalQuality = quality;

      compressedBuffer = await image
        .resize(width, height, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality })
        .toBuffer();

      attempts++;
    }

    const compressedSize = compressedBuffer.length;
    const compressionRatio = compressedSize / originalSize;

    return {
      buffer: compressedBuffer,
      originalSize,
      compressedSize,
      compressionRatio,
      format: "webp",
      quality: finalQuality,
      dimensions: { width, height },
    };
  } catch (error) {
    throw new Error(
      `Image compression failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get compression statistics
 */
export function getCompressionStats(result: CompressionResult): string {
  const savingsKB = (result.originalSize - result.compressedSize) / 1024;
  const savingsPercent = ((1 - result.compressionRatio) * 100).toFixed(1);

  return `Compressed from ${(result.originalSize / 1024).toFixed(1)}KB to ${(result.compressedSize / 1024).toFixed(1)}KB (${savingsPercent}% reduction, ${savingsKB.toFixed(1)}KB saved)`;
}

/**
 * Validate if compression is beneficial
 * Returns true if compressed size is at least 20% smaller
 */
export function isCompressionBeneficial(result: CompressionResult): boolean {
  return result.compressionRatio < 0.8; // At least 20% reduction
}
