# Agent 指引（in-page-sense）

面向 Cursor / Codex 等编码 Agent 的仓库入口。

## 编码铁律

- `.cursor/rules/codingRole.mdc` — 职责原子（感知 ≠ 控制 ≠ 编排 ≠ 通道）、失败方向、反平铺  
- `.cursor/rules/testing-and-quality.mdc` — typecheck / DTO 与模式分流契约  
- `.cursor/rules/规则制定原则.mdc` — 歧义时先澄清再写码  

领域规则按路径注入（`code-style.mdc`、`docs-governance.mdc` 等）。

## 文档三层

见 `.cursor/rules/docs-governance.mdc`：

| 目录 | Agent |
|------|-------|
| `docs/人类文档/` | **只读**（除非用户明确授权） |
| `docs/AI文档/` | 仅用户要求 **固化 harness** 时可写 |
| `docs/AI与人类/` | 需求、原则、过程记录 — 可写 |

**当前需求真源：** [`docs/AI与人类/需求拟定/README.md`](./docs/AI与人类/需求拟定/README.md)  
**失败方向原则：** [`docs/AI与人类/规范和原则/快照诚实与失败方向.md`](./docs/AI与人类/规范和原则/快照诚实与失败方向.md)

## 实施前最小阅读

| 任务 | 先读 |
|------|------|
| 任意非 trivial 实现 | 需求拟定 README → `01` / `06` |
| 模式分流 / 挡层 / pagetitle | 需求拟定 `02` + `03` |
| 公开 API / DTO | 需求拟定 `04` |
| 语言 / 打包形态 | [决策：源码 TypeScript](./docs/AI与人类/决策与复盘/源码TypeScript与产物形态.md) + 需求拟定 `05` |
| 假菜单 / 焦点层竞态 | 规范和原则「快照诚实」+ `snapshot-lifecycle-sniffing.mdc` |

## 质量门禁（脚本落地后）

```shell
npm run typecheck
npm run lint
npm test                 # 含 DTO 判别 / id 同一套 / 收口 / 空挡层 / resolve 契约
```

未落地前：不得声称检查已通过；改行为须在报告中写明未跑项。

## 明确不要做

控制（bot）、编排（in-page-playable 信封）、BOM / eval、MCP / 扩展、宿主 env 闸门、`E2ePlayable`、Playwright 运行时依赖、把 generic `ref` 当 playable id。详见需求拟定 `06`。
