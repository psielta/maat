import { z } from "zod"

import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { userNameSchema } from "@/lib/validations/user"

const routeContextSchema = z.object({
  params: z.object({
    userId: z.string(),
  }),
})

type RouteContext = {
  params: Promise<{
    userId: string
  }>
}

export async function PATCH(
  req: Request,
  context: RouteContext
) {
  try {
    // Validate the route context.
    const { params } = routeContextSchema.parse({
      params: await context.params,
    })

    // Ensure the current database user has access to this profile.
    const user = await getCurrentUser()
    if (!user || params.userId !== user.id) {
      return new Response(null, { status: 403 })
    }

    // Get the request body and validate it.
    const body = await req.json()
    const payload = userNameSchema.parse(body)

    // Update the user.
    await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        name: payload.name,
      },
    })

    return new Response(null, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}
