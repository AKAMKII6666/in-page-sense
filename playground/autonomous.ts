/**
 * 模块名称：playground/autonomous
 * 模块说明：有 pagetitle 的全页菜单页；可打开假 Modal 验证焦点层。
 */

import { createSense } from "in-page-sense";
import { bindSnapshotButton } from "./renderSnapshot";

const output = document.getElementById("output");
const snapButton = document.getElementById("take-snapshot");
const openModal = document.getElementById("open-modal");
const closeModal = document.getElementById("close-modal");
const modal = document.getElementById("modal");

if (snapButton instanceof HTMLButtonElement && output) {
  void bindSnapshotButton(snapButton, output, () => {
    return createSense({ root: document }).snapshot();
  });
}

if (openModal && modal) {
  openModal.addEventListener("click", () => {
    modal.hidden = false;
  });
}

if (closeModal && modal) {
  closeModal.addEventListener("click", () => {
    modal.hidden = true;
  });
}
