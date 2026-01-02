/**
 * Storage File Serving Endpoint
 *
 * Serves files from local storage with authentication.
 * Any authenticated user can access files.
 *
 * GET /api/storage/{category}/{year}/{month}/{filename}
 * - Requires authentication (handled by middleware)
 * - Streams file from disk
 * - Returns proper content-type headers
 * - Supports ?download=true for force download
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";
import { getStorageConfig } from "@/lib/storage/factory";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: {
    path: string[];
  };
}

/**
 * GET handler - Serve file from storage
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 }
      );
    }

    // Get storage configuration
    const config = getStorageConfig();

    if (!config.local) {
      return NextResponse.json(
        { error: "Local storage not configured" },
        { status: 500 }
      );
    }

    // Construct file path from URL segments
    const filePath = params.path.join("/");
    const fullPath = path.join(config.local.storagePath, filePath);

    // Security: Prevent directory traversal
    const normalizedPath = path.normalize(fullPath);
    const storagePath = path.normalize(config.local.storagePath);

    if (!normalizedPath.startsWith(storagePath)) {
      return NextResponse.json(
        { error: "Invalid file path" },
        { status: 400 }
      );
    }

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = await fs.readFile(fullPath);

    // Try to read metadata for content-type
    let contentType = "application/octet-stream";
    let originalName: string | undefined;

    try {
      const metadataPath = `${fullPath}.meta.json`;
      const metadata = await fs.readFile(metadataPath, "utf-8");
      const metaData = JSON.parse(metadata);

      if (metaData.mimeType) {
        contentType = metaData.mimeType;
      }

      if (metaData.originalName) {
        originalName = metaData.originalName;
      }
    } catch {
      // Fallback: Guess content type from extension
      const ext = path.extname(filePath).toLowerCase();
      const contentTypeMap: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".pdf": "application/pdf",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
      };

      contentType = contentTypeMap[ext] || "application/octet-stream";
    }

    // Check if download is requested
    const searchParams = request.nextUrl.searchParams;
    const isDownload = searchParams.get("download") === "true";

    // Prepare response headers
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", fileBuffer.length.toString());

    if (isDownload && originalName) {
      headers.set(
        "Content-Disposition",
        `attachment; filename="${originalName}"`
      );
    } else if (isDownload) {
      headers.set(
        "Content-Disposition",
        `attachment; filename="${path.basename(filePath)}"`
      );
    } else {
      headers.set("Content-Disposition", "inline");
    }

    // Cache headers for better performance
    headers.set("Cache-Control", "private, max-age=31536000, immutable");

    // ETag for client-side caching
    const stats = await fs.stat(fullPath);
    const etag = `"${stats.size}-${stats.mtimeMs}"`;
    headers.set("ETag", etag);

    // Check if client has cached version
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers });
    }

    // Return file
    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error serving file:", error);

    return NextResponse.json(
      {
        error: "Failed to serve file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
