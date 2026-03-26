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
