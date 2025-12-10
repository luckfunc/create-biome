# create-biome

一个帮助项目快速接入 [Biome](https://biomejs.dev/) 的命令行工具。它会在当前目录中自动创建/更新 Biome 配置、忽略文件、常用 scripts，并根据你的系统安装所需的 CLI 依赖。

## 功能

- 自动生成 `biome.json`、`.biomeignore`、`.editorconfig` 等配置文件
- 检查包管理器（pnpm/npm/yarn/bun），并允许手动确认
- 安装 `@biomejs/biome` 以及当前平台匹配的 CLI 二进制
- 向 `package.json` 注入 `lint` 与 `lint:fix` 脚本

## 快速开始

```bash
npx create-biome
```

执行过程中会通过终端交互确认目标目录与包管理器，其余步骤全自动完成。默认会在未检测到的情况下创建 `.biomeignore`、`.gitignore`（附带 `.biomeignore` 记录）和 `.editorconfig`。

## 环境要求

- Node.js 18 或更高版本。当前依赖（如 `commander@14`、`chalk@5`、`@clack/prompts`）只在 Node 18+ 上提供官方支持，因此旧版 Node（14/16）无法运行 create-biome。
- 已安装任一包管理器（pnpm/npm/yarn/bun）用于安装 `@biomejs/biome`。

## 开发 & 构建

项目使用 pnpm，如需修改 CLI 逻辑：

```bash
pnpm install
pnpm dev    # 开启 watch 模式，输出 dist/index.mjs
pnpm build  # 进行一次完整构建并复制模板文件到 dist/
pnpm lint   # 运行 Biome 检查
```

发布之前请确保 `dist/` 中包含 `index.mjs` 以及模板目录（构建脚本已通过 `tsdown --copy` 自动处理）。

## 目录结构

```
.
├── src/index.ts               # CLI 入口
├── src/template/              # 模板（React / JavaScript / Base，含 editorconfig 等配置）
├── dist/                      # 构建产物（publish 时使用）
└── .github/workflows/         # CI（pnpm 安装、lint、发布）
```

## CI 发布

`.github/workflows/node-package.yml` 会在 push 到 `main` 时运行：

1. `build` 作业：安装依赖、执行 `pnpm lint` 和 `pnpm build`
2. `publish-npm` 作业（需要 `NPM_TOKEN` Secret）：重新安装、构建并执行 `pnpm publish --access public --no-git-checks`

请确保 `pnpm-lock.yaml` 已提交，且仓库配置了有发布权限的 `NPM_TOKEN`。

## 许可证

MIT
