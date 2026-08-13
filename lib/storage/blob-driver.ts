import "server-only";

import { del, head, put } from "@vercel/blob";
import type { StorageDriver, StoredFile } from "@/lib/storage/types";

/** Production driver — Vercel Blob. Requires BLOB_READ_WRITE_TOKEN. */
export const blobDriver: StorageDriver = {
  name: "vercel-blob",

  async put(pathname, body, contentType): Promise<StoredFile> {
    const result = await put(pathname, body, {
      access: "public",
      contentType,
      // Pathnames already include a cuid, so the random suffix would only make
      // the delete handle harder to reason about.
      addRandomSuffix: false,
    });

    return {
      url: result.url,
      pathname: result.pathname,
      size: body.byteLength,
    };
  },

  async delete(pathname): Promise<void> {
    await del(pathname);
  },

  async get(pathname): Promise<Buffer | null> {
    const metadata = await head(pathname).catch(() => null);
    if (!metadata) return null;

    const response = await fetch(metadata.url);
    if (!response.ok) return null;

    return Buffer.from(await response.arrayBuffer());
  },
};
