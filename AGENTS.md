# AGENTS.md

## Project Overview
This repository (`@yuyi919/tslibs-effect`) is a personal shared library that provides polyfills and re-exports for `Effect-TS` and `effect-smol` (Effect v4). 
The main goal is to simplify usage (tree-shaking is not a priority) and align common functions and naming conventions with `effect-v3/v4`.

## What is AGENTS.md?
`AGENTS.md` is a recognized open standard used by over 60k open-source projects. It acts as a "README for AI coding agents". While `README.md` is for humans, `AGENTS.md` provides structured, machine-readable instructions specifically designed for AI agents (like Cursor, Trae, Copilot, etc.) to understand build instructions, code style, testing guidelines, and repository constraints without cluttering the human-facing documentation.

## Project Structure
- `src/`: The root source directory containing "thin re-export" layers to maintain backwards compatibility for import paths.
- `src/public/`: (Planned/Conceptual) Stable public APIs. Files here are exposed via `package.json` exports.
- `src/internal/`: Internal implementations and experimental features (e.g., `cluster`, `libs`). These are NOT directly exported to consumers.
- `src/internal/test/`: Unit tests and testing utilities.
- `docs/`: Project documentation and research notes.

## Setup Commands
- **Install dependencies**: `npm install` (Use `--legacy-peer-deps` if peer dependency conflicts occur)
- **Run formatter and linter**: `npx @biomejs/biome check --write .`
- **Build the project**: `npm run build` (uses `tsc --build`)
- **Run tests**: `npm run test` (uses `bun test src`)

## Code Style & Constraints
- **TypeScript**: Strict mode is enabled. We use `bun` as the primary runtime environment types (`"types": ["bun"]` in tsconfig).
- **Biome**: We use Biome for formatting and linting. Do not use ESLint or Prettier.
- **Imports/Exports**: When refactoring or moving files, maintain the existing import/export semantics. If moving internal files, ensure a "thin re-export" layer is left in the original location to preserve backwards compatibility for the export path.
- **Dependencies**: The project heavily relies on `effect`, `@effect/platform-bun`, `@effect/sql-sqlite-bun`, and `es-toolkit`. Always check existing peerDependencies before adding new packages.
- **Testing**: We use `bun test` for testing. Ensure tests are isolated in `*.test.ts` files within the appropriate `test` or `internal` directories.

## Development Rules for AI Agents
1. **Preserve Logic**: Do not modify business logic or type semantics when performing directory restructurings, unless explicitly requested.
2. **Documentation Separation**: Keep `README.md` concise and human-readable. Use this `AGENTS.md` file for machine-specific instructions and tool configurations.
3. **Spec-Driven**: We follow a spec-driven development process. Always check `.trae/specs` for current specifications and checklists before making structural changes.
4. **Validation**: Always run `npm run build` and `npm run test` to verify your changes before completing a task.
