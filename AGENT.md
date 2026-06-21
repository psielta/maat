# AGENT.md

Este arquivo orienta agentes de IA trabalhando no Maat.

## Identidade do App

Maat é um app de portfólio para controle pessoal de tarefas, focado em desenvolvedores de software. A funcionalidade central é um workspace Kanban colaborativo com atualização em tempo real entre usuários, além de um Diário de Trabalho para registrar decisões e progresso.

Não reintroduza funcionalidades do template original sem pedido explícito. O app não deve ter Billing, Stripe, Pricing, blog de template, docs de template ou login via GitHub neste momento.

## Regras de Produto

- A tela principal autenticada é `/dashboard/boards`.
- `/dashboard` deve continuar levando para boards.
- Boards são privados por padrão.
- Compartilhamento acontece entre usuários já existentes no sistema.
- O Diário de Trabalho fica em `/dashboard/diary`.
- Notas do diário são privadas por padrão.
- Uma nota pode ser compartilhada individualmente com outro usuário como `EDITOR` ou `VIEWER`.
- `OWNER` gerencia membros e pode deletar boards.
- `EDITOR` edita conteúdo do board.
- `VIEWER` somente visualiza.
- O app é gratuito e de portfólio.

## Arquitetura

- Next.js App Router em `app/`.
- Prisma é a camada de persistência.
- PostgreSQL é a fonte de verdade.
- Redis Pub/Sub é usado somente para fanout realtime efêmero.
- SSE entrega eventos ao browser pela rota `app/api/boards/[boardId]/events/route.ts`.
- `BoardEvent` registra eventos no banco para auditoria simples.

Não adicione RabbitMQ ou Kafka sem necessidade concreta. Para o estágio atual, Redis resolve o requisito de realtime. Considere RabbitMQ apenas para jobs com retries e Kafka apenas para event streaming durável/analytics.

## Portas Obrigatórias

Use apenas a faixa `14500-14999`.

- App: `14500`
- PostgreSQL: `14532`
- MailHog SMTP: `14525`
- MailHog UI: `14580`
- Redis: `14679`

## Email

- Desenvolvimento: MailHog.
- Produção: Resend.
- Não configure MailHog como caminho de produção.
- Não torne `RESEND_API_KEY` obrigatório para rodar dev.

## Comandos

```bash
pnpm install
docker compose up -d postgres mailhog redis
pnpm exec prisma migrate deploy
pnpm dev
```

Validação antes de finalizar mudanças:

```bash
pnpm exec prisma validate
pnpm exec prisma generate
pnpm typecheck
pnpm lint
pnpm build
```

## Convenções de Código

- Siga os padrões locais antes de criar abstrações novas.
- Proteja toda mutação de board com `lib/board-access.ts`.
- Proteja toda mutação de diário com `lib/diary-access.ts`.
- Grave e publique eventos com `recordBoardEvent` quando a mudança precisar aparecer realtime.
- Não confie no client para permissão.
- Mantenha migrations versionadas em `prisma/migrations`.
- Use commits convencionais.

## UI

- Mantenha a marca visível como Maat.
- A UI deve parecer ferramenta de trabalho, não landing page genérica.
- Use a fonte Geist já configurada.
- Mantenha o tema Twitter/shadcn atual.
- Evite textos do template original.
- Remova interfaces órfãs em vez de só escondê-las quando não fizerem parte do produto.

## Cuidados

- Em Windows, `prisma generate` pode falhar com `EPERM` se um dev server estiver segurando o Prisma Client. Pare processos Next do workspace, remova `.next` se necessário e rode novamente.
- Não use portas fora da faixa acordada.
- Não restaure Stripe, Billing ou login GitHub por conveniência.
