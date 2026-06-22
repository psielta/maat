#!/usr/bin/env bash
set -euo pipefail

# Deploy do Maat no VPS compartilhado (/opt/maat). O Caddy do TRX e o ingress;
# este projeto nao publica portas no host. Rode a partir de /opt/maat.

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
COMPOSE=(docker compose -f "$COMPOSE_FILE")

usage() {
  cat <<'EOF'
Usage: ./deploy.sh <command>

Commands:
  all       Pull origin/main, sobe infra, roda migrations e (re)cria o app
  app       Build/recreate so o maat-app (apos migrations)
  migrate   Aplica as migrations Prisma (prisma migrate deploy)
  infra     Sobe Postgres + Redis + MinIO (+ cria bucket)
  status    Mostra status do compose e estado dos containers
  logs [S]  Segue logs. Opcionalmente de um servico S.

Rode a partir de /opt/maat no VPS de producao.
EOF
}

require_prod_files() {
  test -f .env || { echo "Missing .env"; exit 1; }
  "${COMPOSE[@]}" config >/dev/null
}

pull_main() {
  echo ">>> Atualizando repositorio"
  git fetch origin main
  git checkout main
  git reset --hard origin/main
  git log --oneline -3
}

start_infra() {
  require_prod_files
  echo ">>> Subindo infra (postgres, redis, minio, bucket)"
  "${COMPOSE[@]}" up -d maat-postgres maat-redis maat-minio maat-minio-init
}

run_migrations() {
  require_prod_files
  echo ">>> Build da imagem de migration"
  "${COMPOSE[@]}" build maat-migrate
  echo ">>> Aplicando migrations (prisma migrate deploy)"
  "${COMPOSE[@]}" run --rm maat-migrate
}

update_app() {
  require_prod_files
  echo ">>> Build da imagem do app"
  "${COMPOSE[@]}" build maat-app
  echo ">>> Recriando maat-app"
  "${COMPOSE[@]}" up -d maat-app
}

update_all() {
  start_infra
  run_migrations
  update_app
}

status() {
  require_prod_files
  echo ">>> Compose status"
  "${COMPOSE[@]}" ps
  echo
  echo ">>> Estado dos containers"
  for cid in $("${COMPOSE[@]}" ps -q); do
    docker inspect -f '{{.Name}} restart={{.RestartCount}} state={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid"
  done
  echo
  echo ">>> Disco"
  df -h /
  echo
  echo ">>> Memoria"
  free -h
}

cmd="${1:-}"
case "$cmd" in
  all)
    pull_main
    update_all
    status
    ;;
  app)
    pull_main
    update_app
    status
    ;;
  migrate)
    pull_main
    start_infra
    run_migrations
    status
    ;;
  infra)
    start_infra
    status
    ;;
  status)
    status
    ;;
  logs)
    shift || true
    "${COMPOSE[@]}" logs -f --tail=200 "$@"
    ;;
  ""|-h|--help|help)
    usage
    ;;
  *)
    echo "Unknown command: $cmd"
    usage
    exit 2
    ;;
esac
