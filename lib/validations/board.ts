import * as z from "zod"

import { validateCardIdPattern } from "@/lib/card-id-pattern"

const cardIdPatternSchema = z
  .string()
  .trim()
  .max(80)
  .nullable()
  .superRefine((value, ctx) => {
    if (!value) {
      return
    }

    const error = validateCardIdPattern(value)
    if (error) {
      ctx.addIssue({
        code: "custom",
        message: error,
      })
    }
  })

export const boardCreateSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional(),
})

export const boardPatchSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(240).optional().nullable(),
  cardIdPattern: cardIdPatternSchema.optional(),
})

export const boardListCreateSchema = z.object({
  title: z.string().trim().min(1).max(80),
})

export const boardListPatchSchema = z.object({
  title: z.string().trim().min(1).max(80),
})

// `description` holds serialized rich-text (Lexical) editor state, so the
// limit is generous compared to a plain-text field.
export const boardCardCreateSchema = z.object({
  listId: z.string().min(1),
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(50000).optional(),
})

export const boardCardPatchSchema = z.object({
  title: z.string().trim().min(1).max(140).optional(),
  description: z.string().trim().max(50000).optional().nullable(),
})

export const MAX_ATTACHMENT_SIZE_BYTES = 125_829_120
export const MAX_ATTACHMENTS_PER_TARGET = 20

export const boardAttachmentPresignSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(255),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_ATTACHMENT_SIZE_BYTES),
  target: z.enum(["card", "comment"]),
})

// `content` holds serialized rich-text (Lexical) editor state.
export const boardCardCommentCreateSchema = z.object({
  content: z.string().trim().min(1).max(50000),
  attachmentIds: z
    .array(z.string().min(1))
    .max(MAX_ATTACHMENTS_PER_TARGET)
    .optional(),
})

export const boardReorderSchema = z.object({
  lists: z.array(
    z.object({
      id: z.string().min(1),
      cards: z.array(z.string().min(1)),
    })
  ),
})

export const boardMemberRoleSchema = z.enum(["EDITOR", "VIEWER"])

export const boardMemberCreateSchema = z.object({
  email: z.string().trim().email(),
  role: boardMemberRoleSchema.default("EDITOR"),
})

export const boardMemberPatchSchema = z.object({
  role: boardMemberRoleSchema,
})
