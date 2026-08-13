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

    // Only serve paths that an owned database row actually points at. Without
    // this, the route would read any file under .storage/ by guessed name.
    const userId = await getOwnerId();
    const owned = await prisma.resumeVersion.findFirst({
      where: { userId, filePathname: pathname },
      select: { id: true },
    });
    if (!owned) return apiError("Not found.", 404);

    const data = await getStorage().get(pathname);
    if (!data) return apiError("Not found.", 404);

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(data.byteLength),
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600",
      },
    });
  });
}
