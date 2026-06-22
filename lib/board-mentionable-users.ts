export type MentionableUser = {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

export function getMentionableUsers(
  members: Array<{
    userId: string
    user: {
      name: string | null
      email: string | null
      image: string | null
    }
  }>,
  currentUserId?: string
): MentionableUser[] {
  const seen = new Set<string>()
  const users: MentionableUser[] = []

  for (const member of members) {
    if (seen.has(member.userId)) {
      continue
    }

    if (currentUserId && member.userId === currentUserId) {
      continue
    }

    seen.add(member.userId)
    users.push({
      id: member.userId,
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
    })
  }

  return users.sort((left, right) => {
    const leftLabel = (left.name || left.email || "").toLowerCase()
    const rightLabel = (right.name || right.email || "").toLowerCase()
    return leftLabel.localeCompare(rightLabel)
  })
}

export function getMentionDisplayName(user: MentionableUser) {
  return user.name || user.email || "Membro"
}