export type StoredFile = {
  /** URL the browser can fetch the file from. */
  url: string;
  /** Opaque handle used to delete the file later. */
  pathname: string;
  size: number;
};

export interface StorageDriver {
  readonly name: "vercel-blob" | "local-disk";
  put(pathname: string, body: Buffer, contentType: string): Promise<StoredFile>;
  delete(pathname: string): Promise<void>;
  /** Read a file back — used to re-extract text without a round trip through the browser. */
  get(pathname: string): Promise<Buffer | null>;
}
