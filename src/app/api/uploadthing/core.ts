import { createUploadthing, type FileRouter } from "uploadthing/server";

const f = createUploadthing();

export const uploadRouter = {
  mediaUpload: f({
    audio: { maxFileSize: "16MB", maxFileCount: 2 },
    video: { maxFileSize: "256MB", maxFileCount: 1 },
  })
    .middleware(async ({ req }) => {
      // no auth for now
      return { user: "demo-user" };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      console.log("Uploaded:", file.url);
      console.log("User:", metadata.user);

      return {
        uploadedBy: metadata.user,
        url: file.url,
      };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
