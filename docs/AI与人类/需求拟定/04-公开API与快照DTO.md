> **文档层级：** AI与人类  
> **状态：** 进行中  
> **所属：** [需求拟定](./README.md)

# 04 — 公开 API 与快照 DTO

字段级合同以此文为准。插件信封（`pageId` / `requestId` / `cmd` / `escapes`）**不是**本库回包。

## 4.1 `createSense`

```ts
function createSense(options?: ICreateSenseOptions): ISense;
```

```ts
interface ICreateSenseOptions {
  /** 查询与扫描根；默认 document */
  root?: Document | ShadowRoot | Element;
  /** 岛 id → 槽位寻址表；不传则岛不展开为合成 playable */
  islandSlots?: IIslandSlotTable;
  /** 可选：覆盖整页底图；sense 仍统一画红框/label 并写 currentView；尺寸不符 → 双 null */
  captureScreenshot?: (scope: Element) => Promise<ISenseScreenshot>;
  /** 覆盖默认配额 */
  quotas?: {
    maxNodes?: number;
    contentTextChars?: number;
    a11yTextChars?: number;
  };
}

interface ISense {
  /**
   * 拉一帧感知；不订阅、不推送。
   * `image: true`：整页诊断长图（红框+label）+ `currentView` + playables.box；日常勿开。
   */
  snapshot(options?: { image?: boolean }): Promise<TSenseSnapshot>;
  /**
   * 把本帧菜单 id 解析成 bot 瞄准节点。与 snapshot 共用扫描/收口；同步、不派发。
   * 叶子：内层控件，没有则包装。岛合成 id：槽位元素。
   * 层外 / generic `g0` / 空码 / 未知 id → null。
   */
  resolve(id: string): Element | null;
}
```

`snapshot()` 为 Promise：诊断截图可能异步。纯 DOM 扫描本身可同步完成。

`resolve(id)` 同步。必须与 `snapshot().playables` 同一套 id：收口后层外为 `null`，不得把 generic `ref` 解析成真节点。重复 id 取列表第一个（DOM playables 然后岛展开）。

## 4.2 岛槽位表（宿主注入，本库不内置业务表）

```ts
interface IIslandSlotLocator {
  /** aria-label 精确或可见名；或 role + name */
  by: "aria-label" | "role-name";
  role?: string;
  name: string;
  /** 排除 id 后缀，如 Measurer */
  excludeIdSuffix?: string;
}

interface IIslandSlotTable {
  [islandId: string]: {
    slots: {
      [slotName: string]: IIslandSlotLocator;
    };
  };
}
```

合成 id 规则：`${islandId}:${slotName}`（如 `list-pagination:next`）。

## 4.3 `TSenseSnapshot`（完整回包）

```ts
type TSenseSnapshot = ISenseAutonomousSnapshot | ISenseDegenerateSnapshot;

type TPlayableEvent = "click" | "input" | "drag" | "scroll";

type TCover = "most" | "partial" | "corner";

type TStackingPosition = "fixed" | "sticky" | "absolute" | "relative";

type TSenseAutonomousCode =
  | null
  | "BLOCKED_NO_PLAYABLE"
  | "BLOCKED_OUTSIDE_ROOT";

interface ISensePlayableItem {
  /** 与树上同一套；含岛展开合成 id */
  id: string;
  event: TPlayableEvent;
  title: string;
  desc: string;
  /** 内层控件 disabled / aria-disabled / loading */
  enabled: boolean;
  /** 仅 image:true：文档坐标 CSS px，与长图同系 */
  box?: { x: number; y: number; w: number; h: number };
}

interface ISenseCurrentView {
  scrollTop: number;
  scrollLeft: number;
  width: number;
  height: number;
}

interface ISenseScreenshot {
  mime: "image/png" | "image/jpeg";
  width: number;
  height: number;
  bytesBase64: string;
}

interface ISenseSnapshotMeta {
  capturedAt: number;
  viewport: ISenseViewport;
  /** 仅 image:true；与 currentView 同有同无 */
  screenshot?: ISenseScreenshot | null;
  /** 仅 image:true；与 screenshot 同有同无 */
  currentView?: ISenseCurrentView | null;
}

interface ISenseContentItem {
  id: string;
  title: string;
  /** innerText 截断后；禁止 innerHTML */
  text: string;
}

interface ISenseStackingLayer {
  position: TStackingPosition;
  zIndex: number;
  cover: TCover;
  width?: number;
  height?: number;
  regionId?: string;
}

interface ISenseBlockingInfo {
  cover: "most";
  position: TStackingPosition;
  zIndex: number;
  playableCount: number;
}

interface ISenseViewport {
  width: number;
  height: number;
  dpr: number;
}

interface ISenseGenericInteractable {
  /** sense 临时 ref，禁止当作 data-e2e-id 交给 bot */
  ref: string;
  role: string;
  name: string;
  disabled?: boolean;
  value?: string;
}

interface ISenseGenericFallback {
  kind: "generic";
  scope: "blocking-layer" | "root";
  truncated: boolean;
  nodeCount: number;
  maxNodes: number;
  interactables: ISenseGenericInteractable[];
  a11yText: string;
  /** 仅 image:true 成功时与顶层 screenshot 同步；否则 null */
  screenshot: ISenseScreenshot | null;
}

interface ISenseAutonomousSnapshot extends ISenseSnapshotMeta {
  mode: "autonomous";
  pageTitle: string;
  view: "page" | "blocking-layer";
  code: TSenseAutonomousCode;
  playables: ISensePlayableItem[];
  contents: ISenseContentItem[];
  asciiTree: string;
  stacking: ISenseStackingLayer[];
  blocking: ISenseBlockingInfo | null;
  fallback: ISenseGenericFallback | null;
}

interface ISenseDegenerateSnapshot extends ISenseSnapshotMeta {
  mode: "degenerate";
  pageTitle: null;
  generic: ISenseGenericFallback;
}
```

判别字段：`mode`。自主里再用 `view` + `code`。

## 4.4 字段约束

| 字段 | 约束 |
|------|------|
| `playables` / `contents` / `asciiTree` 的 id | 同一套 |
| `asciiTree` | `string`；不是操作真源 |
| `stacking` | 无 `x` / `y` |
| `fallback` | 仅自主 + `BLOCKED_NO_PLAYABLE`；此时 `playables` 必须 `[]` |
| `view: "blocking-layer"` | `blocking` 非 null |
| `view: "page"` | `blocking` 为 null；`fallback` 为 null |
| `generic.interactables[].ref` | 不能作为 bot 目标 id |
| degenerate | 没有 `playables` / `asciiTree` |

本库 **不回：** `pageId`、`requestId`、`cmd`、`escapes`。

## 4.5 示例（缩写）

日常全页：`mode: "autonomous"`，`view: "page"`，`code: null`，`fallback: null`。

焦点层有按钮：`view: "blocking-layer"`，`playables` 仅层内，`fallback: null`。

空挡层：`code: "BLOCKED_NO_PLAYABLE"`，`playables: []`，`fallback.kind === "generic"`。

无 pagetitle：`mode: "degenerate"`，`generic.scope === "root"`。
