/**
 * Local File Storage Server
 *
 * GET /api/storage/{category}/{year}/{month}/{filename}
 * Example: /api/storage/receipt/2025/01/receipt_abc123_1234567890.jpg
 *
 * Features:
 * - Serves files from local storage directory
 * - Only active when STORAGE_PROVIDER=local
 * - Security: Prevents directory traversal attacks (../ blocked)
 * - Supports proper Content-Type headers based on file extension/metadata
 * - Supports ?download=true query parameter for force download
 * - Caching enabled for performance (immutable, 1 year max-age)
 *
 * Security Notes:
 * - Directory traversal protection via path.normalize() validation
 * - No authentication required (public file access for registration images)
 * - If you need auth, add getServerSession() check or use middleware
 * - Files organized by category/year/month to prevent enumeration
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getStorageConfig } from "@/lib/storage/factory";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  try {
    const config = getStorageConfig();

    // Only serve files when using local storage
    if (config.provider !== "local" || !config.local) {
      return NextResponse.json(
        { error: "Local storage not configured" },
        { status: 404 },
      );
    }

    // Reconstruct the file path from route params
    const filePath = params.path.join("/");

    // Security: Prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.includes("..") || path.isAbsolute(normalizedPath)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // Full path to the file
    const fullPath = path.join(config.local.storagePath, normalizedPath);

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Read file
    const fileBuffer = await fs.readFile(fullPath);

    // Read metadata if available
    let mimeType = "application/octet-stream";
    let originalName = path.basename(filePath);

    try {
      const metadataPath = `${fullPath}.meta.json`;
      const metadataContent = await fs.readFile(metadataPath, "utf-8");
      const metadata = JSON.parse(metadataContent);
      mimeType = metadata.mimeType || mimeType;
      originalName = metadata.originalName || originalName;
    } catch {
      // Metadata not found, infer MIME type from extension
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".pdf": "application/pdf",
      };
      mimeType = mimeTypes[ext] || mimeType;
    }

    // Check if download is requested
    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download") === "true";

    // Set headers
    const headers = new Headers();
    headers.set("Content-Type", mimeType);
    headers.set("Content-Length", fileBuffer.length.toString());
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    if (download) {
      headers.set(
        "Content-Disposition",
        `attachment; filename="${originalName}"`,
      );
    } else {
      headers.set("Content-Disposition", `inline; filename="${originalName}"`);
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[Storage] Error serving file:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to serve file",
      },
      { status: 500 },
    );
  }
}
