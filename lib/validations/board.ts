import * as z from "zod"

import { validateCardIdPattern } from "@/lib/card-id-pattern"
import { isValidDateOnly } from "@/lib/card-dates"
import { isValidCustomFieldColor } from "@/lib/custom-field-colors"
import { isValidLabelColor } from "@/lib/label-colors"

export const MAX_CUSTOM_FIELDS_PER_BOARD = 50
export const MAX_CUSTOM_FIELD_OPTIONS = 50

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

const cardDateOnlySchema = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    if (!isValidDateOnly(value)) {
      ctx.addIssue({
        code: "custom",
        message: "Date must use YYYY-MM-DD format.",
      })
    }
  })

const cardDueAtSchema = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    const parsed = Date.parse(value)
    if (Number.isNaN(parsed)) {
      ctx.addIssue({
        code: "custom",
        message: "Due date must be a valid ISO datetime.",
      })
    }
  })

export const boardCardPatchSchema = z
  .object({
    title: z.string().trim().min(1).max(140).optional(),
    description: z.string().trim().max(50000).optional().nullable(),
    startDate: cardDateOnlySchema.nullable().optional(),
    dueAt: cardDueAtSchema.nullable().optional(),
    dueComplete: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.startDate !== undefined ||
      data.dueAt !== undefined ||
      data.dueComplete !== undefined,
    {
      message: "At least one field must be provided.",
    }
  )

export const MAX_ATTACHMENT_SIZE_BYTES = 125_829_120
export const MAX_ATTACHMENTS_PER_TARGET = 20
export const MAX_INLINE_IMAGE_SIZE_BYTES = 10_485_760
export const MAX_INLINE_IMAGES_PER_CONTENT = 10

export const INLINE_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const

export function isAllowedInlineImageMime(mimeType: string) {
  return (INLINE_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)
}

export const boardAttachmentPresignSchema = z
  .object({
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(1).max(255),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(MAX_ATTACHMENT_SIZE_BYTES),
    target: z.enum(["card", "comment", "inline"]),
  })
  .superRefine((data, ctx) => {
    if (data.target !== "inline") {
      return
    }

    if (!isAllowedInlineImageMime(data.mimeType)) {
      ctx.addIssue({
        code: "custom",
        message: "Only JPEG, PNG, WebP, and GIF images are supported.",
        path: ["mimeType"],
      })
    }

    if (data.sizeBytes > MAX_INLINE_IMAGE_SIZE_BYTES) {
      ctx.addIssue({
        code: "custom",
        message: "Images must be 10MB or smaller.",
        path: ["sizeBytes"],
      })
    }
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

export const customFieldTypeSchema = z.enum([
  "TEXT",
  "NUMBER",
  "CHECKBOX",
  "DATE",
  "DROPDOWN",
])

const customFieldOptionSchema = z.object({
  label: z.string().trim().min(1).max(80),
  color: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (!isValidCustomFieldColor(value)) {
        ctx.addIssue({
          code: "custom",
          message: "Color must be one of the supported presets.",
        })
      }
    }),
})

const customFieldOptionsSchema = z
  .array(customFieldOptionSchema)
  .min(1)
  .max(MAX_CUSTOM_FIELD_OPTIONS)

export const customFieldCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    type: customFieldTypeSchema,
    showOnFront: z.boolean().optional(),
    options: customFieldOptionsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "DROPDOWN" && !data.options?.length) {
      ctx.addIssue({
        code: "custom",
        message: "Dropdown fields require at least one option.",
        path: ["options"],
      })
    }
    if (data.type !== "DROPDOWN" && data.options?.length) {
      ctx.addIssue({
        code: "custom",
        message: "Options are only supported for dropdown fields.",
        path: ["options"],
      })
    }
  })

export const customFieldPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    showOnFront: z.boolean().optional(),
    options: customFieldOptionsSchema.optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.showOnFront !== undefined ||
      data.options !== undefined,
    {
      message: "At least one field must be provided.",
    }
  )

export const customFieldReorderSchema = z.object({
  fieldIds: z.array(z.string().min(1)),
})

export const cardCustomFieldsPatchSchema = z.object({
  values: z.array(
    z.object({
      fieldId: z.string().min(1),
      value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
    })
  ),
})

export const MAX_LABELS_PER_BOARD = 50

const labelColorSchema = z.string().trim().superRefine((value, ctx) => {
  if (!isValidLabelColor(value)) {
    ctx.addIssue({
      code: "custom",
      message: "Color must be one of the supported presets.",
    })
  }
})

export const labelCreateSchema = z.object({
  name: z.string().trim().max(80).optional(),
  color: labelColorSchema,
})

export const labelPatchSchema = z
  .object({
    name: z.string().trim().max(80).optional(),
    color: labelColorSchema.optional(),
  })
  .refine((data) => data.name !== undefined || data.color !== undefined, {
    message: "At least one field must be provided.",
  })

export const labelReorderSchema = z.object({
  labelIds: z.array(z.string().min(1)),
})

export const cardLabelsPatchSchema = z.object({
  labelIds: z.array(z.string().min(1)),
})

export const MAX_CHECKLISTS_PER_CARD = 20
export const MAX_ITEMS_PER_CHECKLIST = 100

export const checklistCreateSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
})

export const checklistPatchSchema = z.object({
  title: z.string().trim().min(1).max(80),
})

export const checklistReorderSchema = z.object({
  checklistIds: z.array(z.string().min(1)),
})

export const checklistItemCreateSchema = z.object({
  text: z.string().trim().min(1).max(500),
})

export const checklistItemPatchSchema = z
  .object({
    text: z.string().trim().min(1).max(500).optional(),
    isComplete: z.boolean().optional(),
  })
  .refine(
    (data) => data.text !== undefined || data.isComplete !== undefined,
    {
      message: "At least one field must be provided.",
    }
  )

export const checklistItemReorderSchema = z.object({
  itemIds: z.array(z.string().min(1)),
})
