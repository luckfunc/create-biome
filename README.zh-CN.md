# create-biome

[English](./README.md) | 简体中文

`create-biome` 是一个命令行工具，用来通过一个简短的交互式流程，把 [Biome](https://biomejs.dev/) 接入到现有项目里。

## 功能

- 创建 `biome.json`、`.biomeignore` 和 `.editorconfig`
- 自动识别包管理器，并允许手动确认
- 安装 `@biomejs/biome`
- 向 `package.json` 注入 `lint`、`lint:fix` 和 `lint:ci` 脚本

## 快速开始

```bash
npx create-biome
```

CLI 会先确认目标目录和包管理器，然后应用所选模板。

在 AI Agent、脚本、CI 等无交互环境中，可以传入 `--yes` 接受默认值：

```bash
npx create-biome --yes
```

也可以把设置写得完全明确：

```bash
npx create-biome --yes --template react --package-manager npm
```

如果只想更新文件、不安装依赖，可以使用：

```bash
npx create-biome --yes --no-install
```

## CLI 参数

- `-y, --yes`：接受默认值并跳过交互式提示
- `-t, --template <template>`：选择 `react` 或 `javascript`
- `-p, --package-manager <package-manager>`：选择 `pnpm`、`npm`、`yarn` 或 `bun`
- `--no-install`：跳过安装 `@biomejs/biome`

## 环境要求

- Node.js 18 或更高版本
- 已安装以下任一包管理器：`pnpm`、`npm`、`yarn` 或 `bun`

## 开发

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
```

## 许可证

MIT
