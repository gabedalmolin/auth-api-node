# Auth API (Node.js + Express + Prisma)

![CI](https://github.com/john-dalmolin/auth-api-node/actions/workflows/ci.yml/badge.svg)

API de autenticação com foco em qualidade de engenharia para ambiente real: arquitetura em camadas, observabilidade, documentação OpenAPI, testes automatizados e pipeline de CI com banco real.

## Resumo

Este projeto implementa autenticação baseada em JWT com refresh token persistido no PostgreSQL, separando responsabilidades por camada (`routes -> controllers -> services -> repositories`).

O objetivo é manter uma base pronta para evolução, priorizando:

- legibilidade e manutenibilidade;
- previsibilidade de erro;
- segurança de sessão;
- cobertura de testes e automação.

## Stack

- Node.js 18+
- Express 5
- Prisma 7 + PostgreSQL
- JWT (`jsonwebtoken`) + `bcryptjs`
- Zod (validação de payload)
- Pino (logging estruturado)
- Vitest + Supertest
- Lint/format com Biome
- Swagger UI + swagger-jsdoc
- ioredis

## Arquitetura

### Camadas

- `routes`: define endpoints e composição de middlewares.
- `controllers`: valida entrada e delega regra de negócio.
- `services`: concentra regras de domínio de autenticação.
- `repositories`: encapsula acesso ao Prisma/Postgres.

### Middlewares principais

- `authMiddleware`: valida access token.
- `validate`: aplica schemas Zod e padroniza resposta de erro de payload.
- `errorHandler`: centraliza mapeamento de erros de domínio/infra.
- `requestId` + `logger`: correlação e rastreabilidade por requisição.
- `rateLimiter`: proteção inicial para endpoints de auth.

## Fluxo de autenticação

1. `POST /auth/register` cria usuário com senha hasheada.
2. `POST /auth/login` valida credenciais e emite `accessToken` + `refreshToken`.
3. `POST /auth/refresh` valida token de refresh e rotaciona sessão.
4. `POST /auth/logout` revoga refresh token ativo.
5. Rotas protegidas (`/auth/profile`, `/users/me`) aceitam apenas access token válido.

## Diagramas de fluxo

### Fluxo geral da requisição

```mermaid
flowchart TD
    A["Client (App, Swagger, curl)"] --> B["Express App"]
    B --> C["requestId middleware"]
    C --> D["logger middleware"]
    D --> E{"Route match"}

    E -->|"/auth/*"| F["rateLimiter"]
    F --> G["validate (Zod)"]
    G --> H["authController"]
    H --> I["authService"]
    I --> J["Repositories"]
    J --> K["Prisma Client"]
    K --> L["PostgreSQL"]

    E -->|"/auth/profile, /users/me"| M["authMiddleware (Bearer JWT)"]
    M --> N["Protected handlers"]
    N --> O["200 JSON response"]

    E -->|"/health, /ready"| P["healthController"]
    E -->|"/docs, /docs.json"| Q["docsRoutes (Swagger)"]

    H -. "AppError / runtime error" .-> R["errorHandler middleware"]
    I -. "AppError / runtime error" .-> R
    R --> S["JSON error response"]
```

### Fluxo de autenticação e rotação de refresh token

```mermaid
sequenceDiagram
    participant U as "User"
    participant API as "Auth API"
    participant SVC as "authService"
    participant DB as "PostgreSQL (RefreshToken)"

    U->>API: "POST /auth/login (email, password)"
    API->>SVC: "login()"
    SVC->>DB: "create(tokenHash, jti, userId, expiresAt)"
    SVC-->>API: "accessToken + refreshToken"
    API-->>U: "200 tokens"

    U->>API: "POST /auth/refresh (refreshToken)"
    API->>SVC: "refreshToken(token)"
    SVC->>SVC: "jwt.verify + hashToken"
    SVC->>DB: "findByJti(jti)"
    SVC->>DB: "revokeByJti(oldJti)"
    SVC->>DB: "create(newTokenHash, newJti, userId, expiresAt)"
    SVC-->>API: "new accessToken + new refreshToken"
    API-->>U: "200 rotated tokens"

    U->>API: "POST /auth/logout (refreshToken)"
    API->>SVC: "logout(token)"
    SVC->>DB: "findByJti(jti)"
    SVC->>DB: "revokeByJti(jti)"
    API-->>U: "200 logged out"
```

## Segurança e qualidade

### Implementado

- [X] Segredo JWT validado no startup (falha rápida).
- [X] Refresh token com `jti` único para rotação/revogação.
- [X] Persistência de refresh token com hash (`tokenHash`) no banco.
- [X] Tratamento de erro unificado com `AppError`.
- [X] Validação de payload com Zod.
- [X] Rate limiting nas rotas de autenticação (Redis com fallback em memória).
- [X] Session management:
- [X] `GET /auth/sessions`
- [X] `POST /auth/logout-session`
- [X] `POST /auth/logout-all`
- [X] Testes automatizados em múltiplas camadas.
- [X] CI com execução de testes e cobertura mínima.
- [X] Lint/format com Biomepadronizados.

### Em andamento

- [ ] Migração para TypeScript (Fase 1) sem alterar arquitetura.
- [ ] Configurar `tsconfig`, `ts-jest` e ESLint para arquivos `.ts`.
- [ ] Converter `src` de `.js` para `.ts`.
- [ ] Converter `tests` de `.js` para `.ts`.
- [ ] Garantir `lint`, `test` e `test:coverage` verdes local e CI.

### Próximos passos

- [ ] Resolver warning de open handles no Jest (`--detectOpenHandles`).
- [ ] Aumentar cobertura de branches em fluxos de erro críticos.
- [ ] Refinar observabilidade de falhas críticas de autenticação/sessão.

## Pré-requisitos

- Docker + Docker Compose
- Node.js 18+
- npm

## Setup local

```bash
docker-compose up -d postgres redis
npm install
npm run dev
```

Crie o arquivo `.env` na raiz:

```env
DATABASE_URL="postgresql://auth_user:auth_password@localhost:5432/auth_api"
JWT_SECRET="super_secret_key"
PORT=3000
REDIS_URL="redis://localhost:6379"
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

Para testes, o projeto usa `tests/.env.test`.

## Scripts úteis

- `npm run dev`: sobe a API com `nodemon`.
- `npm run start`: inicia em modo produção.
- `npm run lint`: valida padrão de código.
- `npm run lint:fix`: corrige problemas de lint automaticamente.
- `npm run format`: verifica formatação.
- `npm run format:write`: aplica formatação.
- `npm test -- --runInBand`: roda suíte completa.
- `npm run test:coverage`: roda suíte com cobertura.

## Testes e cobertura

A suíte inclui:

- testes e2e de autenticação e rotas protegidas;
- testes de middleware de autenticação;
- testes de repositório de refresh token;
- testes unitários de `AuthService`.

Notas importantes:

- `pretest` e `pretest:coverage` executam `prisma migrate reset --force && prisma generate` para garantir ambiente reproduzível.
- A CI aplica `coverageThreshold` global para evitar regressão silenciosa.

## Endpoints

- `POST /auth/register`: cria usuário.
- `POST /auth/login`: autentica e retorna tokens.
- `POST /auth/refresh`: renova sessão.
- `POST /auth/logout`: revoga refresh token.
- `GET /auth/profile`: rota protegida de perfil.
- `GET /users/me`: rota protegida de usuário autenticado.
- `GET /health`: liveness.
- `GET /ready`: readiness com verificação de banco.
- `GET /docs`: Swagger UI.
- `GET /docs.json`: OpenAPI em JSON.
- `GET /auth/sessions`: listar sessões ativas do usuário autenticado.
- `POST /auth/logout-session`: revogar uma sessão específica por `jti`.
- `POST /auth/logout-all`: revogar todas as sessões do usuário autenticado.

## Validação manual (curl)

Registrar usuário:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","password":"123456"}'
```

Login:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@test.com","password":"123456"}'
```

Rota protegida:

```bash
curl http://localhost:3000/users/me \
  -H "Authorization: Bearer <access_token>"
```

## Estrutura de pastas

```txt
src/
- app.js
- server.js
- logger.js
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
- auth.e2e.test.js
- health.e2e.test.js
- middleware/
- config/
- repositories/
- services/
- setup.js
- jest.env.js
```

## CI

Workflow em `.github/workflows/ci.yml`:

- provisiona PostgreSQL no GitHub Actions;
- instala dependências.
- executa testes com cobertura;
- falha o pipeline se thresholds mínimos não forem atendidos.

## Decisões e trade-offs

- Refresh token em banco aumenta controle de sessão, com custo de estado adicional.
- Access token curto reduz impacto de comprometimento, com maior frequência de refresh.
- Camadas explícitas aumentam legibilidade e testabilidade, com mais arquivos e disciplina arquitetural.
- Reset de banco no pretest aumenta previsibilidade, com custo de tempo em execução local/CI.

## Roadmap técnico

### Segurança

- Revogação por usuário/dispositivo.
- Rotina de revisão de dependências e vulnerabilidades.

### Confiabilidade

- Cobrir cenários negativos e de erro de infra.
- Refinar observabilidade de falhas críticas.

### Escalabilidade

- Evoluir rate limit Redis para operação distribuída avançada.
- Preparar comportamento para múltiplas instâncias.

### Evolução de base de código

- Migrar para TypeScript de forma incremental (Fase 1 sem refactor estrutural).
- Após estabilizar TS, avaliar extração de casos de uso em classes (Fase 2).
- Manter compatibilidade total com pipeline CI durante a migração.
