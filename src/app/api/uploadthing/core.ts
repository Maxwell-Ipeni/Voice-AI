import { createUploadthing, type FileRouter } from "uploadthing/server";

const f = createUploadthing();

export const uploadRouter = {
  mediaUpload: f({
    audio: { maxFileSize: "16MB", maxFileCount: 10 },
  })
    // .middleware(async ({ req }) => {
    //   // no auth for now
    //   return { user: "demo-user" };
    // })
    .onUploadComplete(async ({ file, }) => {
      console.log("Uploaded:", file.ufsUrl);
      // console.log("User:", metadata.user);

      return {
        // uploadedBy: metadata.user,
        url: file.ufsUrl,
      };
    }),
    
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
