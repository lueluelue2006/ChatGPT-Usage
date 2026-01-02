# ChatGPT_Usage（Tampermonkey）开发构建

这个目录用 `esbuild` 把 `src/` 下的模块化源码打包成单文件油猴脚本，便于后续继续维护/重构。

## 环境

- Node.js（建议 >= 18）
- npm

## 安装依赖

如果你本机 `~/.npm` 权限有问题（常见报错：`Your cache folder contains root-owned files`），可以用本地缓存目录：

```bash
cd ChatGPT_Usage_repo
npm install --cache .npm-cache --no-audit --no-fund
```

## 构建

```bash
cd ChatGPT_Usage_repo
npm run build
```

输出文件：`ChatGPT_Usage_repo/ChatGPT_Usage.js`

## 监听构建（开发）

```bash
cd ChatGPT_Usage_repo
npm run dev
```

## 结构说明

- 入口：`ChatGPT_Usage_repo/src/index.js`
- 用户脚本头：`ChatGPT_Usage_repo/src/userscript-header.txt`（构建时作为 banner 注入到输出顶部）
- 构建输出：`ChatGPT_Usage_repo/ChatGPT_Usage.js`（用于 `@downloadURL/@updateURL` 发布）
