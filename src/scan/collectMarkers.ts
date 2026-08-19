/**
 * 模块名称：scan/collectMarkers
 * 模块说明：收集 data-e2e-* 点位。缺字段的 playable 不进菜单、不抛死宿主页。
 */

import { queryAllInclusive } from "../dom";
import type { IScanMarkers, TInternalMarker } from "../internal-types";
import type { TPlayableEvent } from "../types";
import { readContentText } from "./readContentText";
import { readEnabled } from "./readEnabled";

const MARKER_SELECTOR = "[data-e2e-kind], [data-e2e-event], [data-e2e-id]";

const PLAYABLE_EVENTS: readonly TPlayableEvent[] = ["click", "input", "drag", "scroll"];

function isPlayableEvent(value: string): value is TPlayableEvent {
  return (PLAYABLE_EVENTS as readonly string[]).includes(value);
}

function readAttr(element: Element, name: string): string | null {
  const value = element.getAttribute(name);
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  return trimmed;
}

function resolveKind(element: Element): "playable" | "island" | "content" | "region" | null {
  const kind = readAttr(element, "data-e2e-kind");
  if (kind === "playable" || kind === "island" || kind === "content" || kind === "region") {
    return kind;
  }

  // 未写 kind、带 data-e2e-event 的视为 playable（需求 02.2）。
  const event = readAttr(element, "data-e2e-event");
  if (event) {
    return "playable";
  }

  return null;
}

/**
 * 扫描 root 内点位。pagetitle 节点本身不是 kind，会被 selector 漏掉或因 resolveKind 为空而跳过。
 */
export function collectMarkers(
  root: Document | ShadowRoot | Element,
  contentTextChars: number,
): IScanMarkers {
  const playables = [];
  const contents = [];
  const islands = [];
  const regions = [];
  const byElement = new Map<Element, TInternalMarker>();

  const candidates = queryAllInclusive(root, MARKER_SELECTOR);

  for (const element of candidates) {
    const kind = resolveKind(element);
    if (!kind) {
      continue;
    }

    const id = readAttr(element, "data-e2e-id");
    if (!id) {
      continue;
    }

    if (kind === "playable") {
      const eventRaw = readAttr(element, "data-e2e-event");
      const title = readAttr(element, "data-e2e-title");
      const desc = readAttr(element, "data-e2e-desc");
      // 缺字段不进菜单；不 throw，避免感知把宿主页打崩。
      if (!eventRaw || !isPlayableEvent(eventRaw) || !title || !desc) {
        continue;
      }
      const record = {
        id,
        event: eventRaw,
        title,
        desc,
        enabled: readEnabled(element),
        element,
      };
      playables.push(record);
      byElement.set(element, { kind: "playable", record });
      continue;
    }

    if (kind === "content") {
      const title = readAttr(element, "data-e2e-title");
      if (!title) {
        continue;
      }
      const record = {
        id,
        title,
        text: readContentText(element, contentTextChars),
        element,
      };
      contents.push(record);
      byElement.set(element, { kind: "content", record });
      continue;
    }

    if (kind === "island") {
      const record = { id, element };
      islands.push(record);
      byElement.set(element, { kind: "island", record });
      continue;
    }

    const regionTitle = readAttr(element, "data-e2e-title");
    const record = { id, title: regionTitle, element };
    regions.push(record);
    byElement.set(element, { kind: "region", record });
  }

  return { playables, contents, islands, regions, byElement };
}
