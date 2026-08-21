/**
 * 模块名称：readCurrentView
 * 模块说明：现读本 frame 可视区（CSS px）；与长图红框同一组数。
 */

import { ownerWindowOf } from "../dom";
import type { ISenseCurrentView } from "../types";

/** 读 scroll + inner 尺寸；无 window 时返回 null。 */
export function readCurrentView(
  root: Document | ShadowRoot | Element,
): ISenseCurrentView | null {
  const view = ownerWindowOf(root);
  if (!view) {
    return null;
  }

  return {
    scrollTop: view.scrollY || view.pageYOffset || 0,
    scrollLeft: view.scrollX || view.pageXOffset || 0,
    width: view.innerWidth,
    height: view.innerHeight,
  };
}

/** Label 固定格式，便于人眼 / OCR。 */
export function formatCurrentViewLabel(view: ISenseCurrentView): string {
  return `scrollTop:${view.scrollTop}px;scrollLeft:${view.scrollLeft}px;width:${view.width}px;height:${view.height}px`;
}

/**
 * 文档 CSS 尺寸（整页底图期望宽高）。
 * 用 documentElement 的 scrollWidth/Height。
 */
export function readDocumentCssSize(
  root: Document | ShadowRoot | Element,
): { width: number; height: number } | null {
  const view = ownerWindowOf(root);
  if (!view || !view.document?.documentElement) {
    return null;
  }
  const el = view.document.documentElement;
  return {
    width: el.scrollWidth,
    height: el.scrollHeight,
  };
}
