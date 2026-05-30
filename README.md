# create-biome

English | [简体中文](./README.zh-CN.md)

`create-biome` is a CLI that helps you add [Biome](https://biomejs.dev/) to an existing project with a small interactive setup flow.

## Features

- Create `biome.json`, `.biomeignore`, and `.editorconfig`
- Detect the package manager and let you confirm it
- Install `@biomejs/biome`
- Add `lint`, `lint:fix`, and `lint:ci` scripts to `package.json`

## Quick Start

```bash
npx create-biome
```

The CLI confirms the target directory and package manager, then applies the selected template.

For AI agents, scripts, and other non-interactive environments, pass `--yes` to accept defaults:

```bash
npx create-biome --yes
```

You can also make the setup fully explicit:

```bash
npx create-biome --yes --template react --package-manager npm
```

To update files without installing packages, use:

```bash
npx create-biome --yes --no-install
```

## CLI Options

- `-y, --yes`: accept defaults and skip interactive prompts
- `-t, --template <template>`: choose `react` or `javascript`
- `-p, --package-manager <package-manager>`: choose `pnpm`, `npm`, `yarn`, or `bun`
- `--no-install`: skip installing `@biomejs/biome`

## Requirements

- Node.js 18 or newer
- One supported package manager installed: `pnpm`, `npm`, `yarn`, or `bun`

## Development

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
```

## License

MIT
