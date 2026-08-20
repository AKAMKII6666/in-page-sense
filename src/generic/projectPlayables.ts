/**
 * 模块名称：generic/projectPlayables
 * 模块说明：degenerate 时将 generic interactables 投影进 playables[]，供 Agent 与 page run 同一读法。
 */

import type { ISenseGenericInteractable, ISensePlayableItem, TPlayableEvent } from "../types";

const GENERIC_DESC = "generic/degenerate";

function eventFromRole(role: string): TPlayableEvent | null {
  if (role === "button" || role === "link") {
    return "click";
  }
  if (role === "textbox") {
    return "input";
  }
  return null;
}

/** 把 generic interactables 投影为 playables；不支持 event 的 role 跳过。 */
export function projectGenericToPlayables(
  interactables: ISenseGenericInteractable[],
): ISensePlayableItem[] {
  const playables: ISensePlayableItem[] = [];

  for (const item of interactables) {
    const event = eventFromRole(item.role);
    if (event === null) {
      continue;
    }

    playables.push({
      id: item.ref,
      event,
      title: item.name.length > 0 ? item.name : "(unnamed)",
      desc: GENERIC_DESC,
      enabled: !item.disabled,
    });
  }

  return playables;
}
