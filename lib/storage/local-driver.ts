import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import type { StorageDriver, StoredFile } from "@/lib/storage/types";

/**
 * Local-disk driver for development.
 *
 * Vercel's filesystem is read-only, so this is never the production path — it
 * exists so uploads work before a Blob store is provisioned. Files land in
 * `.storage/` (gitignored) and are served back through /api/files.
 */
const ROOT = path.join(process.cwd(), ".storage");

/**
 * Reject anything that would escape the storage root. Pathnames are built
 * server-side today, but this is the only thing standing between a future
 * caller-supplied path and arbitrary filesystem access.
 */
function resolveWithinRoot(pathname: string): string {
  const target = path.resolve(ROOT, pathname);
  const rootWithSep = ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;

  if (target !== ROOT && !target.startsWith(rootWithSep)) {
    throw new Error("Invalid storage path.");
  }
  return target;
}

export const localDriver: StorageDriver = {
  name: "local-disk",

  async put(pathname, body): Promise<StoredFile> {
    const target = resolveWithinRoot(pathname);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body);

    return {
      url: `/api/files/${pathname.split("/").map(encodeURIComponent).join("/")}`,
      pathname,
      size: body.byteLength,
    };
  },

  async delete(pathname): Promise<void> {
    try {
      await fs.unlink(resolveWithinRoot(pathname));
    } catch (error) {
      // Already gone is a success for our purposes; anything else is real.
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  },

  async get(pathname): Promise<Buffer | null> {
    try {
      return await fs.readFile(resolveWithinRoot(pathname));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  },
};
