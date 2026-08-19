/**
 * 模块名称：playground/degenerate
 * 模块说明：无 pagetitle 页，验收 mode=degenerate。
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
