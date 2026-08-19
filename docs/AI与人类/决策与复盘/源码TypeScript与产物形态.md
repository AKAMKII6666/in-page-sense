> **文档层级：** AI与人类  
> **状态：** 已裁决（进行中仓库）  
> **日期：** 2026-08-19  
> **读者：** 工程 | 实现 Agent  

# 决策：源码 TypeScript，产物 ESM + `.d.ts`

与 in-page-bot 同一选择，适用于本感知库。

## 结论

| 项 | 选择 |
|----|------|
| **作者侧源码** | TypeScript，`strict` |
| **发布产物** | ESM `.js` + `.d.ts`（V1 不必强求 CJS） |
| **运行时依赖** | 零；不编译进 React / jQuery / Playwright / html2canvas |
| **消费方** | 可用 JS 或 TS；类型对 TS 宿主友好 |

**一句话：** 作者侧 TS，产物侧标准 JS 模块。

## 为什么不用纯 JS 写源码

1. **合同就是类型。** `TSenseSnapshot` 判别联合、`ISensePlayableItem`、`code`、截断配额是公开 API；TS 写进 `.d.ts`，宿主才能在编译期拦住乱拼快照。
2. **模式分流适合被类型约束。** `autonomous` vs `degenerate`、`view` / `fallback` 同时出现的合法性，纯 JS 全靠约定，一膨胀易漂。
3. **与姊妹库和规则一致。** 契约测试、`code-style.mdc`、Cursor 规则均按 TS 语境。
4. **发布形态仍可服务 JS 用户。** 打包出 ESM 即可。

## 何时会考虑「纯 JS」

几乎只有：刻意做无构建、单文件丢进任意页的书签脚本。即便如此，也更适合 **TS 源码 + 打一份 IIFE/ESM 产物**。

## 工程落地（与需求拟定对齐）

- 目录与分期见 [`../需求拟定/05-工程结构与分期.md`](../需求拟定/05-工程结构与分期.md)。
- 打包器具体选型（tsup / unbuild 等）可在脚手架阶段再定，**不改变本决策**。
- playground 可用 Vite 挂 TS，或先编再开 HTML。

## 非目标（本决策不覆盖）

- 是否提供 CDN UMD 包
- 是否双包 CJS
- 截图由谁拍（本库允许 `screenshot: null` 或宿主注入 `captureScreenshot`，见需求拟定 `04` / `06`）
