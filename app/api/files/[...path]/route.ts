import type { NextRequest } from "next/server";
import { apiError, handleRoute } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";
import { getOwnerId } from "@/lib/db/user";
import { getStorage, isLocalStorage } from "@/lib/storage";

/**
 * Serves files held by the local-disk driver.
 *
 * With Vercel Blob the browser fetches the blob URL directly and never hits
 * this route. It exists only so local development has working file URLs.
 */

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/**
 * Is this path referenced by a row the owner actually owns?
 *
 * Checked across every table that stores a file, because authorizing only one
 * of them silently 404s the others — which is exactly what happened when
 * optimized resumes were added and only resume uploads were allowed through.
 */
async function isOwnedPath(userId: string, pathname: string): Promise<boolean> {
  const [resume, optimized] = await Promise.all([
    prisma.resumeVersion.findFirst({
      where: { userId, filePathname: pathname },
      select: { id: true },
    }),
    prisma.optimizedResume.findFirst({
      where: {
        userId,
        OR: [{ pdfPathname: pathname }, { docxPathname: pathname }],
      },
      select: { id: true },
    }),
  ]);

  return Boolean(resume || optimized);
}

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/files/[...path]">,
) {
  return handleRoute(async () => {
    if (!isLocalStorage()) {
      return apiError("Not found.", 404);
    }

    const { path } = await context.params;
    const pathname = path.map(decodeURIComponent).join("/");

    // Only serve paths an owned row points at. Without this, the route would
    // read any file under .storage/ by guessed name.
    const userId = await getOwnerId();
    if (!(await isOwnedPath(userId, pathname))) {
      return apiError("Not found.", 404);
    }

    const data = await getStorage().get(pathname);
    if (!data) return apiError("Not found.", 404);

    const extension = pathname.split(".").pop()?.toLowerCase() ?? "";
    const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";

    // Word files download rather than render, so give the browser a filename.
    const filename = pathname.split("/").pop() ?? "download";
    const disposition = extension === "pdf" ? "inline" : "attachment";

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(data.byteLength),
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  });
}
