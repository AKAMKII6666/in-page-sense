# in-page-sense

**中文：** 页内感知组件。在已打开的页面（或 iframe）里扫描 `data-e2e-*` 点位，产出给 Agent 的**短菜单 + 浅字符树**。

**English:** In-page sensing library. Scan `data-e2e-*` markers inside an already-open page (or iframe) and return a **short action menu + shallow ASCII tree** for an Agent.

```ts
import { createSense } from "in-page-sense";

const sense = createSense({ root: document });
const snap = await sense.snapshot();
const el = sense.resolve("save");
```

公开入口是 `createSense` → `snapshot()` / `resolve(id)` → `TSenseSnapshot`。

The public entry is `createSense` → `snapshot()` / `resolve(id)` → `TSenseSnapshot`.

---

## 目录 / Contents

1. [组件介绍 / Introduction](#1-组件介绍--introduction)
2. [安装 / Install](#2-安装--install)
3. [怎么用 / Quick start](#3-怎么用--quick-start)
4. [用法合集 / Recipes](#4-用法合集--recipes)
5. [参数表 / Options](#5-参数表--options)
6. [回包合同 / Snapshot contract](#6-回包合同--snapshot-contract)
7. [宿主打点 / Host markup](#7-宿主打点--host-markup)
8. [本地开发 / Local development](#8-本地开发--local-development)

---

## 1. 组件介绍 / Introduction

### 它做什么 / What it does

在调用方指定的 `root` 内**拉一帧**页面结构，供 Agent 或编排层阅读：

Inside the caller-supplied `root`, it **pulls one frame** for an Agent or orchestrator:

| 第一个 `data-e2e-pagetitle` 非空 | 无该节点，或第一个值为空 |
|----------------------------------|--------------------------|
| `mode: "autonomous"`：`playables` + `contents` + `asciiTree` | `mode: "degenerate"`：投影 `playables[]` + generic a11y + 可选截图 |

| First `data-e2e-pagetitle` is non-empty | Missing node, or first value is empty |
|----------------------------------------|----------------------------------------|
| `mode: "autonomous"`: `playables` + `contents` + `asciiTree` | `mode: "degenerate"`: budgeted a11y + optional screenshot |

### 怎么读回包 / How to read a snapshot

| 口径 / Rule | 说明 / Meaning |
|-------------|----------------|
| 列表是菜单 | 可操作目标在 `playables[]`；只读文本在 `contents[]` |
| 树用来认路 | `asciiTree` 是浅结构，id 与上列数组同一套（含岛展开合成 id） |
| 按次拉取 | 每次调用 `snapshot()` 读当前 DOM；`pageTitle` 也是本帧现读 |
| 点这个 id | `resolve(id)` 给出瞄准 Element；与菜单同一套收口，找不到则为 `null` |
| 截图可选 | 由 `captureScreenshot` 注入；未传或失败时字段为 `null` |

| Rule | Meaning |
|------|---------|
| The list is the menu | Action targets live in `playables[]`; read-only text in `contents[]` |
| The tree orients | `asciiTree` is a shallow structure; ids match those arrays (including island synthetic ids) |
| Pull per call | Each `snapshot()` reads the current DOM; `pageTitle` is also read this frame |
| Aim this id | `resolve(id)` returns the aim Element; same close-to-layer rules as the menu; `null` if not playable |
| Screenshot is optional | Injected via `captureScreenshot`; the field is `null` when omitted or when capture fails |

### 调用方 / Callers

| 角色 / Role | 用法 / Usage |
|-------------|--------------|
| 宿主应用 | 在 DOM 上打点后 `createSense({ root }).snapshot()` |
| 编排层 | 按 `mode` / `view` / `code` 把快照交给后续流程；用 `resolve(id)` 得到 Element 再交给 bot |

Host apps tag the DOM and call `snapshot()`. Orchestrators branch on `mode` / `view` / `code` and call `resolve(id)` before handing an Element to bot.

### 运行时形态 / Runtime shape

- **源码：** TypeScript `strict`
- **产物：** ESM `dist/index.js` + `dist/index.d.ts`
- **运行时依赖：** 零
- **公开入口：** `createSense` 与类型

Source is TypeScript (`strict`). Publish artifact is ESM + `.d.ts`. Zero runtime dependencies. Public surface is `createSense` plus types.

---

## 2. 安装 / Install

需要 **Node.js ≥ 18**。包是 ESM（`"type": "module"`），用 `import` 引用。

Requires **Node.js ≥ 18**. The package is ESM (`"type": "module"`); import it with `import`.

### 作为依赖安装 / As a dependency

包发布后：

After the package is published:

```bash
npm install in-page-sense
```

用本地路径或 workspace 时，先构建再安装：

From a local path or workspace, build first, then install:

```bash
cd /path/to/in-page-sense
npm install
npm run build

# 在宿主项目中 / in the host project
npm install /path/to/in-page-sense
```

npm workspaces 示例：

```json
{
  "workspaces": ["packages/in-page-sense", "apps/host"]
}
```

```ts
import { createSense } from "in-page-sense";
```

TypeScript 宿主直接使用包内 `.d.ts`。

TypeScript hosts pick up types from the package `.d.ts`.

### 运行环境 / Runtime

在浏览器或 jsdom 中调用：会读 `document`、计算样式和盒子。打包器消费 ESM 即可（Vite / webpack / esbuild）。截图通过选项 `captureScreenshot` 由宿主提供。

Call it in a browser or jsdom: it reads `document`, computed styles, and boxes. Bundlers consume ESM (Vite / webpack / esbuild). Screenshots are supplied by the host via `captureScreenshot`.

---

## 3. 怎么用 / Quick start

路径：宿主打点 → `createSense` → `snapshot()`。

Path: host tags the DOM → `createSense` → `snapshot()`.

### 3.1 页面上打点 / Tag the page

```html
<div hidden data-e2e-pagetitle="ready-list"></div>

<section data-e2e-kind="region" data-e2e-id="main">
  <button
    data-e2e-kind="playable"
    data-e2e-id="save"
    data-e2e-event="click"
    data-e2e-title="Save"
    data-e2e-desc="Save the current list"
  >
    Save
  </button>
  <span data-e2e-kind="content" data-e2e-id="status" data-e2e-title="Status">
    Idle
  </span>
</section>
```

第一个 pagetitle 非空时走 **autonomous**；缺失或第一个值为空时走 **degenerate**。

**autonomous** when the first pagetitle is non-empty; **degenerate** when it is missing or the first value is empty.

### 3.2 调用 / Call

```ts
import { createSense } from "in-page-sense";
import type { TSenseSnapshot } from "in-page-sense";

const sense = createSense({
  root: document, // 默认 document；iframe 里传 iframe 的 document
});

const snap: TSenseSnapshot = await sense.snapshot();

if (snap.mode === "autonomous") {
  for (const item of snap.playables) {
    console.log(item.id, item.event, item.enabled, item.title);
    const el = sense.resolve(item.id);
  }
  console.log(snap.asciiTree);
} else {
  console.log(snap.generic.a11yText);
}
```

`snapshot()` 返回 Promise：DOM 扫描是同步的，可选截图回调可能异步。

`snapshot()` returns a Promise: DOM scanning is sync; an optional screenshot callback may be async.

### 3.3 一次调用的流程 / What one call does

```text
snapshot()
  → 读取第一个 data-e2e-pagetitle
  → 空 / 缺失 → degenerate（generic @ root）
  → 有值 → 扫点位 + stacking
  → 若 fixed/sticky/absolute 且 cover=most 并拦住指针
       → 列表和树收到该层
       → 层内 0 playable → BLOCKED_NO_PLAYABLE + fallback
  → TSenseSnapshot

resolve(id)
  → 同一套扫描 / 收口
  → 命中菜单 id → 内层控件（没有则包装）
  → 否则 null（含 g0 / 层外 / 空挡层 / degenerate）
```

---

## 4. 用法合集 / Recipes

### 4.1 扫当前文档 / Scan the current document

```ts
const sense = createSense();
const snap = await sense.snapshot();
```

`root` 默认 `document`。适合页面脚本、content script、已注入的同源 iframe 文档。

`root` defaults to `document`. Use this from a page script, content script, or a same-origin iframe document.

**效果 / Effect:** 有 pagetitle 则出菜单；否则 `mode: "degenerate"`。

### 4.2 只扫应用子树 / Scan an app subtree

```ts
const app = document.getElementById("app");
if (!app) {
  throw new Error("missing #app");
}
const sense = createSense({ root: app });
```

点位收集范围是 `app` 子树。若同文档里、`root` 之外还有 `fixed` 全屏挡层，回包可为 `code: "BLOCKED_OUTSIDE_ROOT"`，`playables` 为空数组。

Markers are collected inside `app`. If a `fixed` full-viewport overlay sits outside `root` in the same document, the snapshot may use `code: "BLOCKED_OUTSIDE_ROOT"` with an empty `playables` array.

### 4.3 扫 iframe / Scan an iframe

```ts
const iframe = document.querySelector("iframe#app");
const childDoc = iframe?.contentDocument;
if (!childDoc) {
  throw new Error("iframe not ready or cross-origin");
}
const sense = createSense({ root: childDoc });
const snap = await sense.snapshot();
```

同源且已加载完成后才能读到 `contentDocument`。

`contentDocument` is available after the iframe has loaded on the same origin.

### 4.4 扫 ShadowRoot / Scan a ShadowRoot

```ts
const host = document.querySelector("my-widget");
const shadow = host?.shadowRoot;
if (!shadow) {
  throw new Error("no open shadow root");
}
const sense = createSense({ root: shadow });
```

要把某个 shadow 树纳入扫描，把该 `ShadowRoot` 当作 `root` 传入。

To scan a shadow tree, pass that `ShadowRoot` as `root`.

### 4.5 路由切换后再拉一帧 / Pull again after in-page navigation

```ts
const sense = createSense({ root: document });

await sense.snapshot(); // pageTitle: "ready-list"

document.querySelector("[data-e2e-pagetitle]")
  ?.setAttribute("data-e2e-pagetitle", "edit-form");

const again = await sense.snapshot(); // pageTitle: "edit-form"
```

同一 `ISense` 实例可反复 `snapshot()`。页身份以这一帧 DOM 为准。

The same `ISense` instance can be snapshotted repeatedly. Page identity follows the DOM of that frame.

### 4.6 判别联合 / Narrowing the union

```ts
function handle(snap: TSenseSnapshot): void {
  if (snap.mode === "degenerate") {
    useGeneric(snap.generic);
    return;
  }

  if (snap.view === "blocking-layer") {
    console.log("layer playables", snap.playables.length, snap.blocking?.playableCount);
  }

  if (snap.code === "BLOCKED_NO_PLAYABLE") {
    console.log(snap.fallback?.a11yText);
    return;
  }

  useMenu(snap.playables);
}
```

### 4.7 全屏 Modal：焦点层收口 / Full-screen modal → blocking layer

当存在 `position: fixed`（或 `sticky` / `absolute`）、盖住视口 ≥ 50%、并且会拦住指针的层时：

When a `fixed` / `sticky` / `absolute` layer covers ≥ 50% of the viewport and intercepts pointer events:

| 字段 / Field | 值 / Value |
|--------------|------------|
| `view` | `"blocking-layer"` |
| `playables` | 该层子树内的 id |
| `asciiTree` | 该层子树 |
| `blocking` | 含 `playableCount`（含岛展开） |
| `code` | 层内有 playable 时为 `null` |

`cover=partial` 的抽屉保持 `view: "page"` 与全页列表；该 stacking 节点可在树里置顶。

A `cover=partial` drawer keeps `view: "page"` and the full-page list; that stacking node may be lifted in the tree.

收口条件是 `fixed` / `sticky` / `absolute`。`relative` 且带数字 `z-index` 的层仍会出现在 `stacking[]`。

Closing uses `fixed` / `sticky` / `absolute`. A `relative` layer with a numeric `z-index` still appears in `stacking[]`.

### 4.8 空挡层 / Empty blocking layer

全屏遮罩存在，层内 0 个 playable、0 个可展开岛槽位时：

When the overlay exists but the layer has zero playables and zero expandable island slots:

```ts
snap.mode === "autonomous";
snap.view === "blocking-layer";
snap.code === "BLOCKED_NO_PLAYABLE";
snap.playables; // []
snap.contents;  // []
snap.fallback;  // { kind: "generic", scope: "blocking-layer", ... }
```

`fallback.interactables[].ref` 是本帧临时编号（如 `g0`），与 `data-e2e-id` 不是同一套。

`fallback.interactables[].ref` is a per-frame temporary id (e.g. `g0`), separate from `data-e2e-id`.

### 4.9 岛展开 / Island expansion

复合体打成 `kind="island"`，由宿主传入槽位表：

Tag a composite widget as `kind="island"` and pass a slot table from the host:

```ts
const sense = createSense({
  root: document,
  islandSlots: {
    "list-pagination": {
      slots: {
        next: { by: "aria-label", name: "Next" },
        prev: { by: "role-name", role: "button", name: "Previous" },
      },
    },
  },
});
```

```html
<div data-e2e-kind="island" data-e2e-id="list-pagination">
  <button aria-label="Next">Next</button>
  <button role="button">Previous</button>
</div>
```

**效果 / Effect:**

- `playables` 含合成 id：`list-pagination:next`、`list-pagination:prev`
- 树里同时有 `[island#list-pagination]` 与 `[playable#list-pagination:next]`
- 未匹配到的槽位不会出现在列表里
- `id` 以 `Measurer` 结尾的节点默认跳过（也可用 `excludeIdSuffix`）
- 省略 `islandSlots` 时，岛只出现在树上

Synthetic ids join `playables` and the tree. Unmatched slots are omitted. Nodes whose `id` ends with `Measurer` are skipped by default (`excludeIdSuffix` is available too). With no `islandSlots`, the island stays on the tree only.

槽位按 `aria-label` 或 `role` + 可访问名寻址。

Slots are located by `aria-label` or `role` + accessible name.

### 4.10 可选截图 / Optional screenshot

通过 `captureScreenshot` 注入；未传或回调抛错时，回包里 `screenshot` 为 `null`，a11y 字段照常给出。

Inject `captureScreenshot`. If it is omitted or throws, `screenshot` is `null` and a11y fields are still filled.

```ts
const sense = createSense({
  root: document,
  captureScreenshot: async (scope) => {
    return {
      mime: "image/png",
      width: 800,
      height: 600,
      bytesBase64: "...",
    };
  },
});
```

`scope` 在 degenerate 时是 root 对应元素；空挡层时是挡层元素。

`scope` is the root element in degenerate mode, or the overlay element for an empty blocking layer.

### 4.11 覆盖配额 / Override quotas

```ts
const sense = createSense({
  quotas: {
    maxNodes: 40,           // generic 扁列表条数，默认 80
    contentTextChars: 120,  // content.text，默认 200
    a11yTextChars: 2000,    // generic.a11yText，默认 4000
  },
});
```

触达上限时 generic 的 `truncated` 为 `true`。

When a cap is hit, generic sets `truncated: true`.

### 4.12 把菜单 id 交给 bot / Resolve an id for bot

```ts
const snap = await sense.snapshot();
if (snap.mode !== "autonomous" || snap.code !== null) {
  return;
}

const target = sense.resolve("save");
if (!target) {
  return;
}
// 交给 in-page-bot.run({ target })；本库不 click。
```

`resolve` 与菜单同一套：挡层底下的 id、healthy autonomous 下 generic `ref` 为 `null`；**`mode=degenerate` 时 `g*` 可 resolve**（与投影 `playables[]` 对齐）。

### 4.13 按回包分支 / Branch on the snapshot

```ts
async function onSnapshot(snap: TSenseSnapshot): Promise<void> {
  if (snap.mode === "degenerate") {
    usePlayables(snap.playables);
    showGeneric(snap.generic);
    return;
  }

  switch (snap.code) {
    case "BLOCKED_NO_PLAYABLE":
      showFallback(snap.fallback);
      return;
    case "BLOCKED_OUTSIDE_ROOT":
      handleOutsideRoot(snap);
      return;
    case null:
      usePlayables(snap.playables);
      return;
  }
}
```

---

## 5. 参数表 / Options

### `createSense(options?: ICreateSenseOptions): ISense`

| 参数 / Param | 类型 / Type | 默认 / Default | 说明 / Description |
|--------------|-------------|----------------|--------------------|
| `root` | `Document \| ShadowRoot \| Element` | `document` | 扫描与查询根 |
| `islandSlots` | `IIslandSlotTable` | 省略 | 岛 id → 槽位表；省略时岛只出现在树上 |
| `captureScreenshot` | `(scope: Element) => Promise<ISenseScreenshot>` | 省略 | 截图回调；省略或抛错时 `screenshot` 为 `null` |
| `quotas` | `ISenseQuotaOverrides` | 见下表 | 截断配额 |

### `quotas`

| 字段 / Field | 默认 / Default | 作用 / Effect |
|--------------|----------------|---------------|
| `maxNodes` | `80` | generic `interactables` 最多条数 |
| `contentTextChars` | `200` | content `text`（innerText）字符上限 |
| `a11yTextChars` | `4000` | generic `a11yText` 字符上限 |

### `ISense.snapshot()`

| | |
|--|--|
| 返回 / Returns | `Promise<TSenseSnapshot>` |
| 行为 / Behavior | 读取当前 `root` 的一帧 DOM |

### `ISense.resolve(id)`

| | |
|--|--|
| 参数 / Param | 菜单 `id`（叶子 `data-e2e-id` 或岛合成 id） |
| 返回 / Returns | 瞄准 `Element`，或 `null` |
| 行为 / Behavior | 与 `snapshot().playables` 同一套扫描/收口；同步；不派发事件。叶子取内层 `button/a/input/[role=button]`；没有则返回包装。healthy autonomous 下 generic `g*`、层外、空挡层为 `null`；**degenerate 下 `g*` 可解析**。 |

### `islandSlots` 槽位 / Slot locator

| 字段 / Field | 类型 / Type | 说明 / Description |
|--------------|-------------|--------------------|
| `by` | `"aria-label"` \| `"role-name"` | 寻址方式 |
| `role` | `string?` | `by: "role-name"` 时的 ARIA / 隐式 role |
| `name` | `string` | aria-label 或可访问名 |
| `excludeIdSuffix` | `string?` | 跳过 id 以此后缀结尾的节点 |

合成 id：`` `${islandId}:${slotName}` ``，例如 `list-pagination:next`。

Synthetic id: `` `${islandId}:${slotName}` ``, e.g. `list-pagination:next`.

---

## 6. 回包合同 / Snapshot contract

判别字段是 `mode`。自主快照再用 `view` + `code`。

Discriminant is `mode`. Autonomous snapshots then use `view` + `code`.

### 6.1 模式对照 / Modes

| | `autonomous` | `degenerate` |
|--|--------------|--------------|
| 条件 / When | 第一个 `data-e2e-pagetitle` 非空 | 没有节点，或第一个值为空 |
| `pageTitle` | `string` | `null` |
| 主体 / Body | `playables` + `contents` + `asciiTree` | 顶层 `generic`（`scope: "root"`） |
| 附件 / Extra | 空挡层时有 `fallback` | — |

有 pagetitle、点位为零时仍是 `autonomous`，菜单为空数组。

A pagetitle with zero markers is still `autonomous`, with empty menu arrays.

### 6.2 `ISenseAutonomousSnapshot` 字段 / Fields

| 字段 / Field | 类型 / Type | 说明 / Description |
|--------------|-------------|--------------------|
| `mode` | `"autonomous"` | 判别 |
| `pageTitle` | `string` | 本帧现读 |
| `capturedAt` | `number` | `Date.now()` |
| `viewport` | `{ width, height, dpr }` | 当时视口 |
| `view` | `"page"` \| `"blocking-layer"` | 全页或已收到挡层 |
| `code` | `null` \| `"BLOCKED_NO_PLAYABLE"` \| `"BLOCKED_OUTSIDE_ROOT"` | 日常为 `null` |
| `playables` | `ISensePlayableItem[]` | 可操作菜单；空挡层时为 `[]` |
| `contents` | `ISenseContentItem[]` | 只读文本；空挡层时为 `[]` |
| `asciiTree` | `string` | 浅树 |
| `stacking` | `ISenseStackingLayer[]` | 层列表；可有 `width` / `height` |
| `blocking` | `ISenseBlockingInfo \| null` | `view === "blocking-layer"` 时有值 |
| `fallback` | `ISenseGenericFallback \| null` | `code === "BLOCKED_NO_PLAYABLE"` 时有值 |

### 6.3 playable 条目 / Playable item

| 字段 / Field | 说明 / Description |
|--------------|--------------------|
| `id` | 与树上同一套；岛展开为 `islandId:slot` |
| `event` | 宿主 `data-e2e-event`：`click` \| `input` \| `drag` \| `scroll` |
| `title` / `desc` | 菜单文案 |
| `enabled` | 内层 `button, a, input, [role=button]` 的 disabled / aria-disabled / loading |

`id` / `event` / `title` / `desc` 齐全的节点才会进入 `playables`。

A node joins `playables` when `id` / `event` / `title` / `desc` are all present.

### 6.4 content 条目 / Content item

| 字段 / Field | 说明 / Description |
|--------------|--------------------|
| `id` | 与树上同一套 |
| `title` | `data-e2e-title` |
| `text` | `innerText` 按配额截断后的纯文本 |

### 6.5 stacking 与 cover / Stacking and cover

进入 `stacking[]` 的层：

Layers that enter `stacking[]`:

- `fixed` / `sticky` / `absolute`，或 `relative` 且计算 `z-index` 为数字
- 可见、尺寸大于 0
- `cover=corner` 时，层上带有 e2e 点位（自身或子孙）

**`cover` 分档 / Bins**（相交面积 / 视口面积）：

| 值 / Value | 规则 / Rule |
|------------|-------------|
| `most` | ≥ 50% |
| `partial` | ≥ 10% 且 &lt; 50% |
| `corner` | &lt; 10% |

**收口 / Close to blocking layer:** `position` 为 `fixed` / `sticky` / `absolute`，`cover=most`，且计算 `pointer-events` 可拦截指针。多块时取 z-index 更高者；相同则取 DOM 中更靠后的一块。

Closing uses `fixed` / `sticky` / `absolute`, `cover=most`, and computed `pointer-events` that can intercept the pointer. If several match, pick higher `z-index`, then the later node in DOM order.

### 6.6 `code`

| `code` | 场景 / When | `playables` |
|--------|-------------|-------------|
| `null` | 全页，或挡层内有 playable | 对应范围的菜单 |
| `BLOCKED_NO_PLAYABLE` | 挡层内 0 playable | `[]`，并带 `fallback` |
| `BLOCKED_OUTSIDE_ROOT` | 挡层在 `root` 外且可判定 | `[]` |

### 6.7 浅树 / ASCII tree

匿名包装节点会塌掉。`tr` / `[role=row]` 收成 `[row]`。点位若自身带 `absolute`/`fixed`，树上仍输出 `[playable#id]`，几何信息在 `stacking[]`。

Anonymous wrappers collapse. `tr` / `[role=row]` become `[row]`. If a marker is itself `absolute`/`fixed`, the tree still prints `[playable#id]`; geometry stays in `stacking[]`.

```text
[region#main]
  [row]
    [playable#row-edit]
    [content#status]
  [playable#save]
[island#list-pagination]
  [playable#list-pagination:next]
```

### 6.8 示例回包 / Example payloads

日常全页：

Everyday full page:

```json
{
  "mode": "autonomous",
  "pageTitle": "ready-list",
  "view": "page",
  "code": null,
  "playables": [
    { "id": "save", "event": "click", "title": "Save", "desc": "Save the current list", "enabled": true }
  ],
  "contents": [
    { "id": "status", "title": "Status", "text": "Idle" }
  ],
  "asciiTree": "[region#main]\n  [playable#save]\n  [content#status]",
  "stacking": [],
  "blocking": null,
  "fallback": null
}
```

焦点层有按钮：

Blocking layer with buttons:

```json
{
  "mode": "autonomous",
  "view": "blocking-layer",
  "code": null,
  "playables": [{ "id": "dialog-ok", "event": "click", "title": "OK", "desc": "Confirm dialog", "enabled": true }],
  "blocking": { "cover": "most", "position": "fixed", "zIndex": 20, "playableCount": 1 },
  "fallback": null
}
```

无 pagetitle：

No pagetitle:

```json
{
  "mode": "degenerate",
  "pageTitle": null,
  "playables": [
    { "id": "g0", "event": "click", "title": "普通按钮", "desc": "generic/degenerate", "enabled": true }
  ],
  "generic": {
    "kind": "generic",
    "scope": "root",
    "truncated": false,
    "nodeCount": 1,
    "maxNodes": 80,
    "interactables": [{ "ref": "g0", "role": "button", "name": "普通按钮" }],
    "a11yText": "button \"普通按钮\"",
    "screenshot": null
  }
}
```

### 6.9 `ISenseGenericFallback`

| 字段 / Field | 说明 / Description |
|--------------|--------------------|
| `kind` | `"generic"` |
| `scope` | `"root"` 或 `"blocking-layer"` |
| `truncated` | 条数或文本触达配额时为 `true` |
| `nodeCount` / `maxNodes` | 实际条数 / 本帧上限 |
| `interactables` | 临时 `ref`（`g0`…） |
| `a11yText` | 浅字符列表 |
| `screenshot` | 截图对象，或 `null` |

---

## 7. 宿主打点 / Host markup

扫描这些 HTML 属性。

These HTML attributes are scanned.

### 页身份 / Page identity

```html
<div hidden data-e2e-pagetitle="dashboard-ready-list"></div>
```

一个 `root` 使用文档序**第一个**该节点。值为空时走 degenerate。

Each `root` uses the **first** such node in document order. An empty value selects degenerate.

### `data-e2e-kind`

| kind | 出现位置 / Where it appears | 作用 / Role |
|------|-----------------------------|-------------|
| `playable` | `playables` + 树 | 叶子可操作 |
| `island` | 树；展开后 slot 进 `playables` | 复合体 |
| `content` | `contents` + 树 | 只读文本 |
| `region` | 树 | 业务块 |

未写 `kind`、但带 `data-e2e-event` 时按 `playable` 处理。

A node with `data-e2e-event` and no `kind` is treated as `playable`.

### playable 属性 / Playable attributes

| 属性 / Attr | 对应字段 / Field |
|-------------|------------------|
| `data-e2e-id` | `id` |
| `data-e2e-event` | `event`（`click` \| `input` \| `drag` \| `scroll`） |
| `data-e2e-title` | `title` |
| `data-e2e-desc` | `desc` |

包装节点常用 `display: contents`。

Wrappers often use `display: contents`.

### 树的其它节点 / Other tree nodes

- `tr` / `[role=row]` → `[row]`（箍同行）
- 树按 DOM 顺序与 stacking / portal 位置编排

`tr` / `[role=row]` become `[row]` (row grouping). The tree follows DOM order plus stacking / portal placement.

---

## 8. 本地开发 / Local development

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run playground
```

| 脚本 / Script | 作用 / Purpose |
|---------------|----------------|
| `typecheck` | `tsc --noEmit`（`strict`） |
| `lint` | ESLint：`src` / `tests` / `playground` |
| `test` | Vitest + jsdom（用例在仓库根 `tests/`） |
| `build` | tsup → `dist/index.js` + `.d.ts` |
| `playground` | Vite，默认 [http://localhost:5173/](http://localhost:5173/) |

playground 含有 pagetitle（假 Modal）、无 pagetitle、空挡层三页。单测里对盒子做了 stub；浏览器里才有真实布局。

Playground pages: tagged autonomous (fake modal), untagged degenerate, empty overlay. Unit tests stub boxes; the browser has real layout.

更细的需求与原则：

Further spec and principles:

| 文档 / Doc | 用途 / Use |
|------------|------------|
| [`docs/AI与人类/需求拟定/`](./docs/AI与人类/需求拟定/README.md) | 产品边界、模式分流、DTO、分期 |
| [`docs/AI与人类/规范和原则/快照诚实与失败方向.md`](./docs/AI与人类/规范和原则/快照诚实与失败方向.md) | 快照字段与失败方向 |
| [`AGENTS.md`](./AGENTS.md) | Agent 实施入口 |
| [`.cursor/rules/`](./.cursor/rules/) | 工程规则 |
