/**
 * 模块名称：scan/expandIslands
 * 模块说明：按宿主 islandSlots 在岛内寻址槽位，写成 islandId:slotName；找不到不进列表。
 */

import { getAccessibleName } from "../dom";
import type { IScannedIsland, IScannedPlayable } from "../internal-types";
import type { IIslandSlotLocator, IIslandSlotTable } from "../types";
import { readEnabled } from "./readEnabled";

const DEFAULT_EXCLUDE_ID_SUFFIX = "Measurer";

function idEndsWithSuffix(element: Element, suffix: string): boolean {
  const htmlId = element.id;
  if (htmlId && htmlId.endsWith(suffix)) {
    return true;
  }
  const e2eId = element.getAttribute("data-e2e-id");
  if (e2eId && e2eId.endsWith(suffix)) {
    return true;
  }
  return false;
}

function shouldExclude(element: Element, locator: IIslandSlotLocator): boolean {
  if (idEndsWithSuffix(element, DEFAULT_EXCLUDE_ID_SUFFIX)) {
    return true;
  }
  if (locator.excludeIdSuffix && idEndsWithSuffix(element, locator.excludeIdSuffix)) {
    return true;
  }
  return false;
}

function walkIslandDescendants(island: Element): Element[] {
  return Array.from(island.querySelectorAll("*"));
}

function findSlotElement(island: Element, locator: IIslandSlotLocator): Element | null {
  const descendants = walkIslandDescendants(island);

  for (const candidate of descendants) {
    if (shouldExclude(candidate, locator)) {
      continue;
    }

    if (locator.by === "aria-label") {
      const ariaLabel = candidate.getAttribute("aria-label");
      if (ariaLabel && ariaLabel.trim() === locator.name) {
        return candidate;
      }
      continue;
    }

    // by === "role-name"：要求 role 匹配且可访问名等于 name。
    const expectedRole = locator.role;
    if (!expectedRole) {
      continue;
    }
    const role = candidate.getAttribute("role") || implicitRole(candidate);
    if (role !== expectedRole) {
      continue;
    }
    const name = getAccessibleName(candidate);
    if (name === locator.name) {
      return candidate;
    }
  }

  return null;
}

function implicitRole(element: Element): string | null {
  const tag = element.tagName.toLowerCase();
  if (tag === "button") {
    return "button";
  }
  if (tag === "a" && element.hasAttribute("href")) {
    return "link";
  }
  if (tag === "input") {
    const type = (element as HTMLInputElement).type;
    if (type === "button" || type === "submit") {
      return "button";
    }
    if (type === "checkbox") {
      return "checkbox";
    }
    if (type === "radio") {
      return "radio";
    }
    return "textbox";
  }
  if (tag === "textarea") {
    return "textbox";
  }
  if (tag === "select") {
    return "combobox";
  }
  return null;
}

/**
 * 把岛槽位展开为合成 playable。无表、无该岛、槽位找不到：不写 playables，不假装已点。
 */
export function expandIslands(
  islands: IScannedIsland[],
  islandSlots: IIslandSlotTable | undefined,
): IScannedPlayable[] {
  if (!islandSlots) {
    return [];
  }

  const expanded: IScannedPlayable[] = [];

  for (const island of islands) {
    const group = islandSlots[island.id];
    if (!group) {
      continue;
    }

    for (const slotName of Object.keys(group.slots)) {
      const locator = group.slots[slotName];
      if (!locator) {
        continue;
      }
      const slotElement = findSlotElement(island.element, locator);
      if (!slotElement) {
        continue;
      }

      expanded.push({
        id: `${island.id}:${slotName}`,
        event: "click",
        title: slotName,
        desc: locator.name,
        enabled: readEnabled(slotElement),
        element: slotElement,
      });
    }
  }

  return expanded;
}
