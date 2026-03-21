import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export type { Id };

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "http://localhost:3000";

export const convex = new ConvexHttpClient(convexUrl);

export async function saveFileToConvex(file: {
  name: string;
  url: string;
  ufsUrl: string;
  size: number;
  contentType: string;
}) {
  return await convex.mutation(api.files.saveFile, file);
}

export async function updateTranscriptionInConvex(fileId: Id<"files">, transcription: string) {
  return await convex.mutation(api.files.updateTranscription, { fileId, transcription });
}

export async function getFilesFromConvex() {
  return await convex.query(api.files.getFiles, {});
}

export async function deleteFileFromConvex(fileId: Id<"files">) {
  return await convex.mutation(api.files.deleteFile, { fileId });
}
