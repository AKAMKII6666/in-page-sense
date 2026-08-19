> **文档层级：** AI与人类  
> **状态：** 进行中  
> **读者：** 产品、研发、实现 Agent  
> **来源：** 设计会话收敛（自主 E2E 点位 / 短菜单 + 浅树 / 职责原子 npm）  
> **日期：** 2026-08-19  

# in-page-sense 需求拟定

这是本库当前的需求基线。它回答：这个 npm 是什么、做什么、不做什么、公开快照 DTO 长什么样、如何分期落地。

**原子化含义（已对齐）：** 指 **职责原子**——本库只做页内感知与快照产出，不负责键鼠控制、插件编排、BOM、宿主闸门。  
**不是**要求库内函数必须拆成最小原语；`snapshot()` 一次产出列表 + 树（必要时附 generic）是一等公民。

## 一句话定位

页内感知组件：在已打开的页面（或 iframe）`root` 里扫描 `data-e2e-*` 点位，产出 Agent 可读的短菜单与浅字符树；无页身份时退化为配额内的普通 a11y + 可选截图。可嵌入任意页面；控制、编排、BOM、MCP 均由宿主或其他库组合。

## 阅读顺序

| 文档 | 用途 |
|------|------|
| [01-产品概述与边界](./01-产品概述与边界.md) | 是什么、为谁、非目标、信任边界 |
| [02-感知合同与模式分流](./02-感知合同与模式分流.md) | pagetitle、焦点层、空挡层附 generic |
| [03-功能需求](./03-功能需求.md) | 扫描、树、stacking、岛展开、配额 |
| [04-公开API与快照DTO](./04-公开API与快照DTO.md) | `createSense` / `snapshot` / `resolve` / `TSenseSnapshot` |
| [05-工程结构与分期](./05-工程结构与分期.md) | 目录、分期 P0–P3、测试；语言见 §5.1.1 |
| [06-范围外与集成示意](./06-范围外与集成示意.md) | 明确不做；与 bot / playable / BOM / SlimVID 的关系 |

相关裁决：[`../决策与复盘/源码TypeScript与产物形态.md`](../决策与复盘/源码TypeScript与产物形态.md)（源码 TS，产物 ESM + `.d.ts`）。

## 关键口径（十二条摘要）

1. **职责原子：** 只感知，不控制、不编排、不 BOM。  
2. **形态：** 独立 npm，可被任意宿主 `import`。  
3. **主通道：** 有非空 `data-e2e-pagetitle` → 自主合同（列表 + 浅树）。  
4. **退化：** 无 pagetitle → 普通快照（配额 a11y + 可选截图），不是自主菜单。  
5. **列表动手、树认路：** 同一套 id；不要第三份深 JSON DOM 当真源。  
6. **大挡层：** `cover=most` 时列表和树一起收口到该层；开关是挡住视口，不是 z-index 最大。  
7. **空挡层：** `BLOCKED_NO_PLAYABLE` 时同一次 `snapshot()` 附 generic；generic `ref` 不得进入 `playables`。  
8. **感知是拉：** 只响应 `snapshot()` / `resolve(id)`；不订阅 DOM、不向 MCP 推全量树。  
9. **岛：** 宿主注入槽位表；本库不内置业务 selector JSON，不写 Polarise CSS hash。  
10. **闸门 / 打点组件不属于本库：** `isInjectE2eAttr`、`E2ePlayable`、SlimVID env 由宿主负责。  
11. **截图：** 可选 `captureScreenshot` 或 `screenshot: null`；不当点击目标；不默认拉 html2canvas。  
12. **通道不做：** 扩展 / WebSocket / MCP / `pageId` 信封属于 in-page-playable 或宿主。

## 工程规则（质量把控）

实施时遵守 [`.cursor/rules/`](../../../.cursor/rules/)；入口见 [`AGENTS.md`](../../../AGENTS.md)。  
失败方向软原则：[`../规范和原则/快照诚实与失败方向.md`](../规范和原则/快照诚实与失败方向.md)。
