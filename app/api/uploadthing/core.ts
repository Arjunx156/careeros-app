import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

export const ourFileRouter = {
  resumeUploader: f({ pdf: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const userId = "mock_user"; // Removed clerk auth for local dev
      if (!userId) throw new UploadThingError("Unauthorized");
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);
      return { uploadedBy: metadata.userId, url: file.url, name: file.name, key: file.key };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
