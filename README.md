> [!NOTE]
> This project has been officially archived and will no longer receive updates. See the [Templates](https://vercel.com/templates/next.js) directory for Next.js starters.
> 
> I started this project when the Next.js App Router was in public preview. Because the framework has since stabilized and undergone significant architectural changes, the code in this repository:
> - Does not reflect current best practices.
> - May contain deprecated APIs or patterns.
> - Is not recommended for use in production environments.

# Taxonomy

An open source application built using the App Router, server components and Next.js 16.

## About this project

This project as an experiment to see how a modern app (with features like authentication, subscriptions, API routes, static pages for docs ...etc) works with Next.js and server components.

## Features

- New `/app` dir,
- Routing, Layouts, Nested Layouts and Layout Groups
- Data Fetching, Caching and Mutation
- Loading UI
- Route handlers
- Metadata files
- Server and Client Components
- API Routes and Middlewares
- Authentication using **NextAuth.js**
- ORM using **Prisma**
- Local database using **PostgreSQL** in Docker
- UI Components built using **Radix UI**
- Documentation and blog using **MDX**
- Development email using **MailHog**
- Production email using **Resend**
- Subscriptions using **Stripe**
- Styled using **Tailwind CSS**
- Validations using **Zod**
- Written in **TypeScript**

## Roadmap

- [x] ~Add MDX support for basic pages~
- [x] ~Build marketing pages~
- [x] ~Subscriptions using Stripe~
- [x] ~Responsive styles~
- [x] ~Add OG image for blog using @vercel/og~
- [x] Dark mode

## Known Issues

A list of things not working right now:

1. ~GitHub authentication (use email)~
2. ~[Prisma: Error: ENOENT: no such file or directory, open '/var/task/.next/server/chunks/schema.prisma'](https://github.com/prisma/prisma/issues/16117)~
3. ~[Next.js 13: Client side navigation does not update head](https://github.com/vercel/next.js/issues/42414)~
4. [Cannot use opengraph-image.tsx inside catch-all routes](https://github.com/vercel/next.js/issues/48162)

## Why not tRPC, Turborepo or X?

I might add this later. For now, I want to see how far we can get using Next.js only.

If you have some suggestions, feel free to create an issue.

## Running Locally

1. Install dependencies using pnpm:

```sh
pnpm install
```

2. Copy `.env.example` to `.env.local` and `.env`, then update values if needed.

```sh
cp .env.example .env.local
cp .env.example .env
```

3. Start PostgreSQL and MailHog:

```sh
docker compose up -d postgres mailhog
```

4. Apply database migrations:

```sh
pnpm exec prisma migrate deploy
```

5. Start the development server:

```sh
pnpm dev
```

The app runs at `http://localhost:14500`.

Local services use the `14500-14999` port range:

- PostgreSQL: `localhost:14532`
- MailHog SMTP: `localhost:14525`
- MailHog UI: `http://localhost:14580`

## License

Licensed under the [MIT license](https://github.com/shadcn/taxonomy/blob/main/LICENSE.md).
