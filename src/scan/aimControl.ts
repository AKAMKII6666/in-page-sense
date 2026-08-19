/**
 * 模块名称：scan/aimControl
 * 模块说明：从点位包装解析 bot 瞄准节点（内层控件优先），与 enabled 读的是同一套选择器。
 */

/** 内层控件选择器；enabled 与 resolve 瞄准共用，禁止各写一份。 */
export const CONTROL_SELECTOR = "button, a, input, [role='button']";

/**
 * playable 包装上的瞄准目标：自身若已是控件则用之，否则取第一个内层控件；都没有则退回包装。
 */
export function resolveAimElement(playableElement: Element): Element {
  if (playableElement.matches(CONTROL_SELECTOR)) {
    return playableElement;
  }

  const inner = playableElement.querySelector(CONTROL_SELECTOR);
  if (inner) {
    return inner;
  }

  return playableElement;
}
