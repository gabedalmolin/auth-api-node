# Contributing

This repository aims to model production-grade engineering discipline for a core auth service. Treat every change as if it were heading to a maintained production system.

## Workflow

- Keep branches small, focused, and reviewable.
- Prefer one concern per branch and one coherent concern per pull request.
- Rebase on top of `main` before merge when the branch is clean enough to preserve intentional commits.
- Merge only after all required checks are green.

## Branch naming

Use a short, descriptive prefix that matches the change:

- `feat/...`
- `fix/...`
- `refactor/...`
- `docs/...`
- `test/...`
- `ci/...`
- `chore/...`

## Commit messages

Use Conventional Commits:

- `feat: add session inventory endpoint`
- `fix: reject inactive sessions in auth middleware`
- `refactor: simplify refresh token revocation flow`
- `docs: clarify integration test workflow`
- `ci: split quality and integration jobs`
- `chore: remove unused dependency`

Keep commits intentional. Avoid mixing unrelated code, docs, and workflow changes in the same commit unless they are inseparable.

## Pull requests

Every pull request should use the repository template and include:

- a short summary of intent
- the main implementation changes
- the exact validation commands that were run
- any residual risks, caveats, or follow-up notes

Keep pull requests small enough that a reviewer can understand them in one pass.

## Validation

Run the relevant checks before opening or merging a pull request:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:integration` for infrastructure-backed changes

Use `npm run prisma:migrate:deploy` when validating against a real PostgreSQL instance so local and CI migration behaviour stay aligned.

## Language and documentation

All repository artefacts must remain in English:

- code
- comments
- documentation
- commit messages
- pull request titles and bodies
- issue titles and bodies

## Maintenance expectations

- Keep the public `/v1/auth` contract stable unless a deliberate breaking-change decision has been made.
- Prefer explicitness over clever abstractions.
- Document meaningful workflow or governance changes in the repository, not only in pull request discussion.
