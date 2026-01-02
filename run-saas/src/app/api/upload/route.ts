/**
 * Unified File Upload API
 *
 * POST /api/upload
 * - Accepts multipart/form-data with a 'file' field
 * - Requires 'category' field: 'receipt' | 'photo' | 'document'
 * - Optional 'userId' field (defaults to authenticated user)
 *
 * DELETE /api/upload?key=<storage-key>
 * - Deletes a file by its storage key
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  uploadFile,
  deleteFile,
  FileCategory,
  FILE_CONSTRAINTS,
} from "@/lib/storage";
import {
  compressImage,
  isCompressibleImage,
  getCompressionStats,
  isCompressionBeneficial,
} from "@/lib/image-compression";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // For receipts during registration, allow unauthenticated uploads
    // For other categories, require authentication
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as FileCategory | null;
    const userId = formData.get("userId") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    if (!category || !["receipt", "photo", "document"].includes(category)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid category. Must be: receipt, photo, or document",
        },
        { status: 400 },
      );
    }

    // Require auth for photos (user profile), allow anonymous for receipts (registration)
    if (category !== "receipt" && !session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get constraints for this category
    const constraints = FILE_CONSTRAINTS[category];

    // Validate file type
    if (!constraints.allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type. Allowed: ${constraints.allowedTypes.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > constraints.maxSize) {
      const maxSizeMB = constraints.maxSize / (1024 * 1024);
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum size: ${maxSizeMB}MB`,
        },
        { status: 400 },
      );
    }

    // Convert File to Buffer
    let buffer = Buffer.from(await file.arrayBuffer());
    let finalMimeType = file.type;
    let compressionInfo: string | undefined;

    // Compress image if applicable
    if (isCompressibleImage(file.type)) {
      try {
        const compressionResult = await compressImage(
          buffer,
          file.type,
          category,
        );

        // Only use compressed version if it's beneficial (at least 20% reduction)
        if (isCompressionBeneficial(compressionResult)) {
          buffer = compressionResult.buffer;
          finalMimeType = "image/webp";
          compressionInfo = getCompressionStats(compressionResult);

          console.log(`[Upload] Image compressed: ${compressionInfo}`);
        } else {
          console.log(`[Upload] Compression not beneficial, using original`);
        }
      } catch (error) {
        // If compression fails, use original file
        console.warn(`[Upload] Compression failed, using original:`, error);
      }
    }

    // Upload file
    const result = await uploadFile(buffer, file.name, finalMimeType, {
      category,
      userId: userId || session?.user?.id || "anonymous",
      metadata: compressionInfo ? { compressionInfo } : undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        key: result.key,
        provider: result.provider,
        originalName: result.originalName,
        size: result.size,
        mimeType: result.mimeType,
        uploadedAt: result.uploadedAt,
        compressed: !!compressionInfo,
        compressionInfo,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { success: false, error: "No file key provided" },
        { status: 400 },
      );
    }

    const result = await deleteFile(key);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Delete failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Delete failed",
      },
      { status: 500 },
    );
  }
}
