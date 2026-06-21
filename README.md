<div align="center">
  <h1>Maat</h1>
  <p>Controle pessoal de tarefas para desenvolvedores de software.</p>
</div>

Maat é um app de portfólio construído com Next.js 16 para organizar trabalho pessoal, bugs, refactors, experimentos e entregas em boards Kanban colaborativos. A experiência principal é o workspace: boards, listas, cards, membros e atualização em tempo real entre usuários conectados.

## Estado Atual

- Next.js 16.2.9 com App Router e React 19.
- Autenticação por email magic link via NextAuth.
- PostgreSQL com Prisma como fonte de verdade.
- Redis Pub/Sub para eventos realtime e Server-Sent Events no browser.
- MailHog somente em desenvolvimento.
- Resend planejado para envio de email em produção.
- Sem GitHub login, sem Billing/Stripe e sem blog/docs do template.

## Stack

- Framework: Next.js 16, React 19, TypeScript.
- UI: Tailwind CSS, shadcn/Radix primitives, tema visual baseado no Twitter, fonte Geist.
- Drag and drop: dnd-kit.
- Banco: PostgreSQL 16 em Docker.
- ORM: Prisma 6.
- Realtime: Redis 7, Pub/Sub e SSE.
- Auth: NextAuth com Prisma Adapter e Email Provider.
- Email dev: MailHog.
- Email prod: Resend.

## Portas Locais

Todas as portas ficam na faixa `14500-14999`.

| Serviço | Porta |
| --- | --- |
| App Next.js | `14500` |
| PostgreSQL | `14532` |
| MailHog SMTP | `14525` |
| MailHog UI | `14580` |
| Redis | `14679` |
| MinIO S3 API | `14590` |
| MinIO Console | `14591` |

## Setup Local

```bash
pnpm install
docker compose up -d postgres mailhog redis minio minio
pnpm exec prisma migrate deploy
pnpm dev
```

A aplicação fica em `http://localhost:14500`.

MailHog fica em `http://localhost:14580`.

## Variáveis

Copie `.env.example` para `.env` e preencha pelo menos:

```env
NEXT_PUBLIC_APP_URL=http://localhost:14500
NEXTAUTH_URL=http://localhost:14500
NEXTAUTH_SECRET=uma-chave-local
DATABASE_URL="postgresql://maat:maat@localhost:14532/maat?schema=public"
REDIS_URL="redis://localhost:14679"
EMAIL_FROM="Maat <noreply@example.com>"
SMTP_HOST=localhost
SMTP_PORT=14525
S3_ENDPOINT=http://localhost:14590
S3_ACCESS_KEY=maat
S3_SECRET_KEY=maatminio1
S3_BUCKET=maat-uploads
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true
```

`RESEND_API_KEY` é necessário apenas para envio real em produção. Em dev, o provider usa MailHog.

MinIO Console fica em `http://localhost:14591`.

## Modelo de Produto

- Board: ambiente de trabalho Kanban.
- BoardList: coluna do board.
- BoardCard: tarefa, bug, refactor, experimento ou item de entrega.
- BoardMember: permissão de acesso por usuário.
- BoardEvent: trilha persistida de eventos para auditoria simples.

Papéis:

- `OWNER`: gerencia board, membros e conteúdo.
- `EDITOR`: altera listas, cards e detalhes do board.
- `VIEWER`: acompanha o board sem editar.

## Realtime

O PostgreSQL continua sendo a fonte de verdade. Cada mutação relevante grava no banco e publica um evento Redis no canal `board:{boardId}`. O browser escuta `/api/boards/[boardId]/events` via Server-Sent Events e executa `router.refresh()` quando recebe uma atualização.

Redis foi escolhido por ser suficiente para fanout realtime entre usuários neste estágio. RabbitMQ e Kafka foram considerados, mas ficam para evolução futura:

- RabbitMQ: útil quando houver filas de jobs, retries e workers.
- Kafka: útil quando houver analytics, event streaming durável ou integrações externas de alto volume.

## Comandos de Validação

```bash
pnpm exec prisma validate
pnpm exec prisma generate
pnpm typecheck
pnpm lint
pnpm build
```

Para atualizar o banco local:

```bash
docker compose up -d postgres mailhog redis minio
pnpm exec prisma migrate deploy
```

## Estrutura Relevante

```text
app/(marketing)/page.tsx                  Landing page do Maat
app/(dashboard)/dashboard/boards          UI do workspace Kanban
app/api/boards                            APIs de boards, listas, cards, membros e eventos
components/board-view.tsx                 Board interativo com dnd-kit e SSE
lib/board-access.ts                       Regras de permissão
lib/board-events.ts                       Persistência/publicação de eventos
lib/redis.ts                              Cliente Redis
prisma/schema.prisma                      Modelo de dados
docker-compose.yml                        PostgreSQL, Redis e MailHog
```

## Roadmap

- Melhorar edição inline e estados vazios dos cards.
- Adicionar filtros por label, prioridade e responsável.
- Criar templates de boards para projetos de software.
- Adicionar notificações assíncronas com worker quando houver demanda real.
- Integrar com GitHub futuramente, sem usar login GitHub por enquanto.

## Licença

MIT. Este projeto nasceu a partir de um starter open source e foi remodelado para o app Maat.
