import * as z from "zod"

export const boardCreateSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional(),
})

export const boardPatchSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(240).optional().nullable(),
})

export const boardListCreateSchema = z.object({
  title: z.string().trim().min(1).max(80),
})

export const boardListPatchSchema = z.object({
  title: z.string().trim().min(1).max(80),
})

export const boardCardCreateSchema = z.object({
  listId: z.string().min(1),
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(1000).optional(),
})

export const boardCardPatchSchema = z.object({
  title: z.string().trim().min(1).max(140).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
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
