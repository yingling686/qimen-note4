#!/bin/sh
# Protect this project's private configuration, then run read-only diagnostics.
# This runs as the existing owner; no privilege escalation is requested.
chmod 600 /volume1/docker/qimen-note4/.env
exec > /volume1/docker/qimen-note4/nas-diagnostics.log 2>&1
date
id
uname -m
command -v docker
docker version --format '{{.Server.Version}}'
docker ps --filter name=qimen-note4 --format '{{.Names}} {{.Status}}'
for endpoint in https://registry-1.docker.io/v2/ https://mirror.gcr.io/v2/ https://deb.debian.org/debian/ https://index.crates.io/config.json; do
  printf '\n%s\n' "$endpoint"
  curl -I -sS --connect-timeout 10 --max-time 20 "$endpoint"
done
