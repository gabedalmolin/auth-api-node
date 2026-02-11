# Auth API (Node.js + Express + Prisma)

![CI](https://github.com/john-dalmolin/auth-api-node/actions/workflows/ci.yml/badge.svg)

API de autenticação e gestão de sessão construída com foco em padrões de engenharia de software para produção: arquitetura em camadas, rastreabilidade de requisições, documentação OpenAPI, testes automatizados e CI com banco/redis reais.

## Visão do projeto

Este repositório foi evoluído como base de estudo e portfólio técnico para demonstrar decisões de backend além do CRUD.

Escopo principal:

- autenticação com `accessToken` + `refreshToken` com rotação;
- revogação de sessão por token e por usuário;
- validação e tratamento de erros consistentes;
- observabilidade mínima para operação real;
- qualidade contínua com lint, cobertura e CI.

## Snapshot de maturidade (fev/2026)

- `16/16` suítes passando
- `104/104` testes passando
- cobertura global: `99.2%` (branches `99.2%`)
- `src/config` e `src/middlewares` com `100%` de branch coverage
- CI do GitHub Actions estável em `main`

## Stack

- Node.js 20 LTS
- Express 5
- TypeScript 5.9
- Prisma 7 + PostgreSQL
- Redis (ioredis)
- JWT (`jsonwebtoken`) + `bcryptjs`
- Zod para validação de payload
- Pino para logging estruturado
- Vitest + Jest + Supertest
- Biome (lint/format)
- Swagger UI + swagger-jsdoc

## Arquitetura

Padrão em camadas:

- `routes`: contrato HTTP e composição de middlewares
- `controllers`: orquestração de entrada/saída
- `services`: regras de negócio
- `repositories`: persistência e consultas

Middlewares críticos:

- `requestId`: correlação de requisição
- `logger`: log estruturado com contexto
- `validate`: validação de entrada com Zod
- `authMiddleware`: proteção de rotas com JWT
- `rateLimiter`: proteção anti-abuso com Redis + fallback memória
- `errorHandler`: resposta de erro unificada

## Fluxo de autenticação

1. `POST /auth/register` cria usuário com senha hasheada.
2. `POST /auth/login` valida credenciais e retorna `accessToken` + `refreshToken`.
3. `POST /auth/refresh` valida refresh token, revoga o antigo e emite novo par.
4. `POST /auth/logout` revoga refresh token atual.
5. `POST /auth/logout-session` e `POST /auth/logout-all` encerram sessões específicas ou todas.

## Segurança e confiabilidade implementadas

- refresh token persistido com hash (`tokenHash`) no banco
- rotação por `jti` com revogação explícita
- validação de segredo JWT no startup (fail fast)
- tratamento centralizado de erro com `AppError`
- rate limit em endpoints sensíveis
- logs de aplicação ajustados para reduzir ruído em ambiente de teste
- encerramento adequado de conexões de teste para evitar open handles

## Progresso técnico recente

Últimas entregas relevantes em `main`:

- [#14](https://github.com/john-dalmolin/auth-api-node/pull/14) estabilidade de runtime de testes (teardown Prisma)
- [#15](https://github.com/john-dalmolin/auth-api-node/pull/15) aumento de branch coverage em fluxos de auth/rate limiter
- [#16](https://github.com/john-dalmolin/auth-api-node/pull/16) redução de ruído de logs em execução de teste
- [#18](https://github.com/john-dalmolin/auth-api-node/pull/18) cobertura completa de branches em `src/config/prisma.ts`
- [#19](https://github.com/john-dalmolin/auth-api-node/pull/19) cobertura completa de branches em `src/logger.ts`
- [#20](https://github.com/john-dalmolin/auth-api-node/pull/20) cobertura completa de branches em `validate.ts` e `errorHandler.ts`

## Backlog atual

As próximas tasks técnicas estão em `to-do.txt`, separando entregas concluídas de próximos incrementos de engenharia.

## Setup local

Pré-requisitos:

- Docker + Docker Compose
- Node.js 20 LTS
- npm

Subir infraestrutura e aplicação:

```bash
docker-compose up -d postgres redis
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Arquivo `.env`:

```env
DATABASE_URL="postgresql://auth_user:auth_password@localhost:5432/auth_api"
JWT_SECRET="<gere-um-segredo-forte-com-no-minimo-32-caracteres>"
PORT=3000
REDIS_URL="redis://localhost:6379"
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

Para testes, usar `tests/.env.test`.

## Scripts principais

- `npm run dev`: desenvolvimento com watch
- `npm run start`: execução da API
- `npm run lint`: lint com Biome
- `npm run format`: valida formatação
- `npm test`: suíte principal (Vitest)
- `npm run test:coverage:jest`: cobertura com Jest
- `npm run typecheck`: verificação de tipos

## Validação rápida

```bash
npm run lint
npm run test:coverage:jest
npx jest --config jest.config.cjs --runInBand --detectOpenHandles --openHandlesTimeout=5000
```


## Endpoints principais

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/profile`
- `GET /users/me`
- `GET /auth/sessions`
- `POST /auth/logout-session`
- `POST /auth/logout-all`
- `GET /health`
- `GET /ready`
- `GET /docs`
- `GET /docs.json`

## Roadmap técnico

### Próximo ciclo

- ampliar testes de falhas de infraestrutura (Redis/DB indisponível)
- consolidar decisão final Vitest x Jest para cobertura
- expandir regras de sessão por dispositivo (metadata mais rica)

### Evolução futura

- endurecimento de segurança (revisão de dependências e policy de segredo)
- maior observabilidade (métricas e tracing)
- preparo para cenário multi-instância com limites distribuídos avançados

## Estrutura de pastas

```txt
src/
- app.ts
- server.ts
- logger.ts
- config/
- controllers/
- docs/
- errors/
- middlewares/
- repositories/
- routes/
- services/
- validators/

prisma/
- schema.prisma
- migrations/

tests/
- auth.e2e.test.ts
- health.e2e.test.ts
- middleware/
- config/
- repositories/
- services/
- setup.js
- jest.env.js
- jest.globals.js
- vitest.setup.mjs
```
