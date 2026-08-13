import "server-only";

import { blobDriver } from "@/lib/storage/blob-driver";
import { localDriver } from "@/lib/storage/local-driver";
import type { StorageDriver } from "@/lib/storage/types";

export type { StoredFile, StorageDriver } from "@/lib/storage/types";

/**
 * Pick a storage driver.
 *
 * Vercel Blob whenever a token is present, local disk otherwise. That means
 * uploads work on a fresh clone with no cloud setup, and switching to Blob is
 * purely a matter of adding the env var.
 */
export function getStorage(): StorageDriver {
  return process.env.BLOB_READ_WRITE_TOKEN ? blobDriver : localDriver;
}

/** True when files are only on this machine — surfaced in the UI as a warning. */
export function isLocalStorage(): boolean {
  return !process.env.BLOB_READ_WRITE_TOKEN;
}

/** Namespaced storage path for an uploaded resume. */
export function resumePath(userId: string, resumeId: string): string {
  return `${userId}/resumes/${resumeId}.pdf`;
}
