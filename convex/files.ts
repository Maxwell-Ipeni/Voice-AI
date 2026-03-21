import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveFile = mutation({
  args: {
    name: v.string(),
    url: v.string(),
    ufsUrl: v.string(),
    size: v.number(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("files", {
      ...args,
      uploadedAt: Date.now(),
      transcriptionStatus: "pending",
    });
  },
});

export const updateTranscription = mutation({
  args: {
    fileId: v.id("files"),
    transcription: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.fileId, {
      transcription: args.transcription,
      transcriptionStatus: "completed",
    });
  },
});

export const getFiles = query({
  handler: async (ctx) => {
    const files = await ctx.db.query("files").order("desc").take(100);
    return files;
  },
});

export const deleteFile = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.fileId);
  },
});
