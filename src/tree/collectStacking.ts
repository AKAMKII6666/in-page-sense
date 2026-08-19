/**
 * 模块名称：tree/collectStacking
 * 模块说明：按计算样式收入 stacking 层并分档 cover。开关是挡住视口，不是 z-index 最大。
 */

import {
  hasNumericZIndex,
  isElementInvisible,
  ownerWindowOf,
  parseNumericZIndex,
  queryAllInclusive,
} from "../dom";
import type { ICollectedStackingLayer } from "../internal-types";
import type { TCover, TStackingPosition } from "../types";

const STACKING_POSITIONS: readonly TStackingPosition[] = [
  "fixed",
  "sticky",
  "absolute",
  "relative",
];

/** 相交面积占视口 ≥ 50% 视为挡住大部分屏幕。 */
const COVER_MOST_RATIO = 0.5;

/**
 * 相交面积占视口 &lt; 10% 视为角落层（Tooltip 量级）。
 * 无 e2e 子孙的 corner 层默认省略，避免把小气泡写进 Agent 快照。
 */
const COVER_CORNER_RATIO = 0.1;

function asStackingPosition(value: string): TStackingPosition | null {
  if ((STACKING_POSITIONS as readonly string[]).includes(value)) {
    return value as TStackingPosition;
  }
  return null;
}

function viewportRect(root: Document | ShadowRoot | Element): {
  width: number;
  height: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  const view = ownerWindowOf(root);
  const width = view?.innerWidth ?? 0;
  const height = view?.innerHeight ?? 0;
  return { width, height, left: 0, top: 0, right: width, bottom: height };
}

function intersectionArea(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
): number {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  const w = right - left;
  const h = bottom - top;
  if (w <= 0 || h <= 0) {
    return 0;
  }
  return w * h;
}

function classifyCover(
  box: DOMRect,
  viewport: { width: number; height: number; left: number; top: number; right: number; bottom: number },
): TCover {
  const viewportArea = viewport.width * viewport.height;
  if (viewportArea <= 0) {
    return "corner";
  }

  const overlap = intersectionArea(
    { left: box.left, top: box.top, right: box.right, bottom: box.bottom },
    viewport,
  );
  const ratio = overlap / viewportArea;

  if (ratio >= COVER_MOST_RATIO) {
    return "most";
  }
  if (ratio < COVER_CORNER_RATIO) {
    return "corner";
  }
  return "partial";
}

function blocksPointer(style: CSSStyleDeclaration): boolean {
  return style.pointerEvents !== "none";
}

function hasE2eDescendant(element: Element): boolean {
  if (element.matches("[data-e2e-kind], [data-e2e-event], [data-e2e-id]")) {
    return true;
  }
  return element.querySelector("[data-e2e-kind], [data-e2e-event], [data-e2e-id]") !== null;
}

/**
 * 在 root 内收集 stacking。零尺寸 / 不可见 / 纯 relative+auto 不收入。
 */
export function collectStacking(
  root: Document | ShadowRoot | Element,
): ICollectedStackingLayer[] {
  const viewport = viewportRect(root);
  const view = ownerWindowOf(root);
  const layers: ICollectedStackingLayer[] = [];

  const candidates = queryAllInclusive(root, "*");

  for (const element of candidates) {
    if (!view) {
      continue;
    }

    const style = view.getComputedStyle(element);
    const position = asStackingPosition(style.position);
    if (!position) {
      continue;
    }

    // 纯 relative 且 z-index 非数字：不是 stacking 合同层。
    if (position === "relative" && !hasNumericZIndex(style)) {
      continue;
    }

    if (isElementInvisible(element, style)) {
      continue;
    }

    const box = element.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) {
      continue;
    }

    const cover = classifyCover(box, viewport);

    // 无 e2e 子孙的 corner 小层（Tooltip 等）默认省略。
    if (cover === "corner" && !hasE2eDescendant(element)) {
      continue;
    }

    const regionId =
      element.getAttribute("data-e2e-kind") === "region"
        ? element.getAttribute("data-e2e-id")?.trim() || undefined
        : undefined;

    layers.push({
      element,
      position,
      zIndex: parseNumericZIndex(style),
      cover,
      width: Math.round(box.width),
      height: Math.round(box.height),
      regionId,
      blocksPointer: blocksPointer(style),
    });
  }

  return layers;
}

function canCloseToLayer(layer: ICollectedStackingLayer): boolean {
  // relative 只建 stacking context，并不盖住子孙点击；整页 App 壳常是 relative+z-index，
  // 若拿来收口会把日常全页误报成 blocking-layer。挡层收口只认会盖住层外内容的定位。
  if (layer.position === "relative") {
    return false;
  }
  return layer.cover === "most" && layer.blocksPointer;
}

/**
 * 多个 cover=most 时取最靠上且会拦住指针的那块。
 * 「靠上」按 z-index，同分按 DOM 后出现（更接近顶层绘制）。
 */
export function pickBlockingLayer(
  layers: ICollectedStackingLayer[],
): ICollectedStackingLayer | null {
  const most = layers.filter(canCloseToLayer);

  if (most.length === 0) {
    return null;
  }

  let picked = most[0]!;
  for (let index = 1; index < most.length; index += 1) {
    const candidate = most[index]!;
    if (candidate.zIndex > picked.zIndex) {
      picked = candidate;
      continue;
    }
    if (candidate.zIndex === picked.zIndex) {
      const position = picked.element.compareDocumentPosition(candidate.element);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        picked = candidate;
      }
    }
  }

  return picked;
}
