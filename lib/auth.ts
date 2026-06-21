import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { NextAuthOptions } from "next-auth"
import EmailProvider from "next-auth/providers/email"
import GitHubProvider from "next-auth/providers/github"
import { createTransport } from "nodemailer"
import { Resend } from "resend"

import { env } from "@/env.mjs"
import { siteConfig } from "@/config/site"
import { db } from "@/lib/db"

const resend = new Resend(env.RESEND_API_KEY)

function createMagicLinkEmail(url: string) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h1 style="font-size: 20px;">Sign in to ${siteConfig.name}</h1>
      <p>Click the link below to sign in.</p>
      <p>
        <a href="${url}" style="color: #2563eb;">Sign in to ${siteConfig.name}</a>
      </p>
      <p>If you did not request this email, you can safely ignore it.</p>
    </div>
  `
}

async function sendDevelopmentEmail({
  identifier,
  url,
  from,
}: {
  identifier: string
  url: string
  from: string
}) {
  const transport = createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
    auth:
      env.SMTP_USER && env.SMTP_PASSWORD
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASSWORD,
          }
        : undefined,
  })

  await transport.sendMail({
    to: identifier,
    from,
    subject: `Sign in to ${siteConfig.name}`,
    html: createMagicLinkEmail(url),
    text: `Sign in to ${siteConfig.name}: ${url}`,
  })
}

async function sendProductionEmail({
  identifier,
  url,
  from,
}: {
  identifier: string
  url: string
  from: string
}) {
  const { error } = await resend.emails.send({
    to: [identifier],
    from,
    subject: `Sign in to ${siteConfig.name}`,
    html: createMagicLinkEmail(url),
    text: `Sign in to ${siteConfig.name}: ${url}`,
    headers: {
      "X-Entity-Ref-ID": String(Date.now()),
    },
  })

  if (error) {
    throw new Error(error.message)
  }
}

export const authOptions: NextAuthOptions = {
  // huh any! I know.
  // This is a temporary fix for prisma client.
  // @see https://github.com/prisma/prisma/issues/16117
  adapter: PrismaAdapter(db as any),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    GitHubProvider({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    }),
    EmailProvider({
      from: env.EMAIL_FROM,
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        const payload = {
          identifier,
          url,
          from: provider.from as string,
        }

        if (process.env.NODE_ENV === "production") {
          await sendProductionEmail(payload)
          return
        }

        await sendDevelopmentEmail(payload)
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id
        session.user.name = token.name
        session.user.email = token.email
        session.user.image = token.picture
      }

      return session
    },
    async jwt({ token, user }) {
      const dbUser = await db.user.findFirst({
        where: {
          email: token.email,
        },
      })

      if (!dbUser) {
        if (user) {
          token.id = user?.id
        }
        return token
      }

      return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        picture: dbUser.image,
      }
    },
  },
}
