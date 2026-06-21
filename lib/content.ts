import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"

type Frontmatter = {
  title?: string
  description?: string
}

export type ContentDoc = {
  slug: string
  slugAsParams: string
  title: string
  description?: string
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

function normalizeRouteParts(filePath: string) {
  const kindRoot = path.join(contentRoot, "pages")
  const relativePath = path.relative(kindRoot, filePath)
  const withoutExtension = relativePath.replace(/\.(md|mdx)$/i, "")
  const parts = withoutExtension.split(path.sep).filter(Boolean)

  if (parts.at(-1) === "index") {
    parts.pop()
  }

  return parts
}

function readContent(): ContentDoc[] {
  return getMdxFiles(path.join(contentRoot, "pages")).map((filePath) => {
    const source = fs.readFileSync(filePath, "utf8")
    const { content, data } = matter(source)
    const frontmatter = data as Frontmatter
    const routeParts = normalizeRouteParts(filePath)
    const slugAsParams = routeParts.join("/")

    return {
      slug: `/${slugAsParams}`,
      slugAsParams,
      title: frontmatter.title ?? "",
      description: frontmatter.description,
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

export const allPages = readContent()