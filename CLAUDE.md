# CLAUDE.md

## Contexto

Maat é um app Next.js 16 para gerenciamento pessoal de tarefas de desenvolvedores. O objetivo é servir como projeto de portfólio no GitHub, com um produto real: Kanban colaborativo, Diário de Trabalho, permissões por usuário e realtime.

## Como Se Orientar

Comece por estes arquivos:

- `README.md`: visão geral, setup e roadmap.
- `AGENT.md`: regras para agentes.
- `prisma/schema.prisma`: modelo de dados.
- `components/board-view.tsx`: principal experiência do produto.
- `components/work-diary-entry-view.tsx`: editor do diário e compartilhamento por nota.
- `app/api/boards/**`: contratos de mutação e realtime.
- `app/api/diary/**`: contratos do diário de trabalho.
- `lib/board-access.ts`: autorização.
- `lib/diary-access.ts`: autorização do diário.
- `lib/board-events.ts`: eventos persistidos e publicados.

## Decisões Importantes

- O app se chama Maat em telas, metadata e documentação.
- O app é gratuito, sem Billing/Stripe.
- Auth atual é somente email magic link.
- GitHub login não deve ser reativado agora.
- MailHog é somente dev.
- Resend é o caminho de produção.
- Redis foi escolhido para realtime.
- RabbitMQ/Kafka não fazem parte da implementação atual.

## Fluxo de Realtime

1. Usuário faz uma mutação em board/list/card/member.
2. API valida sessão e permissão.
3. Prisma persiste a mudança em PostgreSQL.
4. `recordBoardEvent` salva `BoardEvent` e publica no Redis.
5. SSE em `/api/boards/[boardId]/events` repassa o evento ao browser.
6. Client chama `router.refresh()` para sincronizar com o estado persistido.

## Checklist de Mudança

Antes de concluir uma tarefa:

```bash
pnpm exec prisma validate
pnpm exec prisma generate
pnpm typecheck
pnpm lint
pnpm build
```

Para qualquer mudança que afete UI, navegação, autenticação ou formulários, também valide no navegador via MCP/Playwright. Use snapshot para localizar elementos e click/type reais para percorrer o fluxo. HTTP smoke isolado não substitui essa validação.

Fluxo mínimo esperado:

- navegar para a tela afetada;
- capturar snapshot;
- clicar ou preencher o elemento real;
- confirmar URL final, título e conteúdo visível.

Exemplo: depois de alterar login ou middleware, clicar no link `Login` da landing page pelo MCP e confirmar `/login` com o formulário de email visível.

Se tocar em Prisma:

```bash
docker compose up -d postgres mailhog redis
pnpm exec prisma migrate deploy
```

## Portas

Não use portas fora de `14500-14999`.

- `14500`: app
- `14532`: PostgreSQL
- `14525`: SMTP MailHog
- `14580`: UI MailHog
- `14679`: Redis

## Commits

Use conventional commits. Exemplos:

- `feat: add collaborative kanban workspace`
- `docs: document maat agent workflow`
- `fix: enforce board member permissions`

## O Que Evitar

- Não recriar blog, docs ou pricing do starter.
- Não adicionar Stripe.
- Não adicionar login GitHub.
- Não usar RabbitMQ/Kafka para realtime simples.
- Não hardcodar URLs de produção enquanto o domínio final não estiver definido.
