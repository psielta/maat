import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { NextAuthOptions } from "next-auth"
import EmailProvider from "next-auth/providers/email"
import { createTransport } from "nodemailer"
import { Resend } from "resend"

import { env } from "@/env.mjs"
import { siteConfig } from "@/config/site"
import { db } from "@/lib/db"
import { messages } from "@/lib/messages/pt-br"

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function getDisplayHost(url: string) {
  try {
    return new URL(url).host
  } catch {
    return siteConfig.url
  }
}

function createMagicLinkText(url: string) {
  return [
    `${messages.auth.magicLinkSubject} ${siteConfig.name}`,
    "",
    messages.auth.magicLinkTextIntro,
    url,
    "",
    messages.auth.magicLinkTextIgnore,
  ].join("\n")
}

function createMagicLinkEmail(url: string) {
  const escapedUrl = escapeHtml(url)
  const escapedName = escapeHtml(siteConfig.name)
  const displayHost = escapeHtml(getDisplayHost(url))

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <title>${messages.auth.magicLinkSubject} ${escapedName}</title>
        <style>
          @media only screen and (max-width: 620px) {
            .container { width: 100% !important; }
            .card { border-radius: 0 !important; }
            .content { padding: 28px 22px !important; }
            .button { display: block !important; width: 100% !important; box-sizing: border-box !important; }
          }
        </style>
      </head>
      <body style="margin:0; padding:0; background:#f4f4f5; color:#18181b; font-family:Arial, Helvetica, sans-serif;">
        <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
          ${messages.auth.magicLinkPreview} ${escapedName}.
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f4f5; margin:0; padding:32px 16px;">
          <tr>
            <td align="center">
              <table class="container" role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="width:560px; max-width:560px;">
                <tr>
                  <td style="padding:0 0 16px 0; text-align:left;">
                    <div style="font-size:18px; line-height:24px; font-weight:700; color:#09090b;">
                      ${escapedName}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="card" style="background:#ffffff; border:1px solid #e4e4e7; border-radius:14px; overflow:hidden;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="height:6px; background:#18181b; line-height:6px; font-size:6px;">&nbsp;</td>
                      </tr>
                      <tr>
                        <td class="content" style="padding:36px 36px 32px 36px;">
                          <p style="margin:0 0 12px 0; font-size:13px; line-height:20px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#71717a;">
                            ${messages.auth.secureAccess}
                          </p>
                          <h1 style="margin:0; font-size:28px; line-height:34px; font-weight:700; color:#09090b;">
                            ${messages.auth.magicLinkHeading} ${escapedName}
                          </h1>
                          <p style="margin:18px 0 0 0; font-size:16px; line-height:26px; color:#3f3f46;">
                            ${messages.auth.magicLinkBody} ${displayHost}.
                          </p>
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 0 0;">
                            <tr>
                              <td>
                                <a class="button" href="${escapedUrl}" style="display:inline-block; border-radius:10px; background:#18181b; color:#ffffff; font-size:15px; line-height:20px; font-weight:700; text-decoration:none; padding:14px 22px;">
                                  ${messages.auth.signInSecurely}
                                </a>
                              </td>
                            </tr>
                          </table>
                          <div style="margin:30px 0 0 0; padding:18px; border-radius:10px; background:#fafafa; border:1px solid #e4e4e7;">
                            <p style="margin:0 0 8px 0; font-size:13px; line-height:20px; font-weight:700; color:#27272a;">
                              ${messages.auth.buttonNotWorking}
                            </p>
                            <p style="margin:0; font-size:13px; line-height:20px; color:#52525b;">
                              ${messages.auth.copyPasteLink}
                            </p>
                            <p style="margin:10px 0 0 0; font-size:12px; line-height:18px; word-break:break-all;">
                              <a href="${escapedUrl}" style="color:#2563eb; text-decoration:underline;">${escapedUrl}</a>
                            </p>
                          </div>
                          <p style="margin:24px 0 0 0; font-size:13px; line-height:20px; color:#71717a;">
                            ${messages.auth.magicLinkTextIgnore}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 8px 0 8px; text-align:center;">
                    <p style="margin:0; font-size:12px; line-height:18px; color:#71717a;">
                      ${messages.auth.sentBy} ${escapedName}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
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
    subject: `${messages.auth.magicLinkSubject} ${siteConfig.name}`,
    html: createMagicLinkEmail(url),
    text: createMagicLinkText(url),
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
  if (!resend) {
    throw new Error("RESEND_API_KEY is required in production.")
  }

  const { error } = await resend.emails.send({
    to: [identifier],
    from,
    subject: `${messages.auth.magicLinkSubject} ${siteConfig.name}`,
    html: createMagicLinkEmail(url),
    text: createMagicLinkText(url),
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
