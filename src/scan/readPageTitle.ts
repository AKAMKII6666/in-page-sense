/**
 * 模块名称：scan/readPageTitle
 * 模块说明：每次 snapshot 现读文档序第一个 data-e2e-pagetitle；禁止用 document.title 凑。
 */

import { queryAllInclusive } from "../dom";

/**
 * 一个 root 只认第一个 pagetitle 节点。找不到、无属性、或值为空 → null（调用方走 degenerate）。
 * 不跳过空节点去找后面的非空值，避免空占位被第二个页名顶掉。
 */
export function readPageTitle(root: Document | ShadowRoot | Element): string | null {
  const nodes = queryAllInclusive(root, "[data-e2e-pagetitle]");
  const first = nodes[0];
  if (!first) {
    return null;
  }

  const value = first.getAttribute("data-e2e-pagetitle");
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }

  return trimmed;
}
