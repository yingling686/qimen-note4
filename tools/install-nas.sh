#!/bin/sh
set -eu
umask 077
cd "$(dirname "$0")/.."
if ! command -v docker >/dev/null 2>&1; then
  echo '没有找到 Docker，请先启用 NAS 的 Container Manager。' >&2
  exit 1
fi
if [ ! -f .env ]; then
  cp .env.example .env
  echo '已创建.env，请填写MiniMax密钥后重新运行。' >&2
  exit 1
fi
chmod 600 .env
mkdir -p data
if docker compose version >/dev/null 2>&1; then
  docker compose config --quiet
  docker compose up -d --build
  docker compose ps
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose config --quiet
  docker-compose up -d --build
  docker-compose ps
else
  echo '没有找到 Docker Compose。' >&2
  exit 1
fi
