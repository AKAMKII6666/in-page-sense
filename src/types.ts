/**
 * 模块名称：types
 * 模块说明：公开快照 DTO 与 createSense 选项。字段级约束与需求拟定 04 对齐。
 */

/** 判别联合：用 `mode` 区分自主菜单与退化快照。 */
export type TSenseSnapshot = ISenseAutonomousSnapshot | ISenseDegenerateSnapshot;

/** 叶子可操作事件；来自宿主 `data-e2e-event`，不是本库派发。 */
export type TPlayableEvent = "click" | "input" | "drag" | "scroll";

/** 挡层与视口相交面积分档；开关是挡住视口，不是 z-index 最大。 */
export type TCover = "most" | "partial" | "corner";

/** stacking 收入的定位类型。 */
export type TStackingPosition = "fixed" | "sticky" | "absolute" | "relative";

/**
 * 自主快照的诚实失败码。
 * `null` 表示本帧菜单按合同成立；禁止用假菜单代替这些码。
 */
export type TSenseAutonomousCode =
  | null
  | "BLOCKED_NO_PLAYABLE"
  | "BLOCKED_OUTSIDE_ROOT";

export interface ISenseQuotaOverrides {
  /** generic 扁列表最多收录的可交互节点数。 */
  maxNodes?: number;
  /** content `text` / 相关 innerText 截断上限（字符）。 */
  contentTextChars?: number;
  /** generic `a11yText` 截断上限（字符）。 */
  a11yTextChars?: number;
}

export interface IIslandSlotLocator {
  /** 槽位寻址方式：aria-label 精确匹配，或 role + 可见名。禁止 CSS hash。 */
  by: "aria-label" | "role-name";
  /** `by: "role-name"` 时的 ARIA role。 */
  role?: string;
  /** aria-label 或可见名。 */
  name: string;
  /** 排除 id 以此后缀结尾的测量节点，如 Measurer。 */
  excludeIdSuffix?: string;
}

export interface IIslandSlotGroup {
  /** 该岛下的具名槽位；找不到的槽位不进 playables。 */
  slots: {
    [slotName: string]: IIslandSlotLocator;
  };
}

export interface IIslandSlotTable {
  /** 以 island 的 `data-e2e-id` 为键；不传整表则岛不展开。 */
  [islandId: string]: IIslandSlotGroup;
}

export interface ISenseScreenshot {
  /** 截图 MIME；本库不默认引入截图实现。 */
  mime: "image/png" | "image/jpeg";
  /** 像素宽。 */
  width: number;
  /** 像素高。 */
  height: number;
  /** 原始字节的 Base64；失败时整份 screenshot 为 null，不给空串假装拍到。 */
  bytesBase64: string;
}

export interface ICreateSenseOptions {
  /** 查询与扫描根；默认 `document`。只扫此范围内的 DOM。 */
  root?: Document | ShadowRoot | Element;
  /** 岛 id → 槽位寻址表；不传则岛只出现在树上，不展开为合成 playable。 */
  islandSlots?: IIslandSlotTable;
  /** 可选截图；未传或抛错时 `screenshot` 为 null。 */
  captureScreenshot?: (scope: Element) => Promise<ISenseScreenshot>;
  /** 覆盖默认配额；未给的项用库内默认。 */
  quotas?: ISenseQuotaOverrides;
}

export interface ISense {
  /** 拉一帧感知；不订阅 DOM、不向通道推送。 */
  snapshot(): Promise<TSenseSnapshot>;
  /**
   * 把本帧菜单 id 解析成 bot 瞄准节点。与 snapshot 共用扫描/收口；同步、不派发事件。
   * 叶子取内层控件（没有则包装）；岛合成 id 取槽位元素。层外 / 空码 / 未知 id → null。
   * `mode=degenerate` 下 `g*` 可解析；healthy autonomous 下 `g*` → null。
   */
  resolve(id: string): Element | null;
}

export interface ISensePlayableItem {
  /** 与树上同一套；含岛展开合成 id（如 `list-pagination:next`）。 */
  id: string;
  /** 宿主声明的事件类型。 */
  event: TPlayableEvent;
  /** 短标题，给 Agent 菜单用。 */
  title: string;
  /** 补充说明。 */
  desc: string;
  /** 内层控件 disabled / aria-disabled / loading；不读 contents 包装本身。 */
  enabled: boolean;
}

export interface ISenseContentItem {
  /** 与树上同一套。 */
  id: string;
  /** 短标题。 */
  title: string;
  /** innerText 截断后的纯文本；禁止把 innerHTML 当对外字段。 */
  text: string;
}

export interface ISenseStackingLayer {
  /** 计算后的定位。 */
  position: TStackingPosition;
  /** 计算 z-index；`auto` 按 0 上报。默认不给 x/y。 */
  zIndex: number;
  /** 与视口相交面积分档。 */
  cover: TCover;
  /** 可选：层盒子宽。 */
  width?: number;
  /** 可选：层盒子高。 */
  height?: number;
  /** 若该层节点同时是 region 点位，带上 region id。 */
  regionId?: string;
}

export interface ISenseBlockingInfo {
  /** 收口层必须是 cover=most。 */
  cover: "most";
  /** 该层定位。 */
  position: TStackingPosition;
  /** 该层 z-index。 */
  zIndex: number;
  /** 收口后（含岛展开）的 playable 数量。 */
  playableCount: number;
}

export interface ISenseViewport {
  /** 视口 CSS 像素宽。 */
  width: number;
  /** 视口 CSS 像素高。 */
  height: number;
  /** devicePixelRatio。 */
  dpr: number;
}

export interface ISenseGenericInteractable {
  /** sense 临时 ref，禁止当作 data-e2e-id 交给 bot。 */
  ref: string;
  /** 粗粒度 role（button / link / textbox 等）。 */
  role: string;
  /** 可见名 / 可访问名。 */
  name: string;
  /** 是否不可操作。 */
  disabled?: boolean;
  /** 表单值；仅在读得到时出现。 */
  value?: string;
}

export interface ISenseGenericFallback {
  /** 判别：普通 a11y 附件，不是自主菜单。 */
  kind: "generic";
  /** 扫的是挡层子树还是整个 root。 */
  scope: "blocking-layer" | "root";
  /** 节点或文本触达配额时必须为 true。 */
  truncated: boolean;
  /** 实际收入 interactables 的条数。 */
  nodeCount: number;
  /** 本帧使用的 maxNodes。 */
  maxNodes: number;
  /** 配额内扁列表；ref 与 degenerate `playables[].id` 对齐。 */
  interactables: ISenseGenericInteractable[];
  /** 浅 a11y 字符；超长截断。 */
  a11yText: string;
  /** 未注入或拍失败时为 null，不得假装已看见图像。 */
  screenshot: ISenseScreenshot | null;
}

export interface ISenseSnapshotMeta {
  /** 取帧时刻（Date.now）。 */
  capturedAt: number;
  /** 当时视口。 */
  viewport: ISenseViewport;
}

export interface ISenseAutonomousSnapshot extends ISenseSnapshotMeta {
  /** 有非空 pagetitle 才允许此模式。 */
  mode: "autonomous";
  /** 本次现读的 pagetitle；禁止 createSense 时缓存。 */
  pageTitle: string;
  /** 全页或已收口到挡层。 */
  view: "page" | "blocking-layer";
  /** 空挡层 / 层外遮挡；日常为 null。 */
  code: TSenseAutonomousCode;
  /** 操作真源；BLOCKED_NO_PLAYABLE 时必须 []。 */
  playables: ISensePlayableItem[];
  /** 只读内容；空挡层时必须 []。 */
  contents: ISenseContentItem[];
  /** 认路用浅树，不是操作真源。 */
  asciiTree: string;
  /** 收入的 stacking 层；无 x/y。 */
  stacking: ISenseStackingLayer[];
  /** view 为 blocking-layer 时非 null；page 时必须 null。 */
  blocking: ISenseBlockingInfo | null;
  /** 仅 BLOCKED_NO_PLAYABLE 时非 null；page 时必须 null。 */
  fallback: ISenseGenericFallback | null;
}

export interface ISenseDegenerateSnapshot extends ISenseSnapshotMeta {
  /** 无/空 pagetitle：不是自主菜单。 */
  mode: "degenerate";
  /** 退化模式固定为 null。 */
  pageTitle: null;
  /** 投影后的可操作菜单；与 generic.interactables 中可 run 项对齐。 */
  playables: ISensePlayableItem[];
  /** 配额内普通快照；scope 为 root。 */
  generic: ISenseGenericFallback;
}
