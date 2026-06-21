import * as z from "zod"

export const diaryEntryCreateSchema = z.object({
  title: z.string().min(1).max(120).default("Untitled note"),
  content: z.string().max(20000).optional().nullable(),
})

export const diaryEntryPatchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  content: z.string().max(20000).optional().nullable(),
})

export const diaryShareRoleSchema = z.enum(["EDITOR", "VIEWER"])

export const diaryShareCreateSchema = z.object({
  email: z.string().email(),
  role: diaryShareRoleSchema.default("VIEWER"),
})

export const diarySharePatchSchema = z.object({
  role: diaryShareRoleSchema,
})
