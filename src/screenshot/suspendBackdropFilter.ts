/**
 * 模块名称：suspendBackdropFilter
 * 模块说明：截图前临时关掉 backdrop-filter（DOM→canvas 管线无法正确合成毛玻璃）。
 */

import { ownerDocumentOf } from "../dom";

const STYLE_ATTR = "data-e2e-sense-suspend-backdrop";

const CSS_TEXT = `
*, *::before, *::after {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
`;

/**
 * 在 root 所属 document 注入样式，禁用所有 backdrop-filter。
 * 返回 restore；必须在 finally 调用。
 */
export function suspendBackdropFilter(
  root: Document | ShadowRoot | Element,
): () => void {
  const doc = ownerDocumentOf(root);
  if (!doc?.head) {
    return () => undefined;
  }

  const existing = doc.head.querySelector(`style[${STYLE_ATTR}]`);
  if (existing) {
    // 已有挂起：不叠第二份；restore 为空操作，避免误删他人实例。
    return () => undefined;
  }

  const style = doc.createElement("style");
  style.setAttribute(STYLE_ATTR, "1");
  style.textContent = CSS_TEXT;
  doc.head.appendChild(style);

  return () => {
    style.remove();
  };
}

/** 等一帧，让禁用毛玻璃的样式进入计算样式后再拍。 */
export function waitNextFrame(root: Document | ShadowRoot | Element): Promise<void> {
  const doc = ownerDocumentOf(root);
  const view = doc?.defaultView;
  if (!view) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    view.requestAnimationFrame(() => {
      view.requestAnimationFrame(() => resolve());
    });
  });
}
