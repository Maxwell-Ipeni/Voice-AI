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

export const saveAnalysis = mutation({
  args: {
    fileId: v.id("files"),
    segments: v.array(
      v.object({
        id: v.string(),
        speaker: v.string(),
        role: v.string(),
        content: v.string(),
        sentiment: v.union(v.literal("positive"), v.literal("neutral"), v.literal("negative")),
        topic: v.string(),
        startIndex: v.number(),
        endIndex: v.number(),
      })
    ),
    metrics: v.object({
      customerSatisfactionScore: v.number(),
      issueResolutionStatus: v.union(v.literal("resolved"), v.literal("unresolved"), v.literal("pending")),
      totalSegments: v.number(),
      positiveSegments: v.number(),
      neutralSegments: v.number(),
      negativeSegments: v.number(),
    }),
    overallSummary: v.string(),
    speakers: v.array(
      v.object({
        name: v.string(),
        role: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("analyses", {
      ...args,
      analyzedAt: Date.now(),
    });
  },
});

export const getAnalysisByFileId = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const analyses = await ctx.db
      .query("analyses")
      .filter((q) => q.eq(q.field("fileId"), args.fileId))
      .take(1);
    return analyses[0] || null;
  },
});

export const getAnalyses = query({
  handler: async (ctx) => {
    const analyses = await ctx.db.query("analyses").order("desc").take(100);
    return analyses;
  },
});
