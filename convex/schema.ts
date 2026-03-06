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
    transcriptionStatus: v.optional(v.union(v.literal("pending"), v.literal("completed"), v.literal("failed"))),
  }),
});
