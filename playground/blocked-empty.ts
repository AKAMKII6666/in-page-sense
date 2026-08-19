/**
 * 模块名称：playground/blockedEmpty
 * 模块说明：全屏空挡层，验收 BLOCKED_NO_PLAYABLE + fallback。
 */

import { createSense } from "in-page-sense";
import { bindSnapshotButton } from "./renderSnapshot";

const output = document.getElementById("output");
const snapButton = document.getElementById("take-snapshot");

if (snapButton instanceof HTMLButtonElement && output) {
  void bindSnapshotButton(snapButton, output, () => {
    return createSense({ root: document }).snapshot();
  });
}
