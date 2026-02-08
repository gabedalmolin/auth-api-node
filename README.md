# Auth API (Node.js + Express + Prisma)

![CI](https://github.com/john-dalmolin/auth-api-node/actions/workflows/ci.yml/badge.svg)

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
- Rate limiting nas rotas de auth.
- Logs estruturados com correlation id por requisição.
- Testes em múltiplas camadas: e2e, middleware, repository e service.
- CI no GitHub Actions com PostgreSQL real e execução de testes.
- Docker Compose para provisionar Postgres de desenvolvimento/teste.

## Decisões de arquitetura

- JWT de acesso curto + refresh token armazenado: balanceia UX e revogação via banco.
- Prisma com driver `pg` dedicado: pool controlado e logs de warning/error.
- Controllers só validam payload e repassam erros ao middleware; serviços contêm regras de negócio.
- `pretest` reseta DB e gera client, garantindo ambiente reproduzível em CI.
- `JWT_SECRET` validado no startup: sem segredo, o app falha rápido.

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
- `src/middlewares` – auth, error handler, rate limit, correlation id, validate
- `tests` – e2e e unitários (Jest + Supertest)

## Notas

- Logs do Prisma limitados a `warn/error` para reduzir ruído.
- `docker-compose` expõe Postgres em `localhost:5432`, compatível com as URLs de `.env` e `.env.test`.

## Próximos passos

- [X] Implementar `jti` + rotação e revogação de refresh tokens no Prisma.
- [X] Validar payloads com Zod e unificar respostas de erro.
- [X] Adicionar logs estruturados (pino) e correlation id via middleware.
- [X] Configurar CI (GitHub Actions) com PostgreSQL e testes.
- [X] Cobrir `AuthService` com testes unitários para cenários de erro e borda.
- [ ] Adicionar lint e format (`eslint` + `prettier`) com checagem na CI.
- [ ] Criar endpoints `/health` e `/ready` com verificação de banco.
- [ ] Publicar documentação OpenAPI/Swagger dos endpoints.
- [ ] Persistir refresh token com hash no banco (evitar token em texto puro).
- [ ] Migrar rate limit para store distribuído (Redis) visando escala horizontal.
- [ ] Definir meta de cobertura na CI (ex.: `--coverage` com mínimo de 80%).
