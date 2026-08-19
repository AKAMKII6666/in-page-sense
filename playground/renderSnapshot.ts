/**
 * 模块名称：playground/renderSnapshot
 * 模块说明：把 TSenseSnapshot 打到页面上，供本地对照 DOM。不是库产物。
 */

import type { TSenseSnapshot } from "in-page-sense";

export function renderSnapshot(target: HTMLElement, snap: TSenseSnapshot): void {
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(snap, null, 2);
  target.replaceChildren(pre);
}

export async function bindSnapshotButton(
  button: HTMLButtonElement,
  output: HTMLElement,
  run: () => Promise<TSenseSnapshot>,
): Promise<void> {
  button.addEventListener("click", () => {
    void run().then((snap) => {
      renderSnapshot(output, snap);
    });
  });
}
