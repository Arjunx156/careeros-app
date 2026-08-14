import "server-only";

import { prisma } from "@/lib/db/prisma";

/**
 * File storage, backed by Postgres.
 *
 * Vercel's filesystem is read-only, so files cannot sit on disk in production.
 * The usual answer is a blob service, but that means another account, another
 * token, and another thing that can be misconfigured at deploy time. For one
 * person storing a handful of PDFs, the database that already exists is
 * simpler and behaves identically in development and production.
 *
 * Bytes live in their own table (StoredFile), so listing resumes never drags
 * megabytes of PDF along with it.
 */

export type StoredFile = {
  /** URL the browser fetches. Always served through /api/files. */
  url: string;
  /** Handle used to delete or re-read the file. */
  pathname: string;
  size: number;
};

function urlFor(pathname: string): string {
  return `/api/files/${pathname.split("/").map(encodeURIComponent).join("/")}`;
}

export async function putFile(
  userId: string,
  pathname: string,
  body: Buffer,
  contentType: string,
): Promise<StoredFile> {
  // Prisma's Bytes maps to Uint8Array<ArrayBuffer>; Node's Buffer is typed over
  // ArrayBufferLike, which includes SharedArrayBuffer and so is not assignable.
  // Copying into a plain Uint8Array converts at the boundary rather than
  // casting the mismatch away.
  const bytes = new Uint8Array(body);

  // Upsert so re-uploading the same logical path replaces rather than
  // accumulating orphaned rows.
  await prisma.storedFile.upsert({
    where: { pathname },
    create: {
      userId,
      pathname,
      contentType,
      size: bytes.byteLength,
      data: bytes,
    },
    update: { contentType, size: bytes.byteLength, data: bytes },
  });

  return { url: urlFor(pathname), pathname, size: body.byteLength };
}

export async function getFile(
  userId: string,
  pathname: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  const file = await prisma.storedFile.findFirst({
    // Scoped by userId as well as pathname — ownership is enforced by the
    // query, not by the caller remembering to check.
    where: { pathname, userId },
    select: { data: true, contentType: true },
  });

  if (!file) return null;
  return { data: Buffer.from(file.data), contentType: file.contentType };
}

export async function deleteFile(userId: string, pathname: string): Promise<void> {
  await prisma.storedFile.deleteMany({ where: { pathname, userId } });
}

/** Namespaced path for an uploaded resume. */
export function resumePath(userId: string, resumeId: string): string {
  return `${userId}/resumes/${resumeId}.pdf`;
}

/** Namespaced path for a generated document. */
export function generatedPath(
  userId: string,
  id: string,
  extension: "pdf" | "docx",
): string {
  return `${userId}/optimized/${id}.${extension}`;
}
