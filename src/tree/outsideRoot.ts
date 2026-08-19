/**
 * 模块名称：tree/outsideRoot
 * 模块说明：root 为页面子树时，探测 root 外、仍挡住视口的挡层。iframe 父页看不见则不强判。
 */

import { ownerDocumentOf, ownerWindowOf } from "../dom";
import { collectStacking, pickBlockingLayer } from "./collectStacking";

/**
 * 能判定「挡层在 root 外」时返回 true。
 * iframe 内看不到父文档 chrome，返回 false，由调用方只报本 root 所见。
 */
export function isBlockedOutsideRoot(root: Document | ShadowRoot | Element): boolean {
  const view = ownerWindowOf(root);
  if (!view) {
    return false;
  }

  // 跨 iframe 看不见父页遮罩，不能判定。
  try {
    if (view.top !== null && view !== view.top) {
      return false;
    }
  } catch {
    return false;
  }

  if (!(root instanceof Element)) {
    return false;
  }

  const doc = ownerDocumentOf(root);
  if (!doc || !doc.documentElement) {
    return false;
  }

  const layers = collectStacking(doc.documentElement);
  const blocking = pickBlockingLayer(layers);
  if (!blocking) {
    return false;
  }

  if (root.contains(blocking.element)) {
    return false;
  }

  if (blocking.element.contains(root)) {
    return false;
  }

  return true;
}
