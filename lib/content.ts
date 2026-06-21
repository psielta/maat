import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"

type ContentKind = "pages"

type Frontmatter = {
  title?: string
  description?: string
  date?: string | Date
  published?: boolean
  featured?: boolean
  image?: string
  authors?: string[]
  avatar?: string
  twitter?: string
}

export type ContentDoc = {
  _id: string
  slug: string
  slugAsParams: string
  title: string
  description?: string
  date: string
  published: boolean
  featured?: boolean
  image: string
  authors: string[]
  avatar: string
  twitter: string
  body: {
    raw: string
    code: string
  }
}

export type Page = ContentDoc

const contentRoot = path.join(process.cwd(), "content")
const mdxExtensions = new Set([".md", ".mdx"])

function getMdxFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return []
  }

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        return getMdxFiles(fullPath)
      }

      return mdxExtensions.has(path.extname(entry.name)) ? [fullPath] : []
    })
}

function normalizeRouteParts(kind: ContentKind, filePath: string) {
  const kindRoot = path.join(contentRoot, kind)
  const relativePath = path.relative(kindRoot, filePath)
  const withoutExtension = relativePath.replace(/\.(md|mdx)$/i, "")
  const parts = withoutExtension.split(path.sep).filter(Boolean)

  if (parts.at(-1) === "index") {
    parts.pop()
  }

  return parts
}

function createSlug(kind: ContentKind, slugAsParams: string) {
  if (kind === "pages") {
    return `/${slugAsParams}`
  }

  return `/${kind}${slugAsParams ? `/${slugAsParams}` : ""}`
}

function normalizeDate(value: Frontmatter["date"]) {
  if (!value) {
    return undefined
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  return value
}

function readContent(kind: ContentKind): ContentDoc[] {
  return getMdxFiles(path.join(contentRoot, kind)).map((filePath) => {
    const source = fs.readFileSync(filePath, "utf8")
    const { content, data } = matter(source)
    const frontmatter = data as Frontmatter
    const routeParts = normalizeRouteParts(kind, filePath)
    const slugAsParams = routeParts.join("/")
    const slug = createSlug(kind, slugAsParams)

    return {
      _id: `${kind}/${slugAsParams || "index"}`,
      slug,
      slugAsParams,
      title: frontmatter.title ?? "",
      description: frontmatter.description,
      date: normalizeDate(frontmatter.date) ?? "",
      published: frontmatter.published ?? true,
      featured: frontmatter.featured ?? false,
      image: frontmatter.image ?? "",
      authors: frontmatter.authors ?? [],
      avatar: frontmatter.avatar ?? "",
      twitter: frontmatter.twitter ?? "",
      body: {
        raw: content,
        code: content,
      },
    }
  })
}

export function getRouteSegments(doc: Pick<ContentDoc, "slugAsParams">) {
  return doc.slugAsParams ? doc.slugAsParams.split("/") : []
}

export const allPages = readContent("pages")
