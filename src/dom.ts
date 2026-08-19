/**
 * 模块名称：dom
 * 模块说明：root 作用域查询、视口与可见性等 DOM 辅助；不改变页面。
 */

import type { ISenseViewport } from "./types";

/**
 * 在 Document / ShadowRoot / Element 上做含自身的 querySelectorAll。
 * Element 根若匹配 selector，必须把自己算进去，否则包装根会被漏扫。
 */
export function queryAllInclusive(
  root: Document | ShadowRoot | Element,
  selector: string,
): Element[] {
  const matched: Element[] = [];

  if (root instanceof Element && root.matches(selector)) {
    matched.push(root);
  }

  const descendants = root.querySelectorAll(selector);
  for (const node of descendants) {
    matched.push(node);
  }

  return matched;
}

/**
 * 取用于 getBoundingClientRect / 截图的 Element。
 * Document 落到 documentElement；ShadowRoot 落到 host（截图作用域）或第一个子元素。
 */
export function toScopeElement(root: Document | ShadowRoot | Element): Element {
  if (root instanceof Document) {
    return root.documentElement;
  }

  if (root instanceof ShadowRoot) {
    const firstChild = root.firstElementChild;
    if (firstChild) {
      return firstChild;
    }
    return root.host;
  }

  return root;
}

/**
 * 编树起点：Document 从 body（无 body 则 documentElement）走，避免把 head 编进浅树。
 */
export function toTreeWalkRoot(root: Document | ShadowRoot | Element): ParentNode {
  if (root instanceof Document) {
    if (root.body) {
      return root.body;
    }
    return root.documentElement;
  }

  return root;
}

export function ownerDocumentOf(root: Document | ShadowRoot | Element): Document | null {
  if (root instanceof Document) {
    return root;
  }

  if (root instanceof ShadowRoot) {
    return root.ownerDocument;
  }

  return root.ownerDocument;
}

export function ownerWindowOf(root: Document | ShadowRoot | Element): Window | null {
  const doc = ownerDocumentOf(root);
  if (!doc) {
    return null;
  }
  return doc.defaultView;
}

/**
 * 现读视口。无 window 时宽高为 0，避免编造尺寸。
 */
export function readViewport(root: Document | ShadowRoot | Element): ISenseViewport {
  const view = ownerWindowOf(root);
  if (!view) {
    return { width: 0, height: 0, dpr: 1 };
  }

  return {
    width: view.innerWidth,
    height: view.innerHeight,
    dpr: view.devicePixelRatio || 1,
  };
}

export function isHtmlElement(node: Element): node is HTMLElement {
  return node instanceof HTMLElement;
}

/**
 * stacking 收入用的可见性：display:none、visibility:hidden、opacity:0 视为不可见。
 */
export function isElementInvisible(element: Element, style: CSSStyleDeclaration): boolean {
  if (style.display === "none") {
    return true;
  }
  if (style.visibility === "hidden") {
    return true;
  }
  if (style.opacity === "0") {
    return true;
  }
  if (!isHtmlElement(element)) {
    return false;
  }
  return false;
}

export function parseNumericZIndex(style: CSSStyleDeclaration): number {
  const raw = style.zIndex;
  if (raw === "auto" || raw === "") {
    return 0;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return parsed;
}

export function hasNumericZIndex(style: CSSStyleDeclaration): boolean {
  const raw = style.zIndex;
  if (raw === "auto" || raw === "") {
    return false;
  }
  return !Number.isNaN(Number.parseInt(raw, 10));
}

export function readInnerText(element: Element): string {
  if (isHtmlElement(element)) {
    const inner = element.innerText;
    // jsdom 对部分节点不实现 innerText，回退 textContent，仍然不读 innerHTML。
    if (typeof inner === "string") {
      return inner;
    }
  }
  return element.textContent ?? "";
}

/**
 * 截断纯文本。不在这里读 innerHTML。
 */
export function truncateText(text: string, maxChars: number): { text: string; truncated: boolean } {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) {
    return { text: normalized, truncated: false };
  }
  return { text: normalized.slice(0, maxChars), truncated: true };
}

export function getAccessibleName(element: Element): string {
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const doc = element.ownerDocument;
    const parts: string[] = [];
    for (const id of labelledBy.split(/\s+/)) {
      const labelEl = doc.getElementById(id);
      if (labelEl) {
        parts.push(readInnerText(labelEl));
      }
    }
    const joined = parts.join(" ").replace(/\s+/g, " ").trim();
    if (joined) {
      return joined;
    }
  }

  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel && ariaLabel.trim()) {
    return ariaLabel.trim();
  }

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    if (element.placeholder) {
      const ownText = readInnerText(element).trim();
      if (ownText) {
        return ownText;
      }
      return element.placeholder;
    }
  }

  return readInnerText(element).replace(/\s+/g, " ").trim();
}
