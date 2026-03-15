# Prettier Config

Shared Prettier configuration for the monorepo.

## Features

- Consistent code formatting across all packages
- Automatic import sorting with `@trivago/prettier-plugin-sort-imports`
- Import order:
    1. React and Next.js
    2. Third-party modules
    3. Workspace packages (`@workspace/*`)
    4. Internal modules (`@/*`)
    5. Relative imports

## Usage

In your package's `.prettierrc.js`:

```js
/** @type {import('prettier').Config} */
module.exports = require("@workspace/prettier-config");
```

## Formatting

Run from root:

```bash
pnpm format          # Format all packages
pnpm format:check    # Check formatting without changes
```

Run in specific package:

```bash
cd apps/web
pnpm format
```
