# Auth API (Node.js + Express + Prisma)

API de autenticação JWT com refresh tokens persistidos em Postgres, cobertura de testes e separação clara de camadas.

## Stack

- Node.js 18+, Express 5
- Prisma 7 + PostgreSQL
- JWT (`jsonwebtoken`), bcryptjs
- Jest + Supertest

## Diferenciais

- Refresh token persistido com unicidade garantida no banco.
- Camadas explícitas: rotas → controllers → services → repositories.
- Error handling centralizado com `AppError`.
- Testes end-to-end cobrindo registro, login, refresh, logout e rotas protegidas.
- Docker Compose para provisionar Postgres de desenvolvimento/teste.

## Decisões de arquitetura

- JWT de acesso curto + refresh token armazenado: balanceia UX e revogação via banco.
- Prisma com driver `pg` dedicado: pool controlado e logs de warning/error.
- Controllers só validam payload e repassam erros ao middleware; serviços contêm regras de negócio.
- `pretest` reseta DB e gera client, garantindo ambiente reproduzível em CI.

## Pré-requisitos

- Docker + Docker Compose
- Node 18+ e npm

## Setup rápido

```bash
docker-compose up -d postgres
npm install
# opcional: npx prisma migrate reset --force && npx prisma generate
npm run dev
```

Crie `.env` na raiz:

```env
DATABASE_URL="postgresql://auth_user:auth_password@localhost:5432/auth_api"
JWT_SECRET="super_secret_key"
PORT=3000
```

Os testes usam `tests/.env.test` automaticamente.

## Testes

```bash
npm test -- --runInBand
```

O `pretest` roda `prisma migrate reset --force && prisma generate`, então o banco de teste fica sempre limpo.

## Endpoints principais

- POST `/auth/register`
- POST `/auth/login`
- POST `/auth/refresh`
- POST `/auth/logout`
- GET `/auth/profile` (protegida)
- GET `/users/me` (protegida)

## Exemplos de uso

Registro:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","password":"123456"}'
```

Rota protegida:

```bash
curl http://localhost:3000/users/me \
  -H "Authorization: Bearer <access_token>"
```

## Estrutura

- `src/config` – JWT, Prisma
- `src/controllers` – valida payload e mapeia para serviços
- `src/services` – regras de negócio (auth)
- `src/repositories` – Prisma
- `src/middlewares` – auth, error handler
- `tests` – e2e e unitários (Jest + Supertest)

## Notas

- Logs do Prisma limitados a `warn/error` para reduzir ruído.
- `docker-compose` expõe Postgres em `localhost:5432`, compatível com as URLs de `.env` e `.env.test`.

## Próximos passos

- [X] Implementar `jti` + rotação e revogação de refresh tokens no Prisma.
- [X] Validar payloads com Zod/Joi e unificar respostas de erro.
- [ ] Adicionar logs estruturados (pino) e correlation id via middleware.
- [ ] Configurar CI (GitHub Actions) com docker-compose, testes e lint.
- [ ] Cobrir services com testes unitários para cenários de erro e borda.
