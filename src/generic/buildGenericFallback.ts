/**
 * 模块名称：generic/buildGenericFallback
 * 模块说明：退化 / 空挡层附件：配额内 interactables + 浅 a11yText + 可选截图。ref 不得写入 playables。
 */

import { getAccessibleName, queryAllInclusive, readInnerText, toScopeElement, truncateText } from "../dom";
import type { ISenseGenericFallback, ISenseGenericInteractable, ISenseScreenshot } from "../types";
import type { IResolvedQuotas } from "../quotas";

const INTERACTABLE_SELECTOR = [
  "button",
  "a[href]",
  "input",
  "select",
  "textarea",
  "[role='button']",
  "[role='link']",
  "[role='textbox']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='menuitem']",
  "[role='tab']",
  "[role='switch']",
].join(", ");

function roleOf(element: Element): string {
  const explicit = element.getAttribute("role");
  if (explicit) {
    return explicit;
  }

  const tag = element.tagName.toLowerCase();
  if (tag === "button") {
    return "button";
  }
  if (tag === "a") {
    return "link";
  }
  if (tag === "textarea") {
    return "textbox";
  }
  if (tag === "select") {
    return "combobox";
  }
  if (tag === "input") {
    const type = (element as HTMLInputElement).type;
    if (type === "checkbox") {
      return "checkbox";
    }
    if (type === "radio") {
      return "radio";
    }
    if (type === "button" || type === "submit" || type === "reset") {
      return "button";
    }
    return "textbox";
  }
  return tag;
}

function isDisabled(element: Element): boolean {
  if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
    if (element.disabled) {
      return true;
    }
  }
  if (element.getAttribute("aria-disabled") === "true") {
    return true;
  }
  return false;
}

function readValue(element: Element): string | undefined {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    if (element.value) {
      return element.value;
    }
  }
  return undefined;
}

async function captureOrNull(
  captureScreenshot: ((scope: Element) => Promise<ISenseScreenshot>) | undefined,
  scope: Element,
): Promise<ISenseScreenshot | null> {
  if (!captureScreenshot) {
    return null;
  }

  try {
    return await captureScreenshot(scope);
  } catch {
    // 拍失败不得假装已看见图像；a11y 仍给。
    return null;
  }
}

/**
 * 在 scopeRoot 内做配额 generic 扫描。scope 只用于回包字段，不扩大查询。
 */
export async function buildGenericFallback(args: {
  scopeRoot: Document | ShadowRoot | Element;
  scope: "blocking-layer" | "root";
  quotas: IResolvedQuotas;
  captureScreenshot: ((scope: Element) => Promise<ISenseScreenshot>) | undefined;
}): Promise<ISenseGenericFallback> {
  const candidates = queryAllInclusive(args.scopeRoot, INTERACTABLE_SELECTOR);
  const interactables: ISenseGenericInteractable[] = [];
  const a11yLines: string[] = [];

  let truncatedByNodes = false;

  for (let index = 0; index < candidates.length; index += 1) {
    const element = candidates[index]!;
    if (interactables.length >= args.quotas.maxNodes) {
      truncatedByNodes = true;
      break;
    }

    const role = roleOf(element);
    const name = getAccessibleName(element) || readInnerText(element).replace(/\s+/g, " ").trim();
    const item: ISenseGenericInteractable = {
      ref: `g${interactables.length}`,
      role,
      name,
    };

    if (isDisabled(element)) {
      item.disabled = true;
    }

    const value = readValue(element);
    if (value !== undefined) {
      item.value = value;
    }

    interactables.push(item);

    let line = `${role} "${name}"`;
    if (item.disabled) {
      line = `${line} disabled`;
    }
    if (item.value !== undefined) {
      line = `${line} value="${item.value}"`;
    }
    a11yLines.push(line);
  }

  const joined = a11yLines.join("\n");
  const textResult = truncateText(joined, args.quotas.a11yTextChars);

  const screenshot = await captureOrNull(
    args.captureScreenshot,
    toScopeElement(args.scopeRoot),
  );

  return {
    kind: "generic",
    scope: args.scope,
    truncated: truncatedByNodes || textResult.truncated,
    nodeCount: interactables.length,
    maxNodes: args.quotas.maxNodes,
    interactables,
    a11yText: textResult.text,
    screenshot,
  };
}
