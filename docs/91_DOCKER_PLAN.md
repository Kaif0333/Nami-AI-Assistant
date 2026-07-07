# 91 — Docker Plan

## Services later

- postgres
- redis
- n8n
- nami-api
- automation-worker later

## V1

Docker optional.

## Later docker compose

Should include:
- PostgreSQL
- n8n
- Redis
- API
- volumes for persistence

## Rules

- Do not store secrets in docker-compose directly.
- Use env files ignored by Git.
