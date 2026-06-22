# Imagem de produção do Maat (Next.js 16 standalone + Prisma + sharp).
# Multi-stage: deps (instala + prisma generate) -> build (next build) ->
# migrate (one-shot prisma migrate deploy) -> runner (standalone enxuto).
#
# Cuidados:
# - Debian bookworm-slim (melhor p/ Prisma engine + sharp do que alpine/musl).
# - NODE_ENV NAO pode ser "production" no install/build (precisamos das devDeps:
#   prisma CLI + toolchain do next build). So o runner roda NODE_ENV=production.
# - O postinstall roda `prisma generate`, que precisa resolver env("DATABASE_URL");
#   por isso uma DATABASE_URL dummy nos stages de install/build.
# - O env.mjs valida no import; SKIP_ENV_VALIDATION=1 (suportado via skipValidation)
#   pula a validacao no build. Em runtime (sem a flag) o env e validado de verdade.

FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# --- deps: instala dependencias (postinstall: prisma generate) ---
FROM base AS deps
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN corepack pnpm install --frozen-lockfile

# --- build: compila o Next em modo standalone ---
FROM base AS build
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV SKIP_ENV_VALIDATION="1"
ENV NEXT_TELEMETRY_DISABLED="1"
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL}"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack pnpm exec prisma generate
RUN corepack pnpm build
# pnpm guarda o Prisma Client gerado (com o engine Linux) dentro do store .pnpm e
# expoe @prisma/client por symlink. Deref para um staging com arquivos reais, que
# o runner copia para o node_modules do standalone.
RUN STORE="$(dirname "$(dirname "$(readlink -f node_modules/@prisma/client)")")" \
  && mkdir -p /prisma-deps/@prisma \
  && cp -rL "$STORE/.prisma" /prisma-deps/.prisma \
  && cp -rL "$STORE/@prisma/client" /prisma-deps/@prisma/client

# --- migrate: one-shot `prisma migrate deploy` (tem prisma CLI + migrations) ---
FROM deps AS migrate
ENV NODE_ENV="production"
CMD ["corepack", "pnpm", "exec", "prisma", "migrate", "deploy"]

# --- runner: runtime minimo com o servidor standalone ---
FROM base AS runner
ENV NODE_ENV="production"
ENV NEXT_TELEMETRY_DISABLED="1"
ENV PORT="14500"
ENV HOSTNAME="0.0.0.0"
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# O trace do standalone deixa @prisma/client / .prisma como symlinks apontando para
# o store .pnpm (inexistente aqui). Remove antes de copiar os arquivos reais.
RUN rm -rf ./node_modules/@prisma ./node_modules/.prisma
# Garante o Prisma Client + engine (externalizado via serverExternalPackages).
COPY --from=build /prisma-deps/.prisma ./node_modules/.prisma
COPY --from=build /prisma-deps/@prisma ./node_modules/@prisma
EXPOSE 14500
CMD ["node", "server.js"]
