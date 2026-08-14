import type { NextRequest } from "next/server";
import { apiError, handleRoute } from "@/lib/api/response";
import { getOwnerId } from "@/lib/db/user";
import { getFile } from "@/lib/storage";

/**
 * Serves stored files.
 *
 * Ownership is enforced by the lookup itself — getFile scopes by userId, so a
 * guessed path belonging to someone else simply does not resolve.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/files/[...path]">,
) {
  return handleRoute(async () => {
    const { path } = await context.params;
    const pathname = path.map(decodeURIComponent).join("/");

    const userId = await getOwnerId();
    const file = await getFile(userId, pathname);
    if (!file) return apiError("Not found.", 404);

    const filename = pathname.split("/").pop() ?? "download";
    // PDFs preview in the browser; Word files have to download.
    const disposition = file.contentType === "application/pdf" ? "inline" : "attachment";

    return new Response(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(file.data.byteLength),
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  });
}
