import { getServerSession } from "next-auth/next"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email && !session?.user?.id) {
    return null
  }

  const user = await db.user.findFirst({
    where: {
      OR: [
        ...(session.user.id
          ? [
              {
                id: session.user.id,
              },
            ]
          : []),
        ...(session.user.email
          ? [
              {
                email: session.user.email,
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  })

  return user
}
