import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  files: defineTable({
    name: v.string(),
    url: v.string(),
    ufsUrl: v.string(),
    size: v.number(),
    contentType: v.string(),
    uploadedAt: v.number(),
    transcription: v.optional(v.string()),
    transcriptionStatus: v.optional(
      v.union(v.literal("pending"), v.literal("completed"), v.literal("failed"))
    ),
    userId: v.optional(v.string()),
  }),
  analyses: defineTable({
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
    analyzedAt: v.number(),
  }),
});
