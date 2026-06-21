import { ImageResponse } from "@vercel/og"

import { siteConfig } from "@/config/site"
import { ogImageSchema } from "@/lib/validations/og"

export const runtime = "edge"

const interRegular = fetch(
  new URL("../../../assets/fonts/Inter-Regular.ttf", import.meta.url)
).then((res) => res.arrayBuffer())

const interBold = fetch(
  new URL("../../../assets/fonts/Inter-Bold.ttf", import.meta.url)
).then((res) => res.arrayBuffer())

export async function GET(req: Request) {
  try {
    const [fontRegular, fontBold] = await Promise.all([
      interRegular,
      interBold,
    ])
    const url = new URL(req.url)
    const values = ogImageSchema.parse(Object.fromEntries(url.searchParams))
    const heading =
      values.heading.length > 120
        ? `${values.heading.substring(0, 120)}...`
        : values.heading

    return new ImageResponse(
      (
        <div
          tw="flex h-full w-full flex-col justify-between bg-white p-16 text-black"
          style={{ fontFamily: "Inter" }}
        >
          <div tw="flex items-center justify-between">
            <div tw="flex items-center text-3xl font-bold">
              {siteConfig.name}
            </div>
            <div tw="flex rounded-full border border-black px-5 py-2 text-2xl">
              {values.type}
            </div>
          </div>
          <div tw="flex max-w-[980px] flex-col">
            <div
              tw="flex text-7xl font-bold leading-none"
              style={{ fontFamily: "Inter Bold" }}
            >
              {heading}
            </div>
            <div tw="mt-8 flex text-3xl leading-10 text-neutral-600">
              Personal task control and realtime Kanban collaboration for
              software developers.
            </div>
          </div>
          <div tw="flex items-center justify-between text-2xl text-neutral-600">
            <div tw="flex">localhost:14500</div>
            <div tw="flex">PostgreSQL + Redis + Next.js 16</div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Inter",
            data: fontRegular,
            weight: 400,
            style: "normal",
          },
          {
            name: "Inter Bold",
            data: fontBold,
            weight: 700,
            style: "normal",
          },
        ],
      }
    )
  } catch {
    return new Response("Failed to generate image", {
      status: 500,
    })
  }
}
