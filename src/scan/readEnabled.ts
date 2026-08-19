/**
 * 模块名称：scan/readEnabled
 * 模块说明：读内层 button/a/input/[role=button] 的 disabled / aria-disabled / loading，不读 contents 包装。
 */

import { CONTROL_SELECTOR, resolveAimElement } from "./aimControl";

function isDisabledControl(control: Element): boolean {
  if (control instanceof HTMLButtonElement || control instanceof HTMLInputElement) {
    if (control.disabled) {
      return true;
    }
  }

  if (control.getAttribute("aria-disabled") === "true") {
    return true;
  }

  // loading：宿主常用 aria-busy 或 loading 属性，不把包装节点的 class 当控件状态。
  if (control.getAttribute("aria-busy") === "true") {
    return true;
  }

  if (control.hasAttribute("loading")) {
    return true;
  }

  if (control.getAttribute("data-loading") === "true") {
    return true;
  }

  return false;
}

/**
 * playable 是否可操作。找不到内层控件时视为 enabled（没有证据说它被禁用）。
 */
export function readEnabled(playableElement: Element): boolean {
  const control = resolveAimElement(playableElement);
  if (control === playableElement && !playableElement.matches(CONTROL_SELECTOR)) {
    // 没有内层控件：没有证据说它被禁用。
    return true;
  }

  if (isDisabledControl(control)) {
    return false;
  }

  return true;
}
