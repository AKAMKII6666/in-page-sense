/**
 * 模块名称：generic/collectGenericElements
 * 模块说明：退化 / 空挡层附件：配额内扫描可交互节点；snapshot 与 resolve 共用同一算法。
 */

import { getAccessibleName, queryAllInclusive, readInnerText } from "../dom";
import type { ISenseGenericInteractable } from "../types";
import type { IResolvedQuotas } from "../quotas";

export const INTERACTABLE_SELECTOR = [
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
  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
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
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    if (element.value) {
      return element.value;
    }
  }
  return undefined;
}

export interface ICollectedGeneric {
  /** 与 interactables 一一对应的 DOM 节点。 */
  elements: Element[];
  interactables: ISenseGenericInteractable[];
  /** 节点触达 maxNodes 配额。 */
  truncatedByNodes: boolean;
}

/**
 * 在 scopeRoot 内做配额 generic 扫描；ref 按 g0、g1… 分配。
 */
export function collectGenericElements(args: {
  scopeRoot: Document | ShadowRoot | Element;
  quotas: IResolvedQuotas;
}): ICollectedGeneric {
  const candidates = queryAllInclusive(args.scopeRoot, INTERACTABLE_SELECTOR);
  const elements: Element[] = [];
  const interactables: ISenseGenericInteractable[] = [];
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

    elements.push(element);
    interactables.push(item);
  }

  return { elements, interactables, truncatedByNodes };
}

/** 按 ref（gN）在已收集列表中定位元素。 */
export function elementForGenericRef(
  collected: ICollectedGeneric,
  ref: string,
): Element | null {
  const match = /^g(\d+)$/.exec(ref.trim());
  if (!match) {
    return null;
  }
  const index = Number.parseInt(match[1]!, 10);
  return collected.elements[index] ?? null;
}
